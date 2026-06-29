/**
 * Human-readable diagnostics: resolve the user call site from a recorded stack,
 * suggest a concrete fix, and format the failure block shown by assertions and
 * matchers. This is the output the 3-minute demo and the report lean on, so it
 * stays plain ASCII and free of framework noise.
 */
import { fileURLToPath } from "node:url";
import type { QueryReport } from "./types.js";

/** queryward's own source/dist directory; frames inside it are framework noise. */
const PKG_DIR = (() => {
  try {
    return fileURLToPath(new URL("..", import.meta.url));
  } catch {
    return "";
  }
})();

const FRAME_RE = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/;

interface ParsedFrame {
  fn?: string;
  file: string;
  line: number;
}

function safeCwd(): string {
  try {
    return process.cwd();
  } catch {
    return "";
  }
}

function normalizePath(file: string): string {
  if (file.startsWith("file://")) {
    try {
      return fileURLToPath(file);
    } catch {
      return file;
    }
  }
  return file;
}

/** A frame we never want to surface: node internals, deps, queryward itself. */
function isFrameworkFrame(file: string): boolean {
  if (!file) return true;
  if (file.startsWith("node:") || file.includes("internal/")) return true;
  if (file.includes("node_modules")) return true;
  if (PKG_DIR && file.includes(PKG_DIR)) return true;
  return false;
}

function relativize(file: string): string {
  const cwd = safeCwd();
  if (cwd && file.startsWith(cwd)) {
    return file.slice(cwd.length).replace(/^[/\\]/, "");
  }
  return file;
}

function parseFrame(line: string): ParsedFrame | undefined {
  const m = line.match(FRAME_RE);
  if (!m) return undefined;
  return { fn: m[1], file: normalizePath(m[2]), line: Number(m[3]) };
}

/**
 * Walk a captured stack and return the first frame that belongs to user code,
 * formatted as `path:line (fn)`. Returns undefined when nothing usable remains.
 */
export function extractCallSite(stack?: string): string | undefined {
  if (!stack) return undefined;
  for (const raw of stack.split("\n")) {
    const frame = parseFrame(raw);
    if (!frame || isFrameworkFrame(frame.file)) continue;
    const where = `${relativize(frame.file)}:${frame.line}`;
    return frame.fn ? `${where} (${frame.fn})` : where;
  }
  return undefined;
}

/**
 * Best-effort fix hint from the repeated query shape. A per-row lookup keyed by
 * an id is the textbook N+1; everything else gets the generic batch advice.
 */
export function suggestFix(sample: string): string | undefined {
  const sql = sample.toLowerCase();
  if (!sql.includes("select")) return undefined;
  const perRowLookup =
    /\b\w*id\b\s*=/.test(sql) || /\b\w*id\b\s+in\b/.test(sql);
  if (perRowLookup) {
    return (
      "This looks like one lookup per row (a related-record N+1). " +
      "Load the relation in a single query (Prisma `include`, Drizzle `with`), " +
      "or batch the ids with `WHERE id IN (...)`."
    );
  }
  return (
    "The same query shape repeats once per row. Hoist it out of the loop, " +
    "or fetch the rows together in one query instead of one-by-one."
  );
}

/** Render the failure block: headline, worst shape with call site, totals, fix. */
export function formatReport(headline: string, report: QueryReport): string {
  const lines: string[] = [headline];
  const worst = report.nPlusOne[0];

  if (worst) {
    lines.push("");
    lines.push(`  ${worst.count}x the same query shape:`);
    lines.push(`    ${worst.sample}`);
    if (worst.callSite) lines.push(`    first seen at ${worst.callSite}`);
  }

  lines.push("");
  lines.push(`  Total queries: ${report.count}`);

  if (worst) {
    const rest = report.shapes
      .filter((s) => s.fingerprint !== worst.fingerprint)
      .slice(0, 4);
    if (rest.length) {
      lines.push("  Other query shapes:");
      for (const s of rest) lines.push(`    ${s.count}x  ${s.sample}`);
    }
    const fix = suggestFix(worst.sample);
    if (fix) {
      lines.push("");
      lines.push(`  Fix: ${fix}`);
    }
  } else if (report.shapes.length) {
    lines.push("  By shape:");
    for (const s of report.shapes.slice(0, 5)) {
      lines.push(`    ${s.count}x  ${s.sample}`);
    }
  }

  return lines.join("\n");
}

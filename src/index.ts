import { collect } from "./core/collector.js";
import { detectNPlusOne, summarizeShapes } from "./core/detect.js";
import { formatReport } from "./core/diagnose.js";
import { reconcileBudget } from "./core/budget.js";
import type { QueryReport } from "./core/types.js";

export type {
  RecordedQuery,
  QueryReport,
  QueryShape,
  NPlusOneFinding,
} from "./core/types.js";
export type { Budgets, BudgetMode, BudgetResult } from "./core/budget.js";
export { recordQuery, isCollecting } from "./core/collector.js";
export { fingerprint } from "./core/fingerprint.js";
export { summarizeShapes, detectNPlusOne } from "./core/detect.js";
export { extractCallSite, suggestFix, formatReport } from "./core/diagnose.js";
export {
  BUDGET_FILE,
  currentMode,
  loadBudgets,
  saveBudgets,
  reconcileBudget,
} from "./core/budget.js";

export interface MeasureOptions {
  /** N+1 detection threshold (same-shape repeats). Default 2. */
  nPlusOneThreshold?: number;
}

/** Run `fn` and report every query the registered adapters recorded. */
export async function measureQueries(
  fn: () => unknown,
  opts: MeasureOptions = {},
): Promise<QueryReport> {
  const { queries } = await collect(fn);
  return {
    count: queries.length,
    queries,
    shapes: summarizeShapes(queries),
    nPlusOne: detectNPlusOne(queries, opts.nPlusOneThreshold ?? 2),
  };
}

export interface QueryCountOptions {
  max: number;
}

/** Assert the code path issues at most `max` queries. */
export async function assertQueryCount(
  fn: () => unknown,
  opts: QueryCountOptions,
): Promise<QueryReport> {
  const report = await measureQueries(fn);
  if (report.count > opts.max) {
    throw new QuerywardError(
      `Expected at most ${opts.max} queries, but ${report.count} ran.`,
      report,
    );
  }
  return report;
}

/** Assert no N+1 pattern (no query shape repeated >= threshold times). */
export async function assertNoNPlusOne(
  fn: () => unknown,
  opts: { threshold?: number } = {},
): Promise<QueryReport> {
  const report = await measureQueries(fn, { nPlusOneThreshold: opts.threshold });
  if (report.nPlusOne.length > 0) {
    const worst = report.nPlusOne[0];
    throw new QuerywardError(
      `Detected N+1: ${report.count} queries ran, ${worst.count} of them the same shape.`,
      report,
    );
  }
  return report;
}

export interface QueryBudgetOptions {
  /** Stable name for this code path; the key under which its baseline is stored. */
  label: string;
  /** Override the budgets file location (mainly for tests). */
  budgetFile?: string;
}

/**
 * Assert the code path stays within its recorded query budget.
 *
 * In "check" mode (default, and in CI) this fails when the path runs more
 * queries than its committed baseline. In "update" mode (`queryward snapshot`)
 * it rewrites the baseline. A label seen for the first time records its count.
 */
export async function assertQueryBudget(
  fn: () => unknown,
  opts: QueryBudgetOptions,
): Promise<QueryReport> {
  const report = await measureQueries(fn);
  const result = reconcileBudget(opts.label, report.count, opts.budgetFile);
  if (result.exceeded) {
    throw new QuerywardError(
      `Query budget exceeded for "${opts.label}": ${result.count} queries ran, baseline is ${result.baseline}.`,
      report,
    );
  }
  return report;
}

export class QuerywardError extends Error {
  report: QueryReport;
  constructor(message: string, report: QueryReport) {
    super(formatReport(message, report));
    this.name = "QuerywardError";
    this.report = report;
  }
}

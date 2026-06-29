#!/usr/bin/env node
/**
 * queryward CLI: query-budget regression mode.
 *   queryward snapshot   run tests and (re)write .queryward/budgets.json baselines
 *   queryward check      run tests in compare mode; nonzero exit if over baseline
 *
 * The subcommand just sets QUERYWARD_MODE and runs your test command (defaults
 * to `npm test`); the actual compare happens inside `assertQueryBudget` /
 * `toMatchQueryBudget` during the test run. spawnSync runs without a shell.
 */
import process from "node:process";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BudgetMode } from "./core/budget.js";

const HELP = [
  "usage: queryward <snapshot|check> [-- <test command>]",
  "",
  "  snapshot   run your tests and (re)write .queryward/budgets.json baselines",
  "  check      run your tests and fail if a label exceeds its baseline (for CI)",
  "",
  "  The test command defaults to `npm test`. Pass your own after `--`:",
  "    queryward check -- npx vitest run",
  "",
  "  Commit .queryward/budgets.json so CI can enforce it.",
].join("\n");

/** Resolve the test command to run: everything after `--`, else `npm test`. */
export function resolveTestCommand(args: string[]): string[] {
  const i = args.indexOf("--");
  if (i >= 0 && args.length > i + 1) return args.slice(i + 1);
  return ["npm", "test"];
}

function runTests(mode: BudgetMode, args: string[]): number {
  const [bin, ...rest] = resolveTestCommand(args);
  const result = spawnSync(bin, rest, {
    stdio: "inherit",
    env: { ...process.env, QUERYWARD_MODE: mode },
  });
  if (result.error) {
    console.error(`queryward: failed to run "${bin}": ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

/** Parse argv (minus node + script) and return the process exit code. */
export function cli(argv: string[] = process.argv.slice(2)): number {
  const [cmd, ...rest] = argv;
  if (cmd === "snapshot") return runTests("update", rest);
  if (cmd === "check") return runTests("check", rest);
  console.log(HELP);
  return cmd ? 1 : 0;
}

function isEntrypoint(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try {
    return realpathSync(arg) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isEntrypoint()) process.exit(cli());

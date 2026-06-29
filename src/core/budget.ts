/**
 * Query budget regression mode. Per-label query-count baselines live in
 * `.queryward/budgets.json` (committed to the repo). A test run in "check" mode
 * fails when a labelled path exceeds its baseline, so an N+1 sneaking into a PR
 * turns CI red. A run in "update" mode rewrites the baselines.
 *
 * CLI: `queryward snapshot` (update) / `queryward check` (compare). See cli.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface Budgets {
  [label: string]: number;
}

export const BUDGET_FILE = ".queryward/budgets.json";

export type BudgetMode = "check" | "update";

/** Read the active mode from the environment; defaults to the safe "check". */
export function currentMode(): BudgetMode {
  return process.env.QUERYWARD_MODE === "update" ? "update" : "check";
}

export function loadBudgets(file: string = BUDGET_FILE): Budgets {
  try {
    if (!existsSync(file)) return {};
    return JSON.parse(readFileSync(file, "utf8")) as Budgets;
  } catch {
    return {};
  }
}

/** Persist budgets with sorted keys so the committed diff stays minimal. */
export function saveBudgets(budgets: Budgets, file: string = BUDGET_FILE): void {
  mkdirSync(dirname(file), { recursive: true });
  const sorted: Budgets = {};
  for (const key of Object.keys(budgets).sort()) sorted[key] = budgets[key];
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

export interface BudgetResult {
  label: string;
  count: number;
  baseline?: number;
  mode: BudgetMode;
  /** The run exceeded a recorded baseline (CI should fail). */
  exceeded: boolean;
  /** A baseline was written this run (update mode, or a first-seen label). */
  recorded: boolean;
}

/**
 * Compare a measured count against the stored baseline for `label`.
 *
 * - update mode: (re)write the baseline and pass.
 * - check mode, no baseline yet: record it and pass (first run establishes it).
 * - check mode, baseline present: fail when the count exceeds it.
 */
export function reconcileBudget(
  label: string,
  count: number,
  file: string = BUDGET_FILE,
  mode: BudgetMode = currentMode(),
): BudgetResult {
  const budgets = loadBudgets(file);
  const baseline = budgets[label];

  if (mode === "update" || baseline === undefined) {
    budgets[label] = count;
    saveBudgets(budgets, file);
    return { label, count, baseline, mode, exceeded: false, recorded: true };
  }

  return {
    label,
    count,
    baseline,
    mode,
    exceeded: count > baseline,
    recorded: false,
  };
}

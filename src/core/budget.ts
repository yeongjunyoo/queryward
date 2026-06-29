/**
 * Query budget regression mode (CLI: `queryward snapshot` | `queryward check`).
 *
 * Stores per-label query-count baselines in `.queryward/budgets.json`, commits
 * them, and fails CI when a labelled path exceeds its baseline.
 *
 * TODO(MVP): implement snapshot write + check compare.
 * See `06 queryward 마스터 설계 (라운드3).md` section 5.
 */
export interface Budget {
  [label: string]: number;
}

export const BUDGET_FILE = ".queryward/budgets.json";

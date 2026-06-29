/**
 * queryward CLI: query-budget regression mode.
 *   queryward snapshot   record per-label baselines into .queryward/budgets.json
 *   queryward check      fail if a label exceeds its baseline (for CI)
 *
 * TODO(MVP): implement. Stub prints help for now.
 */
const cmd = process.argv[2];

if (cmd === "snapshot" || cmd === "check") {
  console.log(`queryward ${cmd}: not implemented yet (MVP TODO).`);
  process.exit(0);
}

console.log("usage: queryward <snapshot|check>");
process.exit(cmd ? 1 : 0);

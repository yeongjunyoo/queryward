import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertQueryBudget, loadBudgets, reconcileBudget } from "../src/index.js";
import { recordQuery } from "../src/core/collector.js";
import { cli, resolveTestCommand } from "../src/cli.js";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qw-"));
  file = join(dir, "budgets.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("budget store", () => {
  it("records a first-seen label in check mode and passes", () => {
    const r = reconcileBudget("posts.list", 2, file, "check");
    expect(r.recorded).toBe(true);
    expect(r.exceeded).toBe(false);
    expect(loadBudgets(file)["posts.list"]).toBe(2);
  });

  it("fails in check mode when the count exceeds the baseline", () => {
    reconcileBudget("posts.list", 2, file, "check");
    const r = reconcileBudget("posts.list", 5, file, "check");
    expect(r.exceeded).toBe(true);
    expect(r.baseline).toBe(2);
    // a failing check must not move the baseline
    expect(loadBudgets(file)["posts.list"]).toBe(2);
  });

  it("passes in check mode when within the baseline", () => {
    reconcileBudget("posts.list", 5, file, "check");
    const r = reconcileBudget("posts.list", 3, file, "check");
    expect(r.exceeded).toBe(false);
    expect(r.recorded).toBe(false);
  });

  it("rewrites the baseline in update mode", () => {
    reconcileBudget("posts.list", 2, file, "check");
    const r = reconcileBudget("posts.list", 9, file, "update");
    expect(r.recorded).toBe(true);
    expect(loadBudgets(file)["posts.list"]).toBe(9);
  });
});

describe("assertQueryBudget", () => {
  function twoQueries(): void {
    recordQuery("SELECT 1");
    recordQuery("SELECT 2");
  }
  function fiveQueries(): void {
    for (let i = 0; i < 5; i++) recordQuery(`SELECT ${i}`);
  }

  it("records on the first run, then throws once the path regresses", async () => {
    await expect(
      assertQueryBudget(twoQueries, { label: "x", budgetFile: file }),
    ).resolves.toBeDefined();
    await expect(
      assertQueryBudget(fiveQueries, { label: "x", budgetFile: file }),
    ).rejects.toThrow(/budget exceeded for "x"/);
  });
});

describe("cli argument handling", () => {
  it("resolves the test command after `--`, else defaults to npm test", () => {
    expect(resolveTestCommand([])).toEqual(["npm", "test"]);
    expect(resolveTestCommand(["--", "npx", "vitest", "run"])).toEqual([
      "npx",
      "vitest",
      "run",
    ]);
    expect(resolveTestCommand(["--"])).toEqual(["npm", "test"]);
  });

  it("exits 0 with no command and nonzero on an unknown command", () => {
    expect(cli([])).toBe(0);
    expect(cli(["bogus"])).toBe(1);
  });
});

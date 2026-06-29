import { describe, expect, it } from "vitest";
import { assertNoNPlusOne, extractCallSite, suggestFix } from "../src/index.js";
import { recordQuery } from "../src/core/collector.js";

describe("diagnostics: call site", () => {
  it("skips node internals, deps, and queryward's own frames", () => {
    const stack = [
      "Error",
      "    at captureStack (/proj/node_modules/queryward/dist/core/collector.js:20:17)",
      "    at node:internal/process/task_queues:95:5",
      "    at getPostsWithAuthors (/proj/app/src/posts.ts:14:20)",
      "    at Array.forEach (<anonymous>)",
    ].join("\n");
    expect(extractCallSite(stack)).toBe(
      "/proj/app/src/posts.ts:14 (getPostsWithAuthors)",
    );
  });

  it("handles a frame with no function name", () => {
    const stack = ["Error", "    at /proj/app/src/db.ts:7:3"].join("\n");
    expect(extractCallSite(stack)).toBe("/proj/app/src/db.ts:7");
  });

  it("returns undefined when nothing usable remains", () => {
    expect(extractCallSite(undefined)).toBeUndefined();
    expect(extractCallSite("Error\n    at node:internal/x:1:1")).toBeUndefined();
  });
});

describe("diagnostics: fix hint", () => {
  it("recognizes a per-row id lookup as a related-record N+1", () => {
    const hint = suggestFix("SELECT * FROM comments WHERE post_id = 1");
    expect(hint).toMatch(/include/);
    expect(hint).toMatch(/with/);
  });

  it("falls back to generic batch advice and ignores non-selects", () => {
    expect(suggestFix("SELECT count(*) FROM posts JOIN users u")).toMatch(
      /one query/,
    );
    expect(suggestFix("BEGIN")).toBeUndefined();
  });
});

describe("diagnostics: end-to-end failure message", () => {
  function listWithNPlusOne(): void {
    recordQuery("SELECT * FROM posts");
    for (let i = 1; i <= 3; i++) {
      recordQuery(`SELECT * FROM comments WHERE post_id = ${i}`);
    }
  }

  it("surfaces the call site and a fix when an N+1 is asserted away", async () => {
    let message = "";
    try {
      await assertNoNPlusOne(listWithNPlusOne);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("Detected N+1");
    expect(message).toContain("Fix:");
    expect(message).toMatch(/diagnose\.test\.ts:\d+/);
  });
});

import { describe, expect, it } from "vitest";
import {
  assertNoNPlusOne,
  assertQueryCount,
  fingerprint,
  measureQueries,
} from "../src/index.js";
import { recordQuery } from "../src/core/collector.js";

/**
 * Simulate an ORM adapter feeding queries during the measured function:
 * one parent query plus one child query per row (the classic N+1).
 */
function fakeListWithComments(): void {
  recordQuery("SELECT * FROM posts");
  for (let i = 1; i <= 50; i++) {
    recordQuery(`SELECT * FROM comments WHERE post_id = ${i}`);
  }
}

describe("queryward core", () => {
  it("counts queries recorded inside a scope", async () => {
    const report = await measureQueries(() => {
      recordQuery("SELECT 1");
      recordQuery("SELECT 2");
    });
    expect(report.count).toBe(2);
  });

  it("is a no-op outside a scope", () => {
    expect(() => recordQuery("SELECT outside")).not.toThrow();
  });

  it("fingerprints away literal values", () => {
    expect(fingerprint("SELECT * FROM c WHERE id = 1")).toBe(
      fingerprint("SELECT * FROM c WHERE id = 999"),
    );
  });

  it("detects N+1 from repeated query shapes", async () => {
    const report = await measureQueries(fakeListWithComments);
    expect(report.count).toBe(51);
    expect(report.nPlusOne.length).toBeGreaterThan(0);
    expect(report.nPlusOne[0].count).toBe(50);
  });

  it("assertQueryCount throws when over budget", async () => {
    await expect(
      assertQueryCount(fakeListWithComments, { max: 2 }),
    ).rejects.toThrow(/at most 2 queries/);
  });

  it("assertNoNPlusOne throws on an N+1 pattern", async () => {
    await expect(assertNoNPlusOne(fakeListWithComments)).rejects.toThrow(
      /Detected N\+1/,
    );
  });
});

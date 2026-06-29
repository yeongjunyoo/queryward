import { expect } from "vitest";
import { measureQueries } from "../index.js";
import { formatReport } from "../core/diagnose.js";
import { reconcileBudget } from "../core/budget.js";

/**
 * Opt-in Vitest matchers. Import once in your test setup:
 *   import "queryward/vitest";
 *
 *   await expect(() => getPosts(db)).toHaveQueryCount({ max: 2 });
 *   await expect(() => getPosts(db)).toHaveNoNPlusOne();
 *   await expect(() => getPosts(db)).toMatchQueryBudget({ label: "posts.list" });
 */
interface QuerywardMatchers<R = unknown> {
  toHaveQueryCount(opts: { max: number }): R;
  toHaveNoNPlusOne(): R;
  toMatchQueryBudget(opts: { label: string }): R;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends QuerywardMatchers<Promise<void>> {}
  interface AsymmetricMatchersContaining extends QuerywardMatchers {}
}

expect.extend({
  async toHaveQueryCount(received: () => unknown, opts: { max: number }) {
    const report = await measureQueries(received);
    const pass = report.count <= opts.max;
    return {
      pass,
      message: () =>
        pass
          ? `expected more than ${opts.max} queries, but only ${report.count} ran`
          : formatReport(
              `expected at most ${opts.max} queries, but ${report.count} ran`,
              report,
            ),
    };
  },
  async toHaveNoNPlusOne(received: () => unknown) {
    const report = await measureQueries(received);
    const pass = report.nPlusOne.length === 0;
    return {
      pass,
      message: () =>
        pass
          ? `expected an N+1 pattern, but found none`
          : formatReport(
              `Detected N+1: ${report.nPlusOne[0].count}x the same query shape.`,
              report,
            ),
    };
  },
  async toMatchQueryBudget(received: () => unknown, opts: { label: string }) {
    const report = await measureQueries(received);
    const result = reconcileBudget(opts.label, report.count);
    return {
      pass: !result.exceeded,
      message: () =>
        result.exceeded
          ? formatReport(
              `Query budget exceeded for "${opts.label}": ${result.count} ran, baseline ${result.baseline}.`,
              report,
            )
          : `expected "${opts.label}" to exceed its budget of ${result.baseline}, but ${result.count} ran`,
    };
  },
});

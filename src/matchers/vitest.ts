import { expect } from "vitest";
import { measureQueries } from "../index.js";

/**
 * Opt-in Vitest matchers. Import once in your test setup:
 *   import "queryward/vitest";
 *
 *   await expect(() => getPosts(db)).toHaveQueryCount({ max: 2 });
 *   await expect(() => getPosts(db)).toHaveNoNPlusOne();
 *
 * TODO: ship matcher type declarations so TS recognizes these on `expect`.
 */
expect.extend({
  async toHaveQueryCount(received: () => unknown, opts: { max: number }) {
    const report = await measureQueries(received);
    const pass = report.count <= opts.max;
    return {
      pass,
      message: () =>
        pass
          ? `expected more than ${opts.max} queries, but only ${report.count} ran`
          : `expected at most ${opts.max} queries, but ${report.count} ran`,
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
          : `detected N+1: ${report.nPlusOne[0].count}x ${report.nPlusOne[0].sample}`,
    };
  },
});

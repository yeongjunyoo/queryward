import { recordQuery } from "../core/collector.js";

/**
 * Drizzle logger that records queries into the active queryward scope.
 *
 *   import { drizzle } from "drizzle-orm/node-postgres";
 *   import { querywardLogger } from "queryward/drizzle";
 *   const db = drizzle(client, { logger: querywardLogger });
 *
 * Drizzle's Logger interface is synchronous and runs in the caller's context,
 * which makes this the parallel-safe reference adapter.
 */
export const querywardLogger = {
  logQuery(query: string, params: unknown[]): void {
    recordQuery(query, params);
  },
};

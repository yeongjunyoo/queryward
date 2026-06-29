import { AsyncLocalStorage } from "node:async_hooks";
import type { RecordedQuery } from "./types.js";

/**
 * Active collection scope. Adapters push into the store bound by `collect`.
 * Outside a scope the store is undefined, so `recordQuery` is a safe no-op.
 */
const storage = new AsyncLocalStorage<RecordedQuery[]>();

/** Called by ORM adapters to record a query. No-op outside a measure scope. */
export function recordQuery(sql: string, params?: unknown[]): void {
  const sink = storage.getStore();
  if (!sink) return;
  sink.push({ sql, params });
}

/** Run `fn` while collecting every query adapters record inside it. */
export async function collect<T>(
  fn: () => T | Promise<T>,
): Promise<{ result: T; queries: RecordedQuery[] }> {
  const sink: RecordedQuery[] = [];
  const result = await storage.run(sink, async () => fn());
  return { result, queries: sink };
}

export function isCollecting(): boolean {
  return storage.getStore() !== undefined;
}

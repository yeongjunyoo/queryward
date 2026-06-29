import type { NPlusOneFinding, QueryShape, RecordedQuery } from "./types.js";
import { fingerprint } from "./fingerprint.js";

/** Group recorded queries by structural fingerprint, most frequent first. */
export function summarizeShapes(queries: RecordedQuery[]): QueryShape[] {
  const map = new Map<string, QueryShape>();
  for (const q of queries) {
    const fp = fingerprint(q.sql);
    const existing = map.get(fp);
    if (existing) existing.count++;
    else map.set(fp, { fingerprint: fp, count: 1, sample: q.sql });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/**
 * Flag any query shape repeated at least `threshold` times as an N+1 pattern.
 * Default threshold is 2. (Future: combine with call-site identity to lower
 * false positives, per the design notes.)
 */
export function detectNPlusOne(
  queries: RecordedQuery[],
  threshold = 2,
): NPlusOneFinding[] {
  return summarizeShapes(queries)
    .filter((s) => s.count >= threshold)
    .map((s) => ({ fingerprint: s.fingerprint, count: s.count, sample: s.sample }));
}

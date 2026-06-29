/**
 * Normalize a SQL string into a structural fingerprint so queries that differ
 * only by literal values collapse to the same shape. Same-shape repetition is
 * the core signal for an N+1 pattern.
 *
 * This is a deliberately simple, dependency-free pass. A real SQL parser is on
 * the roadmap for sturdier normalization.
 */
export function fingerprint(sql: string): string {
  return sql
    .replace(/\s+/g, " ")
    .trim()
    // single-quoted string literals (with '' escapes)
    .replace(/'(?:[^']|'')*'/g, "?")
    // numeric literals
    .replace(/\b\d+(\.\d+)?\b/g, "?")
    // positional ($1) and named (:id / @id) params
    .replace(/\$\d+/g, "?")
    .replace(/[:@]\w+/g, "?")
    // collapse IN (?, ?, ?) lists to IN (?)
    .replace(/\bIN\s*\(\s*\?(?:\s*,\s*\?)*\s*\)/gi, "IN (?)")
    .toLowerCase();
}

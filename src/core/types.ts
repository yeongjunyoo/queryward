export interface RecordedQuery {
  sql: string;
  params?: unknown[];
  /** Best-effort caller stack at record time (filled by adapters later). */
  stack?: string;
}

export interface QueryShape {
  /** Structural fingerprint (literals stripped). */
  fingerprint: string;
  count: number;
  /** A representative raw SQL string for this shape. */
  sample: string;
  /** Caller stack of the first query seen for this shape, if captured. */
  stack?: string;
}

export interface NPlusOneFinding {
  fingerprint: string;
  count: number;
  sample: string;
  /** Resolved user call site (`path:line (fn)`) for this shape, if available. */
  callSite?: string;
}

export interface QueryReport {
  count: number;
  queries: RecordedQuery[];
  shapes: QueryShape[];
  nPlusOne: NPlusOneFinding[];
}

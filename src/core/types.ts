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
}

export interface NPlusOneFinding {
  fingerprint: string;
  count: number;
  sample: string;
}

export interface QueryReport {
  count: number;
  queries: RecordedQuery[];
  shapes: QueryShape[];
  nPlusOne: NPlusOneFinding[];
}

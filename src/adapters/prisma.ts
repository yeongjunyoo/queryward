import { recordQuery } from "../core/collector.js";

/** Minimal shape of a Prisma client that emits query events. */
interface PrismaQueryEvent {
  query: string;
  params: string;
}
interface PrismaLike {
  $on(event: "query", cb: (e: PrismaQueryEvent) => void): void;
}

/**
 * Attach queryward to a Prisma client. The client must enable query event
 * logging:
 *
 *   const prisma = new PrismaClient({
 *     log: [{ level: "query", emit: "event" }],
 *   });
 *   attachPrisma(prisma);
 *
 * Note: Prisma's query event is async and does not carry the caller stack, so
 * parallel scoping is less precise than the Drizzle adapter. Run measured
 * Prisma paths serially for now. See ROADMAP (driver-adapter interception).
 */
export function attachPrisma(client: PrismaLike): void {
  client.$on("query", (e) => {
    let params: unknown[] | undefined;
    try {
      params = JSON.parse(e.params);
    } catch {
      params = undefined;
    }
    recordQuery(e.query, params);
  });
}

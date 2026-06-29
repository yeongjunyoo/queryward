<div align="center">

# queryward

**Catch N+1 queries in your tests, before they hit production.**

<sub>An ORM-agnostic query-count assertion library for TypeScript. Prisma, Drizzle, and more.</sub>

<br /><br />

<a href="https://github.com/yeongjunyoo/queryward/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/yeongjunyoo/queryward/ci.yml?branch=main&label=CI&style=flat&labelColor=1a1a2e"></a>
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178C6?style=flat&logo=typescript&logoColor=white&labelColor=1a1a2e">
<a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/yeongjunyoo/queryward?style=flat&labelColor=1a1a2e&color=blue"></a>
<a href="https://github.com/yeongjunyoo/queryward/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/yeongjunyoo/queryward?style=flat&labelColor=1a1a2e&color=f5c518"></a>

<br />

<a href="#quickstart"><b>Quickstart</b></a> &nbsp;|&nbsp; <a href="#why-queryward">Why</a> &nbsp;|&nbsp; <a href="#orm-support">ORM support</a> &nbsp;|&nbsp; <a href="#api">API</a> &nbsp;|&nbsp; <a href="#roadmap">Roadmap</a>

</div>

---

**queryward** asserts how many SQL queries your ORM runs inside a test, so an N+1 fails CI instead of production. Ruby has bullet, Python has nplusone, PHP has phpunit-query-count-assertions. TypeScript had nothing. queryward fills that gap.

> [!NOTE]
> Early but working. The core (query collection, fingerprinting, N+1 detection) and the assertion API are tested and green. ORM adapters are wired; the CI budget mode and the first npm release are in progress. See the [roadmap](#roadmap).

## Quickstart

```bash
npm i -D queryward
```

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { querywardLogger } from "queryward/drizzle";
import { assertNoNPlusOne, assertQueryCount } from "queryward";

const db = drizzle(client, { logger: querywardLogger });

test("listing posts stays within budget", async () => {
  await assertQueryCount(() => getPostsWithAuthors(db), { max: 2 });
  await assertNoNPlusOne(() => getPostsWithAuthors(db));
});
```

## Before and after

A function that looks innocent in review:

```ts
const posts = await db.query.posts.findMany();
for (const post of posts) {
  // one extra query per post: the classic N+1
  post.author = await db.query.users.findFirst({ where: eq(users.id, post.authorId) });
}
```

queryward turns it into a failing test:

```
QuerywardError: Detected N+1: 50x of the same query shape.
  SELECT * FROM users WHERE id = ?

Total queries: 51
  50x  SELECT * FROM users WHERE id = $1
   1x  SELECT * FROM posts
```

One join later, the test is green at 2 queries. The regression can never reach production again.

## Why queryward

N+1 is the most common backend performance bug, and today it is caught by luck: a reviewer's eye, or a production dashboard after the incident. Every other ecosystem has a test-time safety net for it. TypeScript did not.

| Ecosystem | Test-time N+1 safety net |
| --- | --- |
| Ruby | bullet, prosopite |
| Java | hibernate-query-asserts, QuickPerf |
| Python | nplusone, Django `assertNumQueries` |
| PHP | phpunit-query-count-assertions |
| **TypeScript** | **queryward** |

queryward is a `devDependency`. It never touches your production code path.

## Features

- **Automatic N+1 detection** from repeated query shapes.
- **Query budgets** you assert in tests with `assertQueryCount(fn, { max })`.
- **ORM-agnostic** through thin adapters. Your tests read the same no matter the ORM.
- **Vitest and Jest matchers**: `await expect(fn).toHaveNoNPlusOne()`.
- **Readable diagnostics**: the exact query shape, how many times, and which budget it broke.
- **Zero production footprint**: dev-only, no runtime middleware, no agent, no dashboard to host.

## ORM support

| ORM | Status |
| --- | --- |
| Drizzle | ✅ supported (reference adapter) |
| Prisma | ✅ supported |
| Kysely | 🛠 planned |
| TypeORM | 🛠 planned |
| Sequelize | 🛠 planned |

Adapters are tiny. Contributing a new one is the easiest way to help, see the [roadmap](./ROADMAP.md).

## How it works

1. An ORM adapter (a logger or a query-event hook) reports each SQL statement into the active measurement scope, tracked with Node's `AsyncLocalStorage`.
2. queryward normalizes each statement into a structural fingerprint, stripping literal values so `WHERE id = 1` and `WHERE id = 2` collapse to the same shape.
3. A shape repeated past a threshold is an N+1. A total over your budget fails the assertion, with a diagnostic that points straight at the offending query.

## API

```ts
measureQueries(fn): Promise<QueryReport>            // { count, queries, shapes, nPlusOne }
assertQueryCount(fn, { max }): Promise<QueryReport>
assertNoNPlusOne(fn, { threshold? }): Promise<QueryReport>
```

Adapters: `queryward/drizzle` (`querywardLogger`), `queryward/prisma` (`attachPrisma`). Matchers: `import "queryward/vitest"`.

## Roadmap

CI query-budget mode (`queryward snapshot` and `queryward check`), Jest matchers, more ORM adapters, EXPLAIN-based full-scan detection, and the first npm release. Full list in [ROADMAP.md](./ROADMAP.md).

## Contributing

Issues and pull requests are welcome, especially new ORM adapters. Get started with `npm install` then `npm test`.

## Acknowledgements

Standing on the shoulders of [bullet](https://github.com/flyerhzm/bullet), prosopite, and nplusone, which proved how valuable a test-time N+1 net can be.

## License

[MIT](./LICENSE) © Yeongjun Yoo

# Roadmap

Target: 2026 오픈소스 개발자대회 출품 (2026-08-27). 설계 출처는 vault
`submissions/2026-오픈소스-개발자대회/06 queryward 마스터 설계 (라운드3).md`.

## MVP (by 2026-08-27)
- [x] Core: AsyncLocalStorage query collector (`recordQuery`, `collect`)
- [x] Fingerprint normalization (strip literals, collapse IN lists)
- [x] N+1 detection (same-shape repeats >= threshold)
- [x] Assertion API: `measureQueries`, `assertQueryCount`, `assertNoNPlusOne`
- [x] Drizzle adapter (reference, synchronous logger)
- [x] Prisma adapter (`$on('query')`)
- [x] Vitest matchers (`toHaveQueryCount`, `toHaveNoNPlusOne`)
- [ ] Jest matchers (share `expect.extend` impl)
- [x] CI budget mode: `queryward snapshot` / `queryward check` (.queryward/budgets.json)
- [ ] Whitelist / ignore rules
- [x] Human-readable diagnostics with call-site + fix hint (include/with)
- [ ] Build pipeline (tsup -> dist), wire `exports` to dist, publish 0.1.0
- [ ] Example app + 3-minute demo (before/after)

## Mentoring phase (2026-09-18 ~ 10-09)
- [ ] Kysely / TypeORM / Sequelize adapters
- [ ] Prisma driver-adapter interception (parallel-safe scoping)
- [ ] EXPLAIN-based full-scan detection
- [ ] GitHub Actions annotations / reporter / dashboard
- [ ] Real SQL parser for sturdier fingerprinting

## Known risks (see 마스터 설계 R3)
- Prisma `$on('query')` is async and loses the caller stack; the Drizzle adapter
  is the parallel-safe reference. (Prisma extension breaks `$on`, issue #23108.)
- Fingerprint false positives: keep the threshold conservative and combine with
  call-site identity; dogfood on a real app.

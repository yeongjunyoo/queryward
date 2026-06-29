import { defineConfig } from "tsup";

/**
 * Dual ESM + CJS build with type declarations. Entry names are kept stable so
 * they line up with the `exports` map in package.json (e.g. `./drizzle` ->
 * dist/adapters/drizzle.*). `shims` injects import.meta.url for the CJS output
 * (diagnose.ts and cli.ts read it).
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/drizzle": "src/adapters/drizzle.ts",
    "adapters/prisma": "src/adapters/prisma.ts",
    "matchers/vitest": "src/matchers/vitest.ts",
    cli: "src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  shims: true,
  target: "node18",
  // Consumers bring their own vitest (optional peer); never bundle it.
  external: ["vitest"],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});

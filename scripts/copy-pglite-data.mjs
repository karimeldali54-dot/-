import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundled = join(root, ".vercel/output/functions/__server.func/_libs/electric-sql__pglite.mjs");
const dist = join(root, "node_modules/@electric-sql/pglite/dist");
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];
if (!existsSync(bundled)) {
  console.log("[pglite] server bundle has no embedded postgres");
} else {
  for (const name of files) {
    const from = join(dist, name);
    if (!existsSync(from)) continue;
    copyFileSync(from, join(dirname(bundled), name));
  }
  console.log("[pglite] copied postgres assets next to the server bundle");
}

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = "/workspace";
const dest = join(root, "mobile/www");
const candidates = [
  join(root, ".vercel/output/static"),
  join(root, ".output/public"),
  join(root, "dist/client"),
  join(root, "dist"),
];

function hasIndex(dir) {
  return existsSync(join(dir, "index.html"));
}

const source = candidates.find(hasIndex);
if (!source) {
  console.error("No mobile index.html. Run MOBILE_BUILD=1 npm run build first.");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(source, dest, { recursive: true });
for (const name of readdirSync(dest)) {
  if (name.endsWith(".apk")) rmSync(join(dest, name), { force: true });
}

const publicDir = join(root, "public");
for (const name of readdirSync(publicDir)) {
  if (name === "__grok" || name.endsWith(".apk")) continue;
  const from = join(publicDir, name);
  const to = join(dest, name);
  if (existsSync(to) && statSync(from).isDirectory()) continue;
  cpSync(from, to, { recursive: true });
}

console.log(`mobile web root: ${source}`);

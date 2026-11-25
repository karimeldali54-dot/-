import { spawnSync } from "node:child_process";

const result = spawnSync("python3", ["/workspace/scripts/android-icons.py"], { stdio: "inherit" });
process.exit(result.status ?? 1);

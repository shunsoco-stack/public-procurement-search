import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const local = path.resolve(".cache/gitleaks/gitleaks.exe");
const binary = process.env.GITLEAKS_PATH ?? (process.platform === "win32" && existsSync(local) ? local : "gitleaks");
const staged = process.argv.includes("--staged");
const args = ["git", ".", "--redact", "--no-banner", "--no-color", ...(staged ? ["--staged"] : [])];
const result = spawnSync(binary, args, { stdio: "inherit", shell: false });
if (result.error) {
  console.error("公式Gitleaksをインストールするか GITLEAKS_PATH を指定してください。README参照。");
  process.exit(2);
}
process.exit(result.status ?? 2);

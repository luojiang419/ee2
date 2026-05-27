import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    shell: process.platform === "win32",
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv
    }
  });
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveSigningKeyContent() {
  if (process.env.TAURI_SIGNING_PRIVATE_KEY) {
    return null;
  }

  const candidates = [
    process.env.TAURI_SIGNING_PRIVATE_KEY_PATH,
    process.env.EE2X_TAURI_UPDATER_KEY_PATH,
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, ".tauri", "ee2x-updater.key")
      : null,
    process.env.HOME ? path.join(process.env.HOME, ".tauri", "ee2x-updater.key") : null
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return {
        keyPath: candidate,
        keyContent: fs.readFileSync(candidate, "utf-8")
      };
    }
  }
  throw new Error(
    "未找到 Tauri updater 私钥。请设置 TAURI_SIGNING_PRIVATE_KEY，或将私钥放到 ~/.tauri/ee2x-updater.key。"
  );
}

const signingKey = resolveSigningKeyContent();

if (signingKey) {
  console.log(`使用本地 updater 私钥: ${signingKey.keyPath}`);
}

run(npmCommand, ["run", "bump:version"]);
run(
  npmCommand,
  ["exec", "tauri", "build"],
  signingKey
    ? {
        TAURI_SIGNING_PRIVATE_KEY: signingKey.keyContent,
        ...(process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
          ? {
              TAURI_SIGNING_PRIVATE_KEY_PASSWORD:
                process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
            }
          : {})
      }
    : {}
);

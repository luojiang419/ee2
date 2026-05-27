import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const outputDir = path.join(projectRoot, "output");

function run(command, args, extraEnv = {}, { allowFailure = false } = {}) {
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
  if (!allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
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
      const raw = fs.readFileSync(candidate, "utf-8").trim();
      let keyContent = raw;
      if (!raw.startsWith("untrusted comment:")) {
        try {
          const decoded = Buffer.from(raw, "base64").toString("utf-8").trim();
          if (decoded.startsWith("untrusted comment:")) {
            keyContent = decoded;
          }
        } catch {
          // keep original content; Tauri will report if the key is invalid
        }
      }
      return {
        keyPath: candidate,
        keyContent: `${keyContent}\n`
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

function readPackageVersion() {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return String(packageJson.version).trim();
}

function resolvePythonExe() {
  const candidates = [
    process.env.EE2X_PYTHON_EXE,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs", "Python", "Python312", "python.exe")
      : null,
    "python.exe"
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-c", "print('ok')"], {
      cwd: projectRoot,
      shell: process.platform === "win32",
      encoding: "utf-8"
    });
    if (result.status === 0) {
      return candidate;
    }
  }

  throw new Error("未找到可用的 Python 解释器，无法为 updater 包生成 .sig。");
}

function artifactPaths(version) {
  const bundleDir = path.join(projectRoot, "src-tauri", "target", "release", "bundle", "nsis");
  return {
    bundleDir,
    setupExe: path.join(bundleDir, `EE2X魔改版启动器_${version}_x64-setup.exe`),
    updaterZip: path.join(bundleDir, `EE2X魔改版启动器_${version}_x64-setup.nsis.zip`),
    updaterSig: path.join(bundleDir, `EE2X魔改版启动器_${version}_x64-setup.nsis.zip.sig`)
  };
}

function signUpdaterArtifact(version) {
  const pythonExe = resolvePythonExe();
  const { updaterZip, updaterSig } = artifactPaths(version);
  if (!fs.existsSync(updaterZip)) {
    throw new Error(`未找到 updater 包: ${updaterZip}`);
  }

  const keyPath = path.join(os.tmpdir(), `ee2x-updater-key-${process.pid}.txt`);
  const scriptPath = path.join(os.tmpdir(), `ee2x-updater-sign-${process.pid}.py`);
  fs.writeFileSync(keyPath, signingKey.keyContent, "utf-8");
  fs.writeFileSync(
    scriptPath,
    [
      "from pathlib import Path",
      "import sys",
      "import minisign",
      "",
      "key_path = Path(sys.argv[1])",
      "zip_path = Path(sys.argv[2])",
      "sig_path = Path(sys.argv[3])",
      "sk = minisign.SecretKey.from_file(key_path)",
      "sk.decrypt('')",
      "sig = sk.sign_file(zip_path, prehash=False)",
      "sig_path.write_bytes(bytes(sig))"
    ].join("\n"),
    "utf-8"
  );

  try {
    run(
      pythonExe,
      [scriptPath, keyPath, updaterZip, updaterSig],
      {},
      { allowFailure: false }
    );
  } finally {
    fs.rmSync(keyPath, { force: true });
    fs.rmSync(scriptPath, { force: true });
  }
}

function syncReleaseArtifacts(version) {
  const { setupExe, updaterZip, updaterSig } = artifactPaths(version);
  fs.mkdirSync(outputDir, { recursive: true });

  const artifacts = [
    [setupExe, path.join(outputDir, path.basename(setupExe))],
    [updaterZip, path.join(outputDir, path.basename(updaterZip))],
    [updaterSig, path.join(outputDir, path.basename(updaterSig))]
  ];

  for (const [source, target] of artifacts) {
    if (!fs.existsSync(source)) {
      throw new Error(`构建产物缺失: ${source}`);
    }
    fs.copyFileSync(source, target);
    console.log(`已同步到 output: ${target}`);
  }
}

run(npmCommand, ["run", "bump:version"]);
const buildResult = run(
  npmCommand,
  ["exec", "tauri", "build"],
  {},
  { allowFailure: true }
);

const version = readPackageVersion();
signUpdaterArtifact(version);
syncReleaseArtifacts(version);

if (buildResult.status !== 0) {
  console.log("Tauri 内置 updater 签名未完成，已改用本地 Python minisign 补签。");
}

import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

const packageJsonPath = path.join(projectRoot, "package.json");
const packageLockPath = path.join(projectRoot, "package-lock.json");
const tauriConfigPath = path.join(projectRoot, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(projectRoot, "src-tauri", "Cargo.toml");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) {
    throw new Error(`不支持的版本号格式: ${version}`);
  }
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

function replaceCargoVersion(cargoToml, nextVersion) {
  const replaced = cargoToml.replace(
    /^version = "(\d+\.\d+\.\d+)"$/m,
    `version = "${nextVersion}"`
  );
  if (replaced === cargoToml) {
    throw new Error("Cargo.toml 中未找到可替换的 version 字段");
  }
  return replaced;
}

const packageJson = readJson(packageJsonPath);
const currentVersion = packageJson.version;
const nextVersion = bumpPatch(currentVersion);

packageJson.version = nextVersion;
writeJson(packageJsonPath, packageJson);

const packageLock = readJson(packageLockPath);
packageLock.version = nextVersion;
if (packageLock.packages?.[""]) {
  packageLock.packages[""].version = nextVersion;
}
writeJson(packageLockPath, packageLock);

const tauriConfig = readJson(tauriConfigPath);
tauriConfig.version = nextVersion;
writeJson(tauriConfigPath, tauriConfig);

const cargoToml = fs.readFileSync(cargoTomlPath, "utf-8");
fs.writeFileSync(
  cargoTomlPath,
  replaceCargoVersion(cargoToml, nextVersion),
  "utf-8"
);

console.log(`EE2X魔改版启动器版本号已递增: ${currentVersion} -> ${nextVersion}`);

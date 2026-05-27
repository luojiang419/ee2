import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const bundleDirDefault = path.join(projectRoot, "src-tauri", "target", "release", "bundle", "nsis");
const packageJsonPath = path.join(projectRoot, "package.json");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function readPackageVersion() {
  const payload = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return String(payload.version || "").trim();
}

function readNotes(args) {
  if (args["notes-file"]) {
    return fs.readFileSync(path.resolve(projectRoot, args["notes-file"]), "utf8").trim();
  }
  if (args.notes) {
    return String(args.notes).trim();
  }
  return "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickLatestArtifact(bundleDir, version, patterns) {
  const entries = fs
    .readdirSync(bundleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = path.join(bundleDir, entry.name);
      return {
        name: entry.name,
        path: filePath,
        stat: fs.statSync(filePath)
      };
    });

  for (const pattern of patterns) {
    const matched = entries
      .filter((entry) => pattern.test(entry.name))
      .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
    const preferred = matched.find((entry) => entry.name.includes(version));
    if (preferred) {
      return preferred.path;
    }
    if (matched[0]) {
      return matched[0].path;
    }
  }

  throw new Error(`未在 ${bundleDir} 找到匹配版本 ${version} 的构建产物。`);
}

function basicAuth(username, password) {
  return Buffer.from(`${username}:${password}`, "utf8").toString("base64");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const version = String(args.version || readPackageVersion()).trim();
  const notes = readNotes(args);
  const baseUrl = String(
    args["base-url"] || process.env.EE2X_LAUNCHER_UPDATE_BASE_URL || "http://115.231.35.105:3011"
  ).replace(/\/+$/, "");
  const username = String(
    args.username || process.env.EE2X_LAUNCHER_UPDATE_USERNAME || "ee2x"
  );
  const password = String(
    args.password || process.env.EE2X_LAUNCHER_UPDATE_PASSWORD || "ee2x"
  );
  const bundleDir = path.resolve(projectRoot, args["bundle-dir"] || bundleDirDefault);

  if (!fs.existsSync(bundleDir)) {
    throw new Error(`构建目录不存在: ${bundleDir}`);
  }

  const versionPattern = escapeRegex(version);
  const setupExe = pickLatestArtifact(bundleDir, version, [
    new RegExp(`${versionPattern}.*setup\\.exe$`, "i"),
    /setup\.exe$/i
  ]);
  const updaterPackage = pickLatestArtifact(bundleDir, version, [
    new RegExp(`${versionPattern}.*\\.nsis\\.zip$`, "i"),
    /\.nsis\.zip$/i
  ]);
  const updaterSignature = pickLatestArtifact(bundleDir, version, [
    new RegExp(`${versionPattern}.*\\.nsis\\.zip\\.sig$`, "i"),
    /\.nsis\.zip\.sig$/i
  ]);

  const form = new FormData();
  form.set("version", version);
  form.set("notes", notes);
  form.set("setupExe", new File([fs.readFileSync(setupExe)], path.basename(setupExe)));
  form.set(
    "updaterPackage",
    new File([fs.readFileSync(updaterPackage)], path.basename(updaterPackage))
  );
  form.set(
    "updaterSignature",
    new File([fs.readFileSync(updaterSignature)], path.basename(updaterSignature))
  );

  console.log(`发布版本: ${version}`);
  console.log(`setup.exe: ${setupExe}`);
  console.log(`updater zip: ${updaterPackage}`);
  console.log(`signature: ${updaterSignature}`);
  console.log(`目标后端: ${baseUrl}`);

  const response = await fetch(`${baseUrl}/api/launcher-update/v1/releases/publish`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(username, password)}`
    },
    body: form
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`发布失败(${response.status}): ${text}`);
  }

  console.log(text);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

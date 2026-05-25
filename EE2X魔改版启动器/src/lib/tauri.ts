import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  AppConfig,
  BootstrapState,
  NetworkSnapshot,
  OnlinePlayer,
  UpdateCheckResult,
  UpdateRunResult,
  UpdateStatusEvent,
  UserProfile,
  UserSession
} from "./types";

const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const STORAGE_CONFIG = "ee2x.mock.config";
const STORAGE_USER = "ee2x.mock.user";
const STORAGE_RELEASE = "ee2x.mock.release";
const STORAGE_NETWORK = "ee2x.mock.network";
const MOCK_LATEST_VERSION = "v1.0.17";
const MOCK_CHAIN = ["v1.0.15", "v1.0.16", "v1.0.17"];
const updateListeners = new Set<(event: UpdateStatusEvent) => void>();

const defaultConfig: AppConfig = {
  gameExe: "EE2X.exe",
  gameExePath: "",
  gameDir: "",
  preferredResolution: "1280x800",
  backgroundType: "default",
  backgroundImagePath: "",
  backgroundVideoPath: "",
  backgroundBlur: 0,
  updateChannel: "stable",
  closeAction: "exit",
  networkServer: "81.71.49.16:1666",
  autoConnect: true,
  userServerUrl: "http://115.231.35.105:3001",
  updateServerHttp: "http://115.231.35.105:3010",
  updateServerWs: "ws://115.231.35.105:3010/api/update/v1/channels/stable/ws",
  matchmakingUrl: "http://115.231.35.105:4002/matchmaking"
};

interface MockReleaseState {
  launcherVersion: string;
  gameVersion: string;
}

interface MockNetworkState {
  connected: boolean;
  virtualIp: string;
  adapterName: string;
  txTotalBytes: number;
  rxTotalBytes: number;
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function emitMockUpdate(event: UpdateStatusEvent) {
  updateListeners.forEach((listener) => listener(event));
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function loadMockConfig() {
  const raw = loadStored<Partial<AppConfig>>(STORAGE_CONFIG, {});
  const config: AppConfig = {
    ...defaultConfig,
    ...raw,
    backgroundType:
      raw.backgroundType === "image" || raw.backgroundType === "video"
        ? raw.backgroundType
        : "default",
    backgroundImagePath:
      typeof raw.backgroundImagePath === "string" ? raw.backgroundImagePath : "",
    backgroundVideoPath:
      typeof raw.backgroundVideoPath === "string" ? raw.backgroundVideoPath : ""
  };
  config.backgroundBlur =
    typeof raw.backgroundBlur === "number" && Number.isFinite(raw.backgroundBlur)
      ? Math.max(0, Math.min(24, raw.backgroundBlur))
      : 0;
  if (config.backgroundImagePath.startsWith("blob:")) {
    config.backgroundImagePath = "";
  }
  if (config.backgroundVideoPath.startsWith("blob:")) {
    config.backgroundVideoPath = "";
  }
  return config;
}

function saveMockConfig(config: AppConfig) {
  saveStored(STORAGE_CONFIG, config);
  return config;
}

function loadMockUser() {
  return loadStored<UserSession | null>(STORAGE_USER, null);
}

function saveMockUser(user: UserSession | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!user) {
    window.localStorage.removeItem(STORAGE_USER);
    return;
  }
  saveStored(STORAGE_USER, user);
}

function loadMockRelease() {
  return loadStored<MockReleaseState>(STORAGE_RELEASE, {
    launcherVersion: "v1.0.15",
    gameVersion: "v1.0.15"
  });
}

function saveMockRelease(release: MockReleaseState) {
  saveStored(STORAGE_RELEASE, release);
}

function loadMockNetwork() {
  return loadStored<MockNetworkState>(STORAGE_NETWORK, {
    connected: false,
    virtualIp: "10.26.8.23",
    adapterName: "Wintun Userspace Tunnel",
    txTotalBytes: 2_450_000,
    rxTotalBytes: 8_600_000
  });
}

function saveMockNetwork(network: MockNetworkState) {
  saveStored(STORAGE_NETWORK, network);
}

function validateMockGamePath(path: string) {
  const normalized = path.trim();
  const valid = normalized.length > 0 && /empire earth ii/i.test(normalized);
  return {
    valid,
    gameDir: valid ? normalized : "",
    gameExePath: valid ? `${normalized}\\EE2X.exe` : "",
    markers: valid ? ["UnofficialVersionConfig.txt", "zips_ee2x"] : [],
    reason: valid ? "ok" : "missing-root-markers"
  };
}

function buildMockBootstrap(): BootstrapState {
  const config = loadMockConfig();
  const release = loadMockRelease();
  return {
    config,
    user: loadMockUser(),
    gamePath: validateMockGamePath(config.gameDir),
    launcherVersion: release.launcherVersion,
    installDir: "浏览器预览模式"
  };
}

function buildMockProfile(session: UserSession): UserProfile {
  return {
    id: 1,
    username: session.username,
    avatar: session.avatar,
    registerTime: "2026-05-25T12:00:00.000Z",
    lastLogin: session.loginTime,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    totalRuntimeSeconds: 18_640,
    ip: "",
    signature: "浏览器预览用户",
    combatPower: 96,
    rankTier: "14",
    rankWins: 188,
    partial: false,
    notice: ""
  };
}

function buildMockPlayers() {
  const base: OnlinePlayer[] = [
    {
      username: "江凯绅",
      avatar: "",
      combatPower: 98,
      rankTier: "14",
      wins: 162,
      losses: 53,
      lastLogin: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
      lastSeen: new Date().toISOString(),
      totalRuntimeSeconds: 23_000
    },
    {
      username: "001",
      avatar: "",
      combatPower: 92,
      rankTier: "13",
      wins: 113,
      losses: 47,
      lastLogin: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      lastSeen: new Date().toISOString(),
      totalRuntimeSeconds: 18_000
    },
    {
      username: "玩家A",
      avatar: "",
      combatPower: 74,
      rankTier: "11",
      wins: 63,
      losses: 41,
      lastLogin: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
      lastSeen: new Date().toISOString(),
      totalRuntimeSeconds: 8_300
    },
    {
      username: "玩家B",
      avatar: "",
      combatPower: 57,
      rankTier: "9",
      wins: 31,
      losses: 30,
      lastLogin: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      lastSeen: new Date().toISOString(),
      totalRuntimeSeconds: 3_100
    }
  ];

  const session = loadMockUser();
  if (session) {
    base.unshift({
      username: session.username,
      avatar: session.avatar,
      combatPower: 96,
      rankTier: "14",
      wins: 188,
      losses: 52,
      lastLogin: session.loginTime,
      lastSeen: new Date().toISOString(),
      totalRuntimeSeconds: 18_640
    });
  }

  return base.sort((a, b) => b.combatPower - a.combatPower);
}

function buildMockUpdateInfo(force: boolean): UpdateCheckResult {
  const release = loadMockRelease();
  const currentLauncherVersion = release.launcherVersion;
  const currentGameVersion = release.gameVersion;
  const startIndex = force
    ? 0
    : Math.max(0, MOCK_CHAIN.indexOf(currentGameVersion) + 1);
  const chainVersions =
    currentGameVersion === MOCK_LATEST_VERSION && !force
      ? []
      : MOCK_CHAIN.slice(startIndex);

  return {
    currentLauncherVersion,
    currentGameVersion,
    latestVersion: MOCK_LATEST_VERSION,
    chainVersions,
    hasLauncherUpdate: currentLauncherVersion !== MOCK_LATEST_VERSION,
    hasGameUpdate: currentGameVersion !== MOCK_LATEST_VERSION,
    canUpdate: true,
    notes: isTauriRuntime ? [] : ["当前为浏览器预览模式，更新流程为模拟演示。"]
  };
}

async function mockRunUpdate(force: boolean): Promise<UpdateRunResult> {
  const chain = buildMockUpdateInfo(force).chainVersions;
  const steps = chain.length
    ? chain
    : [MOCK_LATEST_VERSION];

  let progress = 10;
  for (const version of steps) {
    emitMockUpdate({
      stage: "下载",
      message: `正在下载 ${version}`,
      progress,
      version
    });
    await sleep(240);
    progress += 18;

    emitMockUpdate({
      stage: "校验",
      message: `正在校验 ${version}`,
      progress,
      version
    });
    await sleep(180);
    progress += 12;

    emitMockUpdate({
      stage: "应用",
      message: `正在应用 ${version}`,
      progress,
      version
    });
    await sleep(260);
    progress += 20;
  }

  saveMockRelease({
    launcherVersion: MOCK_LATEST_VERSION,
    gameVersion: MOCK_LATEST_VERSION
  });

  emitMockUpdate({
    stage: "完成",
    message: `更新完成，当前版本 ${MOCK_LATEST_VERSION}`,
    progress: 100,
    version: MOCK_LATEST_VERSION
  });

  return {
    ok: true,
    targetVersion: MOCK_LATEST_VERSION,
    appliedVersions: steps,
    restartRequired: false,
    launcherStageReady: false,
    message: "浏览器预览模式不会自动重启，桌面端会在完成后自动重启。",
    notes: ["已模拟链式更新完成。"]
  };
}

export async function pickGameDirectoryDialog() {
  if (isTauriRuntime) {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择 Empire Earth II 游戏根目录"
    });
    return typeof selected === "string" ? selected : null;
  }

  const fallback = window.prompt(
    "请输入 Empire Earth II 游戏根目录路径",
    "G:\\ee2\\Empire Earth II"
  );
  return fallback ? fallback.trim() : null;
}

function pickBrowserMedia(kind: "image" | "video") {
  return new Promise<string | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "image" ? "image/*" : "video/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (kind === "image") {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } else {
        resolve(URL.createObjectURL(file));
      }
    };
    input.click();
  });
}

export async function pickBackgroundMedia(kind: "image" | "video") {
  if (isTauriRuntime) {
    const selected = await open({
      multiple: false,
      filters: [
        kind === "image"
          ? {
              name: "图片",
              extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"]
            }
          : {
              name: "视频",
              extensions: ["mp4", "webm", "mov", "mkv"]
            }
      ]
    });
    if (typeof selected !== "string") {
      return null;
    }
    return invoke<string>("import_background_media", { path: selected, kind });
  }
  return pickBrowserMedia(kind);
}

export function resolveBackgroundSource(path: string) {
  if (!path) {
    return "";
  }
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  if (isTauriRuntime) {
    return convertFileSrc(path);
  }
  return "";
}

export async function bootstrapState(): Promise<BootstrapState> {
  if (isTauriRuntime) {
    return invoke("bootstrap_state");
  }
  return buildMockBootstrap();
}

export async function saveConfig(config: AppConfig): Promise<AppConfig> {
  if (isTauriRuntime) {
    return invoke("save_config", { config });
  }
  return saveMockConfig(config);
}

export async function setGameDirectory(path: string) {
  if (isTauriRuntime) {
    return invoke<BootstrapState>("set_game_directory", { path });
  }
  const status = validateMockGamePath(path);
  if (!status.valid) {
    throw new Error("未检测到完整的游戏根目录，请确认路径中包含 Empire Earth II。");
  }
  const nextConfig = {
    ...loadMockConfig(),
    gameDir: status.gameDir,
    gameExePath: status.gameExePath,
    gameExe: "EE2X.exe"
  };
  saveMockConfig(nextConfig);
  return buildMockBootstrap();
}

export async function startGame() {
  if (isTauriRuntime) {
    return invoke<{ ok: boolean; error?: string }>("start_game");
  }
  return { ok: true };
}

export async function authLogin(username: string, _password: string) {
  if (isTauriRuntime) {
    return invoke<UserSession>("auth_login", { username, password: _password });
  }
  if (!username.trim()) {
    throw new Error("用户名不能为空");
  }
  const user = {
    username: username.trim(),
    avatar: "",
    token: `mock-token-${username.trim()}`,
    loginTime: new Date().toISOString()
  };
  saveMockUser(user);
  return user;
}

export async function authRegister(username: string, _password: string) {
  if (isTauriRuntime) {
    return invoke<UserSession>("auth_register", { username, password: _password });
  }
  return authLogin(username, _password);
}

export async function authLogout() {
  if (isTauriRuntime) {
    return invoke("auth_logout");
  }
  const network = loadMockNetwork();
  saveMockNetwork({ ...network, connected: false });
  saveMockUser(null);
  return true;
}

export async function getProfile() {
  if (isTauriRuntime) {
    return invoke<UserProfile>("get_profile");
  }
  const session = loadMockUser();
  if (!session) {
    throw new Error("当前未登录");
  }
  return buildMockProfile(session);
}

export async function fetchOnlinePlayers() {
  if (isTauriRuntime) {
    return invoke<OnlinePlayer[]>("fetch_online_players");
  }
  return buildMockPlayers();
}

export async function ensureNetwork() {
  if (isTauriRuntime) {
    return invoke<NetworkSnapshot>("ensure_network");
  }
  const session = loadMockUser();
  if (!session) {
    throw new Error("未登录，不能连接联机网络");
  }
  const next = {
    ...loadMockNetwork(),
    connected: true
  };
  saveMockNetwork(next);
  return networkStatus();
}

export async function stopNetwork() {
  if (isTauriRuntime) {
    return invoke("stop_network");
  }
  saveMockNetwork({ ...loadMockNetwork(), connected: false });
  return true;
}

export async function networkStatus() {
  if (isTauriRuntime) {
    return invoke<NetworkSnapshot>("network_status");
  }
  const session = loadMockUser();
  const state = loadMockNetwork();
  if (!session) {
    return {
      connected: false,
      status: "未登录",
      mode: "TUN",
      virtualIp: "",
      adapterName: "",
      txTotalBytes: null,
      rxTotalBytes: null,
      txFallbackBps: 0,
      rxFallbackBps: 0
    };
  }

  if (!state.connected) {
    return {
      connected: false,
      status: "未启动",
      mode: "TUN",
      virtualIp: "",
      adapterName: state.adapterName,
      txTotalBytes: null,
      rxTotalBytes: null,
      txFallbackBps: 0,
      rxFallbackBps: 0
    };
  }

  const next = {
    ...state,
    txTotalBytes: state.txTotalBytes + 55_000 + Math.floor(Math.random() * 25_000),
    rxTotalBytes: state.rxTotalBytes + 110_000 + Math.floor(Math.random() * 60_000)
  };
  saveMockNetwork(next);

  return {
    connected: true,
    status: "TUN已连接",
    mode: "TUN",
    virtualIp: next.virtualIp,
    adapterName: next.adapterName,
    txTotalBytes: next.txTotalBytes,
    rxTotalBytes: next.rxTotalBytes,
    txFallbackBps: 66_000,
    rxFallbackBps: 148_000
  };
}

export async function reportOnline(virtualIp: string) {
  if (isTauriRuntime) {
    return invoke("report_online", { virtualIp });
  }
  saveMockNetwork({
    ...loadMockNetwork(),
    connected: true,
    virtualIp
  });
  return true;
}

export async function checkUpdates(force: boolean) {
  if (isTauriRuntime) {
    return invoke<UpdateCheckResult>("check_updates", { force });
  }
  return buildMockUpdateInfo(force);
}

export async function runUpdate(force: boolean) {
  if (isTauriRuntime) {
    return invoke<UpdateRunResult>("run_update", { force });
  }
  return mockRunUpdate(force);
}

export async function finalizeUpdateRestart() {
  if (isTauriRuntime) {
    return invoke("finalize_update_restart");
  }
  return true;
}

export async function restartSelf() {
  if (isTauriRuntime) {
    return invoke("restart_self");
  }
  return true;
}

export async function openMatchmaking() {
  if (isTauriRuntime) {
    return invoke("open_matchmaking");
  }
  window.open(defaultConfig.matchmakingUrl, "_blank", "noopener,noreferrer");
  return true;
}

export async function openConfigDirectory() {
  if (isTauriRuntime) {
    return invoke("open_config_directory");
  }
  return true;
}

export async function listenUpdateStatus(
  cb: (event: UpdateStatusEvent) => void
) {
  if (isTauriRuntime) {
    return listen<UpdateStatusEvent>("update-status", (event) => cb(event.payload));
  }

  updateListeners.add(cb);
  return () => {
    updateListeners.delete(cb);
  };
}

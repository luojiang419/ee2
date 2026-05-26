import { LogicalSize } from "@tauri-apps/api/dpi";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  authLogin,
  authLogout,
  authRegister,
  bootstrapState,
  checkUpdates,
  ensureNetwork,
  fetchOnlinePlayers,
  getAutostartEnabled,
  getProfile,
  isTauriRuntime,
  listenUpdateStatus,
  networkStatus,
  openConfigDirectory,
  openMatchmaking,
  pickBackgroundMedia,
  pickGameDirectoryDialog,
  reportOnline,
  resolveBackgroundSource,
  runUpdate,
  saveConfig,
  setAutostartEnabled as saveAutostartEnabled,
  setGameDirectory,
  startGame,
  stopNetwork
} from "./lib/tauri";
import type {
  AppConfig,
  BootstrapState,
  CloseAction,
  NetworkSnapshot,
  OnlinePlayer,
  PageId,
  RegisterPayload,
  UpdateCheckResult,
  UpdateRunResult,
  UpdateStatusEvent,
  UserProfile,
  UserSession
} from "./lib/types";

const RESOLUTION_OPTIONS = [
  "1024x768",
  "1280x720",
  "1280x800",
  "1366x768",
  "1600x900",
  "1920x1080"
];

const APP_DESIGN_WIDTH = 1600;
const APP_DESIGN_HEIGHT = 960;
type OnboardingStep = "pickGameDir" | "auth" | null;
type FirstRunWizardStep = "pickDir" | "update" | "auth" | null;
type AuthMode = "login" | "register";
type StartupUpdateState = "checking" | "updating" | "error" | null;

const emptyNetwork: NetworkSnapshot = {
  connected: false,
  status: "未连接",
  mode: "TUN",
  virtualIp: "",
  adapterName: "",
  txTotalBytes: null,
  rxTotalBytes: null,
  txFallbackBps: null,
  rxFallbackBps: null
};

function formatBytesPerSec(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB/s`;
  }
  return `${(bytes / 1024).toFixed(0)} KB/s`;
}

function formatDurationFrom(startIso: string, now: number) {
  const start = Date.parse(startIso);
  if (Number.isNaN(start)) {
    return "--:--:--";
  }
  const total = Math.max(0, Math.floor((now - start) / 1000));
  const hours = Math.floor(total / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function computeWinRate(player: OnlinePlayer) {
  const total = player.wins + player.losses;
  if (total <= 0) {
    return "0%";
  }
  return `${Math.round((player.wins / total) * 100)}%`;
}

function getAvatarUrl(src: string) {
  if (src && /^https?:\/\//i.test(src)) {
    return src;
  }
  if (src && src.startsWith("/avatars/")) {
    return `http://115.231.35.105:3001${src}`;
  }
  if (src) {
    return src;
  }
  return "";
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [boot, setBoot] = useState<BootstrapState | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [network, setNetwork] = useState<NetworkSnapshot>(emptyNetwork);
  const [txSpeed, setTxSpeed] = useState(0);
  const [rxSpeed, setRxSpeed] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateEvents, setUpdateEvents] = useState<UpdateStatusEvent[]>([]);
  const [updateRunning, setUpdateRunning] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateRunResult | null>(null);
  const [firstRunWizardStep, setFirstRunWizardStep] = useState<FirstRunWizardStep>(null);
  const [startupUpdateState, setStartupUpdateState] = useState<StartupUpdateState>(null);
  const [startupUpdateError, setStartupUpdateError] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [autostartInitialEnabled, setAutostartInitialEnabled] = useState<boolean | null>(null);
  const [autostartReady, setAutostartReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", password: "", avatar: "" });
  const [uiScale, setUiScale] = useState(() => {
    if (typeof window === "undefined") {
      return 1;
    }
    return Math.min(
      1,
      window.innerWidth / APP_DESIGN_WIDTH,
      window.innerHeight / APP_DESIGN_HEIGHT
    );
  });

  const startupUpdateCheckedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const speedRef = useRef<{ tx: number | null; rx: number | null; at: number }>({
    tx: null,
    rx: null,
    at: 0
  });
  const reportRef = useRef(0);
  const lastMinimizedRef = useRef(false);
  const registerAvatarInputRef = useRef<HTMLInputElement | null>(null);

  const boardPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.combatPower - a.combatPower).slice(0, 8);
  }, [players]);

  function resolveOnboardingStep(nextBoot: BootstrapState | null, nextSession: UserSession | null): OnboardingStep {
    if (!nextBoot) {
      return null;
    }
    if (!nextBoot.gamePath.valid) {
      return "pickGameDir";
    }
    if (!nextSession) {
      return "auth";
    }
    return null;
  }

  function resolveFirstRunWizardStep(
    nextBoot: BootstrapState | null,
    nextSession: UserSession | null
  ): FirstRunWizardStep {
    if (!nextBoot) {
      return null;
    }
    if (nextBoot.config.setupPendingAuth && !nextSession) {
      return "auth";
    }
    if (nextBoot.config.setupCompleted) {
      return null;
    }
    if (!nextBoot.gamePath.valid) {
      return "pickDir";
    }
    return "update";
  }

  function hasPendingUpdate(info: UpdateCheckResult | null) {
    return Boolean(info && (info.hasGameUpdate || info.hasLauncherUpdate));
  }

  function resolveAuthTabClass(mode: AuthMode, current: AuthMode) {
    return current === mode ? "auth-tab auth-tab-active" : "auth-tab auth-tab-inactive";
  }

  function parsePreferredResolution(value: string) {
    const [widthText, heightText] = value.split("x");
    const width = Number(widthText);
    const height = Number(heightText);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }
    return { width, height };
  }

  async function applyPreferredResolutionToWindow(value: string) {
    if (!isTauriRuntime) {
      return;
    }
    const parsed = parsePreferredResolution(value);
    if (!parsed) {
      return;
    }
    const currentWindow = getCurrentWindow();
    await currentWindow.setSize(new LogicalSize(parsed.width, parsed.height));
    await currentWindow.center();
  }

  function resetRegisterForm() {
    setRegisterForm({ username: "", password: "", avatar: "" });
    if (registerAvatarInputRef.current) {
      registerAvatarInputRef.current.value = "";
    }
  }

  async function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error ?? new Error("读取头像失败"));
      reader.readAsDataURL(file);
    });
  }

  async function refreshBootstrap() {
    const payload = await bootstrapState();
    const nextFirstRunWizardStep = resolveFirstRunWizardStep(payload, payload.user);
    const nextOnboardingStep =
      nextFirstRunWizardStep === null
        ? resolveOnboardingStep(payload, payload.user)
        : null;
    setBoot(payload);
    setConfig(payload.config);
    setSession(payload.user);
    setFirstRunWizardStep(nextFirstRunWizardStep);
    if (nextOnboardingStep === "auth") {
      setAuthMode("login");
    }
    setOnboardingStep(nextOnboardingStep);
    return payload;
  }

  async function refreshProfile() {
    setProfileLoading(true);
    try {
      const nextProfile = await getProfile();
      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }

  function isAuthInvalidError(error: unknown) {
    return String(error).startsWith("AUTH_INVALID:");
  }

  async function clearInvalidSession() {
    try {
      await authLogout();
    } catch {
      // ignore remote/logout transport failure; local session still needs clearing
    }
    setErrorMessage("登录状态已失效，请重新登录。");
    setProfile(null);
    setSession(null);
    setProfileOpen(false);
    setNetwork(emptyNetwork);
    setTxSpeed(0);
    setRxSpeed(0);
    setAuthMode("login");
    await refreshBootstrap();
  }

  async function refreshPlayers() {
    try {
      const nextPlayers = await fetchOnlinePlayers();
      setPlayers(nextPlayers);
    } catch (error) {
      console.error("fetch_online_players failed", error);
    }
  }

  async function refreshUpdateInfo(force: boolean) {
    try {
      const info = await checkUpdates(force);
      setUpdateInfo(info);
      return info;
    } catch (error) {
      console.error("check_updates failed", error);
      return null;
    }
  }

  async function saveSetupFlags(setupCompleted: boolean, setupPendingAuth: boolean) {
    if (!config) {
      return null;
    }
    const saved = await saveConfig({
      ...config,
      setupCompleted,
      setupPendingAuth
    });
    setConfig(saved);
    setBoot((current) => (current ? { ...current, config: saved } : current));
    return saved;
  }

  async function pollNetwork() {
    try {
      const snapshot = await networkStatus();
      setNetwork(snapshot);
      const now = Date.now();
      if (snapshot.txTotalBytes != null && snapshot.rxTotalBytes != null) {
        const previous = speedRef.current;
        if (previous.tx != null && previous.rx != null && previous.at > 0) {
          const seconds = Math.max(1, (now - previous.at) / 1000);
          setTxSpeed(Math.max(0, (snapshot.txTotalBytes - previous.tx) / seconds));
          setRxSpeed(Math.max(0, (snapshot.rxTotalBytes - previous.rx) / seconds));
        }
        speedRef.current = {
          tx: snapshot.txTotalBytes,
          rx: snapshot.rxTotalBytes,
          at: now
        };
      } else {
        setTxSpeed(snapshot.txFallbackBps ?? 0);
        setRxSpeed(snapshot.rxFallbackBps ?? 0);
      }

      if (snapshot.connected && snapshot.virtualIp && now - reportRef.current > 10000) {
        reportRef.current = now;
        void reportOnline(snapshot.virtualIp);
      }
    } catch (error) {
      console.error("network_status failed", error);
      setNetwork(emptyNetwork);
      setTxSpeed(0);
      setRxSpeed(0);
    }
  }

  async function handlePickGameDirectory() {
    setErrorMessage("");
    const selected = await pickGameDirectoryDialog();
    if (!selected) {
      return;
    }
    try {
      setBusyMessage("正在校验游戏目录...");
      const next = await setGameDirectory(selected);
      const nextFirstRunWizardStep = resolveFirstRunWizardStep(next, session);
      const nextOnboardingStep =
        nextFirstRunWizardStep === null
          ? resolveOnboardingStep(next, session)
          : null;
      setBoot(next);
      setConfig(next.config);
      setFirstRunWizardStep(nextFirstRunWizardStep);
      if (nextOnboardingStep === "auth") {
        setAuthMode("login");
      }
      setOnboardingStep(nextOnboardingStep);
      if (firstRunWizardStep === "pickDir") {
        await runFirstRunWizardUpdate(next);
      } else if (onboardingStep === "pickGameDir") {
        startupUpdateCheckedRef.current = false;
        await enforceStartupUpdate(next);
      }
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setBusyMessage("");
    }
  }

  async function handleSaveSettings() {
    if (!config) {
      return;
    }
    try {
      setBusyMessage("正在保存设置...");
      const saved = await saveConfig(config);
      await applyPreferredResolutionToWindow(saved.preferredResolution);
      if (
        autostartReady &&
        autostartInitialEnabled !== null &&
        autostartEnabled !== autostartInitialEnabled
      ) {
        await saveAutostartEnabled(autostartEnabled);
      }
      setConfig(saved);
      setAutostartInitialEnabled(autostartEnabled);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(String(error));
      try {
        const actualAutostart = await getAutostartEnabled();
        setAutostartEnabled(actualAutostart);
        setAutostartInitialEnabled(actualAutostart);
      } catch {
        // ignore autostart refresh failure after save failure
      }
    } finally {
      setBusyMessage("");
    }
  }

  function closeUpdateResultAndReturnHome() {
    setUpdateResult(null);
    setActivePage("home");
  }

  async function handleLogin() {
    try {
      setBusyMessage("正在登录...");
      await authLogin(loginForm.username, loginForm.password);
      if (config?.setupPendingAuth) {
        await saveSetupFlags(true, false);
      }
      setLoginForm({ username: "", password: "" });
      await refreshBootstrap();
      await refreshPlayers();
      await refreshProfile();
      await ensureNetwork();
      setFirstRunWizardStep(null);
      setOnboardingStep(null);
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setBusyMessage("");
    }
  }

  async function handlePickRegisterAvatar(file: File | null) {
    if (!file) {
      setRegisterForm((current) => ({ ...current, avatar: "" }));
      return;
    }
    try {
      const avatar = await fileToDataUrl(file);
      setRegisterForm((current) => ({ ...current, avatar }));
    } catch (error) {
      setErrorMessage(String(error));
    }
  }

  async function handleRegister() {
    try {
      setBusyMessage("正在注册...");
      const payload: RegisterPayload = {
        username: registerForm.username,
        password: registerForm.password,
        avatar: registerForm.avatar
      };
      await authRegister(payload);
      if (config?.setupPendingAuth) {
        await saveSetupFlags(true, false);
      }
      resetRegisterForm();
      await refreshBootstrap();
      await refreshPlayers();
      await refreshProfile();
      await ensureNetwork();
      setFirstRunWizardStep(null);
      setOnboardingStep(null);
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setBusyMessage("");
    }
  }

  async function handleLogout() {
    try {
      await stopNetwork();
      await authLogout();
      setProfile(null);
      setProfileOpen(false);
      setNetwork(emptyNetwork);
      setTxSpeed(0);
      setRxSpeed(0);
      setAuthMode("login");
      await refreshBootstrap();
    } catch (error) {
      setErrorMessage(String(error));
    }
  }

  async function handleStartGame() {
    try {
      setBusyMessage("正在启动游戏...");
      const result = await startGame();
      if (!result.ok) {
        setErrorMessage(result.error ?? "启动游戏失败");
      }
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setBusyMessage("");
    }
  }

  async function executeUpdate(force: boolean, showResultModal = true) {
    if (updateRunning) {
      return null;
    }
    setUpdateEvents([]);
    if (showResultModal) {
      setUpdateResult(null);
    }
    setUpdateRunning(true);
    setBusyMessage(force ? "正在执行强制更新..." : "正在检查并应用更新...");
    try {
      const result = await runUpdate(force);
      if (showResultModal) {
        setUpdateResult(result);
      }
      await refreshUpdateInfo(false);
      return result;
    } catch (error) {
      setErrorMessage(String(error));
      return null;
    } finally {
      setBusyMessage("");
      setUpdateRunning(false);
    }
  }

  async function handleRunUpdate(force: boolean) {
    const result = await executeUpdate(force, true);
    return result;
  }

  async function runFirstRunWizardUpdate(payload?: BootstrapState) {
    const currentBoot = payload ?? boot;
    if (!currentBoot?.gamePath.valid) {
      setFirstRunWizardStep("pickDir");
      return false;
    }

    setFirstRunWizardStep("update");
    setStartupUpdateError("");
    setStartupUpdateState("checking");
    const info = await refreshUpdateInfo(false);
    if (!info) {
      setStartupUpdateError("首次启动检查更新失败，请重试。");
      setStartupUpdateState("error");
      return false;
    }

    if (hasPendingUpdate(info)) {
      setStartupUpdateState("updating");
      const result = await executeUpdate(true, false);
      if (!result?.ok) {
        setStartupUpdateError("首次启动强制更新失败，请重试。");
        setStartupUpdateState("error");
        return false;
      }
    }

    await saveSetupFlags(true, true);
    setStartupUpdateState(null);
    setFirstRunWizardStep("auth");
    setAuthMode("login");
    return true;
  }

  async function enforceStartupUpdate(payload?: BootstrapState) {
    const currentBoot = payload ?? boot;
    if (!currentBoot?.gamePath.valid || startupUpdateCheckedRef.current) {
      return true;
    }

    startupUpdateCheckedRef.current = true;
    setStartupUpdateError("");
    setStartupUpdateState("checking");

    const info = await refreshUpdateInfo(false);
    if (!info) {
      startupUpdateCheckedRef.current = false;
      setStartupUpdateError("启动时检查更新失败，请重试。");
      setStartupUpdateState("error");
      return false;
    }

    if (!hasPendingUpdate(info)) {
      setStartupUpdateState(null);
      return true;
    }

    setStartupUpdateState("updating");
    const result = await executeUpdate(false, false);
    if (!result?.ok) {
      startupUpdateCheckedRef.current = false;
      setStartupUpdateError("更新同步失败，请重试。");
      setStartupUpdateState("error");
      return false;
    }

    setStartupUpdateState(null);
    return true;
  }

  useEffect(() => {
    void (async () => {
      try {
        const payload = await refreshBootstrap();
        const firstRunStep = resolveFirstRunWizardStep(payload, payload.user);
        if (firstRunStep === "pickDir" || firstRunStep === "auth") {
          return;
        }
        if (firstRunStep === "update") {
          await runFirstRunWizardUpdate(payload);
          return;
        }
        const startupUpdatePassed = await enforceStartupUpdate(payload);
        if (!startupUpdatePassed) {
          return;
        }
        await refreshPlayers();
        if (payload.user) {
          try {
            await refreshProfile();
          } catch (error) {
            if (isAuthInvalidError(error)) {
              await clearInvalidSession();
              return;
            }
            setErrorMessage(String(error));
          }
          try {
            await ensureNetwork();
          } catch (error) {
            setErrorMessage(String(error));
          }
        }
      } catch (error) {
        setErrorMessage(String(error));
      }
    })();

    const clockTimer = window.setInterval(() => setClock(Date.now()), 1000);
    const playersTimer = window.setInterval(() => {
      void refreshPlayers();
    }, 15000);
    const networkTimer = window.setInterval(() => {
      void pollNetwork();
    }, 1000);

    let unlisten: (() => void) | undefined;
    void listenUpdateStatus((payload) => {
      setUpdateEvents((current) => [...current.slice(-59), payload]);
    }).then((dispose) => {
      unlisten = dispose;
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (unlisten) {
        unlisten();
      }
      window.clearInterval(clockTimer);
      window.clearInterval(playersTimer);
      window.clearInterval(networkTimer);
    };
  }, []);

  useEffect(() => {
    if (!config) {
      return;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    try {
      const ws = new WebSocket(config.updateServerWs);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "update_available" && boot?.gamePath.valid) {
            void handleRunUpdate(false);
          }
        } catch (error) {
          console.error("ws parse failed", error);
        }
      };
      wsRef.current = ws;
    } catch (error) {
      console.error("ws init failed", error);
    }
  }, [boot?.gamePath.valid, config]);

  const resolvedVersion =
    updateInfo?.currentLauncherVersion || boot?.launcherVersion || "v1.0.0";
  const backgroundImageSrc =
    config?.backgroundType === "image"
      ? resolveBackgroundSource(config.backgroundImagePath)
      : "";
  const backgroundVideoSrc =
    config?.backgroundType === "video"
      ? resolveBackgroundSource(config.backgroundVideoPath)
      : "";

  async function handlePickBackground(kind: "image" | "video") {
    const selected = await pickBackgroundMedia(kind);
    if (!selected) {
      return;
    }
    setConfig((current) =>
      current
        ? {
            ...current,
            backgroundType: kind,
            backgroundImagePath:
              kind === "image" ? selected : current.backgroundImagePath,
            backgroundVideoPath:
              kind === "video" ? selected : current.backgroundVideoPath
          }
        : current
    );
  }

  function handleResetBackground() {
    setConfig((current) =>
      current
        ? {
            ...current,
            backgroundType: "default"
          }
        : current
    );
  }

  useEffect(() => {
    if (!profileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [profileOpen]);

  useEffect(() => {
    if (!updateResult) {
      return;
    }
    const timer = window.setTimeout(() => {
      closeUpdateResultAndReturnHome();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [updateResult]);

  useEffect(() => {
    if (!updateResult) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeUpdateResultAndReturnHome();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [updateResult]);

  useEffect(() => {
    if (!profileOpen || !session || profile) {
      return;
    }
    void refreshProfile().catch(async (error) => {
      if (isAuthInvalidError(error)) {
        await clearInvalidSession();
      }
    });
  }, [profile, profileOpen, session]);

  useEffect(() => {
    const handleResize = () => {
      setUiScale(
        Math.min(
          1,
          window.innerWidth / APP_DESIGN_WIDTH,
          window.innerHeight / APP_DESIGN_HEIGHT
        )
      );
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    void getAutostartEnabled()
      .then((enabled) => {
        setAutostartEnabled(enabled);
        setAutostartInitialEnabled(enabled);
      })
      .catch((error) => {
        console.error("get_autostart_enabled failed", error);
      })
      .finally(() => {
        setAutostartReady(true);
      });
  }, []);

  useEffect(() => {
    if (!isTauriRuntime || !config) {
      return;
    }
    const currentWindow = getCurrentWindow();
    let active = true;

    const pollMinimizedState = async () => {
      try {
        const minimized = await currentWindow.isMinimized();
        if (
          active &&
          config.closeAction === "minimize" &&
          minimized &&
          !lastMinimizedRef.current
        ) {
          await currentWindow.hide();
        }
        lastMinimizedRef.current = minimized;
      } catch (error) {
        if (active) {
          console.error("is_minimized poll failed", error);
        }
      }
    };

    void pollMinimizedState();
    const timer = window.setInterval(() => {
      void pollMinimizedState();
    }, 500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [config]);

  const backgroundBlur = Math.max(0, Math.min(24, config?.backgroundBlur ?? 0));
  const isHome = activePage === "home";
  const isFirstRunWizardActive = firstRunWizardStep !== null;
  const viewportStyle = {
    "--ui-scale": String(uiScale),
    "--background-blur": `${backgroundBlur}px`
  } as CSSProperties;

  return (
    <div className={`app-viewport ${isHome ? "home-mode" : ""}`} style={viewportStyle}>
      {backgroundImageSrc || backgroundVideoSrc ? (
        <div className="background-media">
          {backgroundImageSrc ? (
            <img alt="" className="background-image" src={backgroundImageSrc} />
          ) : null}
          {backgroundVideoSrc ? (
            <video
              autoPlay
              className="background-video"
              key={backgroundVideoSrc}
              loop
              muted
              playsInline
              src={backgroundVideoSrc}
            />
          ) : null}
        </div>
      ) : null}
      <div className="background-layer" />
      <div className="app-stage">
      <div className="app-shell">
      {isFirstRunWizardActive ? (
        <div className="wizard-shell">
          <div className="wizard-panel glass">
            <div className="wizard-eyebrow">安装后首次启动向导</div>
            {firstRunWizardStep === "pickDir" ? (
              <>
                <div className="wizard-title">选择魔改版游戏目录</div>
                <div className="wizard-copy">
                  请先选择 Empire Earth II 魔改版游戏目录。你也可以直接选择它的上层目录，启动器会自动向下查找真正的游戏根目录。
                </div>
                <div className="wizard-copy wizard-copy-subtle">
                  启动器会自动识别 EE2X.exe / EE2.exe，以及 UnofficialVersionConfig.txt、zips_ee2x、Unofficial Patch Files 等根目录标记。
                </div>
                <div className="wizard-actions-bottom">
                  <button className="picker-button wizard-primary" onClick={() => void handlePickGameDirectory()} type="button">
                    选择魔改版游戏目录
                  </button>
                </div>
              </>
            ) : null}
            {firstRunWizardStep === "update" ? (
              <>
                <div className="wizard-title">同步到最新版本</div>
                <div className="wizard-copy">
                  为避免玩家版本不统一，首次启动必须先执行一次强制更新，确认游戏文件与服务器最新版本保持一致。
                </div>
              {startupUpdateState === "checking" ? (
                <div className="profile-note">正在检查可用更新，请稍候...</div>
              ) : null}
              {startupUpdateState === "updating" ? (
                <div className="log-panel glass-lite startup-update-log">
                    {updateEvents.length === 0 ? (
                      <div className="board-empty">正在准备更新任务...</div>
                    ) : (
                      updateEvents.map((event, index) => (
                        <div className="log-line" key={`first-run-${event.stage}-${index}`}>
                          <span className="log-stage">{event.stage}</span>
                          <span className="log-message">{event.message}</span>
                          <span className="log-progress">{Math.round(event.progress)}%</span>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
                {startupUpdateState === "error" ? (
                  <>
                    <div className="profile-note">
                      {startupUpdateError || "首次启动强制更新失败，请重试。"}
                    </div>
                    <div className="wizard-actions-bottom">
                      <button className="mini-action primary-glow" onClick={() => void runFirstRunWizardUpdate()} type="button">
                        重试强制更新
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
            {firstRunWizardStep === "auth" ? (
              <>
                <div className="wizard-title">登录后进入启动器</div>
                <div className="wizard-copy wizard-copy-subtle">
                  游戏目录与版本同步已完成。请先登录或注册账号，完成后将自动进入正常启动器界面。
                </div>
                <div className="wizard-auth-card glass-lite">
                  <div className="auth-mode-switch wizard-auth-switch">
                    <button
                      className={resolveAuthTabClass("login", authMode)}
                      onClick={() => setAuthMode("login")}
                      type="button"
                    >
                      登录
                    </button>
                    <button
                      className={resolveAuthTabClass("register", authMode)}
                      onClick={() => setAuthMode("register")}
                      type="button"
                    >
                      注册
                    </button>
                  </div>
                  <div className="modal-body wizard-auth-body">
                    {authMode === "login" ? (
                      <>
                        <input
                          placeholder="用户名"
                          value={loginForm.username}
                          onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                        />
                        <input
                          placeholder="密码"
                          type="password"
                          value={loginForm.password}
                          onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                        />
                      </>
                    ) : (
                      <>
                        <div className="register-avatar-block">
                          <input
                            ref={registerAvatarInputRef}
                            accept="image/*"
                            className="avatar-file-input"
                            type="file"
                            onChange={(event) =>
                              void handlePickRegisterAvatar(event.target.files?.[0] ?? null)
                            }
                          />
                          <div className="register-avatar-preview-shell">
                            {registerForm.avatar ? (
                              <img
                                alt="注册头像预览"
                                className="register-avatar-preview"
                                src={registerForm.avatar}
                              />
                            ) : (
                              <div className="register-avatar-empty">头像</div>
                            )}
                            <button
                              className="mini-action mini-secondary register-avatar-button"
                              onClick={() => registerAvatarInputRef.current?.click()}
                              type="button"
                            >
                              选择头像
                            </button>
                          </div>
                        </div>
                        <input
                          placeholder="用户名"
                          value={registerForm.username}
                          onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))}
                        />
                        <input
                          placeholder="密码"
                          type="password"
                          value={registerForm.password}
                          onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                        />
                      </>
                    )}
                  </div>
                  <div className="wizard-actions-bottom">
                    {authMode === "login" ? (
                      <button className="mini-action primary-glow wizard-submit" onClick={() => void handleLogin()} type="button">
                        登录账号
                      </button>
                    ) : (
                      <button className="mini-action primary-glow wizard-submit" onClick={() => void handleRegister()} type="button">
                        注册并进入软件
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <>
      <header className="topbar glass">
        <div className="brand-block">
          <div className="brand-mark">EE2X</div>
          <div>
            <div className="brand-title">EE2X魔改版启动器</div>
            <div className="brand-subtitle">TUN 联机 / 历史链式更新 / 独立安装</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="net-strip glass-lite">
            <span className={`dot ${network.connected ? "online" : "offline"}`} />
            <span>网络</span>
            <span className="speed-label">↑ {formatBytesPerSec(txSpeed)}</span>
            <span className="speed-label">↓ {formatBytesPerSec(rxSpeed)}</span>
          </div>
          <div className="version-pill glass-lite">{`版本 ${resolvedVersion}`}</div>
          {session ? (
            <button
              className="user-pill glass-lite interactive"
              onClick={() => setProfileOpen(true)}
              type="button"
            >
              <img
                alt={session.username}
                className="avatar"
                src={
                  getAvatarUrl(session.avatar) ||
                  `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(session.username)}`
                }
              />
              <span>{session.username}</span>
            </button>
          ) : (
            <div className="auth-actions">
              <button
                className="mini-action"
                onClick={() => {
                  setAuthMode("login");
                  setOnboardingStep("auth");
                }}
                type="button"
              >
                登录
              </button>
              <button
                className="mini-action mini-secondary"
                onClick={() => {
                  setAuthMode("register");
                  setOnboardingStep("auth");
                }}
                type="button"
              >
                注册
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={`main-grid ${isHome ? "main-grid-home" : "main-grid-page"}`}>
        {isHome ? (
        <section className="player-board glass">
          <div className="board-header">
            <div>
              <div className="section-title">在线玩家</div>
              <div className="section-subtitle">{players.length} 人在线</div>
            </div>
            <button className="text-button" onClick={() => setActivePage("players")} type="button">
              全部
            </button>
          </div>
          <div className="board-table">
            <div className="board-row board-head">
              <span>昵称</span>
              <span>战力</span>
              <span>等级</span>
              <span>在线时长</span>
            </div>
            {boardPlayers.map((player) => (
              <div className="board-row" key={player.username}>
                <span className="name-cell">{player.username}</span>
                <span>{player.combatPower}</span>
                <span>{player.rankTier || "-"}</span>
                <span>{formatDurationFrom(player.lastLogin, clock)}</span>
              </div>
            ))}
            {boardPlayers.length === 0 ? (
              <div className="board-empty">暂无在线玩家</div>
            ) : null}
          </div>
          <div className="board-footer">
            <button className="mini-action" onClick={() => void refreshPlayers()} type="button">
              刷新
            </button>
            <button className="mini-action mini-secondary" onClick={() => void openMatchmaking()} type="button">
              组队匹配
            </button>
          </div>
          {boot?.gamePath.valid ? (
            <div className="path-strip">
              <span className="path-label">路径:</span>
              <span className="path-value">{boot.gamePath.gameDir}</span>
              <button className="path-button" onClick={() => void handlePickGameDirectory()} type="button">
                更换路径
              </button>
            </div>
          ) : null}
        </section>
        ) : null}

        <section className={`content-shell ${activePage === "home" ? "home-layout" : "page-layout"}`}>
          {activePage === "home" ? (
            <>
              <div className="home-stage glass">
                <div className="state-cluster">
                  <div className="home-main-fill" />
                  <div className="action-stack">
                    <div className="summary-block compact-status">
                      <span className={`dot ${network.connected ? "online" : "offline"}`} />
                      <div>
                        <div className="summary-title">联机状态</div>
                        <div className="summary-value">
                          {session ? network.status : "登录后可联机"}
                        </div>
                      </div>
                    </div>
                    <button
                      className="stack-action"
                      onClick={() => {
                        setActivePage("updates");
                        void handleRunUpdate(true);
                      }}
                      type="button"
                    >
                      一键更新
                    </button>
                    <button className="stack-action" onClick={() => setActivePage("settings")} type="button">
                      游戏设置
                    </button>
                    <button
                      className={`start-button ${boot?.gamePath.valid ? "" : "disabled"}`}
                      disabled={!boot?.gamePath.valid}
                      onClick={() => void handleStartGame()}
                      type="button"
                    >
                      开始游戏
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activePage === "players" ? (
            <section className="page-card glass">
              <div className="page-header">
                <div>
                  <div className="section-title">在线玩家列表</div>
                  <div className="section-subtitle">按战力从高到低排列</div>
                </div>
                <div className="page-actions">
                  <button className="mini-action" onClick={() => void refreshPlayers()} type="button">
                    刷新
                  </button>
                  <button className="mini-action mini-secondary" onClick={() => setActivePage("home")} type="button">
                    返回首页
                  </button>
                </div>
              </div>
              <div className="players-table glass-lite">
                <div className="players-head">
                  <span>玩家</span>
                  <span>战力</span>
                  <span>等级</span>
                  <span>胜率</span>
                  <span>在线时长</span>
                </div>
                {players
                  .slice()
                  .sort((a, b) => b.combatPower - a.combatPower)
                  .map((player) => (
                    <div className="players-row" key={player.username}>
                      <span className="players-user">
                        <img
                          alt={player.username}
                          className="avatar"
                          src={
                            getAvatarUrl(player.avatar) ||
                            `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(player.username)}`
                          }
                        />
                        {player.username}
                      </span>
                      <span>{player.combatPower}</span>
                      <span>{player.rankTier || "-"}</span>
                      <span>{computeWinRate(player)}</span>
                      <span>{formatDurationFrom(player.lastLogin, clock)}</span>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          {activePage === "updates" ? (
            <section className="page-card glass">
              <div className="page-header">
                <div>
                  <div className="section-title">更新中心</div>
                  <div className="section-subtitle">启动即检查，收到推送后自动执行链式更新</div>
                </div>
                <div className="page-actions">
                  <button className="mini-action" onClick={() => void refreshUpdateInfo(false)} type="button">
                    检查更新
                  </button>
                  <button className="mini-action mini-secondary" onClick={() => setActivePage("home")} type="button">
                    返回首页
                  </button>
                </div>
              </div>
              <div className="update-meta">
                <div className="summary-block glass-lite">
                  <div>
                    <div className="summary-title">当前启动器版本</div>
                    <div className="summary-value">{updateInfo?.currentLauncherVersion || resolvedVersion}</div>
                  </div>
                </div>
                <div className="summary-block glass-lite">
                  <div>
                    <div className="summary-title">最新版本</div>
                    <div className="summary-value">{updateInfo?.latestVersion || "-"}</div>
                  </div>
                </div>
                <div className="summary-block glass-lite">
                  <div>
                    <div className="summary-title">游戏版本链</div>
                    <div className="summary-value">
                      {updateInfo?.chainVersions.length ? updateInfo.chainVersions.join(" → ") : "已是最新"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="update-actions-row">
                <button
                  className="mini-action primary-glow"
                  disabled={updateRunning || !boot?.gamePath.valid}
                  onClick={() => void handleRunUpdate(true)}
                  type="button"
                >
                  一键强制更新
                </button>
                <button
                  className="mini-action"
                  disabled={updateRunning}
                  onClick={() => void handleRunUpdate(false)}
                  type="button"
                >
                  自动更新当前游戏版本链
                </button>
              </div>
              <div className="log-panel glass-lite">
                {updateEvents.length === 0 ? (
                  <div className="board-empty">等待更新事件...</div>
                ) : (
                  updateEvents.map((event, index) => (
                    <div className="log-line" key={`${event.stage}-${index}`}>
                      <span className="log-stage">{event.stage}</span>
                      <span className="log-message">{event.message}</span>
                      <span className="log-progress">{Math.round(event.progress)}%</span>
                    </div>
                  ))
                )}
              </div>
              {updateInfo?.notes?.length ? (
                <div className="notes-panel">
                  {updateInfo.notes.map((note) => (
                    <div key={note} className="note-line">
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {activePage === "settings" ? (
            <section className="page-card glass settings-page">
              <div className="page-header">
                <div>
                  <div className="section-title">游戏设置</div>
                  <div className="section-subtitle">路径、启动参数、更新频道与组网服务器</div>
                </div>
                <div className="page-actions">
                  <button className="mini-action" onClick={() => void handleSaveSettings()} type="button">
                    保存设置
                  </button>
                  <button className="mini-action mini-secondary" onClick={() => setActivePage("home")} type="button">
                    返回首页
                  </button>
                </div>
              </div>
              {config ? (
                <div className="settings-scroll">
                  <div className="settings-grid">
                    <label className="field-card glass-lite">
                      <span>游戏路径</span>
                      <div className="field-inline">
                        <input readOnly value={config.gameDir} />
                        <button className="mini-action" onClick={() => void handlePickGameDirectory()} type="button">
                          浏览
                        </button>
                      </div>
                    </label>
                    <label className="field-card glass-lite">
                      <span>启动程序</span>
                      <input readOnly value={config.gameExe || "EE2X.exe"} />
                    </label>
                    <label className="field-card glass-lite">
                      <span>分辨率</span>
                      <select
                        value={config.preferredResolution}
                        onChange={(event) =>
                          setConfig((current) =>
                            current ? { ...current, preferredResolution: event.target.value } : current
                          )
                        }
                      >
                        {RESOLUTION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-card glass-lite">
                      <span>背景类型</span>
                      <select
                        value={config.backgroundType}
                        onChange={(event) =>
                          setConfig((current) =>
                            current
                              ? {
                                  ...current,
                                  backgroundType: event.target.value as AppConfig["backgroundType"]
                                }
                              : current
                          )
                        }
                      >
                        <option value="default">默认背景</option>
                        <option value="image">背景图片</option>
                        <option value="video">背景视频</option>
                      </select>
                    </label>
                    <label className="field-card glass-lite">
                      <span>{`背景模糊度 ${Math.round(config.backgroundBlur)}px`}</span>
                      <div className="field-range">
                        <input
                          max={24}
                          min={0}
                          step={1}
                          type="range"
                          value={config.backgroundBlur}
                          onChange={(event) =>
                            setConfig((current) =>
                              current
                                ? {
                                    ...current,
                                    backgroundBlur: Number(event.target.value)
                                  }
                                : current
                            )
                          }
                        />
                        <strong>{Math.round(config.backgroundBlur)}px</strong>
                      </div>
                    </label>
                    <div className="field-card glass-lite background-preview-card">
                      <div className="background-preview-header">
                        <span>背景预览</span>
                        <button className="text-button" onClick={handleResetBackground} type="button">
                          恢复默认背景
                        </button>
                      </div>
                      <div className="background-preview-shell">
                        {config.backgroundType === "image" && backgroundImageSrc ? (
                          <img alt="背景图片预览" className="background-preview-media" src={backgroundImageSrc} />
                        ) : null}
                        {config.backgroundType === "video" && backgroundVideoSrc ? (
                          <video
                            autoPlay
                            className="background-preview-media"
                            loop
                            muted
                            playsInline
                            src={backgroundVideoSrc}
                          />
                        ) : null}
                        {config.backgroundType === "default" ||
                        (!backgroundImageSrc && !backgroundVideoSrc) ? (
                          <div className="background-preview-empty">当前使用默认科技背景</div>
                        ) : null}
                      </div>
                    </div>
                    {config.backgroundType === "image" ? (
                      <label className="field-card glass-lite">
                        <span>背景图片</span>
                        <div className="field-inline">
                          <input readOnly value={config.backgroundImagePath} />
                          <button
                            className="mini-action"
                            onClick={() => void handlePickBackground("image")}
                            type="button"
                          >
                            浏览
                          </button>
                        </div>
                      </label>
                    ) : null}
                    {config.backgroundType === "video" ? (
                      <label className="field-card glass-lite">
                        <span>背景视频</span>
                        <div className="field-inline">
                          <input readOnly value={config.backgroundVideoPath} />
                          <button
                            className="mini-action"
                            onClick={() => void handlePickBackground("video")}
                            type="button"
                          >
                            浏览
                          </button>
                        </div>
                      </label>
                    ) : null}
                    <label className="field-card glass-lite">
                      <span>更新频道</span>
                      <input
                        value={config.updateChannel}
                        onChange={(event) =>
                          setConfig((current) =>
                            current ? { ...current, updateChannel: event.target.value } : current
                          )
                        }
                      />
                    </label>
                    <label className="field-card glass-lite">
                      <span>关闭行为</span>
                      <select
                        value={config.closeAction}
                        onChange={(event) =>
                          setConfig((current) =>
                            current
                              ? {
                                  ...current,
                                  closeAction: event.target.value as CloseAction
                                }
                              : current
                          )
                        }
                      >
                        <option value="exit">退出程序</option>
                        <option value="minimize">最小化到托盘</option>
                      </select>
                    </label>
                    <label className="field-card glass-lite">
                      <span>组网服务器</span>
                      <input
                        value={config.networkServer}
                        onChange={(event) =>
                          setConfig((current) =>
                            current ? { ...current, networkServer: event.target.value } : current
                          )
                        }
                      />
                    </label>
                    <label className="field-card glass-lite">
                      <span>自动联机</span>
                      <select
                        value={config.autoConnect ? "on" : "off"}
                        onChange={(event) =>
                          setConfig((current) =>
                            current
                              ? { ...current, autoConnect: event.target.value === "on" }
                              : current
                          )
                        }
                      >
                        <option value="on">开</option>
                        <option value="off">关</option>
                      </select>
                    </label>
                    <label className="field-card glass-lite">
                      <span>开机自启</span>
                      <select
                        disabled={!autostartReady}
                        value={autostartEnabled ? "on" : "off"}
                        onChange={(event) => setAutostartEnabled(event.target.value === "on")}
                      >
                        <option value="on">开</option>
                        <option value="off">关</option>
                      </select>
                    </label>
                    <div className="settings-tools">
                      <button className="mini-action" onClick={() => void openConfigDirectory()} type="button">
                        打开配置目录
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      </main>
      </>
      )}

      {(busyMessage || errorMessage) && (
        <div className="status-bar glass">
          {busyMessage ? <span>{busyMessage}</span> : null}
          {errorMessage ? <span className="error-text">{errorMessage}</span> : null}
          {errorMessage ? (
            <button className="text-button" onClick={() => setErrorMessage("")} type="button">
              关闭
            </button>
          ) : null}
        </div>
      )}

      {startupUpdateState && !isFirstRunWizardActive && (
        <div className="overlay">
          <div className="modal glass onboarding-modal">
            <div className="modal-title">同步游戏版本</div>
            <div className="modal-body onboarding-body">
              <div className="onboarding-copy">
                启动时检测到需要校验或同步游戏版本。为避免玩家版本不统一，当前必须先完成更新后才能继续使用软件。
              </div>
              {startupUpdateState === "checking" ? (
                <div className="profile-note">正在检查更新，请稍候...</div>
              ) : null}
              {startupUpdateState === "updating" ? (
                <div className="log-panel glass-lite startup-update-log">
                  {updateEvents.length === 0 ? (
                    <div className="board-empty">正在准备更新任务...</div>
                  ) : (
                    updateEvents.map((event, index) => (
                      <div className="log-line" key={`startup-${event.stage}-${index}`}>
                        <span className="log-stage">{event.stage}</span>
                        <span className="log-message">{event.message}</span>
                        <span className="log-progress">{Math.round(event.progress)}%</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
              {startupUpdateState === "error" ? (
                <div className="profile-note">
                  {startupUpdateError || "无法完成启动时版本同步，请重试。"}
                </div>
              ) : null}
            </div>
            {startupUpdateState === "error" ? (
              <div className="modal-actions">
                <button className="mini-action primary-glow" onClick={() => void enforceStartupUpdate()} type="button">
                  重试同步
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {onboardingStep === "pickGameDir" && !isFirstRunWizardActive && (
        <div className="overlay">
          <div className="modal glass onboarding-modal">
            <div className="modal-title">选择魔改版游戏目录</div>
            <div className="modal-body onboarding-body">
              <div className="onboarding-copy">
                首次使用必须先选择有效的 Empire Earth II 魔改版根目录。
              </div>
              <div className="onboarding-copy onboarding-copy-subtle">
                目录中需要存在 EE2X.exe 或 EE2.exe，以及 UnofficialVersionConfig.txt、zips_ee2x 等根目录标记。
              </div>
            </div>
            <div className="modal-actions">
              <button className="mini-action primary-glow" onClick={() => void handlePickGameDirectory()} type="button">
                选择魔改版游戏目录
              </button>
            </div>
          </div>
        </div>
      )}

      {onboardingStep === "auth" && !isFirstRunWizardActive && (
        <div className="overlay">
          <div className="modal glass onboarding-modal">
            <div className="modal-title">{authMode === "login" ? "登录账号" : "注册账号"}</div>
            <div className="modal-body onboarding-body">
              <div className="auth-mode-switch">
                <button
                  className={resolveAuthTabClass("login", authMode)}
                  onClick={() => setAuthMode("login")}
                  type="button"
                >
                  登录
                </button>
                <button
                  className={resolveAuthTabClass("register", authMode)}
                  onClick={() => setAuthMode("register")}
                  type="button"
                >
                  注册
                </button>
              </div>
              <div className="onboarding-copy onboarding-copy-subtle">
                目录校验已通过，登录后即可正常使用启动器、联机网络与更新功能。
              </div>
              {authMode === "login" ? (
                <>
                  <input
                    placeholder="用户名"
                    value={loginForm.username}
                    onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                  />
                  <input
                    placeholder="密码"
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </>
              ) : (
                <>
                  <div className="register-avatar-block">
                    <input
                      ref={registerAvatarInputRef}
                      accept="image/*"
                      className="avatar-file-input"
                      type="file"
                      onChange={(event) =>
                        void handlePickRegisterAvatar(event.target.files?.[0] ?? null)
                      }
                    />
                    <div className="register-avatar-preview-shell">
                      {registerForm.avatar ? (
                        <img
                          alt="注册头像预览"
                          className="register-avatar-preview"
                          src={registerForm.avatar}
                        />
                      ) : (
                        <div className="register-avatar-empty">头像</div>
                      )}
                      <button
                        className="mini-action mini-secondary register-avatar-button"
                        onClick={() => registerAvatarInputRef.current?.click()}
                        type="button"
                      >
                        选择头像
                      </button>
                    </div>
                  </div>
                  <input
                    placeholder="用户名"
                    value={registerForm.username}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))}
                  />
                  <input
                    placeholder="密码"
                    type="password"
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </>
              )}
            </div>
            <div className="modal-actions">
              {authMode === "login" ? (
                <button className="mini-action primary-glow" onClick={() => void handleLogin()} type="button">
                  登录账号
                </button>
              ) : (
                <button className="mini-action primary-glow" onClick={() => void handleRegister()} type="button">
                  注册并进入软件
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {profileOpen && session && (
        <div className="overlay" onClick={() => setProfileOpen(false)}>
          <div
            className="modal profile-modal glass"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <img
                alt={session.username}
                className="avatar large"
                src={
                  getAvatarUrl(profile?.avatar || session.avatar) ||
                  `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(session.username)}`
                }
              />
              <div>
                <div className="modal-title profile-title">
                  {profile?.username || session.username}
                </div>
                <div className="section-subtitle">
                  等级 {profile?.rankTier || "-"} · 战力 {profile?.combatPower ?? 0}
                </div>
              </div>
            </div>
            <div className="drawer-grid">
              <div className="glass-lite drawer-item">
                <span>胜场</span>
                <strong>{profile?.rankWins ?? 0}</strong>
              </div>
              <div className="glass-lite drawer-item">
                <span>总在线时长</span>
                <strong>
                  {profile
                    ? formatDurationFrom(
                        new Date(clock - profile.totalRuntimeSeconds * 1000).toISOString(),
                        clock
                      )
                    : "--:--:--"}
                </strong>
              </div>
              <div className="glass-lite drawer-item full">
                <span>个性签名</span>
                <strong>{profile?.signature || "暂无个性签名"}</strong>
              </div>
              <div className="glass-lite drawer-item full">
                <span>注册时间 / 上次登录</span>
                <strong>
                  {(profile?.registerTime || "-") + " / " + (profile?.lastLogin || "-")}
                </strong>
              </div>
            </div>
            {profileLoading ? (
              <div className="profile-note">正在加载个人资料...</div>
            ) : null}
            {profile?.notice ? <div className="profile-note">{profile.notice}</div> : null}
            <div className="drawer-actions">
              <button
                className="mini-action mini-secondary"
                onClick={() => setProfileOpen(false)}
                type="button"
              >
                关闭
              </button>
              <button className="mini-action" onClick={() => void handleLogout()} type="button">
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}

      {updateResult && (
        <div className="overlay">
          <div className="modal glass">
            <div className="modal-title">更新完成</div>
            <div className="modal-body">
              <div>当前游戏版本已同步到 {updateResult.targetVersion}</div>
              <div>共应用 {updateResult.appliedVersions.length} 个游戏版本包</div>
              <div>{updateResult.message}</div>
              <div className="onboarding-copy onboarding-copy-subtle">
                3 秒后自动返回软件首页，或按 `Esc` 立即返回。
              </div>
            </div>
            <div className="modal-actions">
              <button className="mini-action primary-glow" onClick={closeUpdateResultAndReturnHome} type="button">
                返回首页
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

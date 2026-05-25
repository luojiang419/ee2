import { useEffect, useMemo, useRef, useState } from "react";
import {
  authLogin,
  authLogout,
  authRegister,
  bootstrapState,
  checkUpdates,
  ensureNetwork,
  fetchOnlinePlayers,
  finalizeUpdateRestart,
  getProfile,
  listenUpdateStatus,
  networkStatus,
  openConfigDirectory,
  openMatchmaking,
  pickBackgroundMedia,
  pickGameDirectoryDialog,
  reportOnline,
  resolveBackgroundSource,
  restartSelf,
  runUpdate,
  saveConfig,
  setGameDirectory,
  startGame,
  stopNetwork
} from "./lib/tauri";
import type {
  AppConfig,
  BootstrapState,
  NetworkSnapshot,
  OnlinePlayer,
  PageId,
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
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [network, setNetwork] = useState<NetworkSnapshot>(emptyNetwork);
  const [txSpeed, setTxSpeed] = useState(0);
  const [rxSpeed, setRxSpeed] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateEvents, setUpdateEvents] = useState<UpdateStatusEvent[]>([]);
  const [updateRunning, setUpdateRunning] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateRunResult | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", password: "" });

  const autoUpdateCheckedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const speedRef = useRef<{ tx: number | null; rx: number | null; at: number }>({
    tx: null,
    rx: null,
    at: 0
  });
  const reportRef = useRef(0);

  const boardPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.combatPower - a.combatPower).slice(0, 8);
  }, [players]);

  async function refreshBootstrap() {
    const payload = await bootstrapState();
    setBoot(payload);
    setConfig(payload.config);
    setSession(payload.user);
    return payload;
  }

  async function refreshProfile() {
    try {
      const nextProfile = await getProfile();
      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      setProfile(null);
      throw error;
    }
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
      setBoot(next);
      setConfig(next.config);
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
      setConfig(saved);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setBusyMessage("");
    }
  }

  async function handleLogin() {
    try {
      setBusyMessage("正在登录...");
      const user = await authLogin(loginForm.username, loginForm.password);
      setSession(user);
      setLoginOpen(false);
      setLoginForm({ username: "", password: "" });
      await refreshProfile();
      await ensureNetwork();
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setBusyMessage("");
    }
  }

  async function handleRegister() {
    try {
      setBusyMessage("正在注册...");
      const user = await authRegister(registerForm.username, registerForm.password);
      setSession(user);
      setRegisterOpen(false);
      setRegisterForm({ username: "", password: "" });
      await refreshProfile();
      await ensureNetwork();
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
      setSession(null);
      setProfileOpen(false);
      setNetwork(emptyNetwork);
      setTxSpeed(0);
      setRxSpeed(0);
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

  async function handleRunUpdate(force: boolean) {
    if (updateRunning) {
      return;
    }
    setUpdateEvents([]);
    setUpdateResult(null);
    setUpdateRunning(true);
    setBusyMessage(force ? "正在执行强制更新..." : "正在检查并应用更新...");
    try {
      const result = await runUpdate(force);
      setUpdateResult(result);
      await refreshUpdateInfo(false);
      if (result.restartRequired) {
        setTimeout(async () => {
          try {
            await finalizeUpdateRestart();
          } catch (error) {
            setErrorMessage(String(error));
          }
        }, 1800);
      } else if (result.ok) {
        setTimeout(async () => {
          try {
            await restartSelf();
          } catch (error) {
            setErrorMessage(String(error));
          }
        }, 1800);
      }
    } catch (error) {
      setErrorMessage(String(error));
    } finally {
      setBusyMessage("");
      setUpdateRunning(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const payload = await refreshBootstrap();
        await refreshPlayers();
        if (payload.user) {
          try {
            await refreshProfile();
            await ensureNetwork();
          } catch {
            await authLogout();
            setSession(null);
          }
        }
        await refreshUpdateInfo(false);
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

  useEffect(() => {
    if (!boot || autoUpdateCheckedRef.current || updateRunning) {
      return;
    }
    autoUpdateCheckedRef.current = true;
    if (boot.gamePath.valid && updateInfo && (updateInfo.hasGameUpdate || updateInfo.hasLauncherUpdate)) {
      void handleRunUpdate(false);
    }
  }, [boot, updateInfo, updateRunning]);

  const resolvedVersion =
    updateInfo?.currentLauncherVersion || boot?.launcherVersion || "v0.1.0";
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

  return (
    <div className="app-shell">
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
              <button className="mini-action" onClick={() => setLoginOpen(true)} type="button">
                登录
              </button>
              <button
                className="mini-action mini-secondary"
                onClick={() => setRegisterOpen(true)}
                type="button"
              >
                注册
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-grid">
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

        <section className={`content-shell ${activePage === "home" ? "home-layout" : ""}`}>
          {activePage === "home" ? (
            <>
              <div className="home-stage glass">
                {boot?.gamePath.valid ? (
                  <div className="state-cluster">
                    <div className="home-main-fill" />
                    <div className="action-stack">
                      <div className="summary-block compact-status">
                        <span className={`dot ${network.connected ? "online" : "offline"}`} />
                        <div>
                          <div className="summary-title">联机状态</div>
                          <div className="summary-value">
                            {session
                              ? network.connected
                                ? "TUN已连接"
                                : "TUN连接中"
                              : "登录后可联机"}
                          </div>
                        </div>
                      </div>
                      <button
                        className="stack-action"
                        onClick={() => {
                          setActivePage("updates");
                          void refreshUpdateInfo(false);
                        }}
                        type="button"
                      >
                        一键更新
                      </button>
                      <button className="stack-action" onClick={() => setActivePage("settings")} type="button">
                        游戏设置
                      </button>
                      <button className="start-button" onClick={() => void handleStartGame()} type="button">
                        开始游戏
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="picker-stage">
                    <div className="picker-layout">
                      <div className="picker-main">
                        <div className="picker-copy">
                          <div className="picker-title">首次使用需要选择 Empire Earth II 游戏根目录</div>
                          <div className="picker-subtitle">
                            需要检测到 EE2X.exe / EE2.exe 与 UnofficialVersionConfig.txt、zips_ee2x 等根目录标记。
                          </div>
                        </div>
                        <button className="picker-button" onClick={() => void handlePickGameDirectory()} type="button">
                          选择 Empire Earth II 游戏根目录
                        </button>
                      </div>
                      <div className="action-stack">
                        <div className="summary-block compact-status">
                          <span className={`dot ${network.connected ? "online" : "offline"}`} />
                          <div>
                            <div className="summary-title">联机状态</div>
                            <div className="summary-value">{session ? "未连接" : "登录后可联机"}</div>
                          </div>
                        </div>
                        <button
                          className="stack-action"
                          onClick={() => {
                            setActivePage("updates");
                            void refreshUpdateInfo(false);
                          }}
                          type="button"
                        >
                          一键更新
                        </button>
                        <button className="stack-action" onClick={() => setActivePage("settings")} type="button">
                          游戏设置
                        </button>
                        <button className="start-button disabled" disabled type="button">
                          开始游戏
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                    <div className="summary-title">版本链</div>
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
                  自动更新当前版本链
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
            <section className="page-card glass">
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
                          current ? { ...current, closeAction: event.target.value } : current
                        )
                      }
                    >
                      <option value="exit">退出程序</option>
                      <option value="minimize">最小化</option>
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
                  <div className="settings-tools">
                    <button className="mini-action" onClick={() => void openConfigDirectory()} type="button">
                      打开配置目录
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      </main>

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

      {loginOpen && (
        <div className="overlay">
          <div className="modal glass">
            <div className="modal-title">登录</div>
            <div className="modal-body">
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
            </div>
            <div className="modal-actions">
              <button className="mini-action mini-secondary" onClick={() => setLoginOpen(false)} type="button">
                取消
              </button>
              <button className="mini-action primary-glow" onClick={() => void handleLogin()} type="button">
                登录
              </button>
            </div>
          </div>
        </div>
      )}

      {registerOpen && (
        <div className="overlay">
          <div className="modal glass">
            <div className="modal-title">注册</div>
            <div className="modal-body">
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
            </div>
            <div className="modal-actions">
              <button className="mini-action mini-secondary" onClick={() => setRegisterOpen(false)} type="button">
                取消
              </button>
              <button className="mini-action primary-glow" onClick={() => void handleRegister()} type="button">
                注册
              </button>
            </div>
          </div>
        </div>
      )}

      {profileOpen && session && (
        <div className="profile-drawer glass">
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
              <div className="section-title">{profile?.username || session.username}</div>
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
                {profile ? formatDurationFrom(new Date(clock - profile.totalRuntimeSeconds * 1000).toISOString(), clock) : "--:--:--"}
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
          <div className="drawer-actions">
            <button className="mini-action mini-secondary" onClick={() => setProfileOpen(false)} type="button">
              关闭
            </button>
            <button className="mini-action" onClick={() => void handleLogout()} type="button">
              退出登录
            </button>
          </div>
        </div>
      )}

      {updateResult && (
        <div className="overlay">
          <div className="modal glass">
            <div className="modal-title">更新完成</div>
            <div className="modal-body">
              <div>当前版本已更新到 {updateResult.targetVersion}</div>
              <div>共应用 {updateResult.appliedVersions.length} 个版本包</div>
              <div>{updateResult.message}</div>
            </div>
            <div className="modal-actions">
              <button className="mini-action primary-glow" onClick={() => setUpdateResult(null)} type="button">
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

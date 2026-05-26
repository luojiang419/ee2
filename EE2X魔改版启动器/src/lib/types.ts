export type PageId = "home" | "players" | "updates" | "settings";
export type CloseAction = "exit" | "minimize";

export interface AppConfig {
  gameExe: string;
  gameExePath: string;
  gameDir: string;
  setupCompleted: boolean;
  setupPendingAuth: boolean;
  preferredResolution: string;
  backgroundType: "default" | "image" | "video";
  backgroundImagePath: string;
  backgroundVideoPath: string;
  backgroundBlur: number;
  updateChannel: string;
  closeAction: CloseAction;
  networkServer: string;
  autoConnect: boolean;
  userServerUrl: string;
  updateServerHttp: string;
  updateServerWs: string;
  matchmakingUrl: string;
}

export interface UserSession {
  username: string;
  avatar: string;
  token: string;
  loginTime: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  avatar: string;
}

export interface GamePathStatus {
  valid: boolean;
  gameDir: string;
  gameExePath: string;
  markers: string[];
  reason: string;
}

export interface BootstrapState {
  config: AppConfig;
  user: UserSession | null;
  gamePath: GamePathStatus;
  launcherVersion: string;
  installDir: string;
}

export interface UserProfile {
  id: number;
  username: string;
  avatar: string;
  registerTime: string;
  lastLogin: string;
  isOnline: boolean;
  lastSeen: string;
  totalRuntimeSeconds: number;
  ip: string;
  signature: string;
  combatPower: number;
  rankTier: string;
  rankWins: number;
  partial: boolean;
  notice: string;
}

export interface OnlinePlayer {
  username: string;
  avatar: string;
  combatPower: number;
  rankTier: string;
  wins: number;
  losses: number;
  lastLogin: string;
  lastSeen: string;
  totalRuntimeSeconds: number;
}

export interface NetworkSnapshot {
  connected: boolean;
  status: string;
  mode: string;
  virtualIp: string;
  adapterName: string;
  txTotalBytes: number | null;
  rxTotalBytes: number | null;
  txFallbackBps: number | null;
  rxFallbackBps: number | null;
}

export interface UpdateCheckResult {
  currentLauncherVersion: string;
  currentGameVersion: string;
  latestVersion: string;
  chainVersions: string[];
  hasLauncherUpdate: boolean;
  hasGameUpdate: boolean;
  canUpdate: boolean;
  notes: string[];
}

export interface UpdateRunResult {
  ok: boolean;
  targetVersion: string;
  appliedVersions: string[];
  restartRequired: boolean;
  launcherStageReady: boolean;
  message: string;
  notes: string[];
}

export interface UpdateStatusEvent {
  stage: string;
  message: string;
  progress: number;
  version?: string;
}

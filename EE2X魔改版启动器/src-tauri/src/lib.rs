use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Utc;
use futures_util::StreamExt;
use serde::{de::DeserializeOwned, Deserialize, Deserializer, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, VecDeque},
    fmt,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::Duration,
};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalSize, Manager, Runtime, State,
};
use tokio::{net::UdpSocket, time::timeout};
use zip::ZipArchive;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const CONFIG_FILE: &str = "config.json";
const USER_FILE: &str = "user.json";
const DEVICE_ID_FILE: &str = "device-id.txt";
const RELEASE_STATE_FILE: &str = "update/runtime/release-state.json";
const BACKGROUND_DIR: &str = "backgrounds";
const DEFAULT_BACKGROUND_FILE: &str = "default-background.png";
const VNT_DIR: &str = "runtime/vnt";
const VNT_CONFIG_FILE: &str = "runtime/vnt/vnt-tun.yaml";
const VNT_LAUNCH_STATE_FILE: &str = "runtime/vnt/launch-state.json";
const APP_DATA_DIR_OVERRIDE_ENV: &str = "EE2X_LAUNCHER_APPDATA_DIR_OVERRIDE";
const INSTALL_DIR_OVERRIDE_ENV: &str = "EE2X_LAUNCHER_INSTALL_DIR_OVERRIDE";
const MATCHMAKING_URL: &str = "http://115.231.35.105:4002/matchmaking";
const BATTLE_REPORT_URL: &str = "http://115.231.35.105:4002/battle-report";
const DEFAULT_USER_SERVER: &str = "http://115.231.35.105:3001";
const DEFAULT_UPDATE_SERVER: &str = "http://115.231.35.105:3010";
const DEFAULT_UPDATE_WS: &str = "ws://115.231.35.105:3010/api/update/v1/channels/stable/ws";
const DEFAULT_NETWORK_SERVER: &str = "81.71.49.16:1666";
const DEFAULT_BATTLE_API_URL: &str = "http://192.168.0.211:1234/v1/responses";
const DEFAULT_BATTLE_API_MODEL: &str = "qwen3.5-9b-vlm";
const DEFAULT_BATTLE_SUBMIT_URL: &str = "http://115.231.35.105:3001/api/battle/submit";
const DEFAULT_BATTLE_SUBMIT_TOKEN: &str = "ee2x-battle-2026-secure-token";
const DEFAULT_BATTLE_SSH_HOST: &str = "115.231.35.105";
const DEFAULT_BATTLE_SSH_USERNAME: &str = "root";
const DEFAULT_BATTLE_SSH_PASSWORD: &str = "lhsgEMCF0380";
const DEFAULT_BATTLE_SSH_REMOTE_DIR: &str = "/opt/ee2x/ee2x_user-admin/data/game-csv";
const AUTH_INVALID_PREFIX: &str = "AUTH_INVALID:";
const TRAY_ID: &str = "main-tray";
const MENU_SHOW_MAIN_WINDOW: &str = "show-main-window";
const MENU_EXIT_APP: &str = "exit-app";
const MAX_GAME_SEARCH_DEPTH: usize = 6;
const MAX_GAME_SEARCH_DIRS: usize = 2000;
const GAME_MARKERS: &[&str] = &[
    "UnofficialVersionConfig.txt",
    "zips_ee2x",
    "Unofficial Patch Files",
];
const GAME_EXE_CANDIDATES: &[&str] = &["EE2X.exe", "ee2x.exe", "EE2.exe", "Empire Earth II.exe"];

#[derive(Default)]
struct PendingRestartState {
    pending: Mutex<Option<PendingRestart>>,
}

struct PendingRestart {
    script_path: PathBuf,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default, rename_all = "camelCase")]
struct VntLaunchState {
    status: String,
    detail: String,
    updated_at: String,
}

impl Default for VntLaunchState {
    fn default() -> Self {
        Self {
            status: "未启动".into(),
            detail: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default, rename_all = "camelCase")]
struct AppConfig {
    game_exe: String,
    game_exe_path: String,
    game_dir: String,
    setup_completed: bool,
    setup_pending_auth: bool,
    preferred_resolution: String,
    background_type: String,
    background_image_path: String,
    background_video_path: String,
    background_blur: f64,
    update_channel: String,
    close_action: String,
    network_server: String,
    auto_connect: bool,
    user_server_url: String,
    update_server_http: String,
    update_server_ws: String,
    matchmaking_url: String,
    battle_hotkey: String,
    battle_api_url: String,
    battle_api_key: String,
    battle_api_model: String,
    battle_submit_url: String,
    battle_submit_token: String,
    battle_report_url: String,
    battle_ssh_host: String,
    battle_ssh_port: u16,
    battle_ssh_username: String,
    battle_ssh_password: String,
    battle_ssh_remote_dir: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            game_exe: "EE2X.exe".into(),
            game_exe_path: String::new(),
            game_dir: String::new(),
            setup_completed: false,
            setup_pending_auth: false,
            preferred_resolution: "1280x800".into(),
            background_type: "default".into(),
            background_image_path: String::new(),
            background_video_path: String::new(),
            background_blur: 0.0,
            update_channel: "stable".into(),
            close_action: "minimize".into(),
            network_server: DEFAULT_NETWORK_SERVER.into(),
            auto_connect: true,
            user_server_url: DEFAULT_USER_SERVER.into(),
            update_server_http: DEFAULT_UPDATE_SERVER.into(),
            update_server_ws: DEFAULT_UPDATE_WS.into(),
            matchmaking_url: MATCHMAKING_URL.into(),
            battle_hotkey: String::new(),
            battle_api_url: DEFAULT_BATTLE_API_URL.into(),
            battle_api_key: String::new(),
            battle_api_model: DEFAULT_BATTLE_API_MODEL.into(),
            battle_submit_url: DEFAULT_BATTLE_SUBMIT_URL.into(),
            battle_submit_token: DEFAULT_BATTLE_SUBMIT_TOKEN.into(),
            battle_report_url: BATTLE_REPORT_URL.into(),
            battle_ssh_host: DEFAULT_BATTLE_SSH_HOST.into(),
            battle_ssh_port: 22,
            battle_ssh_username: DEFAULT_BATTLE_SSH_USERNAME.into(),
            battle_ssh_password: DEFAULT_BATTLE_SSH_PASSWORD.into(),
            battle_ssh_remote_dir: DEFAULT_BATTLE_SSH_REMOTE_DIR.into(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UserSession {
    username: String,
    avatar: String,
    token: String,
    login_time: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ScopeState {
    version: String,
    package_sha256: String,
    manifest_url: String,
    package_url: String,
    published_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ReleaseState {
    launcher: ScopeState,
    game: ScopeState,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default, rename_all = "camelCase")]
struct BattleRuntimeState {
    status: String,
    message: String,
    shot_path: String,
    csv_path: String,
    submitted_at: String,
    report_url: String,
}

impl Default for BattleRuntimeState {
    fn default() -> Self {
        Self {
            status: "idle".into(),
            message: "尚未执行游戏结算。".into(),
            shot_path: String::new(),
            csv_path: String::new(),
            submitted_at: String::new(),
            report_url: BATTLE_REPORT_URL.into(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BattleCapturePayload {
    shot_path: String,
    image_base64: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BattleSubmitPayload {
    shot_path: String,
    csv_content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BattleRunResult {
    ok: bool,
    message: String,
    shot_path: String,
    csv_path: String,
    submitted_at: String,
    report_url: String,
    duplicate: bool,
    matched: i64,
    unmatched: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GamePathStatus {
    valid: bool,
    game_dir: String,
    game_exe_path: String,
    markers: Vec<String>,
    reason: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BootstrapState {
    config: AppConfig,
    user: Option<UserSession>,
    game_path: GamePathStatus,
    launcher_version: String,
    game_version: String,
    install_dir: String,
    default_background_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UserProfile {
    id: i64,
    username: String,
    avatar: String,
    register_time: String,
    last_login: String,
    is_online: bool,
    last_seen: String,
    total_runtime_seconds: i64,
    ip: String,
    signature: String,
    combat_power: i64,
    rank_tier: String,
    rank_wins: i64,
    partial: bool,
    notice: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OnlinePlayer {
    username: String,
    avatar: String,
    combat_power: i64,
    rank_tier: String,
    wins: i64,
    losses: i64,
    last_login: String,
    last_seen: String,
    total_runtime_seconds: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NetworkSnapshot {
    connected: bool,
    status: String,
    mode: String,
    virtual_ip: String,
    adapter_name: String,
    tx_total_bytes: Option<u64>,
    rx_total_bytes: Option<u64>,
    tx_fallback_bps: Option<f64>,
    rx_fallback_bps: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateCheckResult {
    current_launcher_version: String,
    current_game_version: String,
    latest_version: String,
    chain_versions: Vec<String>,
    has_launcher_update: bool,
    has_game_update: bool,
    can_update: bool,
    notes: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateRunResult {
    ok: bool,
    target_version: String,
    applied_versions: Vec<String>,
    restart_required: bool,
    launcher_stage_ready: bool,
    message: String,
    notes: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateStatusEvent {
    stage: String,
    message: String,
    progress: f32,
    version: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LatestRelease {
    version: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ReleasePackage {
    manifest_url: String,
    package_url: String,
    package_sha256: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct HistoryPayload {
    #[serde(default)]
    history: Vec<HistoryRelease>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct HistoryRelease {
    release_id: String,
    version: String,
    #[serde(default)]
    published_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseManifest {
    root_dir_name: String,
    package_file_name: String,
    package_sha256: String,
    #[serde(default)]
    delete_list: Vec<String>,
    #[serde(default)]
    files: Vec<ManifestFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestFile {
    path: String,
    size: u64,
    sha256: String,
}

#[derive(Debug, Deserialize)]
struct LoginResponse {
    success: bool,
    message: Option<String>,
    user: Option<LoginUser>,
    token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LoginUser {
    username: String,
    #[serde(default)]
    avatar: String,
}

#[derive(Debug, Deserialize)]
struct ProfileResponse {
    success: bool,
    message: Option<String>,
    user: Option<LegacyProfile>,
}

#[derive(Debug, Deserialize)]
struct RuntimeSummaryResponse {
    success: bool,
    #[serde(default)]
    total_seconds: i64,
    #[serde(default)]
    total_starts: i64,
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct LegacyProfile {
    id: i64,
    username: String,
    #[serde(default)]
    avatar: String,
    #[serde(default)]
    register_time: String,
    #[serde(default)]
    last_login: String,
    #[serde(default, deserialize_with = "deserialize_boolish")]
    is_online: bool,
    #[serde(default)]
    last_seen: String,
    #[serde(default)]
    total_runtime_seconds: i64,
    #[serde(default)]
    ip: String,
    #[serde(default)]
    signature: String,
    #[serde(default)]
    combat_power: i64,
    #[serde(default)]
    rank_tier: String,
    #[serde(default)]
    rank_wins: i64,
}

fn deserialize_boolish<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(match value {
        Value::Bool(flag) => flag,
        Value::Number(number) => number.as_i64().unwrap_or(0) != 0,
        Value::String(text) => {
            let lower = text.trim().to_ascii_lowercase();
            matches!(lower.as_str(), "1" | "true" | "yes" | "on")
        }
        _ => false,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum JsonRequestErrorKind {
    AuthInvalid,
    Transport,
    Http,
    Decode,
}

#[derive(Debug)]
struct JsonRequestError {
    kind: JsonRequestErrorKind,
    label: String,
    detail: String,
}

impl JsonRequestError {
    fn new(kind: JsonRequestErrorKind, label: impl Into<String>, detail: impl Into<String>) -> Self {
        Self {
            kind,
            label: label.into(),
            detail: detail.into(),
        }
    }

    fn is_auth_invalid(&self) -> bool {
        self.kind == JsonRequestErrorKind::AuthInvalid
    }
}

impl fmt::Display for JsonRequestError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.is_auth_invalid() {
            write!(f, "{AUTH_INVALID_PREFIX} {}: {}", self.label, self.detail)
        } else {
            write!(f, "{}: {}", self.label, self.detail)
        }
    }
}

impl std::error::Error for JsonRequestError {}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn close_action_is_minimize<R: Runtime>(app: &AppHandle<R>) -> bool {
    load_config(app)
        .map(|config| config.close_action == "minimize")
        .unwrap_or(true)
}

fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    let show_item = MenuItemBuilder::with_id(MENU_SHOW_MAIN_WINDOW, "显示主窗口").build(app)?;
    let exit_item = MenuItemBuilder::with_id(MENU_EXIT_APP, "退出程序").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&exit_item)
        .build()?;

    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("EE2X魔改版启动器")
        .show_menu_on_left_click(false);

    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }

    tray.build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            app.handle().plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None::<Vec<&'static str>>,
            ))?;
            #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
            app.handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            create_tray(&app.handle())?;
            Ok(())
        })
        .manage(PendingRestartState::default())
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_SHOW_MAIN_WINDOW => show_main_window(app),
            MENU_EXIT_APP => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|app, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => show_main_window(app),
            _ => {}
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if close_action_is_minimize(&window.app_handle()) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            bootstrap_state,
            save_config,
            set_game_directory,
            import_background_media,
            start_game,
            auth_login,
            auth_register,
            auth_logout,
            get_profile,
            fetch_online_players,
            ensure_network,
            stop_network,
            network_status,
            report_online,
            check_updates,
            run_update,
            finalize_update_restart,
            restart_self,
            open_matchmaking,
            open_battle_report,
            open_config_directory,
            battle_get_state,
            battle_update_state,
            battle_capture_screenshot,
            battle_store_and_submit,
            exit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn app_data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    if let Some(dir) = std::env::var_os(APP_DATA_DIR_OVERRIDE_ENV).filter(|value| !value.is_empty())
    {
        let path = PathBuf::from(dir);
        fs::create_dir_all(&path)?;
        return Ok(path);
    }
    let dir = app.path().app_data_dir()?;
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn install_dir() -> Result<PathBuf> {
    if let Some(dir) = std::env::var_os(INSTALL_DIR_OVERRIDE_ENV).filter(|value| !value.is_empty())
    {
        let path = PathBuf::from(dir);
        fs::create_dir_all(&path)?;
        return Ok(path);
    }
    let exe = std::env::current_exe()?;
    exe.parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| anyhow!("无法解析启动器安装目录"))
}

fn config_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    Ok(app_data_dir(app)?.join(CONFIG_FILE))
}

fn user_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    Ok(app_data_dir(app)?.join(USER_FILE))
}

fn device_id_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    Ok(app_data_dir(app)?.join(DEVICE_ID_FILE))
}

fn release_state_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    Ok(app_data_dir(app)?.join(RELEASE_STATE_FILE))
}

fn vnt_runtime_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let dir = app_data_dir(app)?.join(VNT_DIR);
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn vnt_config_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let path = app_data_dir(app)?.join(VNT_CONFIG_FILE);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(path)
}

fn vnt_launch_state_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let path = app_data_dir(app)?.join(VNT_LAUNCH_STATE_FILE);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(path)
}

fn update_temp_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let dir = app_data_dir(app)?.join("update").join("staging");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn battle_root_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let dir = app_data_dir(app)?.join("battle");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn battle_shots_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let dir = battle_root_dir(app)?.join("shots");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn battle_csv_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let dir = battle_root_dir(app)?.join("csv");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn battle_runtime_state_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let path = battle_root_dir(app)?.join("runtime").join("recent.json");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(path)
}

fn background_dir<R: Runtime>(app: &AppHandle<R>, kind: &str) -> Result<PathBuf> {
    let suffix = match kind {
        "image" => "img",
        "video" => "video",
        _ => return Err(anyhow!("不支持的背景类型: {kind}")),
    };
    let dir = app_data_dir(app)?.join(BACKGROUND_DIR).join(suffix);
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T> {
    let raw = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, serde_json::to_vec_pretty(value)?)?;
    Ok(())
}

fn response_preview(bytes: &[u8]) -> String {
    let text = String::from_utf8_lossy(bytes);
    let compact = text
        .replace('\r', " ")
        .replace('\n', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    compact.chars().take(240).collect()
}

fn response_content_type(response: &reqwest::Response) -> String {
    response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string()
}

fn message_indicates_auth_invalid(message: &str) -> bool {
    let lower = message.to_ascii_lowercase();
    lower.contains("unauthorized")
        || lower.contains("forbidden")
        || lower.contains("token expired")
        || lower.contains("invalid token")
        || message.contains("未授权")
        || message.contains("认证失效")
        || message.contains("登录已过期")
        || message.contains("账号信息已失效")
        || message.contains("请重新登录")
}

async fn send_json_request<T: DeserializeOwned>(
    label: &str,
    request: reqwest::RequestBuilder,
) -> Result<T, JsonRequestError> {
    let response = request
        .send()
        .await
        .map_err(|error| JsonRequestError::new(JsonRequestErrorKind::Transport, label, error.to_string()))?;
    let status = response.status();
    let content_type = response_content_type(&response);
    let bytes = response
        .bytes()
        .await
        .map_err(|error| JsonRequestError::new(JsonRequestErrorKind::Transport, label, error.to_string()))?;
    let preview = response_preview(bytes.as_ref());

    if !status.is_success() {
        let detail = format!(
            "HTTP {} content-type={} body={}",
            status.as_u16(),
            if content_type.is_empty() { "<empty>" } else { &content_type },
            preview
        );
        let kind = if status.as_u16() == 401 || status.as_u16() == 403 {
            JsonRequestErrorKind::AuthInvalid
        } else {
            JsonRequestErrorKind::Http
        };
        return Err(JsonRequestError::new(kind, label, detail));
    }

    if !content_type.to_ascii_lowercase().contains("json") {
        return Err(JsonRequestError::new(
            JsonRequestErrorKind::Decode,
            label,
            format!(
                "error decoding response body (status={} content-type={} body={})",
                status.as_u16(),
                if content_type.is_empty() { "<empty>" } else { &content_type },
                preview
            ),
        ));
    }

    serde_json::from_slice::<T>(bytes.as_ref()).map_err(|error| {
        JsonRequestError::new(
            JsonRequestErrorKind::Decode,
            label,
            format!(
                "error decoding response body (status={} content-type={} body={} detail={})",
                status.as_u16(),
                content_type,
                preview,
                error
            ),
        )
    })
}

fn fallback_user_profile(session: &UserSession) -> UserProfile {
    UserProfile {
        id: 0,
        username: session.username.clone(),
        avatar: session.avatar.clone(),
        register_time: String::new(),
        last_login: session.login_time.clone(),
        is_online: true,
        last_seen: String::new(),
        total_runtime_seconds: 0,
        ip: String::new(),
        signature: String::new(),
        combat_power: 0,
        rank_tier: "-".into(),
        rank_wins: 0,
        partial: true,
        notice: String::new(),
    }
}

fn merge_legacy_profile(target: &mut UserProfile, profile: LegacyProfile) {
    target.id = profile.id;
    target.username = if profile.username.trim().is_empty() {
        target.username.clone()
    } else {
        profile.username
    };
    if !profile.avatar.trim().is_empty() {
        target.avatar = profile.avatar;
    }
    target.register_time = profile.register_time;
    target.last_login = if profile.last_login.trim().is_empty() {
        target.last_login.clone()
    } else {
        profile.last_login
    };
    target.is_online = profile.is_online;
    target.last_seen = profile.last_seen;
    target.total_runtime_seconds = profile.total_runtime_seconds;
    target.ip = profile.ip;
    target.signature = profile.signature;
    target.combat_power = profile.combat_power;
    target.rank_tier = if profile.rank_tier.trim().is_empty() {
        "-".into()
    } else {
        profile.rank_tier
    };
    target.rank_wins = profile.rank_wins;
}

fn load_config<R: Runtime>(app: &AppHandle<R>) -> Result<AppConfig> {
    let path = config_path(app)?;
    if !path.exists() {
        let config = AppConfig::default();
        write_json(&path, &config)?;
        return Ok(config);
    }
    let config: AppConfig = read_json(&path)?;
    Ok(config)
}

fn save_config_file<R: Runtime>(app: &AppHandle<R>, config: &AppConfig) -> Result<AppConfig> {
    let path = config_path(app)?;
    write_json(&path, config)?;
    apply_preferred_window_resolution(app, &config.preferred_resolution)?;
    Ok(config.clone())
}

fn load_user<R: Runtime>(app: &AppHandle<R>) -> Result<Option<UserSession>> {
    let path = user_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    match read_json::<UserSession>(&path) {
        Ok(user) => Ok(Some(user)),
        Err(_) => {
            let _ = fs::remove_file(&path);
            Ok(None)
        }
    }
}

fn save_user<R: Runtime>(app: &AppHandle<R>, user: &UserSession) -> Result<()> {
    let path = user_path(app)?;
    write_json(&path, user)
}

fn clear_user<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    let path = user_path(app)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn load_release_state<R: Runtime>(app: &AppHandle<R>) -> Result<ReleaseState> {
    let path = release_state_path(app)?;
    if !path.exists() {
        let state = ReleaseState::default();
        write_json(&path, &state)?;
        return Ok(state);
    }
    Ok(read_json(&path)?)
}

fn save_release_state<R: Runtime>(app: &AppHandle<R>, state: &ReleaseState) -> Result<()> {
    let path = release_state_path(app)?;
    write_json(&path, state)
}

fn load_vnt_launch_state<R: Runtime>(app: &AppHandle<R>) -> Result<VntLaunchState> {
    let path = vnt_launch_state_path(app)?;
    if !path.exists() {
        let state = VntLaunchState::default();
        write_json(&path, &state)?;
        return Ok(state);
    }
    match read_json::<VntLaunchState>(&path) {
        Ok(state) => Ok(state),
        Err(_) => {
            let state = VntLaunchState::default();
            write_json(&path, &state)?;
            Ok(state)
        }
    }
}

fn save_vnt_launch_state<R: Runtime>(
    app: &AppHandle<R>,
    status: &str,
    detail: impl Into<String>,
) -> Result<()> {
    let path = vnt_launch_state_path(app)?;
    let state = VntLaunchState {
        status: status.into(),
        detail: detail.into(),
        updated_at: Utc::now().to_rfc3339(),
    };
    write_json(&path, &state)
}

fn load_battle_runtime_state<R: Runtime>(app: &AppHandle<R>) -> Result<BattleRuntimeState> {
    let path = battle_runtime_state_path(app)?;
    if !path.exists() {
        let state = BattleRuntimeState::default();
        write_json(&path, &state)?;
        return Ok(state);
    }
    match read_json::<BattleRuntimeState>(&path) {
        Ok(state) => Ok(state),
        Err(_) => {
            let state = BattleRuntimeState::default();
            write_json(&path, &state)?;
            Ok(state)
        }
    }
}

fn save_battle_runtime_state<R: Runtime>(
    app: &AppHandle<R>,
    state: &BattleRuntimeState,
) -> Result<BattleRuntimeState> {
    let path = battle_runtime_state_path(app)?;
    write_json(&path, state)?;
    Ok(state.clone())
}

fn normalize_path(input: &str) -> String {
    let mut path = input
        .replace('/', "\\")
        .trim()
        .trim_matches('"')
        .to_string();
    // Remove trailing backslashes except for root paths like C:\
    while path.len() > 3 && path.ends_with('\\') {
        path.pop();
    }
    path
}

#[derive(Clone)]
struct GameRootCandidate {
    game_dir: String,
    game_exe_path: String,
    markers: Vec<String>,
    depth: usize,
    exe_rank: usize,
}

fn build_game_root_candidate(dir: &Path, depth: usize) -> Option<GameRootCandidate> {
    let markers = GAME_MARKERS
        .iter()
        .filter_map(|item| {
            let target = dir.join(item);
            if target.exists() {
                Some((*item).to_string())
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    if markers.is_empty() {
        return None;
    }

    let Some((exe_rank, game_exe_path)) = GAME_EXE_CANDIDATES
        .iter()
        .enumerate()
        .map(|(index, name)| (index, dir.join(name)))
        .find(|(_, candidate)| candidate.is_file())
    else {
        return None;
    };

    Some(GameRootCandidate {
        game_dir: dir.to_string_lossy().to_string(),
        game_exe_path: game_exe_path.to_string_lossy().to_string(),
        markers,
        depth,
        exe_rank,
    })
}

fn game_path_status_from_candidate(candidate: GameRootCandidate, reason: &str) -> GamePathStatus {
    GamePathStatus {
        valid: true,
        game_dir: candidate.game_dir,
        game_exe_path: candidate.game_exe_path,
        markers: candidate.markers,
        reason: reason.into(),
    }
}

fn validate_game_dir(path: &str) -> GamePathStatus {
    let normalized = normalize_path(path);
    if normalized.is_empty() {
        return GamePathStatus {
            valid: false,
            game_dir: String::new(),
            game_exe_path: String::new(),
            markers: Vec::new(),
            reason: "empty-path".into(),
        };
    }

    let dir = PathBuf::from(&normalized);
    if !dir.is_dir() {
        return GamePathStatus {
            valid: false,
            game_dir: normalized,
            game_exe_path: String::new(),
            markers: Vec::new(),
            reason: "missing-path".into(),
        };
    }

    if let Some(candidate) = build_game_root_candidate(&dir, 0) {
        return game_path_status_from_candidate(candidate, "ok");
    }

    let mut queue = VecDeque::new();
    let mut visited_dirs = 0usize;
    let mut candidates = Vec::new();

    queue.push_back((dir.clone(), 0usize));

    while let Some((current_dir, depth)) = queue.pop_front() {
        if visited_dirs >= MAX_GAME_SEARCH_DIRS {
            break;
        }
        visited_dirs += 1;

        if depth > 0 {
            if let Some(candidate) = build_game_root_candidate(&current_dir, depth) {
                candidates.push(candidate);
                continue;
            }
        }

        if depth >= MAX_GAME_SEARCH_DEPTH {
            continue;
        }

        let Ok(entries) = fs::read_dir(&current_dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                queue.push_back((path, depth + 1));
            }
        }
    }

    if candidates.is_empty() {
        return GamePathStatus {
            valid: false,
            game_dir: normalized,
            game_exe_path: String::new(),
            markers: Vec::new(),
            reason: "search-exhausted".into(),
        };
    }

    candidates.sort_by(|a, b| {
        a.depth
            .cmp(&b.depth)
            .then(a.exe_rank.cmp(&b.exe_rank))
            .then(a.game_dir.len().cmp(&b.game_dir.len()))
            .then(a.game_dir.cmp(&b.game_dir))
    });

    let reason = if candidates.len() > 1 {
        "multiple-candidates-resolved"
    } else {
        "ok"
    };
    game_path_status_from_candidate(candidates.remove(0), reason)
}

fn launcher_version_from_state(_state: &ReleaseState) -> String {
    format!("v{}", env!("CARGO_PKG_VERSION"))
}

fn parse_resolution(value: &str) -> Option<(f64, f64)> {
    let trimmed = value.trim();
    let (width, height) = trimmed.split_once('x')?;
    let width = width.trim().parse::<f64>().ok()?;
    let height = height.trim().parse::<f64>().ok()?;
    if width >= 1.0 && height >= 1.0 {
        Some((width, height))
    } else {
        None
    }
}

fn apply_preferred_window_resolution<R: Runtime>(
    app: &AppHandle<R>,
    preferred_resolution: &str,
) -> Result<()> {
    let Some((width, height)) = parse_resolution(preferred_resolution) else {
        return Ok(());
    };
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_size(LogicalSize::new(width, height))
            .map_err(|error| anyhow!(error.to_string()))?;
        let _ = window.center();
    }
    Ok(())
}

fn ensure_default_background<R: Runtime>(app: &AppHandle<R>) -> Result<String> {
    let img_dir = background_dir(app, "image")?;
    let dst = img_dir.join(DEFAULT_BACKGROUND_FILE);
    if !dst.exists() {
        let src = resource_candidates(app, DEFAULT_BACKGROUND_FILE)
            .into_iter()
            .find(|candidate| candidate.exists());
        if let Some(source) = src {
            fs::copy(&source, &dst)?;
        }
    }
    Ok(dst.to_string_lossy().to_string())
}

fn bootstrap_state_internal<R: Runtime>(app: &AppHandle<R>) -> Result<BootstrapState> {
    let mut config = load_config(app)?;

    // 旧版本迁移：已有有效游戏目录但未标记完成 → 自动完成
    if !config.setup_completed && validate_game_dir(&config.game_dir).valid {
        config.setup_completed = true;
        config.setup_pending_auth = false;
        save_config_file(app, &config)?;
    }

    apply_preferred_window_resolution(app, &config.preferred_resolution)?;
    let user = load_user(app)?;
    let state = load_release_state(app)?;
    let default_background_path = ensure_default_background(app).unwrap_or_default();
    let game_version = state.game.version.clone();
    Ok(BootstrapState {
        game_path: validate_game_dir(&config.game_dir),
        launcher_version: launcher_version_from_state(&state),
        game_version,
        install_dir: install_dir()?.to_string_lossy().to_string(),
        config,
        user,
        default_background_path,
    })
}

fn device_id<R: Runtime>(app: &AppHandle<R>) -> Result<String> {
    let path = device_id_path(app)?;
    if path.exists() {
        return Ok(fs::read_to_string(path)?.trim().to_string());
    }
    let seed = format!(
        "{}-{}",
        std::env::var("COMPUTERNAME").unwrap_or_else(|_| "EE2X".into()),
        Utc::now().timestamp_millis()
    );
    let mut digest = Sha256::new();
    digest.update(seed.as_bytes());
    let id = format!("{:x}", digest.finalize());
    fs::write(path, &id)?;
    Ok(id)
}

fn fallback_network_name() -> String {
    let base = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "EE2X".into());
    sanitize_network_name(&base)
}

fn sanitize_network_name(raw: &str) -> String {
    let mut result = String::new();
    for ch in raw.chars() {
        let is_cjk = ('\u{4e00}'..='\u{9fa5}').contains(&ch);
        if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' || is_cjk {
            result.push(ch);
        }
        if result.chars().count() >= 32 {
            break;
        }
    }
    if result.is_empty() {
        let suffix = (Utc::now().timestamp().unsigned_abs() % 10_000) as u16;
        format!("Player{suffix}")
    } else {
        result
    }
}

fn copy_if_missing_or_changed(src: &Path, dst: &Path) -> Result<()> {
    let needs_copy = if !dst.exists() {
        true
    } else {
        let src_meta = fs::metadata(src)?;
        let dst_meta = fs::metadata(dst)?;
        src_meta.len() != dst_meta.len()
    };
    if needs_copy {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(src, dst)?;
    }
    Ok(())
}

fn resource_candidates<R: Runtime>(app: &AppHandle<R>, relative: &str) -> Vec<PathBuf> {
    let mut results = Vec::new();
    if let Ok(resource_dir) = app.path().resource_dir() {
        results.push(resource_dir.join(relative));
        results.push(resource_dir.join("resources").join(relative));
    }
    results.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join(relative),
    );
    results
}

fn ensure_vnt_runtime<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let runtime_dir = vnt_runtime_dir(app)?;
    let exe_dst = runtime_dir.join("vnt-cli.exe");
    let dll_dst = runtime_dir.join("wintun.dll");

    let exe_src = resource_candidates(app, "vnt/vnt-cli.exe")
        .into_iter()
        .find(|candidate| candidate.exists())
        .ok_or_else(|| anyhow!("未找到打包后的 vnt-cli.exe 资源"))?;
    let dll_src = resource_candidates(app, "vnt/wintun.dll")
        .into_iter()
        .find(|candidate| candidate.exists())
        .ok_or_else(|| anyhow!("未找到打包后的 wintun.dll 资源"))?;

    copy_if_missing_or_changed(&exe_src, &exe_dst)?;
    copy_if_missing_or_changed(&dll_src, &dll_dst)?;
    Ok(exe_dst)
}

fn vnt_command_port<R: Runtime>(app: &AppHandle<R>) -> Result<Option<u16>> {
    let port_path = vnt_runtime_dir(app)?.join("env").join("command-port");
    if !port_path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(port_path)?;
    Ok(raw.trim().parse::<u16>().ok())
}

async fn send_udp_command<R: Runtime>(app: &AppHandle<R>, command: &str) -> Result<Option<String>> {
    let Some(port) = vnt_command_port(app)? else {
        return Ok(None);
    };

    let socket = UdpSocket::bind("127.0.0.1:0").await?;
    socket
        .send_to(command.as_bytes(), ("127.0.0.1", port))
        .await?;
    let mut buf = vec![0u8; 32 * 1024];
    let recv = timeout(Duration::from_secs(2), socket.recv_from(&mut buf)).await;
    match recv {
        Ok(Ok((size, _))) => Ok(Some(String::from_utf8_lossy(&buf[..size]).to_string())),
        _ => Ok(None),
    }
}

fn parse_yaml_map(input: &str) -> HashMap<String, String> {
    input
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            let idx = trimmed.find(':')?;
            let key = trimmed[..idx].trim();
            let value = trimmed[idx + 1..]
                .trim()
                .trim_matches('"')
                .trim_matches('\'');
            Some((
                key.to_lowercase().replace([' ', '-'], "_"),
                value.to_string(),
            ))
        })
        .collect()
}

fn process_exists_by_name(process_name: &str) -> bool {
    let output = run_hidden_command(
        "tasklist",
        &["/FI", &format!("IMAGENAME eq {process_name}")],
        None,
    );
    match output {
        Ok(stdout) => stdout.to_lowercase().contains(&process_name.to_lowercase()),
        Err(_) => false,
    }
}

fn run_hidden_command(binary: &str, args: &[&str], cwd: Option<&Path>) -> Result<String> {
    let mut command = Command::new(binary);
    command.args(args);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let output = command.output()?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn run_hidden_command_with_status(binary: &str, args: &[&str], cwd: Option<&Path>) -> Result<(bool, String, String)> {
    let mut command = Command::new(binary);
    command.args(args);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let output = command.output()?;
    Ok((
        output.status.success(),
        String::from_utf8_lossy(&output.stdout).trim().to_string(),
        String::from_utf8_lossy(&output.stderr).trim().to_string(),
    ))
}

fn powershell_quote(value: &str) -> String {
    value.replace('\'', "''")
}

fn powershell_json(script: &str) -> Result<Option<Value>> {
    let stdout = run_hidden_command("powershell.exe", &["-NoProfile", "-Command", script], None)?;
    if stdout.trim().is_empty() {
        return Ok(None);
    }
    Ok(Some(serde_json::from_str(&stdout)?))
}

fn battle_timestamp_slug() -> String {
    Utc::now().format("%Y-%m-%d-%H-%M-%S").to_string()
}

fn build_battle_csv_name(shot_path: &str) -> String {
    let shot = Path::new(shot_path);
    if let Some(stem) = shot.file_stem().and_then(|value| value.to_str()) {
        return format!("{stem}-ocr.csv");
    }
    format!("ee2x-{}-ocr.csv", battle_timestamp_slug())
}

fn capture_primary_screen_png(output_path: &Path) -> Result<()> {
    let output = output_path.to_string_lossy().to_string();
    let script = format!(
        "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bounds=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap=New-Object System.Drawing.Bitmap $bounds.Width,$bounds.Height; $graphics=[System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.X,$bounds.Y,0,0,$bounds.Size); $bitmap.Save('{}',[System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bitmap.Dispose();",
        powershell_quote(&output)
    );
    let (ok, _stdout, stderr) = run_hidden_command_with_status(
        "powershell.exe",
        &["-NoProfile", "-STA", "-Command", &script],
        None,
    )?;
    if !ok {
        return Err(anyhow!(if stderr.is_empty() {
            "屏幕截图失败。".into()
        } else {
            format!("屏幕截图失败：{stderr}")
        }));
    }
    Ok(())
}

fn upload_battle_csv(config: &AppConfig, local_csv_path: &Path, remote_file_name: &str) -> Result<()> {
    let askpass_path = std::env::temp_dir().join(format!(
        "ee2x-battle-askpass-{}.cmd",
        Utc::now().timestamp_millis()
    ));
    let remote_path = format!(
        "{}/{}",
        config.battle_ssh_remote_dir.trim_end_matches('/'),
        remote_file_name
    );
    fs::write(
        &askpass_path,
        format!("@echo off\r\necho {}\r\n", config.battle_ssh_password),
    )?;

    let script = format!(
        "$env:SSH_ASKPASS='{}'; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY='ee2x'; $env:HOME=$env:TEMP; & 'C:\\Windows\\System32\\OpenSSH\\scp.exe' -q -P {} -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL '{}' '{}@{}:{}'; exit $LASTEXITCODE",
        powershell_quote(&askpass_path.to_string_lossy()),
        config.battle_ssh_port,
        powershell_quote(&local_csv_path.to_string_lossy()),
        powershell_quote(&config.battle_ssh_username),
        powershell_quote(&config.battle_ssh_host),
        powershell_quote(&remote_path),
    );

    let result = run_hidden_command_with_status(
        "powershell.exe",
        &["-NoProfile", "-Command", &script],
        None,
    );
    let _ = fs::remove_file(&askpass_path);

    let (ok, stdout, stderr) = result?;
    if ok {
        return Ok(());
    }

    Err(anyhow!(if !stderr.is_empty() {
        format!("CSV 上传失败：{stderr}")
    } else if !stdout.is_empty() {
        format!("CSV 上传失败：{stdout}")
    } else {
        "CSV 上传失败。".into()
    }))
}

async fn submit_battle_csv(config: &AppConfig, remote_file_name: &str) -> Result<Value> {
    let mut request = http_client()
        .post(&config.battle_submit_url)
        .json(&json!({ "csvFile": remote_file_name }));
    if !config.battle_submit_token.trim().is_empty() {
        request = request.bearer_auth(config.battle_submit_token.trim());
    }
    let response = request.send().await?;
    let status = response.status();
    let text = response.text().await?;
    let value = serde_json::from_str::<Value>(&text)
        .unwrap_or_else(|_| json!({ "success": false, "message": text }));
    if !status.is_success() {
        let message = value
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("战报提交失败。");
        return Err(anyhow!("{} (HTTP {})", message, status.as_u16()));
    }
    Ok(value)
}

fn launch_vnt_elevated(vnt_exe: &Path, config_path: &Path, cwd: &Path) -> Result<()> {
    let script = format!(
        "$ErrorActionPreference='Stop'; Start-Process -FilePath '{}' -ArgumentList @('-f','{}') -WorkingDirectory '{}' -WindowStyle Hidden -Verb RunAs | Out-Null",
        powershell_quote(&vnt_exe.to_string_lossy()),
        powershell_quote(&config_path.to_string_lossy()),
        powershell_quote(&cwd.to_string_lossy()),
    );
    let (ok, _stdout, stderr) =
        run_hidden_command_with_status("powershell.exe", &["-NoProfile", "-Command", &script], None)?;
    if ok {
        return Ok(());
    }
    let lower = stderr.to_ascii_lowercase();
    if lower.contains("canceled") || stderr.contains("已被用户取消") {
        return Err(anyhow!("管理员授权被取消，VNT 未启动。"));
    }
    Err(anyhow!(if stderr.is_empty() {
        "VNT 提权启动失败。".into()
    } else {
        format!("VNT 提权启动失败：{stderr}")
    }))
}

fn clear_vnt_runtime_markers<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    let runtime_dir = vnt_runtime_dir(app)?;
    let port_path = runtime_dir.join("env").join("command-port");
    if port_path.exists() {
        let _ = fs::remove_file(&port_path);
    }
    Ok(())
}

fn adapter_statistics() -> Result<(String, u64, u64)> {
    let script = "$adapter = Get-NetAdapter | Where-Object { $_.InterfaceDescription -match 'Wintun' -and $_.Status -eq 'Up' } | Select-Object -First 1 -Property Name, InterfaceDescription; if ($adapter) { $stats = Get-NetAdapterStatistics -Name $adapter.Name; [PSCustomObject]@{ adapterName=$adapter.Name; tx=$stats.SentBytes; rx=$stats.ReceivedBytes } | ConvertTo-Json -Compress }";
    let Some(value) = powershell_json(script)? else {
        return Err(anyhow!("no-adapter"));
    };
    let name = value
        .get("adapterName")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let tx = value.get("tx").and_then(Value::as_u64).unwrap_or(0);
    let rx = value.get("rx").and_then(Value::as_u64).unwrap_or(0);
    if name.is_empty() {
        return Err(anyhow!("adapter-name-empty"));
    }
    Ok((name, tx, rx))
}

async fn network_status_internal<R: Runtime>(app: &AppHandle<R>) -> Result<NetworkSnapshot> {
    let user = load_user(app)?;
    if user.is_none() {
        return Ok(NetworkSnapshot {
            connected: false,
            status: "未登录".into(),
            mode: "TUN".into(),
            virtual_ip: String::new(),
            adapter_name: String::new(),
            tx_total_bytes: None,
            rx_total_bytes: None,
            tx_fallback_bps: None,
            rx_fallback_bps: None,
        });
    }

    let launch_state = load_vnt_launch_state(app).unwrap_or_default();
    let info = send_udp_command(app, "info").await?;
    let chart = send_udp_command(app, "chart_a").await?;

    if let Some(raw_info) = info {
        let parsed_info = parse_yaml_map(&raw_info);
        let virtual_ip = parsed_info.get("virtual_ip").cloned().unwrap_or_default();
        let chart_map = chart.as_deref().map(parse_yaml_map).unwrap_or_default();
        let adapter = adapter_statistics().ok();
        return Ok(NetworkSnapshot {
            connected: !virtual_ip.is_empty() && virtual_ip != "0.0.0.0",
            status: if !virtual_ip.is_empty() && virtual_ip != "0.0.0.0" {
                "已连接".into()
            } else {
                "启动中".into()
            },
            mode: "TUN".into(),
            virtual_ip,
            adapter_name: adapter
                .as_ref()
                .map(|item| item.0.clone())
                .unwrap_or_default(),
            tx_total_bytes: adapter.as_ref().map(|item| item.1),
            rx_total_bytes: adapter.as_ref().map(|item| item.2),
            tx_fallback_bps: chart_map
                .get("up_total")
                .and_then(|v| v.parse::<f64>().ok()),
            rx_fallback_bps: chart_map
                .get("down_total")
                .and_then(|v| v.parse::<f64>().ok()),
        });
    }

    Ok(NetworkSnapshot {
        connected: false,
        status: if process_exists_by_name("vnt-cli.exe") {
            "启动中".into()
        } else if launch_state.status == "启动失败" {
            "启动失败".into()
        } else {
            "未启动".into()
        },
        mode: "TUN".into(),
        virtual_ip: String::new(),
        adapter_name: String::new(),
        tx_total_bytes: None,
        rx_total_bytes: None,
        tx_fallback_bps: None,
        rx_fallback_bps: None,
    })
}

async fn wait_for_network_ready<R: Runtime>(app: &AppHandle<R>, timeout_seconds: u64) -> Result<NetworkSnapshot> {
    let command_port = vnt_runtime_dir(app)?.join("env").join("command-port");
    let deadline = tokio::time::Instant::now() + Duration::from_secs(timeout_seconds.max(3));
    let mut saw_process = false;

    loop {
        let snapshot = network_status_internal(app).await?;
        if snapshot.connected {
            return Ok(snapshot);
        }
        if process_exists_by_name("vnt-cli.exe") {
            saw_process = true;
        }
        if tokio::time::Instant::now() >= deadline {
            break;
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    if !saw_process && !process_exists_by_name("vnt-cli.exe") {
        return Err(anyhow!("VNT 启动失败：管理员进程未成功拉起。"));
    }
    if !command_port.exists() {
        return Err(anyhow!("VNT 启动失败：未生成 command-port。"));
    }
    Err(anyhow!("VNT 启动超时：未获取到 virtual_ip。"))
}

fn write_vnt_config<R: Runtime>(
    app: &AppHandle<R>,
    config: &AppConfig,
    session: &UserSession,
) -> Result<PathBuf> {
    let path = vnt_config_path(app)?;
    let preferred_name = if session.username.trim().is_empty() {
        fallback_network_name()
    } else {
        session.username.clone()
    };
    let device_name = sanitize_network_name(&preferred_name);
    let body = format!(
        "tap: false\nserver_address: {}\ntoken: game-net\nname: {}\ndevice_id: {}\nuse_channel: relay\n",
        config.network_server,
        device_name,
        device_id(app)?
    );
    fs::write(&path, body)?;
    Ok(path)
}

fn spawn_hidden_process(binary: &Path, args: &[&str], cwd: Option<&Path>) -> Result<Child> {
    let mut command = Command::new(binary);
    command
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null());
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
    Ok(command.spawn()?)
}

#[tauri::command]
fn bootstrap_state(app: AppHandle) -> Result<BootstrapState, String> {
    bootstrap_state_internal(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config(app: AppHandle, config: AppConfig) -> Result<AppConfig, String> {
    save_config_file(&app, &config).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_game_directory(app: AppHandle, path: String) -> Result<BootstrapState, String> {
    let status = validate_game_dir(&path);
    if !status.valid {
        return Err(
            "未在所选目录及其下级目录中找到有效的游戏根目录。需要存在 EE2X.exe / EE2.exe 与 UnofficialVersionConfig.txt、zips_ee2x 等根目录标记。"
                .into(),
        );
    }

    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    config.game_dir = status.game_dir.clone();
    config.game_exe_path = status.game_exe_path.clone();
    config.game_exe = Path::new(&status.game_exe_path)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "EE2X.exe".into());
    save_config_file(&app, &config).map_err(|e| e.to_string())?;

    // 直接构建 BootstrapState，不触发 bootstrap_state_internal 中的迁移逻辑
    // 因为此时处于首次运行向导流程中，setupCompleted 应由向导步骤控制
    apply_preferred_window_resolution(&app, &config.preferred_resolution)
        .map_err(|e| e.to_string())?;
    let user = load_user(&app).map_err(|e| e.to_string())?;
    let state = load_release_state(&app).map_err(|e| e.to_string())?;
    let default_background_path = ensure_default_background(&app).unwrap_or_default();
    let game_version = state.game.version.clone();
    Ok(BootstrapState {
        game_path: validate_game_dir(&config.game_dir),
        launcher_version: launcher_version_from_state(&state),
        game_version,
        install_dir: install_dir().map_err(|e| e.to_string())?.to_string_lossy().to_string(),
        config,
        user,
        default_background_path,
    })
}

#[tauri::command]
fn import_background_media(app: AppHandle, path: String, kind: String) -> Result<String, String> {
    let source = PathBuf::from(path.trim());
    if !source.is_file() {
        return Err("背景文件不存在。".into());
    }

    let ext = source
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_else(|| "dat".into());
    let timestamp = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let filename = format!("bg-{timestamp}.{ext}");
    let target_dir = background_dir(&app, &kind).map_err(|e| e.to_string())?;
    let target_path = target_dir.join(filename);
    fs::copy(&source, &target_path).map_err(|e| e.to_string())?;
    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
fn start_game(app: AppHandle) -> Result<HashMap<String, Value>, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let status = validate_game_dir(&config.game_dir);
    if !status.valid {
        return Ok(HashMap::from([
            ("ok".into(), Value::Bool(false)),
            (
                "error".into(),
                Value::String("请先选择有效的 Empire Earth II 游戏根目录。".into()),
            ),
        ]));
    }
    let exe_path = PathBuf::from(status.game_exe_path);
    let cwd = exe_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法解析游戏目录".to_string())?;
    spawn_hidden_process(&exe_path, &[], Some(&cwd)).map_err(|e| e.to_string())?;
    Ok(HashMap::from([("ok".into(), Value::Bool(true))]))
}

#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(concat!("EE2X-Mod-Launcher/", env!("CARGO_PKG_VERSION")))
        .build()
        .expect("http client")
}

#[tauri::command]
async fn auth_login(
    app: AppHandle,
    username: String,
    password: String,
) -> Result<UserSession, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let url = format!("{}/api/login", config.user_server_url.trim_end_matches('/'));
    let payload = json!({
        "username": username,
        "password": password,
        "computer_name": std::env::var("COMPUTERNAME").unwrap_or_default()
    });
    let body: LoginResponse = send_json_request(
        "登录请求",
        http_client().post(url).json(&payload),
    )
    .await
    .map_err(|e| e.to_string())?;
    if !body.success {
        return Err(body.message.unwrap_or_else(|| "登录失败".into()));
    }
    let user = body
        .user
        .ok_or_else(|| "登录响应缺少用户信息".to_string())?;
    let token = body.token.ok_or_else(|| "登录响应缺少 token".to_string())?;
    let session = UserSession {
        username: user.username,
        avatar: user.avatar,
        token,
        login_time: Utc::now().to_rfc3339(),
    };
    save_user(&app, &session).map_err(|e| e.to_string())?;
    Ok(session)
}

#[tauri::command]
async fn auth_register(
    app: AppHandle,
    username: String,
    password: String,
    avatar: String,
) -> Result<UserSession, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let url = format!(
        "{}/api/register",
        config.user_server_url.trim_end_matches('/')
    );
    let payload = json!({
        "username": username,
        "password": password,
        "avatar": avatar,
        "computer_name": std::env::var("COMPUTERNAME").unwrap_or_default()
    });
    let body: LoginResponse = send_json_request(
        "注册请求",
        http_client().post(url).json(&payload),
    )
    .await
    .map_err(|e| e.to_string())?;
    if !body.success {
        return Err(body.message.unwrap_or_else(|| "注册失败".into()));
    }
    let user = body
        .user
        .ok_or_else(|| "注册响应缺少用户信息".to_string())?;
    let token = body.token.ok_or_else(|| "注册响应缺少 token".to_string())?;
    let session = UserSession {
        username: user.username,
        avatar: if user.avatar.trim().is_empty() {
            avatar
        } else {
            user.avatar
        },
        token,
        login_time: Utc::now().to_rfc3339(),
    };
    save_user(&app, &session).map_err(|e| e.to_string())?;
    Ok(session)
}

#[tauri::command]
async fn auth_logout(app: AppHandle) -> Result<bool, String> {
    if let Ok(Some(session)) = load_user(&app) {
        let config = load_config(&app).map_err(|e| e.to_string())?;
        let url = format!(
            "{}/api/logout",
            config.user_server_url.trim_end_matches('/')
        );
        let _ = http_client()
            .post(url)
            .json(&json!({ "token": session.token }))
            .send()
            .await;
    }
    clear_user(&app).map_err(|e| e.to_string())?;
    Ok(true)
}

async fn fetch_runtime_summary_for_session(
    config: &AppConfig,
    session: &UserSession,
) -> Result<RuntimeSummaryResponse, JsonRequestError> {
    let url = format!(
        "{}/api/user/runtime/summary",
        config.user_server_url.trim_end_matches('/')
    );
    send_json_request(
        "运行时统计",
        http_client()
            .get(url)
            .header("Authorization", format!("Bearer {}", session.token)),
    )
    .await
}

#[tauri::command]
async fn get_profile(app: AppHandle) -> Result<UserProfile, String> {
    let session = load_user(&app)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "当前未登录".to_string())?;
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let mut profile = fallback_user_profile(&session);
    let mut notices = Vec::new();
    let profile_url = reqwest::Url::parse_with_params(
        &format!(
            "{}/api/user/profile",
            config.user_server_url.trim_end_matches('/')
        ),
        [
            ("username", session.username.as_str()),
            ("token", session.token.as_str()),
        ],
    )
    .map_err(|e| e.to_string())?;
    match send_json_request::<ProfileResponse>("个人资料", http_client().get(profile_url)).await {
        Ok(body) if body.success => {
            if let Some(user) = body.user {
                merge_legacy_profile(&mut profile, user);
                profile.partial = false;
            } else {
                notices.push("个人资料暂未加载：资料响应缺少用户信息。".into());
            }
        }
        Ok(body) => {
            let message = body
                .message
                .unwrap_or_else(|| "资料接口未返回成功状态".into());
            if message_indicates_auth_invalid(&message) {
                return Err(format!("{AUTH_INVALID_PREFIX} {message}"));
            }
            notices.push(format!("个人资料暂未加载：{message}"));
        }
        Err(error) => {
            if error.is_auth_invalid() {
                return Err(error.to_string());
            }
            notices.push(format!("个人资料暂未加载：{error}"));
        }
    }

    if profile.total_runtime_seconds <= 0 {
        match fetch_runtime_summary_for_session(&config, &session).await {
            Ok(summary) if summary.success => {
                profile.total_runtime_seconds = summary.total_seconds;
            }
            Ok(summary) => {
                if let Some(message) = summary.message.filter(|message| !message.trim().is_empty()) {
                    notices.push(format!("运行时统计不可用：{message}"));
                } else {
                    let _ = summary.total_starts;
                }
            }
            Err(error) => {
                if error.is_auth_invalid() {
                    return Err(error.to_string());
                }
                notices.push(format!("运行时统计不可用：{error}"));
            }
        }
    }

    profile.partial = !notices.is_empty();
    profile.notice = notices.join(" ");
    Ok(profile)
}

#[tauri::command]
async fn fetch_online_players(app: AppHandle) -> Result<Vec<OnlinePlayer>, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let url = format!(
        "{}/api/user/online/list",
        config.user_server_url.trim_end_matches('/')
    );
    let players: Vec<Value> = send_json_request("在线玩家列表", http_client().get(url))
        .await
        .map_err(|e| e.to_string())?;
    let mut result = players
        .into_iter()
        .map(|item| OnlinePlayer {
            username: item
                .get("username")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            avatar: item
                .get("avatar")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            combat_power: item
                .get("combat_power")
                .and_then(Value::as_i64)
                .unwrap_or(0),
            rank_tier: item
                .get("rank_tier")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            wins: item.get("wins").and_then(Value::as_i64).unwrap_or(0),
            losses: item.get("losses").and_then(Value::as_i64).unwrap_or(0),
            last_login: item
                .get("last_login")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            last_seen: item
                .get("last_seen")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            total_runtime_seconds: item
                .get("total_runtime_seconds")
                .and_then(Value::as_i64)
                .unwrap_or(0),
        })
        .collect::<Vec<_>>();
    result.sort_by(|a, b| b.combat_power.cmp(&a.combat_power));
    Ok(result)
}

#[tauri::command]
async fn ensure_network(app: AppHandle) -> Result<NetworkSnapshot, String> {
    let session = load_user(&app)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "未登录，不能连接联机网络".to_string())?;
    let current = network_status_internal(&app)
        .await
        .map_err(|e| e.to_string())?;
    if current.connected {
        return Ok(current);
    }

    let config = load_config(&app).map_err(|e| e.to_string())?;
    let vnt_exe = ensure_vnt_runtime(&app).map_err(|e| e.to_string())?;
    let vnt_cfg = write_vnt_config(&app, &config, &session).map_err(|e| e.to_string())?;
    let cwd = vnt_exe
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法解析 VNT 运行目录".to_string())?;
    let _ = stop_network(app.clone()).await;
    clear_vnt_runtime_markers(&app).map_err(|e| e.to_string())?;
    save_vnt_launch_state(&app, "启动中", "正在以管理员权限启动 VNT。")
        .map_err(|e| e.to_string())?;
    launch_vnt_elevated(&vnt_exe, &vnt_cfg, &cwd).map_err(|e| {
        let message = e.to_string();
        let _ = save_vnt_launch_state(&app, "启动失败", &message);
        message
    })?;

    match wait_for_network_ready(&app, 30).await {
        Ok(snapshot) => {
            let _ = save_vnt_launch_state(&app, "已连接", "");
            Ok(snapshot)
        }
        Err(error) => {
            let message = error.to_string();
            let _ = save_vnt_launch_state(&app, "启动失败", &message);
            Err(message)
        }
    }
}

#[tauri::command]
async fn stop_network(app: AppHandle) -> Result<bool, String> {
    let vnt_exe = ensure_vnt_runtime(&app).map_err(|e| e.to_string())?;
    let _ = spawn_hidden_process(&vnt_exe, &["--stop"], vnt_exe.parent());
    let _ = run_hidden_command("taskkill", &["/F", "/IM", "vnt-cli.exe"], None);
    let _ = clear_vnt_runtime_markers(&app);
    let _ = save_vnt_launch_state(&app, "未启动", "");
    Ok(true)
}

#[tauri::command]
async fn network_status(app: AppHandle) -> Result<NetworkSnapshot, String> {
    network_status_internal(&app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn report_online(app: AppHandle, virtual_ip: String) -> Result<bool, String> {
    let session = load_user(&app)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "未登录".to_string())?;
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let url = format!(
        "{}/api/user/online/report",
        config.user_server_url.trim_end_matches('/')
    );
    http_client()
        .post(url)
        .json(&json!({
            "token": session.token,
            "virtual_ip": virtual_ip
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(true)
}

async fn fetch_latest(config: &AppConfig) -> Result<LatestRelease> {
    send_json_request(
        "获取最新版本",
        http_client().get(format!(
            "{}/api/update/v1/channels/{}/latest",
            config.update_server_http.trim_end_matches('/'),
            config.update_channel
        )),
    )
    .await
    .map_err(|e| anyhow!(e.to_string()))
}

async fn fetch_history(config: &AppConfig) -> Result<Vec<HistoryRelease>> {
    let payload: HistoryPayload = send_json_request(
        "获取版本历史",
        http_client().get(format!(
            "{}/api/update/v1/channels/{}/history?limit=0",
            config.update_server_http.trim_end_matches('/'),
            config.update_channel
        )),
    )
    .await
    .map_err(|e| anyhow!(e.to_string()))?;
    Ok(payload.history)
}

async fn fetch_manifest(url: &str) -> Result<ReleaseManifest> {
    send_json_request("获取更新清单", http_client().get(url))
        .await
        .map_err(|e| anyhow!(e.to_string()))
}

fn build_chain(
    history: &[HistoryRelease],
    current_version: &str,
    latest_version: &str,
    force: bool,
) -> Vec<HistoryRelease> {
    let mut ordered = history.to_vec();
    ordered.sort_by(|a, b| a.published_at.cmp(&b.published_at));
    if force || current_version.is_empty() {
        return ordered;
    }
    if current_version == latest_version {
        return Vec::new();
    }
    let index = ordered
        .iter()
        .position(|item| item.version == current_version);
    match index {
        Some(idx) => ordered.into_iter().skip(idx + 1).collect(),
        None => ordered,
    }
}

async fn release_package_for_version(
    config: &AppConfig,
    release: &HistoryRelease,
    scope: &str,
) -> Result<Option<ReleasePackage>> {
    let server = config.update_server_http.trim_end_matches('/');
    let manifest_url = format!(
        "{server}/updates/{}/releases/{}/{scope}/release-manifest.json",
        config.update_channel, release.release_id
    );
    let response = http_client().get(&manifest_url).send().await?;
    if response.status().is_client_error() {
        return Ok(None);
    }
    let manifest: ReleaseManifest =
        send_json_request("历史版本清单", http_client().get(&manifest_url))
        .await
        .map_err(|e| anyhow!(e.to_string()))?;
    let package_url = format!(
        "{server}/updates/{}/releases/{}/{scope}/{}",
        config.update_channel, release.release_id, manifest.package_file_name
    );
    Ok(Some(ReleasePackage {
        manifest_url,
        package_url,
        package_sha256: manifest.package_sha256,
    }))
}

fn emit_update<R: Runtime>(
    app: &AppHandle<R>,
    stage: &str,
    message: impl Into<String>,
    progress: f32,
    version: Option<String>,
) {
    let _ = app.emit(
        "update-status",
        UpdateStatusEvent {
            stage: stage.into(),
            message: message.into(),
            progress,
            version,
        },
    );
}

async fn download_file<R: Runtime>(
    app: &AppHandle<R>,
    url: &str,
    target: &Path,
    stage: &str,
    version: &str,
) -> Result<()> {
    let response = http_client().get(url).send().await?.error_for_status()?;
    let total = response.content_length().unwrap_or(0);
    let mut stream = response.bytes_stream();
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut file = fs::File::create(target)?;
    let mut downloaded = 0u64;
    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;
        file.write_all(&bytes)?;
        downloaded += bytes.len() as u64;
        let pct = if total == 0 {
            0.0
        } else {
            (downloaded as f32 / total as f32) * 100.0
        };
        emit_update(
            app,
            stage,
            format!("正在下载 {version} ({downloaded}/{total} bytes)"),
            pct.clamp(0.0, 100.0),
            Some(version.to_string()),
        );
    }
    Ok(())
}

fn sha256_file(path: &Path) -> Result<String> {
    let mut file = fs::File::open(path)?;
    let mut digest = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let size = file.read(&mut buffer)?;
        if size == 0 {
            break;
        }
        digest.update(&buffer[..size]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

fn extract_zip(archive_path: &Path, target_dir: &Path) -> Result<()> {
    if target_dir.exists() {
        fs::remove_dir_all(target_dir)?;
    }
    fs::create_dir_all(target_dir)?;
    let file = fs::File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)?;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index)?;
        let outpath = target_dir.join(entry.mangled_name());
        if entry.name().ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut outfile = fs::File::create(&outpath)?;
            std::io::copy(&mut entry, &mut outfile)?;
        }
    }
    Ok(())
}

fn apply_manifest_overlay(
    extracted_root: &Path,
    target_root: &Path,
    manifest: &ReleaseManifest,
) -> Result<()> {
    for item in &manifest.delete_list {
        let normalized = item.replace('\\', "/");
        let target = target_root.join(&normalized);
        if target.is_dir() {
            let _ = fs::remove_dir_all(&target);
        } else if target.exists() {
            let _ = fs::remove_file(&target);
        }
    }

    for file in &manifest.files {
        let relative = file.path.replace('\\', "/");
        let src = extracted_root.join(&relative);
        if !src.is_file() {
            return Err(anyhow!("更新包缺少文件: {relative}"));
        }
        if src.metadata()?.len() != file.size {
            return Err(anyhow!("更新包文件大小不匹配: {relative}"));
        }
        if sha256_file(&src)? != file.sha256 {
            return Err(anyhow!("更新包文件哈希不匹配: {relative}"));
        }
        let dst = target_root.join(&relative);
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&src, &dst)?;
    }
    Ok(())
}

#[tauri::command]
async fn check_updates(app: AppHandle, force: bool) -> Result<UpdateCheckResult, String> {
    check_updates_inner(app, force).await
}

async fn check_updates_inner<R: Runtime>(
    app: AppHandle<R>,
    force: bool,
) -> Result<UpdateCheckResult, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let latest = fetch_latest(&config).await.map_err(|e| e.to_string())?;
    let history = fetch_history(&config).await.map_err(|e| e.to_string())?;
    let state = load_release_state(&app).map_err(|e| e.to_string())?;
    let game_path = validate_game_dir(&config.game_dir);

    let current_launcher = launcher_version_from_state(&state);
    let current_game = state.game.version.clone();
    let game_chain = build_chain(&history, &state.game.version, &latest.version, force);
    let chain_versions = game_chain.iter().map(|item| item.version.clone()).collect();
    Ok(UpdateCheckResult {
        current_launcher_version: current_launcher,
        current_game_version: current_game,
        latest_version: latest.version.clone(),
        chain_versions,
        has_launcher_update: false,
        has_game_update: state.game.version != latest.version,
        can_update: game_path.valid && state.game.version != latest.version,
        notes: if !game_path.valid {
            vec!["当前游戏路径无效，无法同步游戏文件版本。".into()]
        } else {
            Vec::new()
        },
    })
}

#[tauri::command]
async fn run_update(
    app: AppHandle,
    force: bool,
    state: State<'_, PendingRestartState>,
) -> Result<UpdateRunResult, String> {
    run_update_inner(app, force, &state).await
}

async fn run_update_inner<R: Runtime>(
    app: AppHandle<R>,
    force: bool,
    _state: &PendingRestartState,
) -> Result<UpdateRunResult, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let latest = fetch_latest(&config).await.map_err(|e| e.to_string())?;
    let history = fetch_history(&config).await.map_err(|e| e.to_string())?;
    let mut release_state = load_release_state(&app).map_err(|e| e.to_string())?;
    let path_status = validate_game_dir(&config.game_dir);
    let game_root = if path_status.valid {
        Some(PathBuf::from(path_status.game_dir.clone()))
    } else {
        None
    };

    emit_update(
        &app,
        "检查",
        "正在获取游戏版本链...",
        3.0,
        Some(latest.version.clone()),
    );

    let game_chain = build_chain(
        &history,
        &release_state.game.version,
        &latest.version,
        force,
    );

    if game_chain.is_empty() {
        return Ok(UpdateRunResult {
            ok: true,
            target_version: latest.version,
            applied_versions: Vec::new(),
            restart_required: false,
            launcher_stage_ready: false,
            message: "游戏文件已经是最新版本。".into(),
            notes: Vec::new(),
        });
    }

    let temp_root = update_temp_dir(&app).map_err(|e| e.to_string())?;
    let mut notes = Vec::new();
    let mut applied_versions = Vec::new();
    let mut downloaded_packages = Vec::new();

    for (index, release) in game_chain.iter().enumerate() {
        let progress_base = 8.0 + (index as f32 * (42.0 / game_chain.len() as f32));
        emit_update(
            &app,
            "版本链",
            format!("准备下载 {}", release.version),
            progress_base,
            Some(release.version.clone()),
        );

        if let Some(root) = game_root.as_ref() {
            if let Some(game_package) = release_package_for_version(&config, release, "game")
                .await
                .map_err(|e| e.to_string())?
            {
                let manifest = fetch_manifest(&game_package.manifest_url)
                    .await
                    .map_err(|e| e.to_string())?;
                let package_path = temp_root.join(format!("game-{}.zip", release.version));
                emit_update(
                    &app,
                    "下载",
                    format!("正在下载游戏更新 {}", release.version),
                    progress_base + 8.0,
                    Some(release.version.clone()),
                );
                download_file(
                    &app,
                    &game_package.package_url,
                    &package_path,
                    "下载",
                    &release.version,
                )
                .await
                .map_err(|e| e.to_string())?;
                if sha256_file(&package_path).map_err(|e| e.to_string())?
                    != game_package.package_sha256
                {
                    return Err(format!("游戏更新包 {} 校验失败", release.version));
                }
                downloaded_packages.push((
                    release.clone(),
                    game_package,
                    manifest,
                    package_path,
                    root.clone(),
                ));
            }
        } else {
            notes.push(format!(
                "{} 的 game 包已跳过：当前游戏路径无效。",
                release.version
            ));
        }
    }

    for (index, (release, game_package, manifest, package_path, root)) in
        downloaded_packages.iter().enumerate()
    {
        let progress_base = 52.0 + (index as f32 * (42.0 / downloaded_packages.len() as f32));
        let extract_dir = temp_root.join(format!("game-{}", release.version));
        emit_update(
            &app,
            "应用",
            format!("正在应用游戏更新 {}", release.version),
            progress_base,
            Some(release.version.clone()),
        );
        extract_zip(package_path, &extract_dir).map_err(|e| e.to_string())?;
        let target_root = extract_dir.join(&manifest.root_dir_name);
        apply_manifest_overlay(&target_root, root, manifest).map_err(|e| e.to_string())?;
        release_state.game = ScopeState {
            version: release.version.clone(),
            package_sha256: game_package.package_sha256.clone(),
            manifest_url: game_package.manifest_url.clone(),
            package_url: game_package.package_url.clone(),
            published_at: release.published_at.clone(),
        };
        applied_versions.push(release.version.clone());
    }

    save_release_state(&app, &release_state).map_err(|e| e.to_string())?;

    emit_update(
        &app,
        "完成",
        format!("游戏更新完成，目标版本 {}", latest.version),
        100.0,
        Some(latest.version.clone()),
    );

    Ok(UpdateRunResult {
        ok: true,
        target_version: latest.version,
        applied_versions,
        restart_required: false,
        launcher_stage_ready: false,
        message: "本次仅同步游戏文件，已生效，无需重启启动器。".into(),
        notes,
    })
}

#[tauri::command]
fn finalize_update_restart(
    app: AppHandle,
    state: State<'_, PendingRestartState>,
) -> Result<bool, String> {
    let pending = state
        .pending
        .lock()
        .map_err(|_| "pending restart state poisoned".to_string())?
        .take();

    if let Some(pending) = pending {
        let script = pending.script_path.to_string_lossy().to_string();
        let _ = spawn_hidden_process(
            Path::new("powershell.exe"),
            &["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", &script],
            None,
        )
        .map_err(|e| e.to_string())?;
        app.exit(0);
        return Ok(true);
    }

    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let cwd = exe
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法解析当前启动器目录".to_string())?;
    spawn_hidden_process(&exe, &[], Some(&cwd)).map_err(|e| e.to_string())?;
    app.exit(0);
    Ok(true)
}

#[tauri::command]
fn restart_self(app: AppHandle) -> Result<bool, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let cwd = exe
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法解析当前启动器目录".to_string())?;
    spawn_hidden_process(&exe, &[], Some(&cwd)).map_err(|e| e.to_string())?;
    app.exit(0);
    Ok(true)
}

#[tauri::command]
fn battle_get_state(app: AppHandle) -> Result<BattleRuntimeState, String> {
    load_battle_runtime_state(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn battle_update_state(
    app: AppHandle,
    state: BattleRuntimeState,
) -> Result<BattleRuntimeState, String> {
    save_battle_runtime_state(&app, &state).map_err(|e| e.to_string())
}

#[tauri::command]
fn battle_capture_screenshot(app: AppHandle) -> Result<BattleCapturePayload, String> {
    let shot_dir = battle_shots_dir(&app).map_err(|e| e.to_string())?;
    let shot_name = format!("ee2x-{}.png", battle_timestamp_slug());
    let shot_path = shot_dir.join(shot_name);
    capture_primary_screen_png(&shot_path).map_err(|e| e.to_string())?;

    let bytes = fs::read(&shot_path).map_err(|e| e.to_string())?;
    let state = BattleRuntimeState {
        status: "running".into(),
        message: "已捕获截图，等待识别与提交。".into(),
        shot_path: shot_path.to_string_lossy().to_string(),
        csv_path: String::new(),
        submitted_at: String::new(),
        report_url: load_config(&app)
            .map(|config| config.battle_report_url)
            .unwrap_or_else(|_| BATTLE_REPORT_URL.into()),
    };
    let _ = save_battle_runtime_state(&app, &state);

    Ok(BattleCapturePayload {
        shot_path: shot_path.to_string_lossy().to_string(),
        image_base64: BASE64.encode(bytes),
    })
}

#[tauri::command]
async fn battle_store_and_submit(
    app: AppHandle,
    payload: BattleSubmitPayload,
) -> Result<BattleRunResult, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let csv_dir = battle_csv_dir(&app).map_err(|e| e.to_string())?;
    let csv_name = build_battle_csv_name(&payload.shot_path);
    let csv_path = csv_dir.join(&csv_name);
    let submitted_at = Utc::now().to_rfc3339();

    let outcome: BattleRunResult = match (|| -> Result<()> {
        fs::write(&csv_path, &payload.csv_content)?;
        upload_battle_csv(&config, &csv_path, &csv_name)?;
        Ok(())
    })() {
        Ok(()) => match submit_battle_csv(&config, &csv_name).await {
            Ok(response) => {
                let ok = response
                    .get("success")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                let message = response
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or(if ok { "战报提交成功。" } else { "战报提交失败。" })
                    .to_string();
                BattleRunResult {
                    ok,
                    message,
                    shot_path: payload.shot_path.clone(),
                    csv_path: csv_path.to_string_lossy().to_string(),
                    submitted_at: submitted_at.clone(),
                    report_url: config.battle_report_url.clone(),
                    duplicate: response
                        .get("duplicate")
                        .and_then(Value::as_bool)
                        .unwrap_or(false),
                    matched: response.get("matched").and_then(Value::as_i64).unwrap_or(0),
                    unmatched: response
                        .get("unmatched")
                        .and_then(Value::as_i64)
                        .unwrap_or(0),
                }
            }
            Err(error) => BattleRunResult {
                ok: false,
                message: error.to_string(),
                shot_path: payload.shot_path.clone(),
                csv_path: csv_path.to_string_lossy().to_string(),
                submitted_at: String::new(),
                report_url: config.battle_report_url.clone(),
                duplicate: false,
                matched: 0,
                unmatched: 0,
            },
        },
        Err(error) => BattleRunResult {
            ok: false,
            message: error.to_string(),
            shot_path: payload.shot_path.clone(),
            csv_path: csv_path.to_string_lossy().to_string(),
            submitted_at: String::new(),
            report_url: config.battle_report_url.clone(),
            duplicate: false,
            matched: 0,
            unmatched: 0,
        },
    };

    let state = BattleRuntimeState {
        status: if outcome.ok { "success" } else { "error" }.into(),
        message: outcome.message.clone(),
        shot_path: outcome.shot_path.clone(),
        csv_path: outcome.csv_path.clone(),
        submitted_at: if outcome.ok {
            outcome.submitted_at.clone()
        } else {
            String::new()
        },
        report_url: outcome.report_url.clone(),
    };
    let _ = save_battle_runtime_state(&app, &state);
    Ok(outcome)
}

#[tauri::command]
fn open_battle_report(app: AppHandle) -> Result<bool, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let url = config.battle_report_url;
    run_hidden_command("cmd.exe", &["/C", "start", "", &url], None).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn open_matchmaking(app: AppHandle) -> Result<bool, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let url = config.matchmaking_url;
    run_hidden_command("cmd.exe", &["/C", "start", "", &url], None).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn open_config_directory(app: AppHandle) -> Result<bool, String> {
    let dir = app_data_dir(&app).map_err(|e| e.to_string())?;
    run_hidden_command("explorer.exe", &[dir.to_string_lossy().as_ref()], None)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[cfg(any())]
mod tests {
    use super::*;
    use serde_json::json;
    use std::{
        ffi::OsString,
        fs::File,
        io::Write,
        net::TcpListener,
        process::{Child, Command, Stdio},
        time::{SystemTime, UNIX_EPOCH},
    };
    use tauri::test::{mock_builder, mock_context, noop_assets, MockRuntime};
    use zip::write::FileOptions;

    const TEST_ROOT_DIR_NAME: &str = "Empire Earth II";

    struct TempDirGuard {
        path: PathBuf,
    }

    impl TempDirGuard {
        fn new(prefix: &str) -> Self {
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos();
            let path = std::env::temp_dir().join(format!("{prefix}-{nanos}"));
            fs::create_dir_all(&path).expect("failed to create temp dir");
            Self { path }
        }
    }

    impl Drop for TempDirGuard {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    struct EnvGuard {
        key: &'static str,
        previous: Option<OsString>,
    }

    impl EnvGuard {
        fn set(key: &'static str, value: &Path) -> Self {
            let previous = std::env::var_os(key);
            std::env::set_var(key, value);
            Self { key, previous }
        }
    }

    impl Drop for EnvGuard {
        fn drop(&mut self) {
            if let Some(value) = &self.previous {
                std::env::set_var(self.key, value);
            } else {
                std::env::remove_var(self.key);
            }
        }
    }

    struct ChildGuard {
        child: Child,
    }

    impl ChildGuard {
        fn new(child: Child) -> Self {
            Self { child }
        }
    }

    impl Drop for ChildGuard {
        fn drop(&mut self) {
            if self.child.try_wait().ok().flatten().is_none() {
                let _ = self.child.kill();
                let _ = self.child.wait();
            }
        }
    }

    fn build_test_app() -> tauri::App<MockRuntime> {
        mock_builder()
            .manage(PendingRestartState::default())
            .build(mock_context(noop_assets()))
            .expect("failed to build mock app")
    }

    fn write_text(path: &Path, content: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("failed to create parent dir");
        }
        fs::write(path, content).expect("failed to write text");
    }

    fn sha256_bytes(bytes: &[u8]) -> String {
        let mut digest = Sha256::new();
        digest.update(bytes);
        format!("{:x}", digest.finalize())
    }

    fn write_release_package(
        scope_dir: &Path,
        root_dir_name: &str,
        package_name: &str,
        files: &[(&str, &str)],
    ) {
        fs::create_dir_all(scope_dir).expect("failed to create scope dir");
        let package_path = scope_dir.join(package_name);
        let file = File::create(&package_path).expect("failed to create package zip");
        let mut archive = zip::ZipWriter::new(file);
        let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        let manifest_files = files
            .iter()
            .map(|(relative, content)| {
                let bytes = content.as_bytes();
                archive
                    .start_file(format!("{root_dir_name}/{relative}"), options)
                    .expect("failed to start zip entry");
                archive.write_all(bytes).expect("failed to write zip entry");
                json!({
                    "path": relative,
                    "size": bytes.len(),
                    "sha256": sha256_bytes(bytes),
                })
            })
            .collect::<Vec<_>>();
        archive.finish().expect("failed to finish zip");

        let package_bytes = fs::read(&package_path).expect("failed to read package zip");
        let manifest = json!({
            "rootDirName": root_dir_name,
            "packageFileName": package_name,
            "packageSha256": sha256_bytes(&package_bytes),
            "deleteList": [],
            "files": manifest_files,
        });
        fs::write(
            scope_dir.join("release-manifest.json"),
            serde_json::to_vec_pretty(&manifest).expect("failed to encode manifest"),
        )
        .expect("failed to write manifest");
    }

    fn write_history_endpoints(server_root: &Path) {
        let api_dir = server_root
            .join("api")
            .join("update")
            .join("v1")
            .join("channels")
            .join("stable");
        fs::create_dir_all(&api_dir).expect("failed to create api dir");
        write_text(
            &api_dir.join("latest"),
            &serde_json::to_string(&json!({ "version": "1.0.2" })).expect("latest json"),
        );
        write_text(
            &api_dir.join("history"),
            &serde_json::to_string(&json!({
                "history": [
                    {
                        "releaseId": "r1",
                        "version": "1.0.1",
                        "publishedAt": "2026-05-25T10:00:00Z"
                    },
                    {
                        "releaseId": "r2",
                        "version": "1.0.2",
                        "publishedAt": "2026-05-25T10:05:00Z"
                    }
                ]
            }))
            .expect("history json"),
        );
    }

    fn write_server_tree(server_root: &Path) {
        write_history_endpoints(server_root);

        let launcher_r1 = server_root
            .join("updates")
            .join("stable")
            .join("releases")
            .join("r1")
            .join("launcher");
        let game_r1 = server_root
            .join("updates")
            .join("stable")
            .join("releases")
            .join("r1")
            .join("game");
        let launcher_r2 = server_root
            .join("updates")
            .join("stable")
            .join("releases")
            .join("r2")
            .join("launcher");
        let game_r2 = server_root
            .join("updates")
            .join("stable")
            .join("releases")
            .join("r2")
            .join("game");

        write_release_package(
            &launcher_r1,
            "launcher-root",
            "launcher-r1.zip",
            &[
                ("smoke-launcher/live.txt", "launcher-1.0.1\n"),
                ("smoke-launcher/obsolete.txt", "launcher-obsolete-1.0.1\n"),
            ],
        );
        write_release_package(
            &game_r1,
            TEST_ROOT_DIR_NAME,
            "game-r1.zip",
            &[
                ("smoke-game/live.txt", "game-1.0.1\n"),
                ("smoke-game/obsolete.txt", "game-obsolete-1.0.1\n"),
            ],
        );
        write_release_package(
            &launcher_r2,
            "launcher-root",
            "launcher-r2.zip",
            &[("smoke-launcher/live.txt", "launcher-1.0.2\n")],
        );
        write_release_package(
            &game_r2,
            TEST_ROOT_DIR_NAME,
            "game-r2.zip",
            &[("smoke-game/live.txt", "game-1.0.2\n")],
        );
    }

    fn pick_free_port() -> u16 {
        TcpListener::bind("127.0.0.1:0")
            .expect("failed to bind free port")
            .local_addr()
            .expect("failed to get local addr")
            .port()
    }

    async fn start_static_server(server_root: &Path) -> (ChildGuard, String) {
        let port = pick_free_port();
        let child = Command::new("python")
            .args([
                "-m",
                "http.server",
                &port.to_string(),
                "--bind",
                "127.0.0.1",
                "--directory",
                server_root.to_string_lossy().as_ref(),
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("failed to start http server");
        let guard = ChildGuard::new(child);
        let base_url = format!("http://127.0.0.1:{port}");
        for _ in 0..40 {
            match http_client()
                .get(format!("{base_url}/api/update/v1/channels/stable/latest"))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => return (guard, base_url),
                _ => tokio::time::sleep(Duration::from_millis(100)).await,
            }
        }
        panic!("static update server did not become ready");
    }

    fn write_game_root(game_root: &Path) {
        fs::create_dir_all(game_root.join("zips_ee2x")).expect("failed to create zips_ee2x");
        fs::create_dir_all(game_root.join("Unofficial Patch Files"))
            .expect("failed to create Unofficial Patch Files");
        write_text(
            &game_root.join("UnofficialVersionConfig.txt"),
            "base-config\n",
        );
        write_text(&game_root.join("EE2X.exe"), "");
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn tauri_launcher_update_smoke_applies_game_and_stages_launcher() {
        let temp = TempDirGuard::new("ee2x-tauri-update");
        let server_root = temp.path.join("server");
        let install_dir = temp.path.join("install-root");
        let app_data_dir = temp.path.join("appdata");
        let game_root = temp.path.join(TEST_ROOT_DIR_NAME);

        write_server_tree(&server_root);
        fs::create_dir_all(&install_dir).expect("failed to create install dir");
        write_text(&install_dir.join("bootstrap.txt"), "seed-launcher\n");
        write_game_root(&game_root);

        let (_server, base_url) = start_static_server(&server_root).await;
        let _install_override = EnvGuard::set(INSTALL_DIR_OVERRIDE_ENV, &install_dir);
        let _appdata_override = EnvGuard::set(APP_DATA_DIR_OVERRIDE_ENV, &app_data_dir);

        let app = build_test_app();
        let mut config = AppConfig::default();
        config.game_dir = game_root.to_string_lossy().to_string();
        config.game_exe_path = game_root.join("EE2X.exe").to_string_lossy().to_string();
        config.update_server_http = base_url;
        config.update_channel = "stable".into();
        save_config_file(&app.handle(), &config).expect("failed to save config");

        let mut release_state = ReleaseState::default();
        release_state.launcher.version = "1.0.0".into();
        release_state.game.version = "1.0.0".into();
        save_release_state(&app.handle(), &release_state).expect("failed to seed release state");

        let update_info = check_updates_inner(app.handle().clone(), false)
            .await
            .expect("check_updates failed");
        assert_eq!(update_info.latest_version, "1.0.2");
        assert_eq!(
            update_info.chain_versions,
            vec!["1.0.1".to_string(), "1.0.2".to_string()]
        );
        assert!(update_info.has_launcher_update);
        assert!(update_info.has_game_update);
        assert!(update_info.can_update);

        let result = run_update_inner(
            app.handle().clone(),
            false,
            &app.state::<PendingRestartState>(),
        )
        .await
        .expect("run_update failed");
        assert!(result.ok);
        assert_eq!(result.target_version, "1.0.2");
        assert_eq!(
            result.applied_versions,
            vec!["1.0.1".to_string(), "1.0.2".to_string()]
        );
        assert!(result.restart_required);
        assert!(result.launcher_stage_ready);

        assert_eq!(
            fs::read_to_string(game_root.join("smoke-game").join("live.txt"))
                .expect("missing game live.txt"),
            "game-1.0.2\n"
        );
        assert!(
            game_root.join("smoke-game").join("obsolete.txt").exists(),
            "v2 未显式删除时应保留 v1 的 obsolete 文件"
        );

        let saved_state = load_release_state(&app.handle()).expect("failed to load release state");
        assert_eq!(saved_state.launcher.version, "1.0.2");
        assert_eq!(saved_state.game.version, "1.0.2");

        let pending_script = app
            .state::<PendingRestartState>()
            .pending
            .lock()
            .expect("pending state poisoned")
            .as_ref()
            .map(|item| item.script_path.clone())
            .expect("missing pending restart script");
        assert!(
            pending_script.exists(),
            "restart script should exist after launcher update"
        );

        let staging_root = app_data_dir.join("update").join("staging");
        let stage_dir = fs::read_dir(&staging_root)
            .expect("missing staging root")
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .find(|path| path.is_dir())
            .expect("missing launcher stage dir");
        assert_eq!(
            fs::read_to_string(stage_dir.join("smoke-launcher").join("live.txt"))
                .expect("missing staged launcher live.txt"),
            "launcher-1.0.2\n"
        );
        assert!(
            stage_dir
                .join("smoke-launcher")
                .join("obsolete.txt")
                .exists(),
            "v2 未显式删除时应保留 v1 的 launcher obsolete 文件"
        );
        assert_eq!(
            fs::read_to_string(stage_dir.join("bootstrap.txt")).expect("missing bootstrap seed"),
            "seed-launcher\n"
        );
    }
}

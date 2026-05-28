(function () {
  const channel = document.body.dataset.channel || "stable";
  const credentialsStorageKey = "ee2x_publish_credentials";

  const activeUsername = document.getElementById("activeUsername");
  const logoutButton = document.getElementById("logoutButton");
  const authOverlay = document.getElementById("authOverlay");
  const usernameInput = document.getElementById("usernameInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginButton = document.getElementById("loginButton");
  const authMessage = document.getElementById("authMessage");
  const bundleFileInput = document.getElementById("bundleFileInput");
  const selectedFileText = document.getElementById("selectedFileText");
  const uploadButton = document.getElementById("uploadButton");
  const refreshButton = document.getElementById("refreshButton");
  const progressCard = document.getElementById("progressCard");
  const progressTitle = document.getElementById("progressTitle");
  const progressPercent = document.getElementById("progressPercent");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const resultCard = document.getElementById("resultCard");
  const uploadMessage = document.getElementById("uploadMessage");
  const historyMessage = document.getElementById("historyMessage");
  const currentVersion = document.getElementById("currentVersion");
  const currentReleaseId = document.getElementById("currentReleaseId");
  const historyList = document.getElementById("historyList");
  const confirmOverlay = document.getElementById("confirmOverlay");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmText = document.getElementById("confirmText");
  const confirmCancelButton = document.getElementById("confirmCancelButton");
  const confirmConfirmButton = document.getElementById("confirmConfirmButton");

  let confirmResolver = null;

  function getCredentials() {
    const raw = sessionStorage.getItem(credentialsStorageKey) || "";
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      const username = String(parsed.username || "").trim();
      const password = String(parsed.password || "");
      if (!username || !password) {
        return null;
      }
      return { username, password };
    } catch (_error) {
      return null;
    }
  }

  function setCredentials(username, password) {
    if (username && password) {
      sessionStorage.setItem(
        credentialsStorageKey,
        JSON.stringify({ username, password }),
      );
    } else {
      sessionStorage.removeItem(credentialsStorageKey);
    }
    renderAuthState();
  }

  function basicAuthHeader(credentials) {
    if (!credentials) {
      return "";
    }
    return `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
  }

  function renderAuthState() {
    const credentials = getCredentials();
    const loggedIn = Boolean(credentials);
    authOverlay.classList.toggle("hidden", loggedIn);
    document.body.classList.toggle("modal-open", !loggedIn);
    if (loggedIn) {
      activeUsername.textContent = credentials.username;
      usernameInput.value = credentials.username;
      passwordInput.value = credentials.password;
      authMessage.textContent = "登录成功，可以进入操作页面。";
      authMessage.className = "inline-status";
    } else {
      activeUsername.textContent = "未登录";
      authMessage.textContent = "请输入账号密码后登录。默认账号密码均为 ee2x。";
      authMessage.className = "inline-status muted";
      if (!usernameInput.value.trim()) {
        usernameInput.value = "ee2x";
      }
      if (!passwordInput.value) {
        passwordInput.value = "ee2x";
      }
    }
  }

  function setMessage(node, text, tone) {
    if (!text) {
      node.textContent = "";
      node.className = "message hidden";
      return;
    }
    node.textContent = text;
    node.className = `message ${tone || "info"}`;
  }

  function setProgressVisible(visible) {
    progressCard.classList.toggle("hidden", !visible);
  }

  function setUploadBusy(busy) {
    uploadButton.disabled = busy;
    bundleFileInput.disabled = busy;
    uploadButton.textContent = busy ? "正在上传..." : "上传并发布";
  }

  function formatFileSize(size) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderResult(payload) {
    if (!payload) {
      resultCard.className = "result-card hidden";
      resultCard.innerHTML = "";
      return;
    }
    resultCard.className = "result-card";
    resultCard.innerHTML = `
      <strong>发布完成</strong>
      <div>版本号: ${escapeHtml(payload.version)}</div>
      <div>Release ID: ${escapeHtml(payload.releaseId)}</div>
      <div>latest.json: ${escapeHtml(payload.latestUrl)}</div>
      <div>启动器文件 ${payload.launcherFileCount || 0} 项，游戏文件 ${payload.gameFileCount || 0} 项</div>
      <div>显式删除启动器 ${payload.launcherDeletedCount || 0} 项，游戏 ${payload.gameDeletedCount || 0} 项</div>
      <div>未勾选文件不会被自动删除。</div>
      <div>UP1.6 冻结保护已移除，所有文件均可被正常更新覆盖。</div>
    `;
  }

  function openAuthOverlay(message) {
    if (message) {
      authMessage.textContent = message;
      authMessage.className = "inline-status";
    }
    authOverlay.classList.remove("hidden");
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      usernameInput.focus();
      usernameInput.select();
    }, 30);
  }

  async function login(username, password) {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    const response = await fetch("/api/update/v1/auth/login", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.detail || payload.error || `登录失败: HTTP ${response.status}`);
    }
    return payload;
  }

  function showConfirmDialog({ title, text, confirmLabel }) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmConfirmButton.textContent = confirmLabel || "确认";
    confirmOverlay.classList.remove("hidden");
    document.body.classList.add("modal-open");
    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  function closeConfirmDialog(confirmed) {
    confirmOverlay.classList.add("hidden");
    if (!getCredentials()) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    if (confirmResolver) {
      const resolver = confirmResolver;
      confirmResolver = null;
      resolver(Boolean(confirmed));
    }
  }

  async function fetchHistory() {
    setMessage(historyMessage, "", "");
    const response = await fetch(`/api/update/v1/channels/${encodeURIComponent(channel)}/history?limit=0`);
    const payload = await response.json();
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.detail || payload.error || `读取历史失败: HTTP ${response.status}`);
    }
    return payload;
  }

  function renderHistory(payload) {
    currentVersion.textContent = payload.currentVersion || "-";
    currentReleaseId.textContent = payload.currentReleaseId || "-";

    const items = Array.isArray(payload.history) ? payload.history : [];
    if (!items.length) {
      historyList.innerHTML = '<div class="history-item"><div class="history-notes">当前频道还没有发布记录。</div></div>';
      return;
    }

    historyList.innerHTML = items
      .map((entry) => {
        const isCurrent = entry.releaseId === payload.currentReleaseId;
        const versionLabel = entry.version || entry.releaseId || "-";
        const notes = (entry.notes || "").trim() || "无更新说明";
        return `
          <article class="history-item ${isCurrent ? "current" : ""}">
            <div class="history-top">
              <div>
                <div class="history-version">${escapeHtml(versionLabel)}</div>
                <div class="history-meta">Release ID: ${escapeHtml(entry.releaseId || "-")} · 发布时间: ${escapeHtml(entry.generatedAt || "-")}</div>
              </div>
              <button
                class="danger-button delete-button"
                type="button"
                data-release-id="${escapeHtml(entry.releaseId || "")}"
                data-version="${escapeHtml(versionLabel)}"
                data-current="${isCurrent ? "1" : "0"}"
              >
                删除版本
              </button>
            </div>
            <div class="history-tags">
              ${isCurrent ? '<span class="tag current">当前版本</span>' : ""}
              <span class="tag files">下载 ${entry.downloadCount || 0} 次</span>
              <span class="tag files">启动器 ${entry.launcherFileCount || 0} 项 · 游戏 ${entry.gameFileCount || 0} 项</span>
              <span class="tag delete">显式删除 ${((entry.launcherDeletedCount || 0) + (entry.gameDeletedCount || 0))} 项</span>
            </div>
            <div class="history-notes">${escapeHtml(notes)}</div>
          </article>
        `;
      })
      .join("");

    historyList.querySelectorAll(".delete-button").forEach((button) => {
      button.addEventListener("click", () => handleDelete(button));
    });
  }

  async function refreshHistory() {
    try {
      refreshButton.disabled = true;
      const payload = await fetchHistory();
      renderHistory(payload);
    } catch (error) {
      setMessage(historyMessage, error.message || String(error), "error");
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function handleDelete(button) {
    const credentials = getCredentials();
    if (!credentials) {
      openAuthOverlay("删除版本前请先登录账号密码。");
      return;
    }
    const releaseId = button.dataset.releaseId || "";
    const version = button.dataset.version || releaseId;
    const isCurrent = button.dataset.current === "1";
    if (!releaseId) {
      return;
    }

    const confirmed = await showConfirmDialog({
      title: isCurrent ? "确认删除当前版本" : "确认删除版本",
      text: isCurrent
        ? `确认删除当前版本 ${version} 吗？删除后会自动回退到上一版。`
        : `确认删除版本 ${version} 吗？`,
      confirmLabel: "确认删除",
    });
    if (!confirmed) {
      return;
    }

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = "删除中...";
    try {
      const response = await fetch(`/api/update/v1/channels/${encodeURIComponent(channel)}/releases/${encodeURIComponent(releaseId)}`, {
        method: "DELETE",
        headers: {
          Authorization: basicAuthHeader(credentials),
        },
      });
      const payload = await response.json();
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.detail || payload.error || `删除失败: HTTP ${response.status}`);
      }
      setMessage(historyMessage, `已删除版本 ${version}。`, "success");
      await refreshHistory();
    } catch (error) {
      setMessage(historyMessage, error.message || String(error), "error");
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  function uploadBundle(file, credentials) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/update/v1/releases/publish-bundle");
      xhr.responseType = "json";
      xhr.setRequestHeader("Authorization", basicAuthHeader(credentials));

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) {
          progressTitle.textContent = "正在上传更新包...";
          progressPercent.textContent = "处理中";
          progressBar.style.width = "100%";
          progressText.textContent = "浏览器未提供总大小，服务端仍会继续接收。";
          return;
        }
        const ratio = event.total > 0 ? event.loaded / event.total : 0;
        progressTitle.textContent = "正在上传更新包...";
        progressPercent.textContent = `${(ratio * 100).toFixed(1)}%`;
        progressBar.style.width = `${(ratio * 100).toFixed(1)}%`;
        progressText.textContent = `${formatFileSize(event.loaded)} / ${formatFileSize(event.total)}`;
      });

      xhr.addEventListener("load", () => {
        const payload = xhr.response || {};
        if (xhr.status < 200 || xhr.status >= 300 || payload.ok !== true) {
          reject(new Error(payload.detail || payload.error || `上传失败: HTTP ${xhr.status}`));
          return;
        }
        resolve(payload);
      });

      xhr.addEventListener("error", () => {
        reject(new Error("网络错误，上传未完成。"));
      });

      const formData = new FormData();
      formData.append("bundleFile", file);
      xhr.send(formData);
    });
  }

  async function handleUpload() {
    const credentials = getCredentials();
    if (!credentials) {
      openAuthOverlay("上传前请先登录账号密码。");
      return;
    }
    const file = bundleFileInput.files && bundleFileInput.files[0];
    if (!file) {
      setMessage(uploadMessage, "请先选择一个更新包 ZIP。", "warning");
      return;
    }

    renderResult(null);
    setMessage(uploadMessage, "", "");
    setProgressVisible(true);
    setUploadBusy(true);
    progressTitle.textContent = "正在上传更新包...";
    progressPercent.textContent = "0%";
    progressBar.style.width = "0%";
    progressText.textContent = "准备上传";
    try {
      const payload = await uploadBundle(file, credentials);
      progressTitle.textContent = "上传完成，服务器已发布";
      progressPercent.textContent = "100%";
      progressBar.style.width = "100%";
      progressText.textContent = "最新版本与历史正在刷新";
      renderResult(payload);
      setMessage(uploadMessage, `已成功发布版本 ${payload.version}。`, "success");
      await refreshHistory();
    } catch (error) {
      setMessage(uploadMessage, error.message || String(error), "error");
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
      authMessage.textContent = "请输入账号和密码。";
      authMessage.className = "inline-status";
      return;
    }
    loginButton.disabled = true;
    loginButton.textContent = "登录中...";
    try {
      const payload = await login(username, password);
      setCredentials(username, password);
      setMessage(uploadMessage, `登录成功，当前账号 ${payload.username}。`, "success");
    } catch (error) {
      setCredentials("", "");
      authMessage.textContent = error.message || String(error);
      authMessage.className = "inline-status";
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "登录进入";
    }
  }

  function handleLogout() {
    setCredentials("", "");
    openAuthOverlay("请重新登录后进入操作页面。");
  }

  confirmCancelButton.addEventListener("click", () => closeConfirmDialog(false));
  confirmConfirmButton.addEventListener("click", () => closeConfirmDialog(true));
  loginButton.addEventListener("click", handleLogin);
  logoutButton.addEventListener("click", handleLogout);
  bundleFileInput.addEventListener("change", () => {
    const file = bundleFileInput.files && bundleFileInput.files[0];
    selectedFileText.textContent = file
      ? `${file.name} · ${formatFileSize(file.size)}`
      : "尚未选择文件";
  });
  uploadButton.addEventListener("click", handleUpload);
  refreshButton.addEventListener("click", refreshHistory);

  usernameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  });
  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  });

  sessionStorage.removeItem(credentialsStorageKey);
  renderAuthState();
  openAuthOverlay("请输入账号密码后登录。默认账号密码均为 ee2x。");
  refreshHistory();
})();

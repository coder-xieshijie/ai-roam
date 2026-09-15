document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const status = document.getElementById("copy-status");
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      status.textContent = "已复制公众号名称，可在微信中搜索。";
    } catch {
      status.textContent = `请在微信中搜索：${button.dataset.copy}`;
    }
  });
});

const syncStatus = document.querySelector("[data-sync-status]");
if (syncStatus) {
  const value = (selector, next) => {
    const element = syncStatus.querySelector(selector);
    if (element) element.textContent = next;
  };
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let amount = bytes;
    let unit = 0;
    while (amount >= 1024 && unit < units.length - 1) {
      amount /= 1024;
      unit += 1;
    }
    return `${amount >= 10 || unit === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unit]}`;
  };
  const formatTime = (raw) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  };
  const renderFileChanges = (metrics) => {
    const windows = metrics?.windows;
    if (!windows || !Object.keys(windows).length) {
      value("[data-change-tracking]", "变更统计暂不可用");
      return;
    }
    syncStatus.querySelectorAll("[data-change-window]").forEach((row) => {
      const windowStatus = windows[row.dataset.changeWindow];
      if (!windowStatus) return;
      for (const action of ["created", "modified", "deleted"]) {
        const count = windowStatus[action];
        const target = row.querySelector(`[data-change-${action}]`);
        if (target)
          target.textContent = Number.isInteger(count)
            ? count.toLocaleString("zh-CN")
            : "—";
      }
      const coverage = row.querySelector("[data-change-coverage]");
      if (coverage) {
        coverage.textContent = windowStatus.complete ? "完整" : "积累中";
        coverage.dataset.complete = windowStatus.complete ? "true" : "false";
        if (!windowStatus.complete && windowStatus.completeAt)
          coverage.title = `将在 ${formatTime(windowStatus.completeAt)} 积累完整`;
      }
    });
    if (metrics.status === "delayed") {
      value(
        "[data-change-tracking]",
        `统计延迟 · 上次扫描 ${formatTime(metrics.lastScannedAt)}`,
      );
    } else {
      value(
        "[data-change-tracking]",
        `统计开始于 ${formatTime(metrics.trackingSince)}`,
      );
    }
  };
  const renderLineChanges = (metrics) => {
    const windows = metrics?.windows;
    if (!windows || !Object.keys(windows).length) {
      value("[data-line-tracking]", "等待电脑建立统计基线");
      return;
    }
    syncStatus.querySelectorAll("[data-line-window]").forEach((row) => {
      const windowStatus = windows[row.dataset.lineWindow];
      if (!windowStatus) return;
      for (const action of ["added", "deleted"]) {
        const count = windowStatus[action];
        const target = row.querySelector(`[data-line-${action}]`);
        if (target)
          target.textContent = Number.isInteger(count)
            ? count.toLocaleString("zh-CN")
            : "—";
      }
      const coverage = row.querySelector("[data-line-coverage]");
      if (coverage) {
        coverage.textContent = windowStatus.complete ? "完整" : "积累中";
        coverage.dataset.complete = windowStatus.complete ? "true" : "false";
        if (!windowStatus.complete && windowStatus.completeAt)
          coverage.title = `将在 ${formatTime(windowStatus.completeAt)} 积累完整`;
      }
    });
    if (metrics.status === "delayed") {
      value(
        "[data-line-tracking]",
        `统计延迟 · 电脑上次扫描 ${formatTime(metrics.lastScannedAt)}`,
      );
    } else {
      value(
        "[data-line-tracking]",
        `统计开始于 ${formatTime(metrics.trackingSince)}`,
      );
    }
  };
  const refresh = async () => {
    syncStatus.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(syncStatus.dataset.endpoint, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const status = await response.json();
      const online = status.status === "online";
      syncStatus.dataset.state = online ? "online" : "offline";
      value("[data-status-label]", online ? "运行正常" : "服务异常");
      value(
        "[data-status-documents]",
        Number.isInteger(status.documentCount)
          ? status.documentCount.toLocaleString("zh-CN")
          : "—",
      );
      value("[data-status-storage]", formatBytes(status.storageBytes));
      value("[data-status-data]", formatBytes(status.dataBytes));
      value("[data-status-updated]", formatTime(status.updatedAt));
      renderFileChanges(status.changeMetrics);
      renderLineChanges(status.lineMetrics);
      value(
        "[data-status-message]",
        online
          ? "同步服务在线。状态数据经过脱敏处理。"
          : "同步服务当前不可用；页面仍显示最后一次成功取得的统计值。",
      );
    } catch {
      syncStatus.dataset.state = "unknown";
      value("[data-status-label]", "无法读取");
      value("[data-change-tracking]", "暂时无法读取变更统计");
      value("[data-line-tracking]", "暂时无法读取行数统计");
      value(
        "[data-status-message]",
        "暂时无法取得服务器状态，请稍后刷新页面。",
      );
    } finally {
      syncStatus.setAttribute("aria-busy", "false");
    }
  };
  refresh();
  window.setInterval(refresh, 60_000);
}

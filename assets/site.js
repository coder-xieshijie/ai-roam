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
  const formatCount = (count) =>
    Number.isInteger(count) ? count.toLocaleString("zh-CN") : "—";
  const tabs = [...syncStatus.querySelectorAll("[data-change-tab]")];
  const panel = syncStatus.querySelector("[data-change-panel]");
  let activeWindow = "1d";
  let latestFileMetrics;
  let latestLineMetrics;
  const trackingText = (metrics, local) => {
    if (!metrics?.windows || !Object.keys(metrics.windows).length)
      return local ? "行数统计等待电脑建立基线" : "文件统计暂不可用";
    if (metrics.status === "delayed")
      return `${local ? "电脑" : "服务器"}统计延迟 · ${formatTime(metrics.lastScannedAt)}`;
    return `${local ? "行数" : "文件"}统计开始于 ${formatTime(metrics.trackingSince)}`;
  };
  const renderSelectedWindow = () => {
    const fileWindow = latestFileMetrics?.windows?.[activeWindow];
    const lineWindow = latestLineMetrics?.windows?.[activeWindow];
    value("[data-summary-created]", formatCount(fileWindow?.created));
    value("[data-summary-modified]", formatCount(fileWindow?.modified));
    value("[data-summary-deleted]", formatCount(fileWindow?.deleted));
    value("[data-summary-lines-added]", formatCount(lineWindow?.added));
    value("[data-summary-lines-deleted]", formatCount(lineWindow?.deleted));
    const coverage = syncStatus.querySelector("[data-window-coverage]");
    if (coverage) {
      const available = fileWindow && lineWindow;
      const complete = available && fileWindow.complete && lineWindow.complete;
      coverage.textContent = available ? (complete ? "数据完整" : "积累中") : "部分数据待就绪";
      coverage.dataset.complete = complete ? "true" : "false";
      const completeAt = [fileWindow?.completeAt, lineWindow?.completeAt]
        .filter(Boolean)
        .sort()
        .at(-1);
      coverage.title = !complete && completeAt ? `将在 ${formatTime(completeAt)} 积累完整` : "";
    }
  };
  const renderChanges = (fileMetrics, lineMetrics) => {
    latestFileMetrics = fileMetrics;
    latestLineMetrics = lineMetrics;
    value("[data-change-tracking]", trackingText(fileMetrics, false));
    value("[data-line-tracking]", trackingText(lineMetrics, true));
    renderSelectedWindow();
  };
  const activateTab = (tab, moveFocus = false) => {
    activeWindow = tab.dataset.changeTab;
    for (const candidate of tabs) {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", selected ? "true" : "false");
      candidate.tabIndex = selected ? 0 : -1;
    }
    if (panel) panel.setAttribute("aria-labelledby", tab.id);
    renderSelectedWindow();
    if (moveFocus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      activateTab(tabs[nextIndex], true);
    });
  });
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
      renderChanges(status.changeMetrics, status.lineMetrics);
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

// All articles remain available when JavaScript is disabled.
const articleFilters = document.querySelector('[data-article-filters]');
if (articleFilters) {
  const buttons = [...articleFilters.querySelectorAll('button[data-topic]')];
  const articles = [...document.querySelectorAll('[data-article-topic]')];
  const counter = document.querySelector('[data-article-count]');
  const groups = [...document.querySelectorAll('[data-year-group]')];
  const applyTopic = topic => {
    const selected = buttons.some(button => button.dataset.topic === topic) ? topic : '';
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.topic === selected));
    for (const article of articles) article.hidden = Boolean(selected && article.dataset.articleTopic !== selected);
    for (const group of groups) group.hidden = !group.querySelector('[data-article-topic]:not([hidden])');
    counter.textContent = `${selected || '全部文章'} · ${articles.filter(article => !article.hidden).length} 篇`;
  };
  articleFilters.hidden = false;
  applyTopic(new URL(location.href).searchParams.get('topic') || '');
  for (const button of buttons) button.addEventListener('click', () => {
    const url = new URL(location.href);
    if (button.dataset.topic) url.searchParams.set('topic', button.dataset.topic);
    else url.searchParams.delete('topic');
    history.replaceState(null, '', url);
    applyTopic(button.dataset.topic);
  });
}

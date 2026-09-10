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

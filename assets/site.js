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

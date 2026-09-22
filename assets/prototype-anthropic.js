// Verify real faces so an unavailable local font is never presented as a match.
(async () => {
  document.body.dataset.fontState = 'loading';
  const families = ['Study Anthropic Sans', 'Study Anthropic Mono', 'Study WenKai', 'Study Plex'];
  const results = await Promise.allSettled(families.map(family => document.fonts.load(`400 16px "${family}"`)));
  const missing = families.filter((_, index) => results[index].status !== 'fulfilled' || !results[index].value.length);
  document.body.dataset.fontState = missing.length ? 'error' : 'ready';
  if (!missing.length) return;
  const notice = document.createElement('p');
  notice.className = 'd-font-notice d-wrap';
  notice.setAttribute('role', 'status');
  notice.textContent = `字体未加载：${missing.map(family => family.replace('Study ', '')).join('、')}。当前显示回退字体；Anthropic 预览需要本机已安装相应字体。`;
  document.querySelector('.d-header').after(notice);
})();

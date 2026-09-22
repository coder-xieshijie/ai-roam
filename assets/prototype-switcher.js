// Keep the same reading point while comparing the local homepage drafts.
(() => {
  const switcher = document.querySelector('.prototype-switcher');
  if (!switcher) return;
  const sections = ['journey', 'work', 'skills', 'writing', 'about'];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const navigate = href => {
    const url = new URL(href, location.href);
    const focus = innerHeight * .32;
    const section = sections.map(id => document.getElementById(id)).filter(element => element && element.getBoundingClientRect().top <= focus).at(-1);
    if (section) {
      url.searchParams.set('at', section.id);
      url.searchParams.set('within', ((focus - section.getBoundingClientRect().top) / section.offsetHeight).toFixed(4));
    }
    url.searchParams.set('pos', (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(4));
    location.href = url.href;
  };
  switcher.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.href);
  });
  switcher.querySelector('select').addEventListener('change', event => navigate('?variant=' + event.target.value));
  addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey || event.target.closest('input,textarea,select,[contenteditable]')) return;
    event.preventDefault();
    const steps = switcher.querySelectorAll('.prototype-step');
    navigate(steps[event.key === 'ArrowLeft' ? 0 : 1].href);
  });
  const params = new URLSearchParams(location.search);
  if (!params.has('pos') || location.hash) return;
  addEventListener('load', async () => {
    await document.fonts.ready;
    const id = params.get('at');
    const section = sections.includes(id) ? document.getElementById(id) : null;
    const within = Number(params.get('within')) || 0;
    const position = clamp(Number(params.get('pos')) || 0, 0, 1);
    const top = section ? section.getBoundingClientRect().top + scrollY + clamp(within, 0, 5) * section.offsetHeight - innerHeight * .32 : position * (document.documentElement.scrollHeight - innerHeight);
    scrollTo({top, behavior: 'instant'});
  }, {once: true});
})();

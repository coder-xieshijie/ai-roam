// Local-only homepage comparison on /?variant=.
// Question: which reading path fits AI Roam's brand?
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { renderRobotDemo } from './robot-demo.mjs';
import { renderTrailDemo } from './trail-demo.mjs';

const root = resolve(import.meta.dirname, '..');
const site = JSON.parse(await readFile(resolve(root, 'content/site.json'), 'utf8'));
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link = (href, text, cls = 'v-link') => `<a class="${cls}" href="${escape(href)}">${escape(text)} <span aria-hidden="true">↗</span></a>`;
const [lord, skills] = site.projects;
const article = site.articles[0];
const variants = [['original','原版'], ['vine','藤蔓'], ['robot','机器人'], ['scarlet','朱红探索线'], ['sketch','手绘游迹']];
const switcher = (variant) => {
  const index = variants.findIndex(([key]) => key === variant);
  const previous = variants[(index + variants.length - 1) % variants.length][0];
  const next = variants[(index + 1) % variants.length][0];
  return `<aside class="prototype-switcher" aria-label="首页原型对照"><span>DEMO</span><a class="prototype-step" href="?variant=${previous}" aria-label="上一个方案">‹</a>${variants.map(([key,label]) => `<a class="prototype-option" href="?variant=${key}" ${variant===key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}<select class="prototype-select" aria-label="选择对照方案">${variants.map(([key,label]) => `<option value="${key}" ${variant===key ? 'selected' : ''}>${label}</option>`).join('')}</select>${variant === 'vine' ? '<button type="button" id="replay-vine" title="回到顶部，重新浏览生长效果">重播 ↺</button>' : ''}<a class="prototype-step" href="?variant=${next}" aria-label="下一个方案">›</a></aside><script src="./assets/prototype-switcher.js" defer></script>`;
};
const demo = `<!doctype html>
<html lang="zh-CN" data-bloom="clay"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>藤蔓花园 · AI游民首页 Demo</title><meta name="robots" content="noindex"><link rel="icon" href="./assets/favicon.ico"><link rel="stylesheet" href="./assets/prototype-vine.css"><script src="./assets/prototype-vine.js" defer></script><script src="./assets/site.js" defer></script></head>
<body class="vine-demo"><a class="v-skip" href="#main">跳到正文</a>
<header class="v-header"><a class="v-brand" href="?variant=vine"><img src="./assets/brand-robot.png" width="40" height="40" alt=""><span>AI游民<small>SHIJIE'S FIELD NOTES</small></span></a><nav aria-label="主导航"><a href="#work">作品</a><a href="#writing">文章与实践</a><a href="./about/">关于我</a>${link(site.github, 'GitHub', 'v-github')}</nav></header>
<main id="main">
<section class="v-hero">
  <div class="v-hero-copy"><p class="v-eyebrow"><i></i> 谢世杰 / DEVELOPER & AI EXPLORER</p><h1>让好奇心生根，<br>让想法<span>长成作品。</span></h1><p class="v-description">帮技术人把 AI 变成工作能力、判断力和职业杠杆。<br>在这里，记录工具、实践，以及一路生长的思考。</p><div class="v-actions">${link('#work', '沿着藤蔓，开始探索', 'v-button')}${link('./writing/', '读我的文章')}</div><p class="v-hero-note"><span class="v-small-line"></span> STAY CURIOUS. KEEP GROWING.</p></div>
  <figure class="v-portrait"><svg id="portrait-vine" viewBox="0 0 460 460" aria-hidden="true"></svg><div class="v-portrait-disc"><img src="./assets/brand-robot.png" width="280" height="280" alt="AI游民的朱红机器人，被绿叶与小花环绕"></div><span class="v-portrait-stamp">A WORK IN<br><em>progress.</em></span><figcaption>保持好奇，慢慢生长。</figcaption></figure>
  <div class="v-hero-bottom"><span>一片持续生长的数字花园</span><a href="#journey">向下漫游 <span aria-hidden="true">↓</span></a><span>TOOLS · IDEAS · FIELD NOTES</span></div>
</section>
<section class="v-journey" id="journey" aria-label="从作品到思考的探索路径">
  <div class="v-journey-intro"><p class="v-eyebrow">THE GROWING PATH</p><h2>从一个问题，<em>慢慢展开。</em></h2><p>做一点东西，写一点思考，再向前走一点。</p></div>
  <svg class="v-trail" id="growing-vine" aria-hidden="true"></svg>
  <article class="v-chapter" id="work"><div class="v-chapter-copy"><p class="v-eyebrow">01 / BUILD · 让想法落地</p><h2>${escape(lord.name)}</h2><p class="v-chapter-lead">给多个 Agent，<br>一条清晰的工作路径。</p><p>${escape(lord.summary)}${escape(lord.detail)}</p>${link('./projects/agent-lord/', '走进这个项目')}</div><figure class="v-project-art"><div class="v-browser-bar"><span><i></i><i></i><i></i></span><span>AGENT LORD / OBSERVER</span><span>↗</span></div><a href="./projects/agent-lord/"><img src="./assets/observer-example.jpg" width="1280" height="720" alt="Agent Lord Observer 的任务与执行记录演示" loading="lazy"></a><figcaption><span class="v-status-dot"></span> 一个窗口，看见每一步。<small>界面演示 · 合成示例数据</small></figcaption><span class="v-paper-label">01 — THE TOOL SHED</span></figure></article>
  <article class="v-chapter v-reverse" id="skills"><div class="v-chapter-copy"><p class="v-eyebrow">02 / SHARE · 把方法留下</p><h2>${escape(skills.name)}</h2><p class="v-chapter-lead">好用的方法，<br>值得被反复使用。</p><p>${escape(skills.summary)}${escape(skills.detail)}</p>${link('./projects/dev-skills/', '看看这些 Skills')}</div><div class="v-skill-art"><span class="v-card-overline">THE FIELD KIT / 开发者手记</span><div class="v-skill-sheet"><span class="v-sheet-number">I.</span><h3>把复杂的事，讲明白。</h3><code>$explain-as-fool</code><p>解释一下什么是线程池</p></div><div class="v-skill-sheet"><span class="v-sheet-number">II.</span><h3>让每个判断，有依据。</h3><code>$review-rules</code><p>复核这条评审意见</p></div><span class="v-hand-note">from practice, with care.</span></div></article>
  <article class="v-chapter" id="writing"><div class="v-chapter-copy"><p class="v-eyebrow">03 / REFLECT · 留下思考</p><h2>写下来的思考</h2><p class="v-chapter-lead">把做过的事，<br>再想清楚一点。</p><p>记录 AI 开发中的具体问题、实践方法和判断。从真实的问题出发，在写作中理清思路。</p>${link('./writing/', '翻开我的文章')}</div><a class="v-article-art" href="./writing/${escape(article.slug)}/"><div class="v-article-top"><span>FIELD NOTES</span><span>NO. 001</span></div><div class="v-article-symbol" aria-hidden="true">✳</div><span class="v-eyebrow">${escape(article.topic)}</span><h3>${escape(article.title)}</h3><p>${escape(article.summary)}</p><div class="v-article-bottom"><time datetime="${escape(article.published)}">${escape(article.published.replaceAll('-', '.'))}</time><span>${escape(article.reading)} · 阅读 ↗</span></div></a></article>
  <article class="v-chapter v-reverse v-about" id="about"><div class="v-chapter-copy"><p class="v-eyebrow">04 / GROW · 继续探索</p><h2>一条持续的主线</h2><p class="v-chapter-lead">工具在变，<br>好奇心一直在。</p><p>从研发效能、代码智能到 AI Coding，我一直关心：怎样让开发者工作得更高效。</p>${link('./about/', '更多关于我')}</div><div class="v-about-art"><span class="v-card-overline">A FEW THINGS ALONG THE WAY</span><ol><li><span>01</span><span>研发效能<small>让工作更顺畅</small></span></li><li><span>02</span><span>代码智能<small>让工具理解代码</small></span></li><li><span>03</span><span>AI Coding<small>让想法走得更远</small></span></li></ol><p>不是终点，是下一片新叶。</p></div></article>
</section>
<section class="v-closing"><svg id="closing-flower" viewBox="0 0 100 130" aria-hidden="true"></svg><p class="v-eyebrow">ALWAYS A LITTLE FURTHER</p><h2>继续探索，<em>终会开花。</em></h2><p>探索 AI，也探索工作与成长的新可能。</p><div class="v-actions">${link(site.github, '在 GitHub 相遇')}<button type="button" class="v-copy" data-copy="${escape(site.wechat)}">公众号 · ${escape(site.wechat)} <span aria-hidden="true">⧉</span></button></div><span id="copy-status" role="status" aria-live="polite"></span></section>
</main><footer class="v-footer"><span>© 2026 谢世杰 · AI ROAM</span><a href="https://beian.miit.gov.cn/">${escape(site.filing.icp)}</a><a href="./sync-status/">同步状态 ↗</a></footer>
<div class="v-flower-picker" role="group" aria-label="花朵配色"><span>挑一朵花</span><button type="button" data-flower="clay" aria-label="朱红花" aria-pressed="true"><span>✿</span></button><button type="button" data-flower="iris" aria-label="鸢尾紫花" aria-pressed="false"><span>✿</span></button><button type="button" data-flower="gold" aria-label="金盏花" aria-pressed="false"><span>✿</span></button></div>
${switcher('vine')}</body></html>`;

const robotDemo = renderRobotDemo(site, switcher);
const trailDemos = {scarlet: renderTrailDemo(site, switcher, 'scarlet'), sketch: renderTrailDemo(site, switcher, 'sketch')};

const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.svg':'image/svg+xml'};
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const variant = url.searchParams.get('variant') || 'scarlet';
      const original = variant === 'original';
      const html = original ? (await readFile(resolve(root, 'dist/index.html'), 'utf8')).replace('</head>', '<link rel="stylesheet" href="./assets/prototype-vine.css"></head>').replace('</body>', switcher('original') + '</body>') : variant === 'vine' ? demo : variant === 'robot' ? robotDemo : trailDemos[variant] || trailDemos.scarlet;
      response.writeHead(200, {'Content-Type':mime['.html'],'Cache-Control':'no-store'}).end(html);
      return;
    }
    let path = resolve(root, 'dist', '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(resolve(root, 'dist') + sep)) { response.writeHead(403).end(); return; }
    if (url.pathname.endsWith('/')) path = resolve(path, 'index.html');
    // Prototype assets are served from source, so CSS/JS edits only need a reload.
    if (/\/assets\/prototype-(vine|robot|trail|switcher)\.(css|js)$/.test(url.pathname)) path = resolve(root, 'assets', url.pathname.split('/').pop());
    response.writeHead(200, {'Content-Type':mime[extname(path)] || 'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(path));
  } catch { response.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Homepage comparison demo: http://127.0.0.1:4173/?variant=scarlet'));

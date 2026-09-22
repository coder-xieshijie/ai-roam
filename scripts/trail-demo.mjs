// Two carriers for the same viewport-driven drawing interaction.
export function renderTrailDemo(site, switcher, variant) {
  const sketch = variant === 'sketch';
  const name = sketch ? '手绘游迹' : '朱红探索线';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = (href, text, cls = 't-link') => `<a class="${cls}" href="${esc(href)}">${esc(text)} <span aria-hidden="true">↗</span></a>`;
  const [lord, skills] = site.projects;
  const article = site.articles[0];
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="noindex"><title>${name} · AI游民首页 Demo</title><link rel="icon" href="./assets/favicon.ico"><link rel="stylesheet" href="./assets/prototype-vine.css"><link rel="stylesheet" href="./assets/prototype-trail.css"><script src="./assets/prototype-trail.js" defer></script><script src="./assets/site.js" defer></script></head>
<body class="trail-demo ${sketch ? 'trail-sketch' : 'trail-scarlet'}" data-trail="${variant}">
<a class="t-skip" href="#main">跳到正文</a>
<header class="t-header t-wrap"><a class="t-brand" href="?variant=${variant}"><img src="./assets/brand-robot.png" width="38" height="38" alt=""><span>AI游民<small>SHIJIE / KEEP ROAMING</small></span></a><nav aria-label="主导航"><a href="#work">作品</a><a href="#writing">文章与实践</a><a href="./about/">关于我</a>${link(site.github, 'GitHub', 't-github')}</nav></header>
<main id="main">
<section class="t-hero t-wrap"><div><p class="t-kicker"><i></i> 谢世杰 / DEVELOPER & AI EXPLORER</p><h1>带着好奇心，<br>把想法<span>做出来。</span></h1><p class="t-description">帮技术人把 AI 变成工作能力、判断力和职业杠杆。<br>这里是我的作品、实践，以及一路探索的记录。</p><div class="t-actions">${link('#journey', '沿着线索，开始探索', 't-button')}${link('./writing/', '先读一篇文章')}</div><p class="t-hero-note">${sketch ? '一些作品，一些笔记，还有尚未写完的想法。' : 'BUILD SOMETHING. LEARN SOMETHING. KEEP GOING.'}</p></div>
<figure class="t-portrait"><span class="t-portrait-index">FIELD NOTES / 001</span><div class="t-portrait-frame"><img src="./assets/brand-robot.png" width="280" height="280" alt="AI游民朱红机器人"></div><span class="t-portrait-cross" aria-hidden="true">＋</span><figcaption>${sketch ? '好奇心，是随身携带的行李。' : 'STAY CURIOUS. KEEP ROAMING.'}</figcaption></figure>
<div class="t-hero-bottom"><span>${name}</span><a href="#journey">向下，继续探索 <span aria-hidden="true">↓</span></a><span>TOOLS / IDEAS / FIELD NOTES</span></div></section>

<section class="t-journey t-wrap" id="journey" aria-label="随视野展开的探索路径">
<header class="t-intro"><p class="t-kicker">${sketch ? 'NOTES ALONG THE WAY' : 'FOLLOW THE THREAD'}</p><h2>${sketch ? '边走边画，<span>边做边想。</span>' : '一个想法，<span>牵出新的可能。</span>'}</h2><p>从工具，到方法，再到一路写下的思考。</p></header>
<svg id="drawing-trail" class="t-trail" aria-hidden="true"></svg>

<article class="t-chapter" id="work" data-note="从这里动手"><div class="t-copy"><p class="t-kicker">01 / BUILD · 让想法落地</p><h2>${esc(lord.name)}</h2><p class="t-lead">给多个 Agent，<br>一条清晰的工作路径。</p><p>${esc(lord.summary)}${esc(lord.detail)}</p>${link('./projects/agent-lord/', '走进这个项目')}</div><figure class="t-project"><div class="t-window-bar"><span><i></i><i></i><i></i></span><span>AGENT LORD / OBSERVER</span><span>↗</span></div><a href="./projects/agent-lord/"><img src="./assets/observer-example.jpg" width="1280" height="720" alt="Agent Lord Observer 的任务与执行记录演示" loading="lazy"></a><figcaption>一个窗口，看见每一步。<small>界面演示 · 合成示例数据</small></figcaption></figure></article>

<article class="t-chapter t-reverse" id="skills" data-note="把好方法留下"><div class="t-copy"><p class="t-kicker">02 / SHARE · 把方法留下</p><h2>${esc(skills.name)}</h2><p class="t-lead">好用的方法，<br>值得被反复使用。</p><p>${esc(skills.summary)}${esc(skills.detail)}</p>${link('./projects/dev-skills/', '看看这些 Skills')}</div><div class="t-methods"><span class="t-card-label">THE FIELD KIT / 开发者手记</span><div class="t-method"><span class="t-method-number">01</span><h3>把复杂的事，讲明白。</h3><code>$explain-as-fool</code><p>解释一下什么是线程池</p></div><div class="t-method"><span class="t-method-number">02</span><h3>让每个判断，有依据。</h3><code>$review-rules</code><p>复核这条评审意见</p></div><small class="t-hand-note">from practice, with care.</small></div></article>

<article class="t-chapter" id="writing" data-note="在这里想清楚"><div class="t-copy"><p class="t-kicker">03 / REFLECT · 留下思考</p><h2>写下来的思考</h2><p class="t-lead">把做过的事，<br>再想清楚一点。</p><p>记录 AI 开发中的具体问题、实践方法和判断。从真实的问题出发，在写作中理清思路。</p>${link('./writing/', '翻开我的文章')}</div><a class="t-article" href="./writing/${esc(article.slug)}/"><div class="t-article-top"><span>FIELD NOTES</span><span>NO. 001</span></div><div class="t-article-mark" aria-hidden="true">${sketch ? '“' : '↗'}</div><p class="t-kicker">${esc(article.topic)}</p><h3>${esc(article.title)}</h3><p>${esc(article.summary)}</p><div class="t-article-bottom"><time datetime="${esc(article.published)}">${esc(article.published.replaceAll('-', '.'))}</time><span>${esc(article.reading)} · 阅读 ↗</span></div></a></article>

<article class="t-chapter t-reverse t-about" id="about" data-note="未完，待续"><div class="t-copy"><p class="t-kicker">04 / ROAM · 继续探索</p><h2>一条持续的主线</h2><p class="t-lead">工具在变，<br>好奇心一直在。</p><p>从研发效能、代码智能到 AI Coding，我一直关心：怎样让开发者工作得更高效。</p>${link('./about/', '更多关于我')}</div><div class="t-about-notes"><span class="t-card-label">A FEW THINGS ALONG THE WAY</span><ol><li><span>01</span><div>研发效能<small>让工作更顺畅</small></div></li><li><span>02</span><div>代码智能<small>让工具理解代码</small></div></li><li><span>03</span><div>AI Coding<small>让想法走得更远</small></div></li></ol></div></article>
</section>
<section class="t-closing t-wrap"><p class="t-kicker">NEXT / STILL EXPLORING</p><h2>下一笔，<span>继续写下去。</span></h2><p>探索 AI，也探索工作与成长的新可能。</p><div class="t-actions">${link(site.github, '在 GitHub 相遇')}<button type="button" class="t-copy-button" data-copy="${esc(site.wechat)}">公众号 · ${esc(site.wechat)} <span aria-hidden="true">⧉</span></button></div><span id="copy-status" role="status" aria-live="polite"></span></section>
</main><footer class="t-footer t-wrap"><span>© 2026 谢世杰 · AI ROAM</span><a href="https://beian.miit.gov.cn/">${esc(site.filing.icp)}</a><a href="./sync-status/">同步状态 ↗</a></footer><button type="button" class="t-replay" id="replay-trail" aria-label="回到起点">↑ <span>回到起点</span></button>
${switcher(variant)}</body></html>`;
}

// Production homepage: the approved humanist layout and viewport-following scarlet trail.
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls = '') => `<svg class="d-icon ${cls}" aria-hidden="true"><use href="./assets/home-icons.svg#${name}"></use></svg>`;
const link = (href, label, cls = 'd-link', glyph = 'arrow-up-right') => `<a class="${cls}" href="${esc(href)}">${label}${icon(glyph)}</a>`;
const date = value => esc(value.replaceAll('-', '.'));
// COS resizes and re-encodes the portrait on request.
const avatar = (site, width) => esc(`${site.avatar}?imageMogr2/thumbnail/${width}x/format/webp`);
function start(site) {
  const title = `作品、实践与思考 · ${site.name}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title><meta name="description" content="${esc(site.description)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(site.description)}"><meta name="theme-color" content="#f4f0e6"><link rel="icon" href="./assets/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="./assets/apple-touch-icon.png"><link rel="preload" href="./assets/fonts/wenkai.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="./assets/fonts/plex-sans-sc.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="./assets/home.css"><script src="./assets/home-trail.js" defer></script><script src="./assets/site.js" defer></script></head><body class="home"><a class="d-skip" href="#main">跳到正文</a>`;
}
function header(site) {
  return `<header class="d-header d-wrap"><a class="d-brand" href="./" aria-label="AI游民首页"><img src="./assets/brand-robot.png" width="40" height="40" alt=""><span>AI游民<small>SHIJIE / KEEP ROAMING</small></span></a><nav aria-label="主导航"><a href="./projects/">作品</a><a href="./writing/">文章</a><a href="./about/">关于</a></nav>${link(site.github,'GitHub','d-github')}</header>`;
}
function footer(site) {
  const f = site.filing;
  const filings = (f.icp ? `<a href="https://beian.miit.gov.cn/">${esc(f.icp)}</a>` : '') + (f.police && f.policeUrl ? `<a href="${esc(f.policeUrl)}">${esc(f.police)}</a>` : '');
  return `<footer class="d-footer d-wrap"><span>© 2026 谢世杰 · AI ROAM</span>${filings}<a href="./about/">关于我</a></footer><button class="d-replay" id="replay-trail" type="button" aria-label="回到起点">${icon('arrow-up')}<span>回到起点</span></button></body></html>`;
}
function contact(site) {
  return `<div class="d-actions">${link(site.github,'在 GitHub 相遇','d-button')}<button class="d-copy" type="button" data-copy="${esc(site.wechat)}">公众号 · ${esc(site.wechat)}${icon('copy')}</button></div><span id="copy-status" role="status" aria-live="polite"></span>`;
}
function updates(site) {
  const items=[...site.projects.map(p=>({date:p.updated,label:p.updateNote || `更新项目介绍 · ${p.name}`,url:`./projects/${p.slug}/`})),...site.articles.filter(a=>!a.legacy).map(a=>({date:a.updated,label:`修订文章 · ${a.title}`,url:`./writing/${a.slug}/` })),...site.contributions.map(c=>({date:c.merged,label:c.updateNote,url:c.url}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  return `<section class="d-updates d-wrap" aria-labelledby="updates-title"><div><p class="d-eyebrow">RECENT NOTES</p><h2 id="updates-title">最近的记录</h2></div><ul>${items.map(item=>`<li><time datetime="${item.date}">${date(item.date)}</time>${link(item.url,esc(item.label))}</li>`).join('')}</ul></section>`;
}
function contributions(site) {
  return `<section class="h-contributions d-wrap" id="contributions" aria-labelledby="contributions-title"><header><p class="d-eyebrow">CONTRIBUTING IN THE OPEN</p><h2 id="contributions-title">开源贡献</h2><p>把真实问题，带回共同维护的工具。</p></header><div>${site.contributions.map(c=>`<article class="h-contribution"><div class="h-contribution-meta"><span>${esc(c.project)} / PR #${c.number}</span><span>已合入 · <time datetime="${c.merged}">${date(c.merged)}</time></span></div><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p><p class="h-contribution-detail">${esc(c.detail)}</p>${link(c.url,'查看这次贡献')}</article>`).join('')}</div></section>`;
}
function observer() {
  return `<figure class="d-observer"><div class="d-window"><span class="d-window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>AGENT LORD / OBSERVER</span>${icon('arrow-up-right')}</div><a href="./projects/agent-lord/" aria-label="查看 Agent Lord 项目"><img src="./assets/observer-example.jpg" width="1280" height="720" alt="Agent Lord Observer 的任务、工具执行记录与评审结果" loading="lazy"></a><figcaption><span>一个窗口，看见每一步。</span><small>界面演示 · 合成示例数据</small></figcaption></figure>`;
}
export function renderHome(site) {
  const l=link,[lord,skills]=site.projects,a=site.articles.find(article=>article.slug===site.featuredArticles[0]);
  const moreArticles=site.featuredArticles.slice(1).map(slug=>site.articles.find(article=>article.slug===slug));
  const articleTitle = esc(a.title).replace(/[，：]/, '$&<wbr>');
  return start(site)+header(site)+`
<main id="main">
<section class="h-hero d-wrap"><p class="d-eyebrow">A PERSONAL JOURNAL OF MAKING & LEARNING</p><h1>带着好奇心，<br>把想法<span>做出来。</span></h1><p class="h-hero-description">帮技术人把 AI 变成工作能力、判断力和职业杠杆。<br>这里是我的作品、实践，以及一路探索的记录。</p><div class="d-actions">${l('#journey','开始探索','d-button','arrow-down')}${l('./writing/','先读一篇文章')}</div><a class="h-author" href="./about/"><img src="${avatar(site,160)}" width="76" height="76" alt="谢世杰"><div><strong>你好，我是谢世杰。</strong><p>MiniMax Agent 研发，也是一名持续记录的 AI 探索者。</p></div><span class="h-author-mark">关于我${icon('arrow-up-right')}</span></a><div class="h-hero-bottom"><span>一些作品，一些笔记，还有尚未写完的想法。</span><a href="#journey" aria-label="向下探索">${icon('arrow-down')}</a></div></section>
<section class="d-journey d-wrap" id="journey" data-breakpoint="800" aria-label="沿朱红探索线阅读作品与手记"><header class="t-intro h-intro"><p class="d-eyebrow">NOTES ALONG THE WAY</p><h2>一个想法，<br><em>牵出新的可能。</em></h2><p>从做工具，到分享方法，再到一路写下的思考。</p></header><svg id="drawing-trail" class="t-trail" aria-hidden="true"></svg>
  <article class="t-chapter h-chapter" id="work"><div class="t-copy"><p class="d-eyebrow">第一章 / 让想法落地</p><h2>${esc(lord.name)}</h2><p class="d-lead">给多个 Agent，<br>一条清晰的工作路径。</p><p class="d-description">${esc(lord.summary)}${esc(lord.detail)}</p><ul class="h-workflows">${lord.workflows.map(w=>`<li><a href="./projects/agent-lord/#${esc(w.slug)}">${esc(w.name)} ${icon('arrow-up-right')}</a></li>`).join('')}</ul>${l('./projects/agent-lord/','走进这个项目')}</div><div class="h-work-visual"><span class="h-margin-note">一件正在使用的工具</span>${observer()}<div class="h-work-caption">${icon('code')}<span>让每一步执行，都有迹可循。</span></div></div></article>
  <article class="t-chapter t-reverse h-chapter" id="skills"><div class="t-copy"><p class="d-eyebrow">第二章 / 把方法留下</p><h2>${esc(skills.name)}</h2><p class="d-lead">好用的方法，<br>值得被反复使用。</p><p class="d-description">${esc(skills.summary)}${esc(skills.detail)}</p>${l('./projects/dev-skills/','翻开这本工具手册')}</div><div class="h-manual"><div class="h-manual-spine" aria-hidden="true">FIELD KIT · VOL. 01</div><div class="h-manual-content">${icon('book')}<p class="d-eyebrow">开发者手记 · ${skills.catalog.length} 个 Skills</p><h3>把经验，<br>写成方法。</h3>${skills.catalog.filter(skill=>["core-spec","plan-for-agents","mr-for-human"].includes(skill.name)).map(skill=>`<div class="h-manual-example"><a href="./projects/dev-skills/#${esc(skill.name)}"><code>$${esc(skill.name)}</code><p>${esc(skill.title)}</p></a></div>`).join('')}<span class="h-manual-bottom">from practice, with care.</span></div></div></article>
  <article class="t-chapter h-chapter" id="writing"><div class="t-copy"><p class="d-eyebrow">第三章 / 留下思考</p><h2>写下来的思考</h2><p class="d-lead">把做过的事，<br>再想清楚一点。</p><p class="d-description">记录 AI 开发中的具体问题、实践方法和判断。从真实的问题出发，在写作中理清思路。</p>${l('./writing/','浏览全部 '+site.articles.length+' 篇文章')}<ul class="h-reading-picks">${moreArticles.map(article=>`<li><a href="./writing/${article.slug}/"><time datetime="${article.published}">${date(article.published)}</time><span>${esc(article.title)}</span>${icon('arrow-up-right')}</a></li>`).join('')}</ul></div><a class="h-article" href="./writing/${esc(a.slug)}/"><div class="h-article-kicker">${icon('book')}<span>SELECTED WRITING</span></div><span class="h-quote" aria-hidden="true">“</span><p class="d-eyebrow">${esc(a.topic)}</p><h3>${articleTitle}</h3><p>${esc(a.summary)}</p><div class="d-article-meta"><time datetime="${a.published}">${date(a.published)}</time><span>${esc(a.reading)} · 阅读</span>${icon('arrow-up-right')}</div></a></article>
  <article class="t-chapter t-reverse h-chapter d-about" id="about"><div class="t-copy"><p class="d-eyebrow">第四章 / 关于我</p><h2>一条持续的主线</h2><p class="d-lead">工具在变，<br>好奇心一直在。</p><p class="d-description">从研发效能、代码智能到 AI Coding，我一直关心：怎样让开发者工作得更高效。</p>${l('./about/','更多关于我')}</div><div class="h-about-note"><p class="d-eyebrow">A FEW THINGS ALONG THE WAY</p><h3>做一点东西，<br>再向前走一点。</h3><ol><li><span>01</span><div><strong>研发效能</strong><small>快手 · 2021 — 2023</small></div></li><li><span>02</span><div><strong>代码智能</strong><small>理想汽车 · 2023 — 2025</small></div></li><li><span>03</span><div><strong>AI Coding</strong><small>小红书 · 2025 — 2026</small></div></li><li><span>04</span><div><strong>Agent</strong><small>MiniMax · 2026 — 现在</small></div></li></ol><span class="h-signature">谢世杰 / AI游民</span></div></article>
</section>
${contributions(site)}
${updates(site)}
<section class="h-closing d-wrap">${icon('book','h-closing-icon')}<p class="d-eyebrow">THERE IS ALWAYS ANOTHER PAGE</p><h2>保持好奇，<br><em>下一段旅程再见。</em></h2><p>探索 AI，也探索工作与成长的新可能。</p>${contact(site)}</section>
</main>`+footer(site);
}

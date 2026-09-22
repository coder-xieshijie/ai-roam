// Comparison prototype: a robot-led route through the same public site content.
export function renderRobotDemo(site, switcher) {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = (href, text, className = 'r-link') => `<a class="${className}" href="${esc(href)}">${esc(text)} <span aria-hidden="true">↗</span></a>`;
  const [lord, skills] = site.projects;
  const article = site.articles[0];
  const stop = (number, name) => `<span class="r-stop" aria-hidden="true">${number}</span><p class="r-kicker">STOP ${number} <span>/</span> ${name}</p>`;

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="noindex"><title>机器人探索路线 · AI游民首页 Demo</title><link rel="icon" href="./assets/favicon.ico"><link rel="stylesheet" href="./assets/prototype-vine.css"><link rel="stylesheet" href="./assets/prototype-robot.css"><script src="./assets/prototype-robot.js" defer></script><script src="./assets/site.js" defer></script></head>
<body class="robot-demo">
<a class="r-skip" href="#main">跳到正文</a>
<header class="r-header r-wrap">
  <a class="r-brand" href="?variant=robot"><img src="./assets/brand-robot.png" width="38" height="38" alt=""><span>AI游民<small>SHIJIE / ALWAYS EXPLORING</small></span></a>
  <nav aria-label="主导航"><a href="#work">作品</a><a href="#writing">文章与实践</a><a href="./about/">关于我</a>${link(site.github, 'GitHub', 'r-github')}</nav>
</header>
<main id="main">
  <section class="r-hero r-wrap">
    <div class="r-hero-copy">
      <p class="r-kicker"><span class="r-signal"></span> 谢世杰 / DEVELOPER & AI EXPLORER</p>
      <h1>带着好奇心，<br>把想法<span>做出来。</span></h1>
      <p class="r-description">帮技术人把 AI 变成工作能力、判断力和职业杠杆。<br>这里是我的作品、实践，以及一路探索的记录。</p>
      <div class="r-actions">${link('#work', '跟着机器人，开始探索', 'r-button')}${link('./writing/', '先读一篇文章')}</div>
      <p class="r-hero-footnote"><span>人负责好奇。</span><span>工具帮助前行。</span></p>
    </div>
    <figure class="r-map" aria-label="机器人与探索路线：从想法出发，经过构建、分享与思考">
      <div class="r-map-top"><span>ROAM / 001</span><span><i></i> READY TO EXPLORE</span></div>
      <svg class="r-map-route" viewBox="0 0 440 430" aria-hidden="true">
        <defs><pattern id="map-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#c7c4bc"/></pattern></defs>
        <rect x="0" y="0" width="440" height="430" fill="url(#map-dots)"/>
        <circle cx="229" cy="183" r="135" fill="none" stroke="#dedbd4"/>
        <circle cx="229" cy="183" r="111" fill="none" stroke="#dedbd4" stroke-dasharray="2 7"/>
        <path d="M60 105 H118 Q138 105 138 125 V276 Q138 305 164 305 H349 Q375 305 375 331 Q375 354 349 354 H102 Q72 354 72 385" fill="none" stroke="#c9c3b9" stroke-width="1.5" stroke-dasharray="5 6"/>
        <path d="M60 105 H118 Q138 105 138 125 V219" fill="none" stroke="#ce5b3e" stroke-width="2"/>
        <circle cx="60" cy="105" r="4" fill="#ce5b3e"/>
        <circle cx="164" cy="305" r="5" fill="#f7f5f0" stroke="#ce5b3e" stroke-width="1.5"/>
        <circle cx="304" cy="354" r="4" fill="#f7f5f0" stroke="#969d9b"/>
        <path d="M51 260 h12 M57 254 v12 M368 101 h12 M374 95 v12" stroke="#adb1aa"/>
      </svg>
      <div class="r-map-robot"><img src="./assets/brand-robot.png" width="240" height="240" alt="AI游民朱红机器人"></div>
      <span class="r-map-label r-map-start">好奇心<br><small>THE STARTING POINT</small></span>
      <span class="r-map-label r-map-build">构建 <small>01</small></span>
      <span class="r-map-label r-map-reflect">思考 <small>03</small></span>
      <figcaption><span>下一站：把想法落地</span><span aria-hidden="true">↓</span></figcaption>
    </figure>
    <div class="r-hero-bottom"><span>一条路线，四个停靠点。</span><a href="#journey">向下探索 <span aria-hidden="true">↓</span></a><span>BUILD / SHARE / REFLECT / ROAM</span></div>
  </section>

  <section class="r-route r-wrap" id="journey" aria-label="机器人的探索路线">
    <header class="r-route-intro"><p class="r-kicker">THE EXPLORATION LOG</p><h2>一路动手，<span>一路想清楚。</span></h2><p>跟着小机器人，逛逛我做过的东西。</p></header>
    <svg class="r-track" id="robot-track" aria-hidden="true"></svg>
    <div class="r-guide" id="robot-guide" aria-hidden="true"><div class="r-guide-avatar"><img src="./assets/brand-robot.png" width="42" height="42" alt=""></div><span class="r-guide-label">01</span></div>

    <article class="r-chapter" id="work" data-stop="Agent Lord">
      ${stop('01', 'BUILD · 构建工具')}
      <div class="r-work-grid"><div class="r-chapter-copy"><h2>${esc(lord.name)}</h2><p class="r-lead">让多个 Agent，<br>沿着清晰的路径工作。</p><p>${esc(lord.summary)}${esc(lord.detail)}</p><div class="r-tags"><span>任务调度</span><span>会话延续</span><span>过程可见</span></div>${link('./projects/agent-lord/', '走进这个项目')}</div>
        <figure class="r-window"><div class="r-window-bar"><div><i></i><i></i><i></i></div><span>agent-lord / observer</span><span>↗</span></div><a href="./projects/agent-lord/"><img src="./assets/observer-example.jpg" width="1280" height="720" alt="Agent Lord Observer 的任务与执行记录演示" loading="lazy"></a><figcaption><span class="r-signal"></span> 让每一步，都有迹可循。<small>界面演示 · 合成示例数据</small></figcaption></figure>
      </div>
    </article>

    <article class="r-chapter" id="skills" data-stop="dev-skills">
      ${stop('02', 'SHARE · 把方法留下')}
      <div class="r-section-top"><div><h2>${esc(skills.name)}</h2><p class="r-lead">把好用的方法，留给下一次。</p></div>${link('./projects/dev-skills/', '查看 Skills')}</div>
      <p class="r-section-description">${esc(skills.summary)}${esc(skills.detail)}</p>
      <div class="r-methods"><a href="./projects/dev-skills/" class="r-method"><span class="r-method-index">01 / UNDERSTAND <span aria-hidden="true">↗</span></span><span class="r-method-icon" aria-hidden="true">[ ? ]</span><h3>把复杂的事，讲明白。</h3><p>从具体例子出发，理解概念背后的因果。</p><code><span>$</span> explain-as-fool</code></a><a href="./projects/dev-skills/" class="r-method"><span class="r-method-index">02 / VERIFY <span aria-hidden="true">↗</span></span><span class="r-method-icon" aria-hidden="true">[ ✓ ]</span><h3>让每个判断，有依据。</h3><p>回到需求与代码，核对一条评审意见。</p><code><span>$</span> review-rules</code></a></div>
    </article>

    <article class="r-chapter" id="writing" data-stop="文章与实践">
      ${stop('03', 'REFLECT · 写下思考')}
      <div class="r-section-top"><div><h2>实践之后，再想一步。</h2><p class="r-section-description">记录 AI 开发中的具体问题、实践方法和判断。</p></div>${link('./writing/', '全部文章')}</div>
      <a class="r-writing-card" href="./writing/${esc(article.slug)}/"><div class="r-writing-art" aria-hidden="true"><div class="r-writing-diagram"><span>方法</span><i>+</i><span>工具</span></div><small>THINK IN CONNECTIONS.</small></div><div class="r-writing-copy"><p class="r-kicker">${esc(article.topic)} <span>/</span> ${esc(article.reading)}</p><h3>${esc(article.title)}</h3><p>${esc(article.summary)}</p><div><time datetime="${esc(article.published)}">${esc(article.published.replaceAll('-', '.'))}</time><span>读这篇文章 ↗</span></div></div></a>
    </article>

    <article class="r-chapter r-about" id="about" data-stop="继续探索">
      ${stop('04', 'ROAM · 继续探索')}
      <div class="r-about-grid"><div><h2>工具在变，<br><span>好奇心一直在。</span></h2><p>从研发效能、代码智能到 AI Coding，我一直关心：怎样让开发者工作得更高效。</p>${link('./about/', '更多关于我')}</div><ol><li><span>01</span><div>研发效能<small>让工作更顺畅</small></div></li><li><span>02</span><div>代码智能<small>让工具理解代码</small></div></li><li><span>03</span><div>AI Coding<small>让想法走得更远</small></div></li></ol></div>
    </article>
  </section>

  <section class="r-closing r-wrap"><span class="r-destination" aria-hidden="true">＋</span><p class="r-kicker">NEXT STOP / STILL EXPLORING</p><h2>下一站，<span>继续做点有意思的。</span></h2><p>探索 AI，也探索工作与成长的新可能。</p><div class="r-actions">${link(site.github, '在 GitHub 相遇')}<button type="button" class="r-copy" data-copy="${esc(site.wechat)}">公众号 · ${esc(site.wechat)} <span aria-hidden="true">⧉</span></button></div><span id="copy-status" role="status" aria-live="polite"></span></section>
</main>
<footer class="r-footer r-wrap"><span>© 2026 谢世杰 · AI ROAM</span><a href="https://beian.miit.gov.cn/">${esc(site.filing.icp)}</a><a href="./sync-status/">同步状态 ↗</a></footer>
<button class="r-back-top" type="button" id="replay-robot" aria-label="回到起点">↑ <span>回到起点</span></button>
${switcher('robot')}
</body></html>`;
}

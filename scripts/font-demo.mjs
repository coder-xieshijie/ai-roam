// A one-page font study within the selected humanist design. No production template changes.
const choices = [
  ['wenkai', '霞鹜文楷', '个人手记'],
  ['plex', 'IBM Plex', '现代技术'],
  ['zhuque', '朱雀仿宋', '中文书刊'],
  ['current', '当前宋体', 'B 版参照'],
  ['anthropic', 'Anthropic', 'Sans + Mono'],
];
const icon = name => `<svg aria-hidden="true" class="f-icon"><use href="./assets/prototype-style/phosphor.svg#${name}"></use></svg>`;
export function renderFontDemo() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="light"><title>字体对照 · AI游民</title><link rel="icon" href="./assets/favicon.ico"><link rel="stylesheet" href="./assets/prototype-style/fonts.css"><link rel="stylesheet" href="./assets/prototype-style/study-fonts.css"><link rel="stylesheet" href="./assets/prototype-fonts.css"><link rel="preload" href="./assets/prototype-style/plex-sans-sc.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="./assets/prototype-style/wenkai.woff2" as="font" type="font/woff2" crossorigin><script src="./assets/prototype-fonts.js" defer></script></head>
<body class="font-demo" data-font="wenkai"><a class="f-skip" href="#specimen">跳到字体预览</a>
<header class="f-header"><a href="?variant=human" class="f-brand"><img src="./assets/brand-robot.png" width="36" height="36" alt=""><span>AI游民</span></a><span>TYPE STUDY / 人文科技</span><a href="?variant=anthropic" class="f-back">查看 Anthropic 完整首页 ${icon('arrow-up-right')}</a></header>
<main>
<section class="f-toolbar" aria-label="字体搭配选择"><div class="f-toolbar-top"><p>同一页，五种文字气质。</p><a class="f-code-jump" href="#code-study">查看代码对照 ↓</a></div><div class="f-options" role="group" aria-label="选择字体">${choices.map(([key,name,note])=>`<button type="button" data-choice="${key}" aria-pressed="${key==='wenkai'}"><strong>${name}</strong><small>${note}</small></button>`).join('')}</div><div class="f-configuration"><span id="font-description">标题：霞鹜文楷 · 正文：IBM Plex Sans SC</span><span id="font-status" role="status" aria-live="polite">字体加载中…</span></div></section>
<div id="specimen" class="f-specimen">
<section class="f-hero"><p class="f-kicker">SHIJIE / A PERSONAL JOURNAL OF MAKING & LEARNING</p><h1>带着好奇心，<br>把想法<span>做出来。</span></h1><p class="f-intro">帮技术人把 AI 变成工作能力、判断力和职业杠杆。<br>这里是我的作品、实践，以及一路探索的记录。</p><p class="f-english">Build useful tools. Keep learning.</p><div class="f-actions"><a class="f-button" href="#field-notes">沿着线索，开始探索 ${icon('arrow-down')}</a><a href="./writing/">先读一篇文章 ${icon('arrow-up-right')}</a></div></section>
<section class="f-notes" id="field-notes" aria-label="中英文与正文排版"><div class="f-project"><svg class="f-line" viewBox="0 0 52 305" aria-hidden="true"><path d="M27 0 C10 42 40 53 27 94 S8 153 26 189 S43 241 25 287"/><circle cx="25" cy="287" r="4"/><path d="M27 94 C33 90 41 90 51 90"/></svg><p class="f-kicker">01 / 让想法落地</p><h2>Agent Lord</h2><p class="f-lead">给多个 Agent，<br>一条清晰的工作路径。</p><p class="f-body">在一个对话里调度、查看和继续多个编程 Agent 的任务。保存会话与执行记录，让任务可以追踪，也可以接着做。</p><a class="f-project-link" href="./projects/agent-lord/">走进这个项目 ${icon('arrow-up-right')}</a></div>
<article class="f-article"><div class="f-article-top">${icon('book')}<span>FIELD NOTES / 001</span></div><p class="f-topic">文章与实践</p><h2>Skills 与 MCP，<br>究竟是什么关系？</h2><p class="f-body">用一次代码评审拆开看：工作方法、工具接口，以及真正需要验证的结果。</p><div class="f-code"><code>$explain-as-fool</code><span>把复杂的事，讲明白。</span></div><footer><time datetime="2026-03-10">2026.03.10</time><span>6 分钟</span><a href="./writing/skills-and-mcp/" aria-label="阅读 Skills 与 MCP 文章">${icon('arrow-up-right')}</a></footer></article></section>
<section class="f-code-study" id="code-study" aria-labelledby="code-study-title"><header><div><p class="f-kicker">TYPE IN CODE</p><h2 id="code-study-title">代码里的字，为什么要等宽？</h2><p>同样 8 个字符，比较占用宽度；再看代码里的空格与缩进。</p></div><span id="code-font-status" role="status" aria-live="polite">字体加载中…</span></header><div class="f-code-pair">${[
  ['sans','Anthropic Sans','比例字体 · 用于正文与界面'],
  ['mono','Anthropic Mono Web','等宽字体 · 用于代码与命令']
].map(([key,name,note])=>`<article class="f-code-panel f-code-${key}"><h3>${name}</h3><p>${note}</p><div class="f-glyph-lines" aria-label="三个八字符宽度样例"><span>iiiiiiii</span><span>WWWWWWWW</span><span>00000000</span></div><pre tabindex="0" aria-label="${name} Java 代码样例"><code><span class="f-code-keyword">int</span> id    = <span class="f-code-number">1</span>;
<span class="f-code-keyword">int</span> count = <span class="f-code-number">100</span>;
<span class="f-code-keyword">int</span> limit = <span class="f-code-number">120</span>;

<span class="f-code-keyword">if</span> (count &lt; limit) {
    <span class="f-code-keyword">return</span> count + id;
}</code></pre><div class="f-glyph-check"><span>0 O o</span><span>1 I l |</span><span>{ } [ ] ( )</span></div></article>`).join('')}</div><p class="f-code-conclusion">正文与项目名用 Sans；代码、命令和终端输出用 Mono。中文继续使用原有搭配。</p></section>
</div>
</main><footer class="f-footer"><span>AI ROAM · STAY CURIOUS. KEEP ROAMING.</span><span>字体来源：<a href="https://github.com/lxgw/LxgwWenKai">霞鹜文楷</a> / <a href="https://github.com/IBM/plex">IBM Plex</a> / <a href="https://github.com/TrionesType/zhuque">朱雀仿宋</a> / <a href="https://www.anthropic.com/">Anthropic（本机字体）</a></span></footer></body></html>`;
}

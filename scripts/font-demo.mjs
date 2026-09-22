// A one-page font study within the selected humanist design. No production template changes.
const choices = [
  ['wenkai', '霞鹜文楷', '个人手记'],
  ['plex', 'IBM Plex', '现代技术'],
  ['zhuque', '朱雀仿宋', '中文书刊'],
  ['current', '当前宋体', 'B 版参照'],
];
const icon = name => `<svg aria-hidden="true" class="f-icon"><use href="./assets/prototype-style/phosphor.svg#${name}"></use></svg>`;
export function renderFontDemo() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="light"><title>字体对照 · AI游民</title><link rel="icon" href="./assets/favicon.ico"><link rel="stylesheet" href="./assets/prototype-style/fonts.css"><link rel="stylesheet" href="./assets/prototype-fonts.css"><link rel="preload" href="./assets/prototype-style/plex-sans-sc.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="./assets/prototype-style/wenkai.woff2" as="font" type="font/woff2" crossorigin><script src="./assets/prototype-fonts.js" defer></script></head>
<body class="font-demo" data-font="wenkai"><a class="f-skip" href="#specimen">跳到字体预览</a>
<header class="f-header"><a href="?variant=human" class="f-brand"><img src="./assets/brand-robot.png" width="36" height="36" alt=""><span>AI游民</span></a><span>TYPE STUDY / 人文科技</span><a href="?variant=human" class="f-back">返回 B 完整首页 ${icon('arrow-up-right')}</a></header>
<main>
<section class="f-toolbar" aria-label="字体搭配选择"><div class="f-toolbar-top"><p>同一页，四种文字气质。</p><span>保留版式与字号，对比字体搭配</span></div><div class="f-options" role="group" aria-label="选择字体">${choices.map(([key,name,note])=>`<button type="button" data-choice="${key}" aria-pressed="${key==='wenkai'}"><strong>${name}</strong><small>${note}</small></button>`).join('')}</div><div class="f-configuration"><span id="font-description">标题：霞鹜文楷 · 正文：IBM Plex Sans SC</span><span id="font-status" role="status" aria-live="polite">字体加载中…</span></div></section>
<div id="specimen" class="f-specimen">
<section class="f-hero"><p class="f-kicker">SHIJIE / A PERSONAL JOURNAL OF MAKING & LEARNING</p><h1>带着好奇心，<br>把想法<span>做出来。</span></h1><p class="f-intro">帮技术人把 AI 变成工作能力、判断力和职业杠杆。<br>这里是我的作品、实践，以及一路探索的记录。</p><div class="f-actions"><a class="f-button" href="#field-notes">沿着线索，开始探索 ${icon('arrow-down')}</a><a href="./writing/">先读一篇文章 ${icon('arrow-up-right')}</a></div></section>
<section class="f-notes" id="field-notes" aria-label="中英文与正文排版"><div class="f-project"><svg class="f-line" viewBox="0 0 52 305" aria-hidden="true"><path d="M27 0 C10 42 40 53 27 94 S8 153 26 189 S43 241 25 287"/><circle cx="25" cy="287" r="4"/><path d="M27 94 C33 90 41 90 51 90"/></svg><p class="f-kicker">01 / 让想法落地</p><h2>Agent Lord</h2><p class="f-lead">给多个 Agent，<br>一条清晰的工作路径。</p><p class="f-body">在一个对话里调度、查看和继续多个编程 Agent 的任务。保存会话与执行记录，让任务可以追踪，也可以接着做。</p><a class="f-project-link" href="./projects/agent-lord/">走进这个项目 ${icon('arrow-up-right')}</a></div>
<article class="f-article"><div class="f-article-top">${icon('book')}<span>FIELD NOTES / 001</span></div><p class="f-topic">文章与实践</p><h2>Skills 与 MCP，<br>究竟是什么关系？</h2><p class="f-body">用一次代码评审拆开看：工作方法、工具接口，以及真正需要验证的结果。</p><div class="f-code"><code>$explain-as-fool</code><span>把复杂的事，讲明白。</span></div><footer><time datetime="2026-03-10">2026.03.10</time><span>6 分钟</span><a href="./writing/skills-and-mcp/" aria-label="阅读 Skills 与 MCP 文章">${icon('arrow-up-right')}</a></footer></article></section>
</div>
</main><footer class="f-footer"><span>AI ROAM · STAY CURIOUS. KEEP ROAMING.</span><span>字体来源：<a href="https://github.com/lxgw/LxgwWenKai">霞鹜文楷</a> / <a href="https://github.com/IBM/plex">IBM Plex</a> / <a href="https://github.com/TrionesType/zhuque">朱雀仿宋</a></span></footer></body></html>`;
}

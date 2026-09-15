import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(
  await readFile(resolve(root, "content/site.json"), "utf8"),
);
if ((site.filing.icp || site.filing.police) && !site.filing.domain)
  throw new Error("备案编号需要同时填写实际备案域名");
if (Boolean(site.filing.police) !== Boolean(site.filing.policeUrl))
  throw new Error("公安备案编号与平台查询链接需要同时填写");
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const arrow = '<span aria-hidden="true">↗</span>';
const nav = [
  ["projects/", "作品"],
  ["writing/", "文章与实践"],
  ["about/", "关于"],
];
const pages = [];
const link = (href, label, cls = "text-link") =>
  `<a class="${cls}" href="${esc(href)}">${label}${arrow}</a>`;
const heading = (n, title, more = "") =>
  `<div class="section-head"><div><span class="section-number">${n}</span><h2>${title}</h2></div>${more}</div>`;
const projectDocs = (p) => `${p.repo}/blob/${p.revision}/README.md`;
const source = (p) =>
  `<p class="source-line">介绍复核于 <time datetime="${p.updated}">${p.updated}</time> · <a href="${projectDocs(p)}">查看依据版本 ${p.revision.slice(0, 7)}</a></p>`;

function footer(base) {
  const f = site.filing;
  const filings = [
    f.icp ? `<a href="https://beian.miit.gov.cn/">${esc(f.icp)}</a>` : "",
    f.police && f.policeUrl
      ? `<a href="${esc(f.policeUrl)}">${esc(f.police)}</a>`
      : "",
  ].join("");
  return `<footer class="site-footer"><div class="wrap"><div class="footer-main"><div><h2>继续探索。</h2><p>探索 AI，也探索工作与成长的新可能。</p></div><div><div class="footer-links">${link(site.github, "GitHub")}<button class="copy-button" type="button" data-copy="${esc(site.wechat)}">公众号 · ${esc(site.wechat)} <span aria-hidden="true">⧉</span></button></div><span id="copy-status" class="copy-status" role="status" aria-live="polite"></span></div></div><div class="footer-meta"><span>© 2026 谢世杰 · AI ROAM</span><span class="filing">${filings}</span><a href="${base}sync-status/">同步状态</a><a href="${base}about/">个人作品与实践 · 个人观点</a></div></div></footer>`;
}

function page(path, title, description, active, body, options = {}) {
  const depth = path === "index.html" ? 0 : path.split("/").length - 1;
  const base = depth ? "../".repeat(depth) : "./";
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)} · ${esc(site.name)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="${options.article ? "article" : "website"}"><meta property="og:title" content="${esc(title)} · AI Roam"><meta property="og:description" content="${esc(description)}"><meta name="theme-color" content="#f1efea"><link rel="icon" type="image/x-icon" href="${base}assets/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="${base}assets/apple-touch-icon.png"><link rel="stylesheet" href="${base}assets/site.css"><script src="${base}assets/site.js" defer></script></head>
<body><a class="skip" href="#main">跳到正文</a><header class="site-header wrap"><a class="brand" href="${base}">谢世杰｜AI游民<span>AI ROAM</span></a><nav class="nav" aria-label="主导航">${nav.map(([url, label]) => `<a href="${base}${url}"${active === url ? ' aria-current="page"' : ""}>${label}</a>`).join("")}<a class="nav-github" href="${site.github}">GitHub ↗</a></nav></header><main id="main" class="wrap">${body(base)}</main>${footer(base)}</body></html>\n`;
  pages.push({ path, html });
}

function projects(base) {
  const [lord, skills] = site.projects;
  return `<article class="featured"><div class="featured-copy"><span class="eyebrow">01 / ${lord.type}</span><h3>${lord.name}</h3><p>${lord.summary}</p><p>${lord.detail}</p>${link(base + "projects/agent-lord/", "了解项目")}</div><figure class="screen-figure"><a href="${base}projects/agent-lord/" aria-label="查看 Agent Lord 项目与演示"><img src="${base}assets/observer-example.jpg" width="1280" height="720" alt="Agent Lord Observer 展示两个代码评审任务、工具执行记录和评审结果" loading="lazy"></a><figcaption>OBSERVER · 使用合成示例数据的界面演示</figcaption></figure></article><article class="skill-card"><div><span class="eyebrow">02 / ${skills.type}</span><h3>${skills.name}</h3><p>${skills.summary}</p>${link(base + "projects/dev-skills/", "查看 Skills")}</div><div class="skill-code" aria-label="Skill 调用示例"><code><span>$explain-as-fool</span> 解释一下什么是线程池</code><code><span>$review-rules</span> 复核这条评审意见</code></div></article>`;
}

function articleRows(base) {
  return site.articles
    .map(
      (a) =>
        `<a class="article-row" href="${base}writing/${a.slug}/"><div class="article-date"><time datetime="${a.published}">${a.published.replaceAll("-", ".")}</time><span class="tag">${a.topic}</span></div><div><h3>${a.title}</h3><p>${a.summary}</p></div><span class="article-arrow" aria-hidden="true">↗</span></a>`,
    )
    .join("");
}

page(
  "index.html",
  "作品、实践与思考",
  site.description,
  "",
  (b) =>
    `<section class="hero"><div class="hero-copy"><p class="eyebrow">谢世杰 / DEVELOPER & AI EXPLORER</p><h1>帮技术人把 AI 变成<br><em>工作能力、判断力</em><br>和职业杠杆。</h1><p class="description">${site.description}</p><div class="actions">${link("#work", "看作品", "button")}${link(b + "writing/", "读文章")}</div></div><figure class="hero-art"><img src="${b}assets/brand-robot.png" width="1024" height="1024" alt="浅紫背景上的朱红机器人，AI游民的品牌形象" fetchpriority="high"><figcaption>STAY CURIOUS. KEEP ROAMING.</figcaption></figure></section><section id="work" class="section">${heading("01 / SELECTED WORK", "做过的东西", link(b + "projects/", "全部作品"))}${projects(b)}</section><section class="section">${heading("02 / WRITING & PRACTICE", "写下来的思考", link(b + "writing/", "文章与实践"))}${articleRows(b)}</section><section class="section bottom-grid"><div>${heading("03 / FIELD NOTES", "最近更新")}<ul class="updates">${[
      ...site.articles.map((a) => ({
        date: a.updated,
        label: `修订文章 · ${a.title}`,
        url: `writing/${a.slug}/`,
      })),
      ...site.projects.map((p) => ({
        date: p.updated,
        label: `更新介绍 · ${p.name}`,
        url: `projects/${p.slug}/`,
      })),
    ]
      .sort((a, z) => z.date.localeCompare(a.date))
      .slice(0, 3)
      .map(
        (u) =>
          `<li><time datetime="${u.date}">${u.date.replaceAll("-", ".")}</time><a href="${b}${u.url}">${u.label}</a></li>`,
      )
      .join(
        "",
      )}</ul></div><div>${heading("04 / ABOUT ME", "一条持续的主线")}<p class="short-about">从研发效能、代码智能到 AI Coding，我一直关心：怎样让开发者工作得更高效。这里放我的公开项目，也记录做事过程中逐渐形成的判断。</p>${link(b + "about/", "更多关于我")}</div></section>`,
);

page(
  "projects/index.html",
  "作品",
  "Agent Lord 与 dev-skills：我做的 Agent 工具和可复用工作方法。",
  "projects/",
  (b) =>
    `<section class="page-intro"><p class="eyebrow">WORK / OPEN SOURCE</p><h1>让想法，进入实际工作。</h1><p class="lead">从调度编程 Agent，到整理日常开发的方法。<br>这里是我正在维护的公开作品。</p></section><section class="section project-list">${projects(b)}</section>`,
);

const lord = site.projects[0];
page(
  "projects/agent-lord/index.html",
  "Agent Lord",
  lord.summary,
  "projects/",
  (b) =>
    `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${b}projects/">作品</a><span>/</span><span>Agent Lord</span></div><p class="eyebrow">AGENT ORCHESTRATION</p><h1>Agent Lord</h1><p class="lead">${lord.summary}<br>${lord.detail}</p><div class="actions">${link(lord.repo, "查看源码", "button")}${link(projectDocs(lord) + "#quick-start", "快速开始")}</div>${source(lord)}</section><figure class="detail-figure"><a href="${b}assets/observer-example.jpg" aria-label="打开 Observer 演示原图"><img src="${b}assets/observer-example.jpg" width="1280" height="720" alt="Observer 中两个独立评审任务的会话列表和执行时间线"></a><figcaption>Observer 界面演示 · 使用合成示例数据，展示任务与执行记录的组织方式。点击查看原图。</figcaption></figure><section class="detail-grid"><h2>适合什么时候用</h2><div class="detail-body"><p>你在主会话里推进一个开发任务，同时需要其他编程 Agent 做独立评审、探索不同实现，或者继续上次留下的问题。Agent Lord 保存这些任务的会话、执行设置和结果，让主会话可以安排工作、跟进进度，再收回产出。</p><p>它由调用方 Skill、负责执行与监督的 CLI runtime，以及只读的 Observer 组成。任务拆分和推进仍由主会话负责。</p></div></section><section class="detail-grid"><h2>一次评审怎么走完</h2><div class="detail-body"><ol class="step-list"><li><h3>给两个 Agent 同一个评审范围</h3><p>让 Claude Code 和 Codex CLI 分别审查当前分支相对 main 的改动，要求附文件与行号。两个 CLI 任务使用各自的 worktree。</p></li><li><h3>查看各自的执行过程</h3><p>主会话跟进任务；Observer 展示会话、工具活动和已有执行证据。没有取得的证据保持未知。</p></li><li><h3>收集两份结论并复核</h3><p>汇总观点差异，回到具体代码判断问题是否成立；需要时运行验证。任务完成状态不能代替这一步。</p></li><li><h3>接着问其中一个任务</h3><p>上一轮执行结束后，可以继续保存的会话，追问某条发现的触发条件，而不用重新交代全部背景。</p></li></ol><p class="note">以上流程对应公开 README 的使用示例；画面是演示数据，不代表已经对你的项目完成了评审。</p></div></section><section class="detail-grid"><h2>关键能力</h2><div class="detail-body capabilities"><div><h3>会话可以延续</h3><p>保留任务端点与执行约定，后续轮次接着原任务推进。</p></div><div><h3>运行中有监督</h3><p>通过检查点跟踪完成、可处理的错误与端点支持的恢复机会。</p></div><div><h3>过程有记录</h3><p>查看请求、工具活动、结果和可获得的模型证据。</p></div><div><h3>交付物单独检查</h3><p>验证声明的文件存在且非空，或提交与工作区满足交付条件。</p></div></div></section><section class="detail-grid"><h2>开始使用</h2><div class="detail-body"><p>引用版本需要 Node.js 24+、pnpm 9.12.0、Git，以及已安装并登录的目标 CLI。使用 Codex App 任务时，还需要 Codex Desktop 的宿主工具。</p><p>完整安装、Skill 接入与首个任务步骤见版本化 README。升级时先看迁移说明。</p><div class="actions">${link(projectDocs(lord) + "#quick-start", "阅读安装步骤", "button")}</div></div></section><section class="detail-grid"><h2>使用前了解的边界</h2><div class="detail-body"><p>Observer 只读。执行成功、交付物存在和代码正确，是三项需要分别判断的结果。Codex App 端点只展示任务状态，CLI 端点可展示会话与工具活动。</p><p>引用版本的 Skill 会以权限跳过模式启动新 CLI 任务。“只评审、不修改”属于任务指令，不能把执行进程变成只读沙箱。首次运行前应读清执行约定，选择合适的工作目录与授权范围。</p><p class="source-line"><a href="${lord.repo}/blob/${lord.revision}/references/protocol.md#execution-contract">阅读执行约定</a> · 本地验证平台为 macOS；项目未声明完成 Windows 端到端验证。</p></div></section><div class="related">${link(b + "projects/", "返回作品")}${link(b + "projects/dev-skills/", "下一个 · dev-skills")}</div>`,
);

const skills = site.projects[1];
const skillSource = (name) =>
  `${skills.repo}/blob/${skills.revision}/skills/${name}/SKILL.md`;
page(
  "projects/dev-skills/index.html",
  "dev-skills",
  skills.summary,
  "projects/",
  (
    b,
  ) => `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${b}projects/">作品</a><span>/</span><span>dev-skills</span></div><p class="eyebrow">REUSABLE SKILLS</p><h1>dev-skills</h1><p class="lead">${skills.summary}<br>${skills.detail}</p><div class="actions">${link(skills.repo, "查看源码", "button")}${link(projectDocs(skills), "安装与使用")}</div>${source(skills)}</section><section class="detail-grid"><h2>把方法留下来</h2><div class="detail-body"><p>有些要求会在开发中反复出现：解释概念时从基础讲起；评审代码时交代问题的依据。这个仓库把它们整理成可手动调用的 Skills，在需要时应用到当前任务。</p><p>当前公开的两个 Skill 分别用于概念解释和评审。它们提供工作指引，输出质量仍需要结合具体任务检查。</p></div></section><section class="detail-grid"><h2>01 / 解释清楚</h2><div class="detail-body"><h3>explain-as-fool</h3><p>适合刚接触一个技术概念、希望从基础理解它的场景。在支持的宿主中显式调用，再给出你想弄懂的问题。</p><pre><code>$explain-as-fool 解释一下什么是线程池</code></pre><p class="note">说明示例，非真实运行输出：可以先把线程池理解为一组可重复接活的工作线程。任务来了先排队，空闲线程再取走执行；接着需要解释线程数、队列容量和拒绝策略分别影响什么。</p><div class="actions">${link(skillSource("explain-as-fool"), "阅读 Skill 原文")}</div></div></section><section class="detail-grid"><h2>02 / 评审有依据</h2><div class="detail-body"><h3>review-rules</h3><p>用于代码、设计，以及已有评审建议的复核。准则关注正确与完整、最少的必要改造、复杂度与收益、具体的扩展需要，以及清晰的责任边界。</p><pre><code>$review-rules 复核这条建议：
“这里应该增加一个通用重试层。”
请结合当前需求、已有实现和失败场景判断。</code></pre><p class="note">复核思路示例，非真实评审结果：先找出会失败的调用及触发条件，再确认调用是否幂等、现有层是否已经重试。证据明确以后，再比较局部修复与通用封装的成本。</p><div class="actions">${link(skillSource("review-rules"), "阅读 Skill 原文")}</div></div></section><section class="detail-grid"><h2>怎样用得更好</h2><div class="detail-body"><p>先明确任务范围，再调用需要的 Skill。例如评审哪个分支、是否允许修改、最终要交付什么。Skill 会沿用当前任务的范围与执行要求。</p><p>仓库 README 给出了 Codex 的 <code>$skill-name</code> 和 Claude Code 的 <code>/skill-name</code> 调用示例。安装位置和实际支持情况请以宿主及仓库文档为准。</p><div class="actions">${link(projectDocs(skills), "查看仓库使用说明", "button")}${link(b + "writing/skills-and-mcp/", "延伸阅读 · Skills 与 MCP")}</div></div></section><div class="related">${link(b + "projects/", "返回作品")}${link(b + "projects/agent-lord/", "另一个作品 · Agent Lord")}</div>`,
);

page(
  "writing/index.html",
  "文章与实践",
  "关于 Agent 开发、工作方法与技术判断的文章和实践记录。",
  "writing/",
  (b) =>
    `<section class="page-intro"><p class="eyebrow">WRITING & PRACTICE</p><h1>把做过的事，想清楚。</h1><p class="lead">记录 AI 开发中的具体问题、实践方法和判断。<br>文章保留原发表日期，修订时说明变化。</p></section><section class="section project-list">${articleRows(b)}</section><section class="detail-grid"><h2>从实践继续读</h2><div class="detail-body"><p>方法也会写进工具。关于多 Agent 任务推进，可以看 Agent Lord；关于解释与评审，可以看 dev-skills。</p><div class="actions">${link(b + "projects/agent-lord/", "Agent Lord")}${link(b + "projects/dev-skills/", "dev-skills")}</div></div></section>`,
);

for (const a of site.articles) {
  const md = await readFile(resolve(root, `content/${a.slug}.md`), "utf8");
  const headings = [];
  let headingCount = 0;
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const label = this.parser.parseInline(tokens);
    const id = `section-${++headingCount}`;
    if (depth === 2) headings.push({ id, label });
    return `<h${depth} id="${id}">${label}</h${depth}>\n`;
  };
  const article = marked.parse(md, { renderer, gfm: true });
  page(
    `writing/${a.slug}/index.html`,
    a.title,
    a.summary,
    "writing/",
    (b) =>
      `<header class="page-intro article-header"><div class="breadcrumb"><a href="${b}writing/">文章与实践</a><span>/</span><span>${a.topic}</span></div><p class="eyebrow">${a.topic} / NOTES</p><h1>${a.title}</h1><p class="lead">${a.summary}</p><div class="article-meta"><span>谢世杰</span><span>原发表 <time datetime="${a.published}">${a.published}</time></span><span>修订 <time datetime="${a.updated}">${a.updated}</time></span><span>约 ${a.reading}</span></div></header><div class="reading-layout"><nav class="toc" aria-label="文章目录"><h2>ON THIS PAGE</h2>${headings.map((h) => `<a href="#${h.id}">${h.label}</a>`).join("")}</nav><article class="prose">${article}</article></div><div class="related">${link(b + "writing/", "返回文章")}${link(b + "projects/dev-skills/", "实践这个方法 · dev-skills")}</div>`,
    { article: true },
  );
}

page(
  "about/index.html",
  "关于我",
  "我叫谢世杰，关注 AI Agent、开发者工具，以及技术人的工作与成长。",
  "about/",
  (b) =>
    `<section class="page-intro about-lead"><div><p class="eyebrow">ABOUT / 谢世杰</p><h1>探索 AI，也探索<br>工作与成长的新可能。</h1><p class="lead">我叫谢世杰。做开发者工具，也写下实践中的方法与判断。这里是我的个人主页，记录公开作品与个人观点。</p></div><img src="${b}assets/brand-robot.png" width="1024" height="1024" alt="AI游民朱红机器人形象"></section><section class="detail-grid"><h2>始终关心的事</h2><div class="detail-body"><p>怎样让开发者工作得更高效，是贯穿我几段经历的问题。从研发效能到代码智能，再到 AI Coding，工具在变化，需要做出的判断也在变化。</p><p>现在我尤其关心 Agent 如何获得合适的上下文、怎样验证结果，以及怎样让执行过程中的错误及时暴露。</p></div></section><section class="detail-grid"><h2>走过的路径</h2><div class="detail-body"><ol class="timeline"><li><time>2026 — 现在</time><div><h3>MiniMax</h3><p>Agent 研发，目前参与 MiniMax Code Agent 的研发。</p></div></li><li><time>2025 — 2026</time><div><h3>小红书</h3><p>AI Coding，关注多步任务中的上下文与执行过程。</p></div></li><li><time>2023 — 2025</time><div><h3>理想汽车</h3><p>代码智能，从代码补全到智能 Code Review。</p></div></li><li><time>此前</time><div><h3>快手</h3><p>Java 后端工程师，做研发效能与开发者工具。</p></div></li></ol></div></section><section class="detail-grid"><h2>这里会写什么</h2><div class="detail-body capabilities"><div><h3>把 AI 用进工作</h3><p>记录 Agent 工具、开发实践，以及可复用的工作方法。</p></div><div><h3>形成自己的判断</h3><p>从具体任务出发，看清能力、边界和验证结果。</p></div><div><h3>继续成长</h3><p>思考工具变化以后，技术人如何调整自己的工作方式。</p></div></div></section><section class="detail-grid"><h2>找到我</h2><div class="detail-body"><p>开源项目与代码放在 GitHub。文章和实践也会在公众号「${esc(site.wechat)}」分享；你可以通过页脚复制名称，在微信中搜索。</p><div class="actions">${link(site.github, "GitHub 主页", "button")}${link(b + "writing/", "读我的文章")}</div></div></section>`,
);

const changeRows = [
  ["1d", "1 天"],
  ["3d", "3 天"],
  ["7d", "7 天"],
  ["30d", "1 个月"],
]
  .map(
    ([key, label]) =>
      `<tr data-change-window="${key}"><th scope="row">${label}</th><td class="change-created" data-change-created>—</td><td class="change-modified" data-change-modified>—</td><td class="change-deleted" data-change-deleted>—</td><td><span class="coverage-badge" data-change-coverage>积累中</span></td></tr>`,
  )
  .join("");

const lineRows = [
  ["1d", "1 天"],
  ["3d", "3 天"],
  ["7d", "7 天"],
  ["30d", "1 个月"],
]
  .map(
    ([key, label]) =>
      `<tr data-line-window="${key}"><th scope="row">${label}</th><td class="change-created" data-line-added>—</td><td class="change-deleted" data-line-deleted>—</td><td><span class="coverage-badge" data-line-coverage>积累中</span></td></tr>`,
  )
  .join("");

page(
  "sync-status/index.html",
  "Obsidian 同步状态",
  "Self-hosted LiveSync 的脱敏运行状态与最近文件、行数变化，不展示笔记正文或数据库凭据。",
  "",
  (b) => `
    <section class="page-intro sync-status-intro">
      <div class="breadcrumb"><a href="${b}">首页</a><span>/</span><span>同步状态</span></div>
      <p class="eyebrow">SYSTEM STATUS / OBSIDIAN</p>
      <h1>Obsidian 同步状态</h1>
      <p class="lead">这里仅展示 Self-hosted LiveSync 的脱敏运行指标。笔记正文、路径和数据库凭据不会出现在这个页面。</p>
    </section>
    <section class="status-board" data-sync-status data-endpoint="./status.json" data-state="loading" aria-busy="true">
      <div class="status-board-head">
        <div><span class="status-label">CURRENT STATUS</span><h2>云端同步服务</h2></div>
        <span class="status-badge" data-status-badge><i aria-hidden="true"></i><span data-status-label>读取中</span></span>
      </div>
      <div class="status-metrics">
        <div class="status-metric"><span>远端记录</span><strong data-status-documents>—</strong><small>加密数据记录，不等于笔记数量</small></div>
        <div class="status-metric"><span>数据库文件</span><strong data-status-storage>—</strong><small>CouchDB 当前磁盘占用</small></div>
        <div class="status-metric"><span>逻辑数据</span><strong data-status-data>—</strong><small>压缩前的有效数据体积</small></div>
        <div class="status-metric"><span>状态检查</span><strong class="status-time" data-status-updated>—</strong><small>页面打开后每分钟刷新</small></div>
      </div>
      <p class="status-message" data-status-message role="status" aria-live="polite">正在读取服务器状态……</p>
      <noscript><p class="status-message">需要启用 JavaScript 才能读取实时状态。</p></noscript>
      <div class="change-history">
        <div class="change-history-head">
          <div><span class="status-label">RECENT CHANGES</span><h3>最近变更</h3></div>
        </div>
        <div class="change-subsection">
          <div class="change-subsection-head"><h4>文件</h4><span class="change-tracking" data-change-tracking>正在建立统计基线……</span></div>
          <div class="change-table-wrap">
            <table class="change-table">
              <thead><tr><th scope="col">时间范围</th><th scope="col">新增文件</th><th scope="col">修改文件</th><th scope="col">删除文件</th><th scope="col">数据完整度</th></tr></thead>
              <tbody>${changeRows}</tbody>
            </table>
          </div>
          <p class="change-note">同一个文件在每个时间窗口、每种操作中只计算一次；重命名计为删除旧文件并新增新文件。</p>
        </div>
        <div class="change-subsection">
          <div class="change-subsection-head"><h4>Markdown 行数</h4><span class="change-tracking" data-line-tracking>等待电脑建立统计基线……</span></div>
          <div class="change-table-wrap">
            <table class="change-table line-change-table">
              <thead><tr><th scope="col">时间范围</th><th scope="col">新增行数</th><th scope="col">删除行数</th><th scope="col">数据完整度</th></tr></thead>
              <tbody>${lineRows}</tbody>
            </table>
          </div>
          <p class="change-note">修改一行会计为删除 1 行、再新增 1 行。电脑离线时暂停扫描，恢复后统计离线期间的净变化。</p>
        </div>
      </div>
    </section>
    <section class="detail-grid status-explanation">
      <h2>这里能看到什么</h2>
      <div class="detail-body"><p>页面只公开服务状态、远端记录数量、存储占用，以及最近文件和行数变化。服务器按分钟采集匿名文件记录；行数由电脑本地只读 Markdown 后汇总上报，前端不会连接 CouchDB，也不会持有同步密码。</p><p>统计从功能启用时开始积累，不补造更早的历史。由于同步库已开启端到端加密和路径混淆，云端不会收到文件名、路径、逐行内容或笔记正文。</p></div>
    </section>`,
);

for (const { path, html } of pages) {
  for (const target of [resolve(root, path), resolve(root, "dist", path)]) {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
  }
}
await cp(resolve(root, "assets"), resolve(root, "dist/assets"), {
  recursive: true,
});
await writeFile(resolve(root, "dist/.nojekyll"), "");
console.log(
  `Built ${pages.length} static pages for GitHub Pages (root) and private preview (dist).`,
);

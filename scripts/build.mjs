import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { renderHome } from "./home.mjs";

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
  return `<article class="featured"><div class="featured-copy"><span class="eyebrow">01 / ${lord.type}</span><h3>${lord.name}</h3><p>${lord.summary}</p><p>${lord.detail}</p>${link(base + "projects/agent-lord/", "了解项目")}</div><figure class="screen-figure"><a href="${base}projects/agent-lord/" aria-label="查看 Agent Lord 项目与演示"><img src="${base}assets/observer-example.jpg" width="1280" height="720" alt="Agent Lord Observer 展示两个代码评审任务、工具执行记录和评审结果" loading="lazy"></a><figcaption>OBSERVER · 使用合成示例数据的界面演示</figcaption></figure></article><article class="skill-card"><div><span class="eyebrow">02 / ${skills.type}</span><h3>${skills.name}</h3><p>${skills.summary}</p>${link(base + "projects/dev-skills/", "查看 Skills")}</div><div class="skill-code" aria-label="Skill 调用示例"><code><span>$core-spec</span> 留下明确的约定</code><code><span>$mr-for-human</span> 读懂 AI 写的代码</code></div></article>`;
}

function articleRows(base) {
  return site.articles
    .map(
      (a) =>
        `<a class="article-row" href="${base}writing/${a.slug}/"><div class="article-date"><time datetime="${a.published}">${a.published.replaceAll("-", ".")}</time><span class="tag">${a.topic}</span></div><div><h3>${a.title}</h3><p>${a.summary}</p></div><span class="article-arrow" aria-hidden="true">↗</span></a>`,
    )
    .join("");
}

pages.push({ path: "index.html", html: renderHome(site) });

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
    `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${b}projects/">作品</a><span>/</span><span>Agent Lord</span></div><p class="eyebrow">AGENT ORCHESTRATION</p><h1>Agent Lord</h1><p class="lead">${lord.summary}<br>${lord.detail}</p><div class="actions">${link(lord.repo, "查看源码", "button")}${link(projectDocs(lord) + "#quick-start", "快速开始")}</div>${source(lord)}</section><figure class="detail-figure"><a href="${b}assets/observer-example.jpg" aria-label="打开 Observer 演示原图"><img src="${b}assets/observer-example.jpg" width="1280" height="720" alt="Observer 中两个独立评审任务的会话列表和执行时间线"></a><figcaption>Observer 界面演示 · 使用合成示例数据，展示任务与执行记录的组织方式。点击查看原图。</figcaption></figure><section class="detail-grid"><h2>适合什么时候用</h2><div class="detail-body"><p>你在主会话里推进一个开发任务，同时需要其他编程 Agent 做独立评审、探索不同实现，或者继续上次留下的问题。Agent Lord 保存这些任务的会话、执行设置和结果，让主会话可以安排工作、跟进进度，再收回产出。</p><p>它由调用方 Skill、负责执行与监督的 CLI runtime，以及用于观察进度的 Observer 组成。任务拆分和推进仍由主会话负责。</p></div></section><section class="detail-grid"><h2>选一条工作路径</h2><div class="detail-body"><p>从单个任务开始，也可以按目标选择已有工作流。主会话负责推进流程，执行端负责具体任务；会话、执行记录与交付证据分别保存。</p><ol class="step-list">${lord.workflows.map(w=>`<li id="${esc(w.slug)}"><h3>${esc(w.name)}</h3><p>${esc(w.description)}</p><a href="${lord.repo}/blob/${lord.revision}/references/pipelines/${w.slug}.md">阅读工作流说明 ↗</a></li>`).join("")}</ol><p class="note">计划交叉评审的最终文档由作者自查确认；计划到实现会创建 PR/MR，合并仍需另行授权。完成执行、通过测试与确认正确，是不同的判断。</p></div></section><figure class="detail-figure"><a href="${b}assets/agent-lord-plan-to-implement.svg" aria-label="打开计划到实现流程图"><img src="${b}assets/agent-lord-plan-to-implement.svg" alt="计划到实现：核验模块计划，按依赖并行实现，统一整合，再验证并创建 PR 或 MR" loading="lazy"></a><figcaption>Agent Lord 公开仓库流程图 · 按依赖并行实现，再由一个整合者完成交付。点击查看原图。</figcaption></figure><section class="detail-grid"><h2>关键能力</h2><div class="detail-body capabilities"><div><h3>会话可以延续</h3><p>保留任务端点与执行约定，后续轮次接着原任务推进。</p></div><div><h3>运行中有监督</h3><p>通过检查点跟踪完成、可处理的错误与端点支持的恢复机会。</p></div><div><h3>过程有记录</h3><p>查看请求、工具活动、结果和可获得的模型证据。</p></div><div><h3>交付物单独检查</h3><p>验证声明的文件存在且非空，或提交与工作区满足交付条件。</p></div></div></section><section class="detail-grid"><h2>开始使用</h2><div class="detail-body"><p>引用版本需要 Node.js 24+、pnpm 9.12.0、Git，以及已安装并登录的目标 CLI。支持 Claude Code、Codex CLI 和 MCode CLI；MCode 需要 0.4.9 或更高版本。使用 Codex App 任务时，还需要 Codex Desktop 的宿主工具。</p><p>完整安装、Skill 接入与首个任务步骤见版本化 README。升级时先看迁移说明。</p><div class="actions">${link(projectDocs(lord) + "#quick-start", "阅读安装步骤", "button")}</div></div></section><section class="detail-grid"><h2>使用前了解的边界</h2><div class="detail-body"><p>Observer 不发起任务或推进工作流；在用户明确要求时，可以打开已有 CLI 会话的终端入口。执行成功、交付物存在和代码正确，是三项需要分别判断的结果。Codex App 端点只展示任务状态，CLI 端点可展示会话与工具活动。</p><p>引用版本的 Skill 会以权限跳过模式启动新 CLI 任务。“只评审、不修改”属于任务指令，不能把执行进程变成只读沙箱。首次运行前应读清执行约定，选择合适的工作目录与授权范围。</p><p class="source-line"><a href="${lord.repo}/blob/${lord.revision}/references/protocol.md#execution-contract">阅读执行约定</a> · 本地验证平台为 macOS；项目未声明完成 Windows 端到端验证。</p></div></section><div class="related">${link(b + "projects/", "返回作品")}${link(b + "projects/dev-skills/", "下一个 · dev-skills")}</div>`,
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
  ) => `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${b}projects/">作品</a><span>/</span><span>dev-skills</span></div><p class="eyebrow">REUSABLE SKILLS</p><h1>dev-skills</h1><p class="lead">${skills.summary}<br>${skills.detail}</p><div class="actions">${link(skills.repo, "查看源码", "button")}${link(projectDocs(skills), "安装与使用")}</div>${source(skills)}</section><section class="detail-grid"><h2>把方法留下来</h2><div class="detail-body"><p>当前公开六个 Skill，覆盖概念解释、评审判断、技术方案、决策收敛、执行计划与变更阅读。每个 Skill 都可独立使用，按当前任务选择，不要求依次调用。</p><p>全部采用手动触发：Codex 用 <code>$skill-name</code>，Claude Code 用 <code>/skill-name</code>。它们提供可复用的工作指引，实际输出仍需结合任务检查。</p></div></section>${skills.catalog.map((skill,index)=>`<section class="detail-grid" id="${esc(skill.name)}"><h2>${String(index+1).padStart(2,'0')} / ${esc(skill.title)}</h2><div class="detail-body"><h3>${esc(skill.name)}</h3><p>${esc(skill.description)}</p><pre><code>${esc(skill.example)}</code></pre><div class="actions">${link(skillSource(skill.name),"阅读 Skill 原文")}</div></div></section>`).join("")}<section class="detail-grid"><h2>怎样用得更好</h2><div class="detail-body"><p>先明确任务范围，再调用需要的 Skill。例如评审哪个分支、是否允许修改、最终要交付什么。Skill 会沿用当前任务的范围与执行要求。</p><p>仓库 README 给出了 Codex 的 <code>$skill-name</code> 和 Claude Code 的 <code>/skill-name</code> 调用示例。安装位置和实际支持情况请以宿主及仓库文档为准。</p><div class="actions">${link(projectDocs(skills), "查看仓库使用说明", "button")}${link(b + "writing/skills-and-mcp/", "延伸阅读 · Skills 与 MCP")}</div></div></section><div class="related">${link(b + "projects/", "返回作品")}${link(b + "projects/agent-lord/", "另一个作品 · Agent Lord")}</div>`,
);

page(
  "writing/index.html",
  "文章与实践",
  "关于 Agent 开发、工作方法与技术判断的文章和实践记录。",
  "writing/",
  (b) =>
    `<section class="page-intro"><p class="eyebrow">WRITING & PRACTICE</p><h1>把做过的事，想清楚。</h1><p class="lead">记录 AI 开发中的具体问题、实践方法和判断。<br>文章保留原发表日期，修订时说明变化。</p></section><section class="section project-list">${articleRows(b)}</section><section class="detail-grid"><h2>从实践继续读</h2><div class="detail-body"><p>方法也会写进工具。关于多 Agent 任务推进，可以看 Agent Lord；关于决策、计划与评审方法，可以看 dev-skills。</p><div class="actions">${link(b + "projects/agent-lord/", "Agent Lord")}${link(b + "projects/dev-skills/", "dev-skills")}</div></div></section>`,
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

const changeTabs = [
  ["1d", "1 天"],
  ["3d", "3 天"],
  ["7d", "7 天"],
  ["30d", "1 个月"],
]
  .map(
    ([key, label], index) =>
      `<button type="button" role="tab" id="change-tab-${key}" data-change-tab="${key}" aria-controls="change-panel" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}">${label}</button>`,
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
    <section class="status-board" data-sync-status data-endpoint="https://xieshijie.cn/sync-status/status.json" data-state="loading" aria-busy="true">
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
          <span class="coverage-badge" data-window-coverage>数据加载中</span>
        </div>
        <div class="change-tabs" role="tablist" aria-label="最近变更时间范围">${changeTabs}</div>
        <div id="change-panel" class="change-panel" role="tabpanel" aria-labelledby="change-tab-1d" data-change-panel>
          <div class="change-table-wrap">
            <table class="change-table change-summary-table">
              <thead><tr><th scope="col">新增文件</th><th scope="col">修改文件</th><th scope="col">删除文件</th><th scope="col">新增行数</th><th scope="col">删除行数</th></tr></thead>
              <tbody><tr><td class="change-created" data-summary-created>—</td><td class="change-modified" data-summary-modified>—</td><td class="change-deleted" data-summary-deleted>—</td><td class="change-created" data-summary-lines-added>—</td><td class="change-deleted" data-summary-lines-deleted>—</td></tr></tbody>
            </table>
          </div>
          <div class="change-sources"><span data-change-tracking>正在建立文件统计基线……</span><span data-line-tracking>等待电脑建立行数统计基线……</span></div>
          <p class="change-note">文件在每个时间范围、每种操作中只计算一次；修改一行计为删除 1 行、再新增 1 行。重命名按删除旧文件并新增新文件计算。</p>
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

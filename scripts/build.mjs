import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { renderHome } from "./home.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(
  await readFile(resolve(root, "content/site.json"), "utf8"),
);
const styles = {};
for (const name of ["home", "site"])
  styles[name] = createHash("sha256")
    .update(await readFile(resolve(root, `assets/${name}.css`)))
    .digest("hex")
    .slice(0, 12);
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
  ["writing/", "文章"],
  ["about/", "关于"],
];
const pages = [];
// Legacy images stay on the COS image host; COS resizes and re-encodes them on request.
const cosImage = /(src="https:\/\/coder-xieshijie-img-1253784930\.cos\.ap-beijing\.myqcloud\.com\/[^"?]+)"/g;
const cosResize = "imageMogr2/thumbnail/1600x%3E/format/webp";
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
      ? `<a class="police-filing" href="${esc(f.policeUrl)}"><img src="${base}assets/police-filing.png" width="18" height="20" alt="">${esc(f.police)}</a>`
      : "",
  ].join("");
  return `<footer class="site-footer"><div class="wrap"><div class="footer-main"><div><h2>继续探索。</h2><p>探索 AI，也探索工作与成长的新可能。</p></div><div><div class="footer-links">${link(site.github, "GitHub")}<button class="copy-button" type="button" data-copy="${esc(site.wechat)}">公众号 · ${esc(site.wechat)} <span aria-hidden="true">⧉</span></button></div><span id="copy-status" class="copy-status" role="status" aria-live="polite"></span></div></div><div class="footer-meta"><span>© 2026 谢世杰 · AI ROAM</span><span class="filing">${filings}</span><a href="${base}about/">关于我</a></div></div></footer>`;
}

function page(path, title, description, active, body, options = {}) {
  const depth = path === "index.html" ? 0 : path.split("/").length - 1;
  const base = depth ? "../".repeat(depth) : "./";
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)} · ${esc(site.name)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="${options.article ? "article" : "website"}"><meta property="og:title" content="${esc(title)} · ${esc(site.name)}"><meta property="og:description" content="${esc(description)}"><meta name="theme-color" content="#f4f0e6"><link rel="icon" type="image/x-icon" href="${base}assets/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="${base}assets/apple-touch-icon.png"><link rel="stylesheet" href="${base}assets/site.css?v=${styles.site}"><script src="${base}assets/site.js" defer></script></head>
<body><a class="skip" href="#main">跳到正文</a><header class="site-header wrap"><nav class="nav" aria-label="主导航">${nav.map(([url, label]) => `<a href="${base}${url}"${active === url ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav><a class="brand" href="${base}" aria-label="${esc(site.name)}首页"><img src="${base}assets/brand-robot.png" width="36" height="36" alt=""><span>${esc(site.name)}<small>SHIJIE / KEEP ROAMING</small></span></a><a class="nav-github" href="${site.github}">GitHub ↗</a></header><main id="main" class="wrap">${body(base)}</main>${footer(base)}</body></html>\n`;
  pages.push({ path, html });
}

const project = (slug) => site.projects.find((p) => p.slug === slug);
const skills = project("dev-skills");
const lord = project("agent-lord");
const flowSkills = skills.catalog.filter((skill) => skill.group === "flow");
const skillSource = (name) =>
  `${skills.repo}/blob/${skills.revision}/skills/${name}/SKILL.md`;
const touchpoints = "人只在三处介入：确认决定，确认验收标准，合入前读一遍决定清单。";

function projects(base) {
  return `<article class="featured"><div class="featured-copy"><span class="eyebrow">01 / ${esc(skills.type)}</span><h3>${esc(skills.name)}</h3><p>${esc(skills.summary)}</p><p>${touchpoints}</p>${link(base + "projects/dev-skills/", "了解项目")}</div><figure class="flow-figure"><ol>${flowSkills.map((skill) => `<li><span>${esc(skill.step)}</span><div><code>/dev-skills:${esc(skill.name)}</code><p>${esc(skill.title)}</p></div></li>`).join("")}</ol><figcaption>共 ${skills.catalog.length} 个 Skills，其中四个串起从需求到合入的流程</figcaption></figure></article><article class="skill-card"><div><span class="eyebrow">02 / ${esc(lord.type)} · 起点</span><h3>${esc(lord.name)}</h3><p>${esc(lord.summary)}</p>${link(base + "projects/agent-lord/", "看看它做过什么")}</div><div class="skill-code" aria-label="Agent Lord 的 pipeline">${lord.workflows.map((w) => `<code><span>${esc(w.slug)}</span> ${esc(w.name)}</code>`).join("")}</div></article>`;
}

function articleRows(base) {
  const years = [...new Set(site.articles.map(a => a.published.slice(0, 4)))];
  return years.map(year => `<section class="year-group" data-year-group aria-labelledby="year-${year}"><h2 class="year-label" id="year-${year}">${year}</h2>${site.articles.filter(a => a.published.startsWith(year)).map(a => `<a class="article-row" data-article-topic="${esc(a.topic)}" href="${base}writing/${a.slug}/"><time class="article-date" datetime="${a.published}">${a.published.slice(5).replace("-", ".")}</time><div><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><p class="article-info">${esc(a.topic)} · ${esc(a.reading)}</p></div><span class="article-arrow" aria-hidden="true">↗</span></a>`).join("")}</section>`).join("");
}

function articleFilters() {
  const topics = [...new Set(site.articles.map(a => a.topic))];
  return `<div class="article-filters" data-article-filters role="group" aria-label="按主题筛选文章" hidden><button type="button" data-topic="" aria-pressed="true">全部 <span>${site.articles.length}</span></button>${topics.map(topic => `<button type="button" data-topic="${esc(topic)}" aria-pressed="false">${esc(topic)} <span>${site.articles.filter(a => a.topic === topic).length}</span></button>`).join("")}</div><p class="article-count" data-article-count role="status" aria-live="polite">共 ${site.articles.length} 篇 · 按发表时间排列</p>`;
}


pages.push({ path: "index.html", html: renderHome(site, styles.home) });

page(
  "projects/index.html",
  "作品",
  "dev-skills 与 Agent Lord：从需求到可合入 PR 的 Agent 工作流，以及它的起点。",
  "projects/",
  (b) =>
    `<section class="page-intro"><p class="eyebrow">WORK / OPEN SOURCE</p><h1>让想法，进入实际工作。</h1><p class="lead">一套从需求走到可合入 PR 的 Skills，和它的前身。<br>这里是我公开的作品。</p></section><section class="section project-list">${projects(b)}</section>`,
);

page(
  "projects/agent-lord/index.html",
  "Agent Lord",
  lord.summary,
  "projects/",
  (b) =>
    `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${b}projects/">作品</a><span>/</span><span>Agent Lord</span></div><p class="eyebrow">${esc(lord.type)} · 起点</p><h1>Agent Lord</h1><p class="lead">${esc(lord.summary)}<br>${esc(lord.detail)}</p><div class="actions">${link(lord.repo, "查看源码", "button")}${link(b + "projects/dev-skills/", "现在的做法 · dev-skills")}</div>${source(lord)}</section><figure class="detail-figure"><a href="${b}assets/observer-example.jpg" aria-label="打开 Observer 演示原图"><img src="${b}assets/observer-example.jpg" width="1280" height="720" alt="Observer 中两个独立评审任务的会话列表和执行时间线"></a><figcaption>Observer 界面演示 · 使用合成示例数据，展示任务与执行记录的组织方式。点击查看原图。</figcaption></figure><section class="detail-grid"><h2>它是什么</h2><div class="detail-body"><p>在 Codex、Claude Code 或 MCode 的一个主会话里，把工作派给 Claude Code、Codex CLI、MCode CLI 或 Codex App 任务。Agent Lord 保存执行设置、会话、进度和产物，主会话可以监督这些任务，并在后续轮次接着推进。</p><p>它由三部分组成：指导主会话的 Skill、负责执行与记录的 CLI runtime，以及展示进度的 Observer。拆分任务、派发和验收都由主会话负责；执行端可以用自己的工具和子 Agent，但不能再调用 Agent Lord。</p></div></section><section class="detail-grid"><h2>做过的几条 pipeline</h2><div class="detail-body"><p>常用的多会话流程被固定成 pipeline：谁来做、哪些能并行、什么证据能放行下一步、什么时候结束。</p><ol class="step-list">${lord.workflows.map((w) => `<li id="${esc(w.slug)}"><h3>${esc(w.name)}</h3><p>${esc(w.description)}</p><a href="${lord.repo}/blob/${lord.revision}/references/pipelines/${w.slug}.md">阅读 pipeline 规则 ↗</a></li>`).join("")}</ol><p class="note">执行成功、交付物存在、测试通过和代码正确，是分开判断的结果。交叉评审把“流程是否走完”和“代码有没有问题”分开报告；计划到实现会开 PR/MR，合入仍由人决定。</p></div></section><figure class="detail-figure"><a href="${b}assets/agent-lord-cross-review.svg" aria-label="打开交叉评审流程图"><img src="${b}assets/agent-lord-cross-review.svg" alt="交叉评审：固定审查范围，MCode 与 Codex 独立初审，交换产物互相质证，可选一轮收敛，再由新的 MCode 会话独立复核" loading="lazy"></a><figcaption>Agent Lord 公开仓库流程图 · 交叉评审。点击查看原图。</figcaption></figure><section class="detail-grid"><h2>为什么不再用于新需求</h2><div class="detail-body"><p>Agent Lord 解决的是同时调度多个 Agent。用下来，卡住交付的是另外两件事：Agent 没法自己运行和操作正在开发的产品，问题常常要等我自己用的时候才发现；已经定下的决定，也会在一次次交接中丢失。Agent 越多，要我检查和重复说明的事越多。</p><p>9 月底起，新需求改走 dev-skills 的流程：先给仓库搭一个 Agent 能自己启动、操作、观察的验证环境；再由一个 Agent 负责到底，需要并行时由它自己分给子 Agent；最后由另一家模型独立验证。让不同模型互相检查的做法，在新流程里留了下来。</p><div class="actions">${link(b + "projects/dev-skills/", "看现在的流程", "button")}</div></div></section><section class="detail-grid"><h2>如果想试试</h2><div class="detail-body"><p>仓库仍然公开。引用版本需要 Node.js 24+、pnpm 9.12.0、Git，以及已安装并登录的目标 CLI；MCode 需要 0.4.9 或更高版本，Codex App 任务还需要 Codex Desktop 的宿主工具。pipeline 依赖另行安装的 dev-skills 中的 review-rules、plan-for-agents 和 explain-as-fool。</p><div class="actions">${link(projectDocs(lord) + "#quick-start", "阅读安装步骤")}</div></div></section><section class="detail-grid"><h2>使用前了解的边界</h2><div class="detail-body"><p>Observer 不发起任务，也不推进 pipeline；在用户明确要求时，可以打开已有 CLI 会话的终端入口。Codex App 端点只展示任务状态，CLI 端点可展示会话与工具活动。</p><p>引用版本的 Skill 会以权限跳过模式启动新 CLI 任务。“只评审、不修改”属于任务指令，不能把执行进程变成只读沙箱。首次运行前应读清执行约定，选择合适的工作目录与授权范围。</p><p class="source-line"><a href="${lord.repo}/blob/${lord.revision}/references/protocol.md#execution-contract">阅读执行约定</a> · 本地验证平台为 macOS，CI 覆盖 macOS 与 Linux；项目未声明完成 Windows 端到端验证。</p></div></section><div class="related">${link(b + "projects/", "返回作品")}${link(b + "projects/dev-skills/", "下一个 · dev-skills")}</div>`,
);

const skillEntry = (skill) =>
  `<li id="${esc(skill.name)}"><h3>${esc(skill.name)} · ${esc(skill.title)}</h3><p>${esc(skill.description)}</p><pre><code>${esc(skill.example)}</code></pre><a href="${skillSource(skill.name)}">阅读 Skill 原文 ↗</a></li>`;
page(
  "projects/dev-skills/index.html",
  "dev-skills",
  skills.summary,
  "projects/",
  (
    b,
  ) => `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${b}projects/">作品</a><span>/</span><span>dev-skills</span></div><p class="eyebrow">${esc(skills.type)}</p><h1>dev-skills</h1><p class="lead">${esc(skills.summary)}<br>${esc(skills.detail)}</p><div class="actions">${link(skills.repo, "查看源码", "button")}${link(projectDocs(skills) + "#install", "安装与使用")}</div>${source(skills)}</section><section class="detail-grid"><h2>一个需求怎样走完</h2><div class="detail-body"><p>每个仓库先做一次准备，之后每个需求依次经过定义和交付；这次暴露出的仓库缺口，列在 PR 里，由你决定补回仓库还是 Skill。</p><ol class="step-list">${flowSkills.map((skill) => `<li><h3>${esc(skill.step)} · <a href="#${esc(skill.name)}">${esc(skill.name)}</a></h3><p>${esc(skill.title)}。你：${esc(skill.you)}。</p></li>`).join("")}</ol><p class="note">几条约定贯穿全程：要人决定的事和验收要求在开头定全，结尾由另一家模型按验收标准验证，中间交给一个 owner 做完；合入、强推共享分支、删除共享数据、对外发消息、改共享环境，这些不可逆操作留给你。</p></div></section>${flowSkills.map((skill) => `<section class="detail-grid" id="${esc(skill.name)}"><h2>${esc(skill.step)} / ${esc(skill.title)}</h2><div class="detail-body"><h3>${esc(skill.name)}</h3><p>${esc(skill.description)}</p><p>你要做的：${esc(skill.you)}。</p><pre><code>${esc(skill.example)}</code></pre><div class="actions">${link(skillSource(skill.name), "阅读 Skill 原文")}</div></div></section>`).join("")}<section class="detail-grid"><h2>流程里也会用到</h2><div class="detail-body"><p>评审、读 PR 和写报告时，流程会沿用下面三个 Skill；它们也可以单独调用。</p><ol class="step-list">${skills.catalog.filter((skill) => skill.group === "support").map(skillEntry).join("")}</ol></div></section><section class="detail-grid"><h2>可以单独使用</h2><div class="detail-body"><p>不在交付流程里，按手头的任务单独调用。</p><ol class="step-list">${skills.catalog.filter((skill) => skill.group === "standalone").map(skillEntry).join("")}</ol></div></section><section class="detail-grid"><h2>安装与调用</h2><div class="detail-body"><p>以插件安装时，Skill 带命名空间：MCode 和 Claude Code 写 <code>/dev-skills:core-grill</code>，Codex 写 <code>$dev-skills:core-grill</code>。从克隆把 Skill 目录链接到本机时没有命名空间，写 <code>/core-grill</code> 或 <code>$core-grill</code>。两种方式二选一。</p><p>在 Claude Code 和 Codex 里，core-spec 也可以在讨论结束后由 Agent 主动调用，其余 Skill 只支持手动调用。MCode 目前不读这个设置，按名字调用更稳妥。</p><div class="actions">${link(projectDocs(skills) + "#install", "查看安装步骤", "button")}</div></div></section><section class="detail-grid"><h2>使用前的前提</h2><div class="detail-body"><p>需要两个不同家族模型的 CLI，都装好并登录，默认是 Claude Code 和 Codex。查漏和最终验证必须由另一家模型来做；只有一家可用时，流程会停在那一步，不会降级成同家族检查。</p><p>还需要 Node.js 24、git，以及开 PR 用的 <code>gh</code> 或 <code>glab</code>；再加一个 Agent 能在 worktree 里启动、操作、观察的应用，这正是 repo-readiness 要搭的。插件安装支持 MCode、Claude Code 和 Codex；端到端测试目前只在 Claude Code 和 Codex 上做过。</p></div></section><div class="related">${link(b + "projects/", "返回作品")}${link(b + "projects/agent-lord/", "它的起点 · Agent Lord")}</div>`,
);

page(
  "writing/index.html",
  "文章与实践",
  "关于 Agent 开发、工作方法与技术判断的文章和实践记录。",
  "writing/",
  (b) =>
    `<section class="page-intro"><p class="eyebrow">WRITING & PRACTICE</p><h1>把做过的事，想清楚。</h1><p class="lead">从 AI 实践、研发效能，到工作中的方法与思考。<br>收录早期笔记与近期文章，按发表时间排列。</p></section>${articleFilters()}<section class="section project-list article-library" aria-label="文章列表">${articleRows(b)}</section><section class="detail-grid"><h2>从实践继续读</h2><div class="detail-body"><p>方法也会写进工具。从需求到可合入 PR 的流程，可以看 dev-skills；它的起点、一个多 Agent 调度器，可以看 Agent Lord。</p><div class="actions">${link(b + "projects/dev-skills/", "dev-skills")}${link(b + "projects/agent-lord/", "Agent Lord")}</div></div></section>`,
);

for (const [index, a] of site.articles.entries()) {
  const headings = a.legacy ? a.toc : [];
  let article;
  if (a.legacy) {
    article = (await readFile(resolve(root, `content/legacy/${a.slug}.html`), "utf8")).replace(cosImage, `$1?${cosResize}"`);
  } else {
    const md = await readFile(resolve(root, `content/${a.slug}.md`), "utf8");
    let headingCount = 0;
    const renderer = new marked.Renderer();
    renderer.heading = function ({ tokens, depth }) {
      const label = this.parser.parseInline(tokens);
      const id = `section-${++headingCount}`;
      if (depth === 2) headings.push({ id, label });
      return `<h${depth} id="${id}">${label}</h${depth}>\n`;
    };
    article = marked.parse(md, { renderer, gfm: true });
  }
  const previous = site.articles[index - 1], next = site.articles[index + 1];
  page(
    `writing/${a.slug}/index.html`, a.title, a.summary, "writing/",
    b => `<header class="page-intro article-header"><div class="breadcrumb"><a href="${b}writing/">文章</a><span>/</span><span>${esc(a.topic)}</span></div><h1>${esc(a.title)}</h1><p class="lead">${esc(a.summary)}</p><div class="article-meta"><span>谢世杰</span><span>发表于 <time datetime="${a.published}">${a.published}</time></span><span>约 ${esc(a.reading)}</span></div></header><div class="reading-layout"><nav class="toc" aria-label="文章目录"><h2>本文目录</h2>${headings.length ? headings.map(h => `<a href="#${h.id}">${a.legacy ? esc(h.label) : h.label}</a>`).join("") : '<a href="#article-body">阅读全文</a>'}</nav><article class="prose" id="article-body">${article}</article></div><nav class="article-pagination" aria-label="前后篇文章">${previous ? `<a href="../${previous.slug}/"><span>上一篇</span><strong>${esc(previous.title)}</strong></a>` : ""}${next ? `<a href="../${next.slug}/"><span>下一篇</span><strong>${esc(next.title)}</strong></a>` : ""}</nav><div class="related">${link(b + "writing/", "返回全部文章")}${link(b + "", "回到首页")}</div>`,
    { article: true },
  );
}

page(
  "about/index.html",
  "关于我",
  "我叫谢世杰，关注 AI Agent、开发者工具，以及技术人的工作与成长。",
  "about/",
  (b) =>
    `<section class="page-intro about-lead"><div><p class="eyebrow">ABOUT / 谢世杰</p><h1>探索 AI，也探索<br>工作与成长的新可能。</h1><p class="lead">我叫谢世杰。做开发者工具，也写下实践中的方法与判断。这里是我的个人主页，记录公开作品与个人观点。</p></div><img src="${esc(site.avatar)}?imageMogr2/thumbnail/480x/format/webp" width="240" height="240" alt="谢世杰"></section><section class="detail-grid"><h2>始终关心的事</h2><div class="detail-body"><p>怎样让开发者工作得更高效，是贯穿我几段经历的问题。从研发效能到代码智能，再到 AI Coding，工具在变化，需要做出的判断也在变化。</p><p>现在我尤其关心 Agent 如何获得合适的上下文、怎样验证结果，以及怎样让执行过程中的错误及时暴露。</p></div></section><section class="detail-grid"><h2>走过的路径</h2><div class="detail-body"><ol class="timeline"><li><time>2026 — 现在</time><div><h3>MiniMax</h3><p>MiniMax Agent 研发。</p></div></li><li><time>2025 — 2026</time><div><h3>小红书</h3><p>AI Coding，关注多步任务中的上下文与执行过程。</p></div></li><li><time>2023 — 2025</time><div><h3>理想汽车</h3><p>代码智能，从代码补全到智能 Code Review。</p></div></li><li><time>2021 — 2023</time><div><h3>快手</h3><p>Java 后端工程师，做研发效能与开发者工具。</p></div></li><li><time>2018 — 2021</time><div><h3>山东大学</h3><p>软件工程，硕士。</p></div></li><li><time>2014 — 2018</time><div><h3>山东大学</h3><p>软件工程，本科。</p></div></li></ol></div></section><section class="detail-grid"><h2>这里会写什么</h2><div class="detail-body capabilities"><div><h3>把 AI 用进工作</h3><p>记录 Agent 工具、开发实践，以及可复用的工作方法。</p></div><div><h3>形成自己的判断</h3><p>从具体任务出发，看清能力、边界和验证结果。</p></div><div><h3>继续成长</h3><p>思考工具变化以后，技术人如何调整自己的工作方式。</p></div></div></section><section class="detail-grid"><h2>找到我</h2><div class="detail-body"><p>开源项目与代码放在 GitHub。文章和实践也会在公众号「${esc(site.wechat)}」分享；你可以通过页脚复制名称，在微信中搜索。</p><div class="actions">${link(site.github, "GitHub 主页", "button")}${link(b + "writing/", "读我的文章")}</div></div></section>`,
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

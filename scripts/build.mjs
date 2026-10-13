import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { renderHome } from "./home.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), "utf8"));
const site = await readJson("content/site.json");
const english = await readJson("content/site.en.json");
const hash = (body) => createHash("sha256").update(body).digest("hex").slice(0, 12);
const styles = {};
for (const name of ["home", "site"])
  styles[name] = hash(await readFile(resolve(root, `assets/${name}.css`)));
// Font URLs carry a content hash so browsers refetch regenerated subsets.
const fonts = {};
for (const name of ["wenkai", "plex-sans-sc", "plex-mono"]) {
  fonts[name] = hash(await readFile(resolve(root, `assets/fonts/${name}.woff2`)));
  for (const css of ["home", "site"]) {
    const text = await readFile(resolve(root, `assets/${css}.css`), "utf8");
    for (const [, version] of text.matchAll(new RegExp(`fonts/${name}\\.woff2(?:\\?v=([0-9a-f]*))?`, "g")))
      if (version !== fonts[name])
        throw new Error(`assets/${css}.css 引用的 ${name}.woff2 版本与文件不一致，运行 python3 scripts/subset-fonts.py --stamp`);
  }
}
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
const fill = (text, values) =>
  text.replace(/\{(\w+)\}/g, (all, key) => (key in values ? values[key] : all));
const origin = `https://${site.filing.domain}/`;

// One locale per language. English text overlays the language-neutral data in
// site.json (repositories, revisions, filing, avatar), matched by slug, name or number.
function englishLocale() {
  const projects = english.projects.map((p) => {
    const base = site.projects.find((zh) => zh.slug === p.slug);
    if (!base) throw new Error(`site.en.json: unknown project ${p.slug}`);
    const merged = { ...base, ...p };
    if (base.catalog) {
      const names = (list) => list.map((s) => s.name).join(",");
      if (names(base.catalog) !== names(p.catalog))
        throw new Error("site.en.json: dev-skills catalog must list the same Skills in the same order as site.json");
      merged.catalog = p.catalog.map((s, i) => ({ ...base.catalog[i], ...s }));
    }
    if (base.workflows && base.workflows.map((w) => w.slug).join() !== p.workflows.map((w) => w.slug).join())
      throw new Error("site.en.json: Agent Lord workflows must match site.json");
    return merged;
  });
  const contributions = english.contributions.map((c) => {
    const base = site.contributions.find((zh) => zh.number === c.number);
    if (!base) throw new Error(`site.en.json: unknown contribution #${c.number}`);
    return { ...base, ...c };
  });
  for (const a of english.articles)
    if (a.zh && !site.articles.some((zh) => zh.slug === a.zh))
      throw new Error(`site.en.json: ${a.slug} points to missing Chinese article ${a.zh}`);
  return { ...site, ...english, projects, contributions };
}
const locales = {
  zh: { ...site, code: "zh", lang: "zh-CN", prefix: "", other: "en", label: "中文" },
  en: { ...englishLocale(), code: "en", lang: "en", prefix: "en/", other: "zh", label: "EN" },
};

// Pages are identified across languages by a key; an article's key is its
// Chinese slug, or "en:<slug>" for an English article with no Chinese version.
const articleKey = (L, a) => (L.code === "zh" ? a.slug : a.zh || `en:${a.slug}`);
function pathFor(L, key) {
  const fixed = { home: "index.html", projects: "projects/index.html", writing: "writing/index.html", about: "about/index.html" };
  if (fixed[key]) return L.prefix + fixed[key];
  if (key.startsWith("project:")) return `${L.prefix}projects/${key.slice(8)}/index.html`;
  const a = L.articles.find((article) => articleKey(L, article) === key);
  return a ? `${L.prefix}writing/${a.slug}/index.html` : null;
}
const dir = (path) => path.replace(/index\.html$/, "");
function alternates(L, key) {
  const self = pathFor(L, key);
  const zh = pathFor(locales.zh, key);
  const en = pathFor(locales.en, key);
  const tags = zh && en
    ? [["zh-CN", zh], ["en", en], ["x-default", zh]]
    : [[L.lang, self], ["x-default", self]];
  return `<link rel="canonical" href="${origin}${dir(self)}">${tags.map(([lang, path]) => `<link rel="alternate" hreflang="${lang}" href="${origin}${dir(path)}">`).join("")}`;
}
// The switch links to the same page in the other language, or to that language's article list.
function languageSwitch(L, key, base) {
  const other = locales[L.other];
  const target = pathFor(other, key) || pathFor(other, "writing");
  const items = [locales.zh, locales.en].map((x) =>
    x === L
      ? `<span aria-current="true" lang="${x.lang}">${x.label}</span>`
      : `<a href="${base}${dir(target)}" lang="${x.lang}" hreflang="${x.lang}">${x.label}</a>`,
  );
  return `<nav class="lang-switch" aria-label="${esc(L.ui.languageLabel)}">${items.join('<span class="lang-sep" aria-hidden="true">/</span>')}</nav>`;
}

const arrow = '<span aria-hidden="true">↗</span>';
const pages = [];
// Images stay on the COS image host; COS resizes and re-encodes them on request.
const cosImage = /(src="https:\/\/coder-xieshijie-img-1253784930\.cos\.ap-beijing\.myqcloud\.com\/[^"?]+)"/g;
const cosResize = "imageMogr2/thumbnail/1600x%3E/format/webp";
const link = (href, label, cls = "text-link") =>
  `<a class="${cls}" href="${esc(href)}">${label}${arrow}</a>`;
const projectDocs = (p) => `${p.repo}/blob/${p.revision}/README.md`;
const source = (L, p) =>
  `<p class="source-line">${esc(L.ui.reviewedOn)} <time datetime="${p.updated}">${p.updated}</time> · <a href="${projectDocs(p)}">${esc(L.ui.viewRevision)} ${p.revision.slice(0, 7)}</a></p>`;
const paragraphs = (list, html = false) => list.map((p) => `<p>${html ? p : esc(p)}</p>`).join("");

function footer(L, base, home) {
  const f = site.filing;
  const filings = [
    f.icp ? `<a href="https://beian.miit.gov.cn/">${esc(f.icp)}</a>` : "",
    f.police && f.policeUrl
      ? `<a class="police-filing" href="${esc(f.policeUrl)}"><img src="${base}assets/police-filing.png" width="18" height="20" alt="">${esc(f.police)}</a>`
      : "",
  ].join("");
  const more = L.ui.wechatLabel
    ? `<button class="copy-button" type="button" data-copy="${esc(site.wechat)}" data-copied="${esc(L.ui.copied)}" data-copy-fallback="${esc(L.ui.copyFallback)}">${esc(L.ui.wechatLabel)} · ${esc(site.wechat)} <span aria-hidden="true">⧉</span></button>`
    : link(L.x.url, esc(L.ui.x));
  const status = L.ui.wechatLabel ? `<span id="copy-status" class="copy-status" role="status" aria-live="polite"></span>` : "";
  return `<footer class="site-footer"><div class="wrap"><div class="footer-main"><div><h2>${esc(L.ui.footerTitle)}</h2><p>${esc(L.ui.footerText)}</p></div><div><div class="footer-links">${link(site.github, esc(L.ui.github))}${more}</div>${status}</div></div><div class="footer-meta"><span>${esc(L.ui.copyright)}</span><span class="filing">${filings}</span><a href="${home}about/">${esc(L.ui.aboutMe)}</a></div></div></footer>`;
}

// base reaches the site root (assets); home reaches the current language's root (pages).
function relative(L, path) {
  const depth = path.split("/").length - 1;
  const langDepth = depth - (L.prefix ? 1 : 0);
  return { base: depth ? "../".repeat(depth) : "./", home: langDepth ? "../".repeat(langDepth) : "./" };
}

function page(L, key, title, description, active, body, options = {}) {
  const path = pathFor(L, key);
  const { base, home } = relative(L, path);
  const html = `<!doctype html>
<html lang="${L.lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)} · ${esc(L.name)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="${options.article ? "article" : "website"}"><meta property="og:title" content="${esc(title)} · ${esc(L.name)}"><meta property="og:description" content="${esc(description)}">${alternates(L, key)}<meta name="theme-color" content="#f4f0e6"><link rel="icon" type="image/x-icon" href="${base}assets/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="${base}assets/apple-touch-icon.png"><link rel="stylesheet" href="${base}assets/site.css?v=${styles.site}"><script src="${base}assets/site.js" defer></script></head>
<body><a class="skip" href="#main">${esc(L.ui.skip)}</a><header class="site-header wrap"><nav class="nav" aria-label="${esc(L.ui.navLabel)}">${L.ui.nav.map(([url, label]) => `<a href="${home}${url}"${active === url ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("")}</nav><a class="brand" href="${home}" aria-label="${esc(L.ui.homeLabel)}"><img src="${base}assets/brand-robot.png" width="36" height="36" alt=""><span>${esc(L.name)}<small>${esc(L.ui.brandSub)}</small></span></a><div class="header-end">${languageSwitch(L, key, base)}<a class="nav-github" href="${site.github}">${esc(L.ui.github)} ↗</a></div></header><main id="main" class="wrap">${body(home, base)}</main>${footer(L, base, home)}</body></html>\n`;
  pages.push({ path, html });
}

async function build(L) {
  const t = L.pages;
  const project = (slug) => L.projects.find((p) => p.slug === slug);
  const skills = project("dev-skills");
  const lord = project("agent-lord");
  const flowSkills = skills.catalog.filter((skill) => skill.group === "flow");
  const skillSource = (name) =>
    `${skills.repo}/blob/${skills.revision}/skills/${name}/SKILL.md`;
  const featured = L.articles.find((a) => a.slug === L.featuredArticles[0]);

  const { base: rootBase, home: rootHome } = relative(L, pathFor(L, "home"));
  pages.push({
    path: pathFor(L, "home"),
    html: renderHome(L, {
      cssVersion: styles.home,
      fonts,
      base: rootBase,
      home: rootHome,
      github: site.github,
      wechat: site.wechat,
      avatar: site.avatar,
      filing: site.filing,
      head: alternates(L, "home"),
      languageSwitch: languageSwitch(L, "home", rootBase),
    }),
  });

  function projects(home) {
    const p = t.projects;
    return `<article class="featured"><div class="featured-copy"><span class="eyebrow">01 / ${esc(skills.type)}</span><h3>${esc(skills.name)}</h3><p>${esc(skills.summary)}</p><p>${esc(p.touchpoints)}</p>${link(home + "projects/dev-skills/", esc(p.skillsLink))}</div><figure class="flow-figure"><ol>${flowSkills.map((skill) => `<li><span>${esc(skill.step)}</span><div><code>/dev-skills:${esc(skill.name)}</code><p>${esc(skill.title)}</p></div></li>`).join("")}</ol><figcaption>${esc(fill(p.flowCaption, { count: skills.catalog.length }))}</figcaption></figure></article><article class="skill-card"><div><span class="eyebrow">02 / ${esc(lord.type)} · ${esc(p.lordBadge)}</span><h3>${esc(lord.name)}</h3><p>${esc(lord.summary)}</p>${link(home + "projects/agent-lord/", esc(p.lordLink))}</div><div class="skill-code" aria-label="${esc(p.lordCodeLabel)}">${lord.workflows.map((w) => `<code><span>${esc(w.slug)}</span> ${esc(w.name)}</code>`).join("")}</div></article>`;
  }

  function articleRows(home) {
    const years = [...new Set(L.articles.map(a => a.published.slice(0, 4)))];
    return years.map(year => `<section class="year-group" data-year-group aria-labelledby="year-${year}"><h2 class="year-label" id="year-${year}">${year}</h2>${L.articles.filter(a => a.published.startsWith(year)).map(a => `<a class="article-row" data-article-topic="${esc(a.topic)}" href="${home}writing/${a.slug}/"><time class="article-date" datetime="${a.published}">${a.published.slice(5).replace("-", ".")}</time><div><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><p class="article-info">${esc(a.topic)} · ${esc(a.reading)}</p></div><span class="article-arrow" aria-hidden="true">↗</span></a>`).join("")}</section>`).join("");
  }

  // Topic filters only appear when there is more than one topic to choose from.
  function articleFilters() {
    const w = t.writing;
    const topics = [...new Set(L.articles.map(a => a.topic))];
    const count = `<p class="article-count" data-article-count role="status" aria-live="polite">${esc(fill(L.articles.length === 1 ? w.countOne : w.count, { count: L.articles.length }))}</p>`;
    if (topics.length < 2) return count;
    return `<div class="article-filters" data-article-filters data-all-label="${esc(w.allArticles)}" data-counter="${esc(w.counter)}" role="group" aria-label="${esc(w.filterLabel)}" hidden><button type="button" data-topic="" aria-pressed="true">${esc(w.all)} <span>${L.articles.length}</span></button>${topics.map(topic => `<button type="button" data-topic="${esc(topic)}" aria-pressed="false">${esc(topic)} <span>${L.articles.filter(a => a.topic === topic).length}</span></button>`).join("")}</div>${count}`;
  }

  page(
    L,
    "projects",
    t.projects.title,
    t.projects.description,
    "projects/",
    (h) =>
      `<section class="page-intro"><p class="eyebrow">${esc(t.projects.eyebrow)}</p><h1>${esc(t.projects.h1)}</h1><p class="lead">${t.projects.leadHtml}</p></section><section class="section project-list">${projects(h)}</section>`,
  );

  const al = t.agentLord;
  page(
    L,
    "project:agent-lord",
    lord.name,
    lord.summary,
    "projects/",
    (h, b) =>
      `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${h}projects/">${esc(t.projects.title)}</a><span>/</span><span>${esc(lord.name)}</span></div><p class="eyebrow">${esc(lord.type)} · ${esc(t.projects.lordBadge)}</p><h1>${esc(lord.name)}</h1><p class="lead">${esc(lord.summary)}<br>${esc(lord.detail)}</p><div class="actions">${link(lord.repo, esc(al.repoLink), "button")}${link(h + "projects/dev-skills/", esc(al.nowLink))}</div>${source(L, lord)}</section><figure class="detail-figure"><a href="${b}assets/observer-example.jpg" aria-label="${esc(al.figureLabel)}"><img src="${b}assets/observer-example.jpg" width="1280" height="720" alt="${esc(al.figureAlt)}"></a><figcaption>${esc(al.figureCaption)}</figcaption></figure><section class="detail-grid"><h2>${esc(al.whatTitle)}</h2><div class="detail-body">${paragraphs(al.whatParagraphs)}</div></section><section class="detail-grid"><h2>${esc(al.pipelinesTitle)}</h2><div class="detail-body"><p>${esc(al.pipelinesIntro)}</p><ol class="step-list">${lord.workflows.map((w) => `<li id="${esc(w.slug)}"><h3>${esc(w.name)}</h3><p>${esc(w.description)}</p><a href="${lord.repo}/blob/${lord.revision}/references/pipelines/${w.slug}.md">${esc(al.pipelineLink)}</a></li>`).join("")}</ol><p class="note">${esc(al.pipelinesNote)}</p></div></section><figure class="detail-figure"><a href="${b}assets/agent-lord-cross-review.svg" aria-label="${esc(al.diagramLabel)}"><img src="${b}assets/agent-lord-cross-review.svg" alt="${esc(al.diagramAlt)}" loading="lazy"></a><figcaption>${esc(al.diagramCaption)}</figcaption></figure><section class="detail-grid"><h2>${esc(al.whyTitle)}</h2><div class="detail-body">${paragraphs(al.whyParagraphs)}<div class="actions">${link(h + "projects/dev-skills/", esc(al.whyLink), "button")}${al.whyArticle ? link(`${h}writing/${featured.slug}/`, esc(al.whyArticle)) : ""}</div></div></section><section class="detail-grid"><h2>${esc(al.tryTitle)}</h2><div class="detail-body">${paragraphs(al.tryParagraphs)}<div class="actions">${link(projectDocs(lord) + "#quick-start", esc(al.tryLink))}</div></div></section><section class="detail-grid"><h2>${esc(al.limitsTitle)}</h2><div class="detail-body">${paragraphs(al.limitsParagraphs)}<p class="source-line"><a href="${lord.repo}/blob/${lord.revision}/references/protocol.md#execution-contract">${esc(al.contractLink)}</a> · ${esc(al.platformNote)}</p></div></section><div class="related">${link(h + "projects/", esc(al.backLink))}${link(h + "projects/dev-skills/", esc(al.nextLink))}</div>`,
  );

  const ds = t.devSkills;
  const skillEntry = (skill) =>
    `<li id="${esc(skill.name)}"><h3>${esc(skill.name)} · ${esc(skill.title)}</h3><p>${esc(skill.description)}</p><pre><code>${esc(skill.example)}</code></pre><a href="${skillSource(skill.name)}">${esc(ds.skillSourceLink)} ↗</a></li>`;
  page(
    L,
    "project:dev-skills",
    skills.name,
    skills.summary,
    "projects/",
    (h) =>
      `<section class="page-intro project-intro"><div class="breadcrumb"><a href="${h}projects/">${esc(t.projects.title)}</a><span>/</span><span>${esc(skills.name)}</span></div><p class="eyebrow">${esc(skills.type)}</p><h1>${esc(skills.name)}</h1><p class="lead">${esc(skills.summary)}<br>${esc(skills.detail)}</p><div class="actions">${link(skills.repo, esc(ds.repoLink), "button")}${link(projectDocs(skills) + "#install", esc(ds.installLink))}</div>${source(L, skills)}</section><section class="detail-grid"><h2>${esc(ds.flowTitle)}</h2><div class="detail-body"><p>${esc(ds.flowIntro)}</p><ol class="step-list">${flowSkills.map((skill) => `<li><h3>${esc(skill.step)} · <a href="#${esc(skill.name)}">${esc(skill.name)}</a></h3><p>${esc(fill(ds.flowItem, { title: skill.title, you: skill.you }))}</p></li>`).join("")}</ol><p class="note">${esc(ds.flowNote)}</p></div></section>${flowSkills.map((skill) => `<section class="detail-grid" id="${esc(skill.name)}"><h2>${esc(skill.step)} / ${esc(skill.title)}</h2><div class="detail-body"><h3>${esc(skill.name)}</h3><p>${esc(skill.description)}</p><p>${esc(fill(ds.skillYou, { you: skill.you }))}</p><pre><code>${esc(skill.example)}</code></pre><div class="actions">${link(skillSource(skill.name), esc(ds.skillSourceLink))}</div></div></section>`).join("")}<section class="detail-grid"><h2>${esc(ds.supportTitle)}</h2><div class="detail-body"><p>${esc(ds.supportIntro)}</p><ol class="step-list">${skills.catalog.filter((skill) => skill.group === "support").map(skillEntry).join("")}</ol></div></section><section class="detail-grid"><h2>${esc(ds.standaloneTitle)}</h2><div class="detail-body"><p>${esc(ds.standaloneIntro)}</p><ol class="step-list">${skills.catalog.filter((skill) => skill.group === "standalone").map(skillEntry).join("")}</ol></div></section><section class="detail-grid"><h2>${esc(ds.installTitle)}</h2><div class="detail-body">${paragraphs(ds.installParagraphsHtml, true)}<div class="actions">${link(projectDocs(skills) + "#install", esc(ds.installButton), "button")}</div></div></section><section class="detail-grid"><h2>${esc(ds.prereqTitle)}</h2><div class="detail-body">${paragraphs(ds.prereqParagraphsHtml, true)}</div></section><div class="related">${link(h + "projects/", esc(ds.backLink))}${link(h + "projects/agent-lord/", esc(ds.nextLink))}</div>`,
  );

  const w = t.writing;
  const otherLanguage = w.otherTitle
    ? (b) => `<section class="detail-grid"><h2>${esc(w.otherTitle)}</h2><div class="detail-body"><p>${esc(fill(w.otherText, { count: locales[L.other].articles.length }))}</p><div class="actions"><a class="text-link" href="${b}${dir(pathFor(locales[L.other], "writing"))}" lang="${locales[L.other].lang}" hreflang="${locales[L.other].lang}">${esc(w.otherLink)}${arrow}</a></div></div></section>`
    : () => "";
  page(
    L,
    "writing",
    w.title,
    w.description,
    "writing/",
    (h, b) =>
      `<section class="page-intro"><p class="eyebrow">${esc(w.eyebrow)}</p><h1>${esc(w.h1)}</h1><p class="lead">${w.leadHtml}</p></section>${articleFilters()}<section class="section project-list article-library" aria-label="${esc(w.listLabel)}">${articleRows(h)}</section>${otherLanguage(b)}<section class="detail-grid"><h2>${esc(w.relatedTitle)}</h2><div class="detail-body"><p>${esc(w.relatedText)}</p><div class="actions">${link(h + "projects/dev-skills/", "dev-skills")}${link(h + "projects/agent-lord/", "Agent Lord")}</div></div></section>`,
  );

  const ar = t.article;
  for (const [index, a] of L.articles.entries()) {
    const headings = a.legacy ? a.toc : [];
    let article;
    if (a.legacy) {
      article = (await readFile(resolve(root, `content/legacy/${a.slug}.html`), "utf8")).replace(cosImage, `$1?${cosResize}"`);
    } else {
      const md = await readFile(resolve(root, `content/${L.prefix}${a.slug}.md`), "utf8");
      let headingCount = 0;
      const renderer = new marked.Renderer();
      renderer.heading = function ({ tokens, depth }) {
        const label = this.parser.parseInline(tokens);
        const id = `section-${++headingCount}`;
        if (depth === 2) headings.push({ id, label });
        return `<h${depth} id="${id}">${label}</h${depth}>\n`;
      };
      article = marked.parse(md, { renderer, gfm: true }).replace(cosImage, `$1?${cosResize}"`);
    }
    const key = articleKey(L, a);
    const other = locales[L.other];
    const translation = pathFor(other, key);
    const previous = L.articles[index - 1], next = L.articles[index + 1];
    page(
      L, key, a.title, a.summary, "writing/",
      (h, b) => `<header class="page-intro article-header"><div class="breadcrumb"><a href="${h}writing/">${esc(ar.breadcrumb)}</a><span>/</span><span>${esc(a.topic)}</span></div><h1>${esc(a.title)}</h1><p class="lead">${esc(a.summary)}</p><div class="article-meta"><span>${esc(ar.author)}</span><span>${esc(ar.published)} <time datetime="${a.published}">${a.published}</time></span><span>${esc(fill(ar.reading, { reading: a.reading }))}</span>${translation ? `<a href="${b}${dir(translation)}" lang="${other.lang}" hreflang="${other.lang}">${esc(ar.translation)}</a>` : ""}</div></header><div class="reading-layout"><nav class="toc" aria-label="${esc(ar.tocLabel)}"><h2>${esc(ar.tocTitle)}</h2>${headings.length ? headings.map(x => `<a href="#${x.id}">${a.legacy ? esc(x.label) : x.label}</a>`).join("") : `<a href="#article-body">${esc(ar.tocFallback)}</a>`}</nav><article class="prose" id="article-body">${article}</article></div><nav class="article-pagination" aria-label="${esc(ar.paginationLabel)}">${previous ? `<a href="../${previous.slug}/"><span>${esc(ar.previous)}</span><strong>${esc(previous.title)}</strong></a>` : ""}${next ? `<a href="../${next.slug}/"><span>${esc(ar.next)}</span><strong>${esc(next.title)}</strong></a>` : ""}</nav><div class="related">${link(h + "writing/", esc(ar.backLink))}${link(h + "", esc(ar.homeLink))}</div>`,
      { article: true },
    );
  }

  const ab = t.about;
  page(
    L,
    "about",
    ab.title,
    ab.description,
    "about/",
    (h) =>
      `<section class="page-intro about-lead"><div><p class="eyebrow">${esc(ab.eyebrow)}</p><h1>${ab.h1Html}</h1><p class="lead">${esc(ab.lead)}</p></div><img src="${esc(site.avatar)}?imageMogr2/thumbnail/480x/format/webp" width="240" height="240" alt="${esc(ab.avatarAlt)}"></section><section class="detail-grid"><h2>${esc(ab.careTitle)}</h2><div class="detail-body">${paragraphs(ab.careParagraphs)}</div></section><section class="detail-grid"><h2>${esc(ab.pathTitle)}</h2><div class="detail-body"><ol class="timeline">${ab.timeline.map((x) => `<li><time>${esc(x.time)}</time><div><h3>${esc(x.org)}</h3><p>${esc(x.text)}</p></div></li>`).join("")}</ol></div></section><section class="detail-grid"><h2>${esc(ab.topicsTitle)}</h2><div class="detail-body capabilities">${ab.topics.map((x) => `<div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join("")}</div></section><section class="detail-grid"><h2>${esc(ab.contactTitle)}</h2><div class="detail-body"><p>${fill(ab.contactHtml, { wechat: esc(site.wechat) })}</p><div class="actions">${link(site.github, esc(ab.githubLink), "button")}${ab.xLink ? link(L.x.url, esc(ab.xLink)) : ""}${link(h + "writing/", esc(ab.writingLink))}</div></div></section>`,
  );
}

for (const L of Object.values(locales)) await build(L);

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

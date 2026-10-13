import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "../dist");
async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}
const htmlFiles = (await files(root)).filter((p) => p.endsWith(".html"));
const errors = [];
let references = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if ((html.match(/<h1[ >]/g) || []).length !== 1)
    errors.push(`${file}: expected one h1`);
  for (const mount of ["/", "/ai-roam/"]) {
    const url = new URL(
      mount + file.slice(root.length + 1),
      "https://preview.test",
    );
    for (const [, attr, raw] of html.matchAll(/\b(href|src)="([^"]*)"/g)) {
      const target = new URL(raw.replaceAll("&amp;", "&"), url);
      if (target.origin !== url.origin) continue;
      if (!target.pathname.startsWith(mount)) {
        errors.push(`${file}: link escapes ${mount}: ${raw}`);
        continue;
      }
      let local = join(
        root,
        decodeURIComponent(target.pathname.slice(mount.length)),
      );
      try {
        if ((await stat(local)).isDirectory())
          local = join(local, "index.html");
        const body = await readFile(local);
        if (
          attr === "href" &&
          target.hash &&
          local.endsWith(".html") &&
          !body
            .toString()
            .includes(`id="${decodeURIComponent(target.hash.slice(1))}"`)
        )
          errors.push(`${file}: missing fragment ${raw}`);
      } catch {
        errors.push(`${file}: broken ${attr} ${raw}`);
      }
      references++;
    }
  }
  assert.equal(
    html,
    await readFile(resolve(root, "..", file.slice(root.length + 1)), "utf8"),
    "GitHub and preview HTML differ",
  );
}
// Generated pages in the repository root must match the current build exactly.
for (const dir of ["writing", "projects", "en/writing", "en/projects"]) {
  for (const entry of await readdir(resolve(root, "..", dir), { withFileTypes: true }))
    if (entry.isDirectory())
      try {
        await stat(join(root, dir, entry.name));
      } catch {
        errors.push(`${dir}/${entry.name}/ is not produced by the build; remove it`);
      }
}

// Languages: Chinese at the root, English under en/. Every page declares its
// language, a canonical URL, hreflang alternates and one link to the other language.
const site = JSON.parse(await readFile(resolve(root, "../content/site.json"), "utf8"));
const english = JSON.parse(await readFile(resolve(root, "../content/site.en.json"), "utf8"));
const origin = `https://${site.filing.domain}/`;
const pageUrl = (file) => origin + file.slice(root.length + 1).replace(/index\.html$/, "");
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
const pagesByUrl = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const head = html.slice(0, html.indexOf("</head>"));
  pagesByUrl.set(pageUrl(file), {
    file,
    html,
    lang: html.match(/<html lang="([^"]+)"/)?.[1],
    canonical: head.match(/<link rel="canonical" href="([^"]+)">/)?.[1],
    alternates: Object.fromEntries([...head.matchAll(/<link rel="alternate"[^>]*>/g)].map(([tag]) => [attrs(tag).hreflang, attrs(tag).href])),
  });
}
// Chinese text allowed on English pages: filing numbers, the WeChat account name, links to Chinese pages.
const allowedChinese = [site.filing.icp, site.filing.police, site.wechat, "中文", english.pages.writing.otherLink, english.pages.article.translation].filter(Boolean).sort((a, b) => b.length - a.length);
for (const [url, p] of pagesByUrl) {
  const name = p.file.slice(root.length + 1);
  const isEnglish = name.startsWith("en/");
  const expected = isEnglish ? "en" : "zh-CN";
  if (p.lang !== expected) errors.push(`${name}: <html lang="${p.lang}">, expected ${expected}`);
  if (p.canonical !== url) errors.push(`${name}: canonical ${p.canonical}, expected ${url}`);
  const alt = p.alternates;
  for (const href of Object.values(alt))
    if (!href.startsWith(origin) || !pagesByUrl.has(href)) errors.push(`${name}: hreflang target is not a built page: ${href}`);
  if (alt["zh-CN"] && alt.en) {
    if (alt[expected] !== url) errors.push(`${name}: hreflang ${expected} should point to itself`);
    if (alt["x-default"] !== alt["zh-CN"]) errors.push(`${name}: x-default should point to the Chinese page`);
    const pair = pagesByUrl.get(isEnglish ? alt["zh-CN"] : alt.en);
    if (pair && (pair.alternates["zh-CN"] !== alt["zh-CN"] || pair.alternates.en !== alt.en))
      errors.push(`${name}: hreflang is not reciprocal with ${pair.file.slice(root.length + 1)}`);
  } else if (Object.keys(alt).sort().join() !== [expected, "x-default"].sort().join() || alt[expected] !== url || alt["x-default"] !== url)
    errors.push(`${name}: a single-language page lists only itself as ${expected} and x-default`);
  const switches = [...p.html.matchAll(/<nav class="lang-switch"[^>]*>(.*?)<\/nav>/g)];
  const links = switches.length === 1 ? [...switches[0][1].matchAll(/<a [^>]*>/g)].map(([tag]) => attrs(tag)) : [];
  if (switches.length !== 1 || links.length !== 1) errors.push(`${name}: expected one language switch with one link`);
  else {
    const other = isEnglish ? "zh-CN" : "en";
    const target = new URL(links[0].href, url).href;
    const fallback = isEnglish ? `${origin}writing/` : `${origin}en/writing/`;
    if (links[0].lang !== other) errors.push(`${name}: language switch should link to ${other}`);
    if (target !== (alt[other] || fallback)) errors.push(`${name}: language switch goes to ${target}, expected ${alt[other] || fallback}`);
  }
  if (isEnglish) {
    let text = p.html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ");
    for (const allowed of allowedChinese) text = text.replaceAll(allowed, "");
    const stray = text.match(/[　-〿㐀-鿿＀-￯][^<\n]{0,30}/g);
    if (stray) errors.push(`${name}: untranslated Chinese text: ${stray.slice(0, 3).join(" | ")}`);
  }
}
// The English list shows only articles that have an English version, each with a built page.
{
  const listed = new Set(english.articles.map((a) => a.slug));
  const list = await readFile(join(root, "en/writing/index.html"), "utf8");
  for (const [, href] of list.matchAll(/class="article-row"[^>]*href="([^"]+)"/g)) {
    const slug = href.match(/^\.\.\/writing\/([^/]+)\/$/)?.[1];
    if (!slug || !listed.has(slug)) errors.push(`en/writing/index.html: lists an article without an English version: ${href}`);
  }
  for (const slug of listed)
    if (!list.includes(`href="../writing/${slug}/"`)) errors.push(`en/writing/index.html: missing ${slug}`);
  for (const entry of await readdir(join(root, "en/writing"), { withFileTypes: true }))
    if (entry.isDirectory() && !listed.has(entry.name)) errors.push(`en/writing/${entry.name}/ has no entry in site.en.json`);
  for (const a of english.articles)
    if (a.zh && !site.articles.some((zh) => zh.slug === a.zh)) errors.push(`site.en.json: ${a.slug} points to missing Chinese article ${a.zh}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${htmlFiles.length} pages and ${references} local references at / and /ai-roam/.`,
  );

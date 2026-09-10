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
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${htmlFiles.length} pages and ${references} local references at / and /ai-roam/.`,
  );

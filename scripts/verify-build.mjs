import assert from "node:assert/strict";
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : path.join(directory, entry.name),
      ),
    )
  ).flat();
}
const htmlFiles = (await files(root)).filter((file) => file.endsWith(".html"));
for (const route of [
  "index.html",
  "projects/index.html",
  "notes/index.html",
  "about/index.html",
  "search/index.html",
  "404.html",
]) {
  await access(path.join(root, route));
}
let searchable = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  assert.match(html, /<html lang="zh-CN"/, file);
  assert.match(html, /<title>[^<]+<\/title>/, file);
  assert.match(html, /name="description"/, file);
  assert.match(html, /rel="canonical"/, file);
  assert.ok(
    !html.includes("writing-template") && !html.includes("project-template"),
    `Draft leaked into ${file}`,
  );
  if (html.includes("data-pagefind-body")) searchable++;
  const route = path.relative(root, file).split(path.sep).join("/");
  const base = new URL(route, "https://chenxingzhi12.github.io/");
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll("&amp;", "&"), base);
    if (url.origin !== base.origin) continue;
    const local = decodeURIComponent(url.pathname);
    const target = path.join(
      root,
      local.endsWith("/") ? `${local}index.html` : local,
    );
    await access(target).catch(() => {
      throw new Error(`Broken link in ${route}: ${match[1]}`);
    });
    if (url.hash && target.endsWith(".html")) {
      const targetHtml =
        target === file ? html : await readFile(target, "utf8");
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(
        targetHtml.includes(`id="${id}"`),
        `Missing anchor: ${match[1]} in ${route}`,
      );
    }
  }
}
const manifest = JSON.parse(
  await readFile(path.join(root, "search-index.json"), "utf8"),
);
assert.equal(manifest.count, searchable);
if (searchable) await access(path.join(root, "pagefind/pagefind.js"));
const sitemap = await readFile(path.join(root, "sitemap-0.xml"), "utf8");
assert.ok(
  !sitemap.includes("writing-template") &&
    !sitemap.includes("project-template") &&
    !sitemap.includes("/404/"),
);
console.log(
  `Verified ${htmlFiles.length} pages, internal links, anchors, metadata, draft exclusion and ${searchable} searchable entries.`,
);

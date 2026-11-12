import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as pagefind from "pagefind";

const output = path.resolve("dist");
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map(async (entry) => {
      const location = path.join(directory, entry.name);
      if (entry.isDirectory()) return collect(location);
      if (entry.name !== "index.html") return [];
      const html = await readFile(location, "utf8");
      return html.includes("data-pagefind-body") ? [{ location, html }] : [];
    }),
  );
  return groups.flat();
}
const pages = await collect(output);
if (pages.length) {
  try {
    const { index, errors } = await pagefind.createIndex({
      forceLanguage: "zh",
      rootSelector: "[data-pagefind-body]",
    });
    if (!index || errors?.length) throw new Error(JSON.stringify(errors));
    for (const page of pages) {
      const relative = path
        .relative(output, page.location)
        .split(path.sep)
        .join("/");
      const result = await index.addHTMLFile({
        url: `/${relative.replace(/index\.html$/, "")}`,
        content: page.html,
      });
      if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
    }
    const result = await index.writeFiles({
      outputPath: path.join(output, "pagefind"),
    });
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
  } finally {
    await pagefind.close();
  }
}
await mkdir(output, { recursive: true });
await writeFile(
  path.join(output, "search-index.json"),
  JSON.stringify({ count: pages.length }),
);
console.log(`Search index ready: ${pages.length} published pages.`);

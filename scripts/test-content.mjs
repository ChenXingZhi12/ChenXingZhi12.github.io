import assert from "node:assert/strict";
import { mkdir, writeFile, readFile, access, cp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const directory = path.resolve(".codex/validation");
const content = path.join(directory, "content");
await mkdir(path.join(content, "notes"), { recursive: true });
await mkdir(path.join(content, "projects"), { recursive: true });
const note = (title, date, category, tags, draft = false) =>
  `---\ntitle: "${title}"\ndescription: "临时验收资料，不属于正式网站内容。"\ndate: ${date}\ncategory: "${category}"\ntags: ${JSON.stringify(tags)}\ndraft: ${draft}\n---\n\n## 中文搜索验收\n\n智能体评测与中文搜索验证。\n\n### 实践细节\n\n记录一段可检索的内容。\n\n\`\`\`python\nprint("hello")\n\`\`\`\n`;
await writeFile(
  path.join(content, "notes", "qa-new.md"),
  note("临时：智能体评测记录", "2026-11-12", "技术", [
    "智能体",
    "评测",
  ]).replace("draft: false", "draft: false\nslug: title-must-not-change-url"),
);
await writeFile(
  path.join(content, "notes", "qa-old.md"),
  note("临时：生活记录", "2025-01-01", "生活", ["随笔"]),
);
await writeFile(
  path.join(content, "notes", "qa-secret.md"),
  note("DRAFT_ONLY_7E2B", "2026-11-12", "技术", ["隐藏"], true),
);
await writeFile(
  path.join(content, "projects", "qa-project.md"),
  `---\ntitle: "临时：评测工具"\ndescription: "仅用于验证的临时项目。"\ndate: 2026-11-12\ntags: ["评测"]\nfeatured: true\ndraft: false\ncode: "https://github.com/ChenXingZhi12/ChenXingZhi12.github.io"\n---\n\n## 项目背景\n\n智能体评测项目验证。\n`,
);
await writeFile(
  path.join(content, "projects", "qa-secret-project.md"),
  `---\ntitle: "DRAFT_PROJECT_ONLY_7E2B"\ndescription: "这个项目不应发布。"\ndate: 2026-11-12\nfeatured: true\ndraft: true\n---\n\n草稿项目。\n`,
);
const env = { ...process.env, SITE_CONTENT_DIR: content };
const run = (script, args, environment = process.env) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env: environment,
  });
  if (result.status !== 0)
    throw new Error(`Failed: ${script} ${args.join(" ")}`);
};
const astro = path.resolve("node_modules/astro/bin/astro.mjs");
try {
  run(astro, ["build"], env);
  run("scripts/build-search.mjs", []);
  run("scripts/verify-build.mjs", []);
  const home = await readFile("dist/index.html", "utf8");
  const archive = await readFile("dist/notes/index.html", "utf8");
  const detail = await readFile("dist/notes/qa-new/index.html", "utf8");
  assert.ok(home.includes("精选项目") && home.includes("最近记录"));
  assert.match(archive, /year-heading[^>]*>2026/);
  assert.match(archive, /year-heading[^>]*>2025/);
  assert.ok(
    archive.indexOf("临时：智能体评测记录") < archive.indexOf("临时：生活记录"),
  );
  assert.ok(
    archive.includes('data-category="生活"') && archive.includes("智能体"),
  );
  assert.ok(
    detail.includes('aria-label="文章目录"') &&
      detail.includes('class="astro-code'),
  );
  await assert.rejects(access("dist/notes/qa-secret/index.html"));
  await assert.rejects(access("dist/projects/qa-secret-project/index.html"));
  await assert.rejects(
    access("dist/notes/title-must-not-change-url/index.html"),
  );
  assert.ok(
    !home.includes("DRAFT_ONLY") && !home.includes("DRAFT_PROJECT_ONLY"),
  );
  const sitemap = await readFile("dist/sitemap-0.xml", "utf8");
  assert.ok(
    sitemap.includes("/notes/qa-new/") && !sitemap.includes("qa-secret"),
  );
  assert.equal(
    JSON.parse(await readFile("dist/search-index.json", "utf8")).count,
    3,
  );
  await cp("dist", path.join(directory, "fixture-site"), {
    recursive: true,
    force: true,
  });
  console.log(
    "Published, draft, archive, featured project, TOC and search fixtures passed.",
  );
} finally {
  const clean = { ...process.env };
  delete clean.SITE_CONTENT_DIR;
  run(astro, ["build"], clean);
  run("scripts/build-search.mjs", [], clean);
  run("scripts/verify-build.mjs", [], clean);
}

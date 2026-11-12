# 陈兴志 · 个人网站

使用 Astro、TypeScript、CSS 和 Markdown 构建的静态个人网站，通过 GitHub Pages 发布。

网站地址：https://chenxingzhi12.github.io

## 本地开发

需要 Node.js 24 和 npm。

```powershell
npm.cmd ci
npm.cmd run dev
```

打开终端打印的本地地址。Windows PowerShell 下使用 `npm.cmd` 可避免 `npm.ps1` 执行策略问题；其他终端可以使用 `npm`。

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run verify
npm.cmd run preview -- --host 127.0.0.1
```

生产预览默认地址为 http://127.0.0.1:4321 。Pagefind 索引在生产构建后生成，因此完整搜索功能请在 `build` 后用 `preview` 验证。开发服务器适合编辑页面和内容。

## 修改个人资料

`src/config.ts` 集中管理站名、姓名、简介、GitHub 链接与导航。更完整的个人介绍在 `src/pages/about.astro` 中修改。首版没有自动复用旧简历的学历、联系方式或经历。

## 写文章与项目

- 文章放在 `src/content/notes/`，复制 `writing-template.md` 开始写作。
- 项目放在 `src/content/projects/`，复制 `project-template.md` 开始整理。
- 使用稳定的文件名，例如 `reading-astro.md`，对应 `/notes/reading-astro/`；修改标题不改变地址。
- 每份内容维护标题 `title`、摘要 `description`、日期 `date`、标签 `tags` 和 `draft`。
- 日期使用 `YYYY-MM-DD`；正文用 Markdown。文章另需分类 `category`。
- 项目可设置 `featured: true` 显示在首页，并可填写 `image`、`code`、`demo`。
- 发布前必须明确设置 `draft: false`。缺省或为 `true` 时不生成公开页面，也不进入列表、搜索和站点地图。
- 不要在资料中设置 `slug`；页面地址由文件标识生成，保持文件名稳定即可。嵌套目录会成为地址的一部分。
- 图片放在 `public/images/`，正文中使用 `![有意义的图片说明](/images/example.webp)`。项目封面使用 `image: "/images/example.webp"`。
- 首页展示最近三篇文章、最多两个设为精选的项目；没有正式内容时自动隐藏对应区域。
- 文章按日期倒序、按年份分组；分类和标签筛选链接可以收藏或分享。

目前仅有两份草稿范例，正式页面呈现空状态；不会将范例当成真实项目或文章。

## 内容集成验收

```powershell
npm.cmd run test:content
```

脚本在 `.codex/validation/` 下生成临时中文文章、跨年记录、精选项目和草稿，验证构建、顺序、详情、目录、代码高亮、草稿隔离与搜索索引，然后恢复正式内容的生产构建。临时站点副本仅供验收，不会部署。`.codex/`、构建产物和依赖都被忽略。

## 发布到 GitHub Pages

发布流程：

1. 在 GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 提交并推送代码到 `main`，或手动触发 **Deploy personal site to GitHub Pages** 工作流。
3. 工作流执行安装、类型检查、构建、页面与链接验证，成功后部署 `dist/`。
4. 在 Actions 中查看部署结果，访问 https://chenxingzhi12.github.io 。

发布根路径为 `/`，无需设置仓库名前缀。若更换域名，需同步更新 `astro.config.mjs`、`src/config.ts` 和 `public/robots.txt`。

## 待补充素材

- 一段更具体、愿意公开的个人介绍与经历。
- 第一个真实项目：问题、个人工作、成果，按需提供截图和代码链接。
- 第一篇正式文章或生活记录。
- 可选头像、其他公开联系方式。

首版不包含后端、账号、评论、访问统计或 AI 服务，也不加载外部字体。

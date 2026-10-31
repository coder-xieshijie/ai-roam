# ai-roam

谢世杰｜AI游民的个人网站 [xieshijie.cn](https://xieshijie.cn/)：Agent 工具作品、AI Coding 实践文章和个人经历。

纯静态站点：`scripts/build.mjs` 从 `content/` 生成 HTML，合入 `main` 后由 GitHub Actions 部署到阿里云 ECS。GitHub Pages（[coder-xieshijie.cn/ai-roam](https://coder-xieshijie.cn/ai-roam/)）发布同一份根目录文件，作为备用地址。

## 本地开发

需要 Node.js 24+。

```sh
npm ci
npm run build
npm run check
python3 -m http.server 4173 --directory dist
```

打开 [本地预览](http://localhost:4173/)。页面不依赖运行时框架；唯一构建依赖 `marked`，只用于渲染仓库内本人维护的 Markdown。

`npm run build` 同时写出仓库根目录（GitHub Pages）和 `dist/`（部署与预览）。根目录生成的 HTML 需要和源文件一起提交，不要手改；`dist/` 与 `node_modules/` 不提交。`npm run check` 在 `/` 和 `/ai-roam/` 两种挂载路径下检查本地链接、锚点和资源，确认根目录与 `dist/` 一致，并拒绝构建不再产出的旧页面目录。

## 目录

| 位置 | 用途 |
| --- | --- |
| `content/site.json` | 站点信息、头像、项目、文章元数据、首页精选、开源贡献、备案信息，以及中文页面文案（`ui`、`home`、`pages`） |
| `content/site.en.json` / `content/en/*.md` | 英文版文案、英文项目介绍与文章元数据；英文文章正文 |
| `content/*.md` / `content/legacy/*.html` | 文章正文：新文章用 Markdown，早期笔记为清理后的静态 HTML |
| `scripts/build.mjs` | 内页模板（作品、文章、关于）、语言与 hreflang、静态生成 |
| `scripts/home.mjs` / `assets/home.css` / `assets/home-trail.js` | 首页排版与朱红探索线 |
| `assets/site.css` / `assets/site.js` | 内页样式、文章筛选、公众号名称复制（提示文字从页面的 `data-*` 读取） |
| `assets/fonts/` / `scripts/subset-fonts.py` | 自托管字体子集及其生成脚本 |
| `assets/brand-robot.png`、`favicon.ico`、`apple-touch-icon.png` | 朱红机器人品牌标识（页头与站点图标） |
| `scripts/deploy-*.py` / `.github/workflows/deploy.yml` | 阿里云部署 |
| `.openai/hosting.json` | Codex Sites 私有预览配置，静态目录为 `dist` |

页面结构：首页、作品列表、dev-skills 项目详情、文章列表与文章正文、关于我，中英文各一套（见“多语言”）。页头导航在所有页面一致：作品 → `projects/`，文章 → `writing/`，关于 → `about/`，路径相对当前语言的根目录。

首页依次是：开场与作者介绍；第一章 dev-skills（从需求到可合入 PR 的流程）；第二章文章精选；第三章关于我；之后是开源贡献、最近的记录和结尾。桌面宽度下各章图文左右交替：偶数章加 `t-reverse`，探索线按章节顺序左右摆动，增删章节时保持交替。

## 多语言

中文是主站，放在根路径 `/`；英文版放在 `/en/`，结构相同：`en/`、`en/projects/`、`en/projects/<slug>/`、`en/writing/`、`en/writing/<slug>/`、`en/about/`。不按浏览器语言自动跳转。GitHub Pages 的 `/ai-roam/` 挂载路径下同样成立，因为页面之间只用相对链接。

- **文案**：模板不写死任何一种语言的文字。中文文案在 `site.json` 的 `ui`（页头页脚与通用提示）、`home`（首页）、`pages`（各内页）中，英文在 `site.en.json` 的同名键下。以 `Html` 结尾的键是可信 HTML，其余都会转义；`{count}`、`{title}` 这类占位符在构建时填入。
- **共用数据**：仓库地址、`revision`、`updated`、备案、头像只在 `site.json` 写一次。`site.en.json` 的 `projects` 按 slug、Skill 按 name、`contributions` 按 number 覆盖文字字段，其余继承中文条目；dev-skills 的 Skill 清单必须与中文一一对应，不一致时构建报错。改项目介绍时两种语言一起更新。
- **新增英文文章**：正文放 `content/en/<slug>.md`（写法同中文 Markdown 文章，不写一级标题，图片用 COS 原图地址），在 `site.en.json` 的 `articles` 中按发表日期倒序填写 slug、标题、摘要、发表日期、`updated`、主题、阅读时间和 `zh`。`zh` 填对应中文文章的 slug，没有中文版就填 `null`。英文列表只显示 `site.en.json` 里的文章；中文旧文不进入英文站。首页“精选”由 `featuredArticles` 指定。
- **语言切换**：页头右侧的 `中文 / EN` 指向另一种语言的同一页；文章没有对应版本时，指向另一种语言的文章列表。手机宽度下只显示另一种语言。文章互有译本时，文章信息栏也会链接到另一版。
- **hreflang 与 canonical**：每页写 `canonical`，地址用 `https://xieshijie.cn/` 加页面路径（域名取自 `filing.domain`）。有对应页的页面写 `zh-CN`、`en` 两条 alternate，`x-default` 指向中文；只有一种语言的页面（中文旧文、尚无中文版的英文文章）只写自己那条，`x-default` 也指向自己。
- **英文页的中文**：备案号、公众号名「AI游民谢世杰」和指向中文页的链接文字可以出现在英文页上；其余中文会被 `npm run check` 当作漏翻报错。英文页页脚同样显示两个备案号。
- **检查**：`npm run check` 另外核对每页的 `<html lang>`、canonical、hreflang 是否指向已构建的页面并且互相对应、语言切换是否只有一个且指向正确的页面，以及英文列表是否只列出有英文版的文章。

## 内容维护

- **新增文章**：在 `content/` 添加 Markdown，并在 `site.json` 的 `articles` 中按发表日期倒序的位置填写 slug、标题、摘要、发表日期、主题和阅读时间；`updated` 只用于首页“最近的记录”。每篇只显示作者谢世杰和发表日期。
- **删除文章**：删掉正文和 `site.json` 条目后重新构建，并删除根目录下对应的 `writing/<slug>/`；`npm run check` 会提示遗留目录。
- **首页精选**：`featuredArticles` 指定三篇。改了首页文案或精选后要重新生成字体子集（见下文）。
- **项目介绍**：`projects` 按 slug 取用，不依赖顺序。`revision` 固定为核对过的上游提交，项目页的依据版本和 Skill 原文链接都指向它：dev-skills 依据 `2254db6` 的 README、README.zh-CN 与 `skills/*/SKILL.md`。dev-skills 的 `catalog` 用 `group` 分为 `flow`（首页手记卡片与作品页展示的四个流程 Skill，带 `step` 与 `you`）、`support`（流程中复用）和 `standalone`（单独使用）。改介绍时先读上游新版本，再更新 `revision`、`updated` 与 `updateNote`（后两者进入首页“最近的记录”）。
- **配图与头像**：图片放在腾讯云 COS 图床 `coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com`，仓库不存副本。正文保留原图地址，构建时追加 `imageMogr2/thumbnail/…/format/webp`，由图床按需缩放并转为 WebP。头像为 `site/xieshijie-avatar.jpg`。图床需保持公开读、开启数据万象图片处理，并允许本站 Referer。
- **英文内容**：见“多语言”。
- **公开边界**：关于页和文章只写本人确认可公开的经历；内部平台、截图、内网地址、业务数据不进入正文。

## 设计与字体

全站共用一套页头（左侧导航、居中的机器人标识与站名、右侧语言切换与 GitHub）和色板：纸色 `#f4f0e6`、正文 `#3c3e34`、次要文字 `#67695c`、分隔线 `#d8d2c3`、朱红 `#b75b42`。首页标题为霞鹜文楷，正文为 IBM Plex Sans SC；内页标题用宋体、正文用系统黑体，因为文章内容是任意文字，不能依赖字形子集。英文页（`html[lang="en"]`）的内页标题改用西文衬线字体（Iowan Old Style、Palatino、Georgia 依次回退）。日期、编号与代码使用 IBM Plex Mono。图标来自 Phosphor Regular。

`assets/fonts/` 中的 WOFF2 是子集：霞鹜文楷与 Plex Sans SC 覆盖可见 ASCII 和中英文首页（`index.html`、`en/index.html`）的全部文字，Plex Mono 覆盖可见 ASCII。改任一首页文案后先 `npm run build`，再用 `scripts/subset-fonts.py` 从下列固定版本的完整字体重新生成（Plex Sans SC 用 `ttf/unhinted`），然后再 build 一次。脚本同时把 CSS 中的字体地址写成 `fonts/<名>.woff2?v=<内容哈希>`，字体一变地址就变，浏览器不会继续用缓存的旧子集；只想刷新哈希时运行 `python3 scripts/subset-fonts.py --stamp`。`npm run build` 发现 CSS 里的哈希与字体文件不一致会直接报错。

- [霞鹜文楷 Regular](https://github.com/lxgw/LxgwWenKai/tree/8bd6319350fb3ae1904c1cb1a41595ab15d21140)，`assets/fonts/WenKai-OFL.txt`。
- [IBM Plex Sans SC / Mono Regular](https://github.com/IBM/plex/tree/78cd4223d8de9fcb78cba84eadecb269c56093c5)，`assets/fonts/Plex-*-LICENSE.txt`。
- [Phosphor Core](https://github.com/phosphor-icons/core/tree/2b75f3ad12b420c9504ef05df8d2564a28f8500e)，`assets/fonts/Phosphor-LICENSE.txt`；SVG 图形保持上游路径，合并为本地 sprite。

开源贡献依据 [MiniMax Code PR #280](https://github.com/MiniMax-AI/minimax-code/pull/280)，合入日期为 2026-09-21。

## 自动部署

修改源文件 → `npm run build` 与 `npm run check` → 源文件和生成的 HTML 一起提交 PR → 合入 `main`。GitHub Actions **Check and deploy website** 检查后部署到 [xieshijie.cn](https://xieshijie.cn/)。

- 普通 PR 只构建、检查和测试；只有 `main` 的 push 或手动运行会部署。网络失败可 **Re-run failed jobs**；手动发布当前 `main` 用 **Run workflow**。
- 撤回内容：合入对应提交的 revert PR 即可重新部署。
- 部署按提交 SHA 校验归档和每个文件，准备好完整版本后原子切换网站目录，旧版本保留在服务器。本地 HTTPS 检查（中文首页、英文首页、站点图标与版本文件）失败会自动恢复原版本；公网验证失败时工作流标红。
- 部署命令用 zlib 压缩传输，以符合 Cloud Assistant 的 24 KiB 限制。新增公开文件类型时，需同步 `scripts/deploy-receive.py` 的允许类型。
- OIDC 信任限定为本仓库的 `main` 分支；临时角色只能在指定 ECS 上以无 sudo 权限的 `ai-roam-deploy` 用户执行命令。Repository Variables：`ALIYUN_DEPLOY_ROLE_ARN`、`ALIYUN_OIDC_PROVIDER_ARN`、`ALIYUN_INSTANCE_ID`，均为资源标识，不存储密钥。

## 备案与联系

正式备案名称「自用网站」在 `site.json` 的 `name` 中维护，同步到全站导航、首页标题和分享标题；个人简介与作者署名仍使用谢世杰。`filing` 填写 `xieshijie.cn`、`鲁ICP备2026052690号-1` 与 `京公网安备11010502063318号`，页脚分别链接工信部和公安备案查询入口。公安备案图标 `assets/police-filing.png` 取自[全国互联网安全管理服务平台页脚使用的官方资源](https://beian.mps.gov.cn/img/logo01.dd7ff50e.png)。公众号名称「AI游民谢世杰」仍在 `site.json` 中维护，全站同步。

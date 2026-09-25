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
| `content/site.json` | 站点信息、头像、项目、文章元数据、首页精选、开源贡献、备案信息 |
| `content/*.md` / `content/legacy/*.html` | 文章正文：新文章用 Markdown，早期笔记为清理后的静态 HTML |
| `scripts/build.mjs` | 内页模板（作品、文章、关于）与静态生成 |
| `scripts/home.mjs` / `assets/home.css` / `assets/home-trail.js` | 首页排版与朱红探索线 |
| `assets/site.css` / `assets/site.js` | 内页样式、文章筛选、公众号名称复制 |
| `assets/fonts/` / `scripts/subset-fonts.py` | 自托管字体子集及其生成脚本 |
| `assets/brand-robot.png`、`favicon.ico`、`apple-touch-icon.png` | 朱红机器人品牌标识（页头与站点图标） |
| `scripts/deploy-*.py` / `.github/workflows/deploy.yml` | 阿里云部署 |
| `.openai/hosting.json` | Codex Sites 私有预览配置，静态目录为 `dist` |

页面结构：首页、作品列表、两个项目详情、文章列表与文章正文、关于我。页头导航在所有页面一致：作品 → `projects/`，文章 → `writing/`，关于 → `about/`。

## 内容维护

- **新增文章**：在 `content/` 添加 Markdown，并在 `site.json` 的 `articles` 中按发表日期倒序的位置填写 slug、标题、摘要、发表日期、主题和阅读时间；`updated` 只用于首页“最近的记录”。每篇只显示作者谢世杰和发表日期。
- **删除文章**：删掉正文和 `site.json` 条目后重新构建，并删除根目录下对应的 `writing/<slug>/`；`npm run check` 会提示遗留目录。
- **首页精选**：`featuredArticles` 指定三篇。改了首页文案或精选后要重新生成字体子集（见下文）。
- **配图与头像**：图片放在腾讯云 COS 图床 `coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com`，仓库不存副本。正文保留原图地址，构建时追加 `imageMogr2/thumbnail/…/format/webp`，由图床按需缩放并转为 WebP。头像为 `site/xieshijie-avatar.jpg`。图床需保持公开读、开启数据万象图片处理，并允许本站 Referer。
- **公开边界**：关于页和文章只写本人确认可公开的经历；内部平台、截图、内网地址、业务数据不进入正文。

## 设计与字体

全站共用一套页头（左侧导航、居中的机器人标识与「AI游民」、右侧 GitHub）和色板：纸色 `#f4f0e6`、正文 `#3c3e34`、次要文字 `#67695c`、分隔线 `#d8d2c3`、朱红 `#b75b42`。首页标题为霞鹜文楷，正文为 IBM Plex Sans SC；内页标题用宋体、正文用系统黑体，因为文章内容是任意文字，不能依赖字形子集。日期、编号与代码使用 IBM Plex Mono。图标来自 Phosphor Regular。

`assets/fonts/` 中的 WOFF2 是子集：霞鹜文楷与 Plex Sans SC 覆盖可见 ASCII 和首页全部文字，Plex Mono 覆盖可见 ASCII。改首页文案后先 `npm run build`，再用 `scripts/subset-fonts.py` 从下列固定版本的完整字体重新生成（Plex Sans SC 用 `ttf/unhinted`）：

- [霞鹜文楷 Regular](https://github.com/lxgw/LxgwWenKai/tree/8bd6319350fb3ae1904c1cb1a41595ab15d21140)，`assets/fonts/WenKai-OFL.txt`。
- [IBM Plex Sans SC / Mono Regular](https://github.com/IBM/plex/tree/78cd4223d8de9fcb78cba84eadecb269c56093c5)，`assets/fonts/Plex-*-LICENSE.txt`。
- [Phosphor Core](https://github.com/phosphor-icons/core/tree/2b75f3ad12b420c9504ef05df8d2564a28f8500e)，`assets/fonts/Phosphor-LICENSE.txt`；SVG 图形保持上游路径，合并为本地 sprite。

Agent Lord 的计划到实现流程图取自该版本的 `assets/diagrams/plan-to-implement.svg`，本地文件为 `assets/agent-lord-plan-to-implement.svg`，未改写图中内容。开源贡献依据 [MiniMax Code PR #280](https://github.com/MiniMax-AI/minimax-code/pull/280)，合入日期为 2026-09-21。

## 自动部署

修改源文件 → `npm run build` 与 `npm run check` → 源文件和生成的 HTML 一起提交 PR → 合入 `main`。GitHub Actions **Check and deploy website** 检查后部署到 [xieshijie.cn](https://xieshijie.cn/)。

- 普通 PR 只构建、检查和测试；只有 `main` 的 push 或手动运行会部署。网络失败可 **Re-run failed jobs**；手动发布当前 `main` 用 **Run workflow**。
- 撤回内容：合入对应提交的 revert PR 即可重新部署。
- 部署按提交 SHA 校验归档和每个文件，准备好完整版本后原子切换网站目录，旧版本保留在服务器。本地 HTTPS 检查失败会自动恢复原版本；公网验证失败时工作流标红。
- 部署命令用 zlib 压缩传输，以符合 Cloud Assistant 的 24 KiB 限制。新增公开文件类型时，需同步 `scripts/deploy-receive.py` 的允许类型。
- OIDC 信任限定为本仓库的 `main` 分支；临时角色只能在指定 ECS 上以无 sudo 权限的 `ai-roam-deploy` 用户执行命令。Repository Variables：`ALIYUN_DEPLOY_ROLE_ARN`、`ALIYUN_OIDC_PROVIDER_ARN`、`ALIYUN_INSTANCE_ID`，均为资源标识，不存储密钥。

## 备案与联系

`filing` 填写 `xieshijie.cn` 与 `鲁ICP备2026052690号-1`，页脚链接到工信部查询入口；取得公安备案号后，同时填写 `police` 与平台提供的 `policeUrl`。公众号名称「AI游民谢世杰」在 `site.json` 中维护，全站同步。

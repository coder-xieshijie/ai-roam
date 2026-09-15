# ai-roam

谢世杰｜AI游民的个人网站：公开作品、AI 开发实践与关于我。

正式主页：[xieshijie.cn](https://xieshijie.cn/)，部署在阿里云 ECS。

GitHub Pages 备用地址：[coder-xieshijie.cn/ai-roam](https://coder-xieshijie.cn/ai-roam/)。发布来源保留为 `main` 分支根目录；分支里的改动合入后才会更新正式站点。

## 本地开发

需要 Node.js 24+。

```sh
npm ci
npm run build
npm run check
python3 -m http.server 4173 --directory dist
```

打开 [本地预览](http://localhost:4173/)。页面是静态 HTML，不需要运行时框架、第三方字体或外部脚本。唯一构建依赖 `marked` 用于渲染仓库内本人维护的 Markdown，不能直接接收不可信的投稿。

## 内容维护

| 位置 | 用途 |
| --- | --- |
| `content/site.json` | 站点信息、项目与文章元数据、公开联系入口、备案配置 |
| `content/skills-and-mcp.md` | 文章正文；保留原发表日期和本站修订说明 |
| `scripts/build.mjs` | 共用导航、页脚、页面模板与静态生成 |
| `assets/site.css` / `assets/site.js` | 全站样式、公众号名称复制和同步状态展示 |
| `assets/brand-robot.png` | 2026-09-10 确认的朱红机器人正式 IP 素材，1024px PNG |
| `assets/favicon.ico` / `assets/apple-touch-icon.png` | 同一正式素材的多尺寸 favicon 与 180px Apple 图标 |
| `assets/observer-example.jpg` | Agent Lord 公开仓库的合成示例画面，页面明确标注 |

修改源文件后运行构建，同时生成 GitHub Pages 根目录文件与 `dist/` 预览文件。根目录生成的 HTML 需要一起提交；不要直接修改这些生成文件。`dist/` 和 `node_modules/` 不提交。

八个页面：首页、作品列表、Agent Lord、dev-skills、文章列表、Skills 与 MCP 正文、关于我、同步状态。内部导航使用相对链接，兼容根路径和 `/ai-roam/` 子路径。`npm run check` 验证两种挂载路径下的本地资源、页面链接、锚点及生成文件一致性。

新增文章：在 `content/` 添加 Markdown，并在 `site.json` 的 `articles` 中填写 slug、标题、摘要、原发表日期、修订日期、主题、阅读时间和原题。最近更新从文章修订日期与项目介绍更新日期生成，不代表上游项目发布日期。移除文章时，也需要移除它在根目录和 `dist/` 中的旧输出。

## 自动部署到阿里云

日常更新：修改上表中的源文件 → 运行 `npm run build` 和 `npm run check` → 将源文件及生成的 HTML 一起提交 PR → 合入 `main`。GitHub Actions 的 **Check and deploy website** 会自动检查并部署到 [xieshijie.cn](https://xieshijie.cn/)，不需要登录阿里云控制台。

- 普通 PR 只构建、检查和测试。仅 `main` 的 push 或手动运行可以部署。
- 在仓库 **Actions → Check and deploy website** 查看结果；网络失败可点击 **Re-run failed jobs** 重试。手动发布当前 `main` 可点 **Run workflow**，分支选择 `main`。
- 如需撤回已发布的内容，创建并合入对应提交的 revert PR，自动部署会发布恢复后的版本。服务器切换后的本地 HTTPS 检查失败时会自动恢复原版本；公网验证失败会将工作流标红，应查看日志再重试或回退。
- 部署按提交 SHA 校验归档和每个公开文件，先准备完整版本，再原子切换网站目录。旧版本保留在服务器，更新不需要重启 Nginx。
- OIDC 信任限定为 `coder-xieshijie/ai-roam` 的 `main` 分支。临时角色只能在指定 ECS 上以 `ai-roam-deploy` 用户执行命令并读取执行结果；这个 Linux 用户可写网站目录，没有 sudo 权限。
- GitHub Repository Variables：`ALIYUN_DEPLOY_ROLE_ARN`、`ALIYUN_OIDC_PROVIDER_ARN`、`ALIYUN_INSTANCE_ID`。这些是资源标识；不存储主账号 AccessKey、SSH 密钥或 OAuth 凭证。

部署实现见 `.github/workflows/deploy.yml`、`scripts/deploy-aliyun.py` 与 `scripts/deploy-receive.py`。新增公开文件类型时需同步接收脚本的允许类型；目前无需在服务器安装 Node.js。

## Obsidian 同步状态

`/sync-status/` 从同路径的 `status.json` 读取脱敏指标。服务器上的 `obsidian-status.timer` 每分钟运行 `scripts/update-obsidian-status.py`：读取 CouchDB 健康状态，并用 root-only SQLite 记录从启用时开始的匿名文件变化。公开 JSON 只包含服务状态、记录数、容量，以及 1/3/7/30 天的文件和行数聚合计数，不包含文件名、路径、正文或凭据。

文件变化由服务器从加密同步记录统计。行数无法从端到端加密后的正文中计算，因此 `scripts/collect-obsidian-line-metrics.py` 通过 macOS LaunchAgent 在本机只读 Markdown：本地 SQLite 仅保存带密钥的文件标识和逐行 HMAC，云端 `obsidian_metrics` 库仅接收每次扫描的新增/删除行数总计。首次运行只建立现有文件基线，不把它们计为新增。行数中的修改按“删除旧行并新增新行”计算；文件重命名按旧文件全部删除、新文件全部新增计算。

相关服务文件保存在 `ops/`。服务器 SQLite 位于 `/var/lib/obsidian-status/metrics.sqlite3`，公开快照位于 `/var/www/obsidian-status/status.json`；本机行数状态位于 `~/Library/Application Support/Obsidian Line Metrics/state.sqlite3`。聚合窗口从各自功能启用时开始积累，同一文件在每个文件操作窗口中只计一次。

## 备案与联系信息

`filing` 已填写核实后的 `xieshijie.cn` 与 `鲁ICP备2026052690号-1`，页脚链接到工信部查询入口；取得公安备案号后，再同时填写 `police` 和平台实际提供的 `policeUrl`。部署到对应域名前核对备案信息与登记服务内容。

公众号名称沿用旧站的「AI游民谢世杰」。若已更名，在 `site.json` 中更新一次即可同步全站。

## 内容依据

- [Agent Lord README，36de09d](https://github.com/coder-xieshijie/agent-lord/blob/36de09d7f128d522f4f0a271a5616e6460e92ff6/README.md)：用途、示例、运行条件与边界。
- [dev-skills，4b46de8](https://github.com/coder-xieshijie/dev-skills/tree/4b46de87aa09a092c6c375e8d1487aac9692f6d8)：两个公开 Skill 及调用方式。
- Skills 与 MCP 文章在正文中链接官方来源，保留 2026-03-10 原发表日期，本站修订于 2026-09-10。
- 关于页仅采用本人确认可公开的经历，不包含内部项目、数据和文档。

`.openai/hosting.json` 关联用于审阅的 Sites 私有预览，静态目录为 `dist`；GitHub Pages 的发布方式继续保留。发布私有预览前先构建、检查并提交同一份源码。

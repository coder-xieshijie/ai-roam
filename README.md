# ai-roam

谢世杰｜AI游民的个人网站：公开作品、AI 开发实践与关于我。

GitHub Pages 地址：[coder-xieshijie.cn/ai-roam](https://coder-xieshijie.cn/ai-roam/)。发布来源保留为 `main` 分支根目录；分支里的改动合入后才会更新正式站点。

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
| `assets/site.css` / `assets/site.js` | 全站样式、公众号名称复制与失败提示 |
| `assets/brand-robot.png` | 2026-09-10 确认的朱红机器人正式 IP 素材，1024px PNG |
| `assets/favicon.ico` / `assets/apple-touch-icon.png` | 同一正式素材的多尺寸 favicon 与 180px Apple 图标 |
| `assets/observer-example.jpg` | Agent Lord 公开仓库的合成示例画面，页面明确标注 |

修改源文件后运行构建，同时生成 GitHub Pages 根目录文件与 `dist/` 预览文件。根目录生成的 HTML 需要一起提交；不要直接修改这些生成文件。`dist/` 和 `node_modules/` 不提交。

七个页面：首页、作品列表、Agent Lord、dev-skills、文章列表、Skills 与 MCP 正文、关于我。内部导航使用相对链接，兼容根路径和 `/ai-roam/` 子路径。`npm run check` 验证两种挂载路径下的本地资源、页面链接、锚点及生成文件一致性。

新增文章：在 `content/` 添加 Markdown，并在 `site.json` 的 `articles` 中填写 slug、标题、摘要、原发表日期、修订日期、主题、阅读时间和原题。最近更新从文章修订日期与项目介绍更新日期生成，不代表上游项目发布日期。移除文章时，也需要移除它在根目录和 `dist/` 中的旧输出。

## 备案与联系信息

`filing` 当前留空，等待实际核发的信息；空值不会生成占位备案号。设置 `domain` 与 `icp` 后展示 ICP 查询入口；取得公安备案号后，再同时填写 `police` 和平台实际提供的 `policeUrl`。部署到对应域名前核对备案信息与登记服务内容。

公众号名称沿用旧站的「AI游民谢世杰」。若已更名，在 `site.json` 中更新一次即可同步全站。

## 内容依据

- [Agent Lord README，36de09d](https://github.com/coder-xieshijie/agent-lord/blob/36de09d7f128d522f4f0a271a5616e6460e92ff6/README.md)：用途、示例、运行条件与边界。
- [dev-skills，4b46de8](https://github.com/coder-xieshijie/dev-skills/tree/4b46de87aa09a092c6c375e8d1487aac9692f6d8)：两个公开 Skill 及调用方式。
- Skills 与 MCP 文章在正文中链接官方来源，保留 2026-03-10 原发表日期，本站修订于 2026-09-10。
- 关于页仅采用本人确认可公开的经历，不包含内部项目、数据和文档。

`.openai/hosting.json` 关联用于审阅的 Sites 私有预览，静态目录为 `dist`；GitHub Pages 的发布方式继续保留。发布私有预览前先构建、检查并提交同一份源码。

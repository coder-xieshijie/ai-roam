# 藤蔓首页原型

在独立分支 `shijie/vine-homepage-demo` 验证：随滚动生长的藤蔓，能否把 AI游民的作品、方法、文章和个人经历串成连续的阅读路径。

参考：[Olav 的设计文章](https://x.com/olavlj/status/2094524951025914278) / [作者博客](https://blume.codes/blog/how-we-built-a-next-level-landing-page-and-how-you-can-too)。采用滚动绘制曲线、叶片与花朵逐步出现的交互思路。SVG 花叶为本原型绘制，没有复制参考站图片或代码。页面沿用本项目公开内容、品牌机器人及 Observer 演示图。

```sh
npm ci
npm run demo
```

打开 http://127.0.0.1:4173/?variant=vine 。底部可切换 `?variant=original` 对照。右下角可换三种花色；「重新生长」回到顶部。向上滚动时藤蔓会收回，系统启用减少动态效果时直接显示完整藤蔓。

原型入口是本地 Node 服务，正式 `npm run build` 仍然生成原来的八个页面。原型只监听本机，未部署。页面结构和样式是用于审阅的草稿，设计待用户确认；没有改写正式首页模板。

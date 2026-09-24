去年 9 月，我从 Java 后端转去做代码智能。第一件事，是把一个开源代码大模型部署起来，给补全插件用。这篇记录这半年从零开始的过程：先跑通，再压测，再调 prompt。

## 最开始的待办清单

刚接手时，我对大模型部署几乎一无所知，列的待办是这样的：

1. 如何部署模型
2. 指定 CPU 和 GPU
3. 把模型放到 Docker 上部署
4. 通过 API 请求模型
5. 现有模型的交互方式
6. 水平扩展模型的性能
7. 如何通过硬件扩展当前模型的性能

入门阶段读过、试过的东西：

- ChatGLM-6B 和 CodeGeeX2，了解国内开源模型的情况；
- 一篇把 Falcon-180B 所需显存从 360G 压到 100G 左右的文章，顺带认识了 accelerate；
- 用 Docker 跑 Hugging Face 模型，搭 GPU 版的 Docker 环境；
- 阿里云当时有免费算力活动，我在上面试着部署过；
- 模型下载经常被网络卡住，试过镜像站，也试过 huggingface_hub 加 token 下载；
- OpenLLM，以及 Hugging Face 的 Model Memory Calculator，用来估算一个模型需要多少显存。

## 目标：单次补全 1 秒以内

正式的目标分三步：

1. **运行模型并访问成功**：拿到测试服务器权限、下载模型、尝试不同的启动器、运行 StarCoder、通过 HTTP 远程调用拿到 response，最后构建 Docker 镜像，测试完可以直接部署。
2. **搭建 Python 服务并运行**，熟悉相关实现。
3. **优化**：
   - 通过各种手段，把单次补全时间降到 1 秒以内；
   - 引入压测，先并发执行 curl 请求，记录每次耗时；
   - 调整不同参数做性能优化；
   - 跨文件提示：获取工程内容，根据其他文件的内容做提示。

启动器最后选了 Hugging Face 的 text-generation-inference（TGI）。

## 启动参数：哪些有用，哪些没用

**量化没有降低延迟。** 单卡上试了非量化、`bitsandbytes-nf4`、`eetq`、`gptq` 四种，单次请求耗时基本没有变化。

**双 shard 做到了 1 秒以内。** 用两张卡做张量并行，单次补全压到了 1 秒以内。作为对比，直接用 transformers 加载 StarCoder 推理，平均要 2.4 秒左右。

**请求参数里，只有 `max_new_tokens` 真正影响速度。** 我逐个试过：

1. 减少 `max_new_tokens`：控制每次生成的最大 token 数，输出变短，响应变快；
2. 调整 `top_k`、`top_p`：和采样有关，理论上可能减少计算；
3. 调整 `temperature`；
4. 关掉 `details`、`decoder_input_details`、`return_full_text` 这些不需要的返回；
5. 固定 `seed`，这不改变速度，但能让结果更确定。

除了 `max_new_tokens`，其他参数对生成速度的影响都可以忽略。所以最直接可行的方案就是：少生成 token。

## 压测：卡数和并发

之后我在两种显卡上做了系统的压测。主要看两个指标：每个 token 的平均生成时间（time-per-token），以及首 token 耗时（prefill latency）。

**token 平均生成速度：**

- 单卡 A800，1 batch，21ms/token；10 batch，24ms/token
- 双卡 A800，1 batch，17ms/token；10 batch，20ms/token
- 双卡 A100，1 batch，20ms/token；10 batch，30ms/token
- 4 卡 A100，1 batch，21ms/token；10 batch，35ms/token

**首 token：** 双 shard 的 A800 在 30 到 50ms，双 shard 的 A100 在 70 到 100ms。

结论有三条：

1. **卡数不是越多越好。** 4 卡、8 卡都没有比 2 卡更快，并发下反而更慢。
2. **并发度维持在 20 以下比较合适。** 从吞吐量看，batch 从 1 到 16，吞吐基本线性增长，平均每个 token 的生成时间只从 22ms 变成 25ms；batch 从 16 到 32，吞吐只从 600 多涨到 800 多，已经是亚线性。
3. **并发提升时，请求耗时有一个爬坡过程。** 刚开始 token 生成还比较快，后面会逐渐变慢。

同样配置的 A800 和 A100 性能差异，我猜测和 CUDA 版本有关：一台是 11.4，另一台是 12.2。这一点还没来得及验证。

还有一个没想通的现象：4 shard 时，1024 token 的输入反而比 10 token 的输入生成得更快。不同 shard 数下，也许存在一个让生成最快的输入长度，这个还待验证。

## 显存参数：并发上限从 30 提到 85

默认参数下，4k 上下文、batch 到 30 左右就会 OOM，报错出现在 Prefill 阶段。调整了三个参数：

- `--cuda-memory-fraction 0.8`
- `--max-total-tokens 18192`
- `--max-batch-prefill-tokens 18000`

调整后，并发上限提高到 85 到 90 才出现 OOM，而且 batch 从 1 到 32 的 benchmark 中，性能没有明显下降，prefill 甚至略有提升。

## Prompt：选模型，也选写法

我对比了 StarCoder 和 OctoCoder。OctoCoder 的底座是 StarCoder，在此基础上又做了指令微调。两者性能基本相同，在 batch 为 1、8、16、32 时，每个 token 都在 18 到 22ms 之间。最后选了 OctoCoder。

验证方法很简单：**同一个 prompt 执行 100 次，统计返回结果有几种。**

- **带 FIM token 时**，StarCoder 返回 43 种不同的补全，而且无法保证只补全单个函数；OctoCoder 只返回 5 种，全部是单函数补全，其中 95 次和 Copilot 的补全形式一致，只差在变量名上。
- **不带 FIM token、直接用 Copilot 风格的 prompt 时**，OctoCoder 有一半场景像是触发了对话模式：补全代码之后，紧跟着出现一个 `Answer`。

**`temperature=0.01` 能保证幂等。** 0.1 时有 13 种结果；0.01 时只有 2 种，而且比例是 99:1，基本可以认为只会出现一种。

**token 的位置很关键。** 把跨文件的参考代码放在 FIM token 中间，补全效果非常好：正确识别了要补全的方法，参数正确，而且只补全一个函数。

## StarCoder2：新模型的兼容问题

StarCoder2 上个月底刚发布，用了新的架构，很多推理框架都需要额外兼容，部署对版本要求非常严格。

- vLLM 版本不低于 0.3.3 时，可以正常部署；
- 最新版 TGI 一开始部署失败，只能跟着 GitHub 上的 issue 等修复；3 月 25 日换了新的基础镜像、手动安装 TGI 后，部署成功；
- StarCoder2 新增了 `<file_sep>` 这个 special token，可以作为停止条件；
- 初步看，StarCoder2-15B 的 FIM 能力比 StarCoder-15B 要差。

## 这半年的感受

作为后端开发，我的路径是：先跑通，再压测，再调 prompt，最后才回头补理论。压测、容量评估、定位报错，这些后端的老本行在这里都用得上。

从今年 1 月开始，我也在同步做微调：用自己的代码数据，让模型在补全最差的那些场景上变好。那部分的结论整理好后单独写。

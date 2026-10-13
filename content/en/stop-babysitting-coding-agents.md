![Cover: you set the goal and the check, the spec is frozen, one agent builds and proves it, another model verifies, you read the decisions and merge](https://coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com/site/en/2026/10/1dff30ab1faf1078d887.png)

I built an orchestrator to run coding agents in parallel. Then one eight-module job took 14 hours—and for about 76% of that time, only one CLI was working. I thought I needed more agents. The audit changed my mind.

Here's what went wrong, what I learned from OpenAI, Anthropic and Lauren Tan, and the workflow and three skills I use now.

## Where I started

I'm a backend engineer on MCode, MiniMax's coding agent, which has a desktop app and a terminal UI. Nearly all my coding goes through agents, and MCode comes first: I work on it, so it's what I use for my own work every day. I also keep Codex and Claude Code around, to cross-check work and see how they handle the same task.

To get more done, I wrote Agent Lord, an orchestrator that lets one agent session hand work to others. From a Codex session, it split a feature into modules and sent each module to its own CLI, usually MCode, in its own git worktree. Modules that didn't depend on each other ran at the same time. For reviews, two model families checked each other's findings. At the end, an integrator merged everything. In the month I later measured, it dispatched 490 operations across 214 tasks.

The bet was simple: more agents working at once, more work done.

By mid-September it didn't feel that way. Here's what I typed to my agents in a single day:

> "This is so tedious. Everything takes forever to build."

> "Do we really need this many tickets? Can't we merge some?"

> "It's been reading for an hour."

> "Why not send out more agents? If they don't depend on each other, why can't they all go at once?"

## More agents weren't the answer

That last message was what I believed at the time: the fix was more parallelism. So after Agent Lord spent a night building a new version of MCode's Goal feature in eight modules, I had an agent audit the run and tell me why so little of it ran in parallel.

- At most four CLIs ran at once; the average was 1.27.
- Agent Lord didn't cap parallelism. The plan did: the modules formed a chain, and each one waited for the one before it to be delivered.
- Waiting didn't even help. A downstream module still started from the original code, so it couldn't see what its upstream had just written. It coded against stubs, and the real pieces met for the first time at the final merge.
- Inside each CLI, most of the time went to waiting on the model, usually with one tool call per turn. One module made 91 round trips, about 56 minutes, before it wrote its first file.

Adding agents wouldn't have fixed that dependency chain or made upstream code available downstream. It would have left me with more output to check and more handoffs where things could get lost.

## What was actually wrong

The next day I had agents go through every session from the previous 30 days, about 1,700 across MCode, Codex and Claude Code, to see whether that run was a one-off. They read 40 task chains closely and checked the quotes against the raw logs. It wasn't a one-off. Two problems ran through the whole month.

**Bugs showed up late, and I was the one who found them.** The agent said it was done and the tests passed. The problem appeared when I used the feature myself, or when the pieces were wired together.
- The agent marked two PRs for the Goal feature done, tests green. I ran the dev build. If I updated the goal while the agent was waiting on background work, it never picked the work back up.
- The status bar said reasoning effort was xhigh. The session actually ran at medium, because new sessions never passed the setting through.
- Every module of the Goal rework was delivered, and the feature still wasn't turned on in the default production setup.

Each piece passed its own tests. What broke was the wiring between pieces and the path a user actually takes.

**A lot of my time went into relaying decisions to agents.** I re-explained decisions I'd already made, checked whether an agent had stalled, and told it to keep going. Decisions didn't survive the handoffs.
- I settled MCode's four sandbox permission levels in August. In September I was still telling agents: four levels, no extra protections.
- My main session handed a plan to another CLI for cross-review and added "keep it concise" on its own. The 875-line plan was replaced by a 279-line one that had lost the file-by-file migration table, the interfaces, the wiring steps and the acceptance checks.
- I asked for a PR based on the latest integration branch. It was opened against a feature branch, and fixing it meant a rebase and three merge conflicts.

Put the two together and you get the real problem. Writing code isn't the scarce part anymore; agents can do most of it. What's scarce now is decision-making, and the decisions still fell to me. I had become the bottleneck in getting a feature delivered: switching from one feature's context to another's, making a call, switching again, until my attention ran out. The work was waiting on me, not on the agents.

In the sessions I audited, two gaps in my setup kept showing up: the agents couldn't operate the product they were building, and decisions I'd already made didn't reliably survive handoffs. Checking the product and repeating those decisions both landed on me. More parallel work put more of both on my plate.

## How I picked the three sources

![How I picked the sources: my own sessions, then Lauren Tan, then 75 sources sorted into five schools, then three picked, then the originals re-read](https://coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com/site/en/2026/10/abfbdf6d815e3be4d922.png)

I started with **Lauren Tan**. Her 2,000 PRs in a month made me want to understand her setup. In her talk, she wanted an agent that could "run the application itself and take the traces for me." Her warning about scaling to a hundred agents matched my audit: it fails "because you don't have trust in your agent's work yet." ([talk](https://x.com/poteto/status/2102050467505430555), at 4:00 and 6:24)

I widened the search to engineering teams, agent builders and research studies. Some approaches used fixed pipelines; others emphasized specs, task trackers or larger agent teams. The approach that most directly addressed my two problems was to give one agent ownership, let it run the real product, and preserve its progress in files.

**OpenAI, Anthropic and Lauren** gave me concrete mechanisms for that. OpenAI and Anthropic build the models I use every day and the coding agents around them; Lauren brought experience applying these ideas to a production codebase. All three publish enough to inspect: pstack's source, OpenAI's ExecPlan format, and Anthropic's prompts and accounts of what failed.

I took their mechanisms, not their throughput claims. Lauren's PR count, like the other throughput figures, is self-reported. The quotes below link to the live sources and were checked against saved copies.

Out of all this came one idea: **the agent proves its own work on the real product, and someone other than the author checks the proof.** I define the work at the start and review the decisions at the end. In between, I automate as much as I can, so I step in and decide as little as possible. I turned it into three skills, published in [dev-skills](https://github.com/coder-xieshijie/dev-skills). They run in MCode, Claude Code and Codex.

## The workflow at a glance

![The workflow: you, the owner agent and another model family across phases A to D, with your three touchpoints](https://coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com/site/en/2026/10/eee2ebc5286df7ea1efe.png)

**A. Make the app drivable (once per repo).** Give the agent commands to start and operate the app, a feature map, smoke tests, and quality checks. This is Lauren's verification-skill idea. Each app needs its own setup; dev-skills doesn't ship it.

**B. Define (you and the agent).** `core-grill` clarifies the request; `core-spec` records the decisions and how to verify them. Another model family checks for gaps. I confirm the files, which are frozen on a feature branch with a draft PR.

**C. Deliver (the agent alone).** In a new session I run `/deliver <draft PR link>`. One owner builds and tests the feature, coordinates independent checks, and handles CI and review until the PR is mergeable. It pauses before irreversible actions and records its decisions for me to review.

**D. Feed back.** The PR lists gaps this run exposed in the repo. I decide which fixes belong in the repo's tools and which belong in the skills.

My part comes down to three touchpoints: answer the questions, confirm spec.md and verify.md, then read the decision list and merge.

## The three skills

![What each skill takes in and hands on: requirement, core-grill, decision summary, core-spec, frozen spec and verify, draft PR, deliver, plan.md and evidence, mergeable PR](https://coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com/site/en/2026/10/ba21f945a28d49e20729.png)

### core-grill: ask only about what users will see

It starts with the request, the goal, what "done" means, and what it's allowed to do. If the repo can answer a question, it looks there first.

It asks me about choices that change what users see: behavior, copy, defaults, entry points and whether data can be lost. Each question includes options, consequences and a recommendation. It handles implementation choices itself and records the defaults. I confirm the resulting decision summary.

### core-spec: two files, checked by another model, then frozen

It turns that summary into `spec.md` (what we decided) and `verify.md` (how to prove it).

The useful part is writing the checks before the code. Each scenario follows a complete user action from a real entry point and says what should happen on the old code. If that baseline wouldn't expose the risk, it also describes a wrong implementation the check must reject. This forces gaps in the spec to surface early.

Another model family reviews both files in a fresh, read-only session, without the author's reasoning. If that reviewer is unavailable, the files don't get frozen. Once the gaps are resolved and I confirm, both files are frozen and committed, and a draft PR is opened. That link is all `deliver` needs.

### deliver: one owner until the PR is mergeable

![Inside deliver: check out the branch, then per milestone implement, run scenarios, fresh subagent check; decisions go to another model family; final verification, check-delivery.mjs, mergeable PR](https://coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com/site/en/2026/10/143969eaaeb2c75ed468.png)

The owner keeps a living `plan.md` in OpenAI's ExecPlan format, committed with the code so a new session can pick up the work.

- **Build and prove each milestone.** Implement it, run its scenarios on the real app, fix failures, then have a fresh subagent check it against the spec.
- **Get another model's view on decisions.** For choices affecting users or how a check is judged, consult another model family without sharing the owner's preference. Then decide and continue.
- **Make those decisions reviewable.** Put them at the top of the PR, including gaps, deviations in verification and anything unfinished. Each entry says what must be redone if I overturn it. The frozen spec and verify files stay unchanged.
- **Get independent final verification.** Another model family checks the final code in its own session and app instance. The owner addresses its code-quality notes or explains why it didn't.

The owner continues until the PR is mergeable, pausing before irreversible actions such as merging, force-pushing a shared branch or changing a shared environment.

## Who checks what

![Who checks what: gap check before freeze, fresh subagent per milestone, another model family for decisions and final verification, check-delivery.mjs as the final gate, you before merge](https://coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com/site/en/2026/10/6bf5bc4e43289789a98b.png)

The owner tests its own work throughout; final acceptance requires an independent verifier. `check-delivery.mjs` enforces four conditions:
- spec.md and verify.md are still the versions I confirmed;
- the verification report covers the code being merged;
- the verdict is PASS;
- the verifier comes from a different model family than the owner.

## The seven principles

![Seven principles, with what OpenAI, Anthropic and Lauren Tan say about each, and where each lives in dev-skills](https://coder-xieshijie-img-1253784930.cos.ap-beijing.myqcloud.com/site/en/2026/10/120f4b9576578c4c0b76.png)

For each one: what the three sources say, and where it lives in dev-skills.

### 1. You set the goal and the check, then step away

- **OpenAI:** "Humans steer. Agents execute." ([Harness engineering](https://openai.com/index/harness-engineering/))
- **Anthropic:** "Give Claude a check it can run... It's the difference between a session you watch and one you walk away from." ([Claude Code best practices](https://code.claude.com/docs/en/best-practices))
- **Lauren Tan:** "Give the agent a goal and a way to check it, in your own words." ([pstack guide](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md))

Without a check it can run, the agent's only signal is that the work looks done, and you become the test loop. In dev-skills this is phase B, taken one step further: verify.md is a full set of scenarios, written before any code, reviewed by another model, and frozen.

### 2. One agent owns the work end to end

- **OpenAI:** in their own repo, given a single prompt, "the agent can now" go from reproducing a bug to merging the fix, and "escalate to a human only when judgment is required." ([Harness engineering](https://openai.com/index/harness-engineering/))
- **Anthropic:** "A well-designed single agent with appropriate tools can accomplish far more than many developers expect." ([Building multi-agent systems](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them))
- **Lauren Tan:** "Code-coupled work (one feature, one migration) goes to a single owner." ([pstack playbooks](https://github.com/cursor/plugins/tree/main/pstack/skills/poteto-mode))

Every handoff loses context; one stripped nearly 600 lines from my plan. In dev-skills this is `deliver`: the owner can hand coding, checks or scenario runs to subagents, but it integrates the work and makes the calls. That's why I set Agent Lord aside. Work still happens in parallel, but one owner coordinates it.

### 3. The agent can run, operate and observe the real product

- **OpenAI:** "we made the app bootable per git worktree, so Codex could launch and drive one instance per change." ([Harness engineering](https://openai.com/index/harness-engineering/))
- **Anthropic:** left to itself, their agent passed unit tests without noticing the feature didn't work end to end. It did much better once told to "do all testing as a human user would." ([Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))
- **Lauren Tan:** a verification skill is "critical infrastructure rather than 'just' a skill." ([The Complete Guide to pstack, Pt. 1](https://x.com/poteto/status/2094457600259842065))

Unit tests check the code you thought to test. Driving the real app also checks the wiring, the defaults and the entry points, which is where my late bugs came from. In dev-skills this is phase A, plus the scenarios in verify.md: each runs from the entry point the user actually uses and records what the old code does, which catches a check that could never fail.

### 4. Plans and progress live in files in the repo

- **OpenAI:** "It should always be possible to restart from only the ExecPlan." ([Using PLANS.md for multi-hour problem solving](https://developers.openai.com/cookbook/articles/codex_exec_plans))
- **Anthropic:** "compaction isn't sufficient." Each session starts by reading a progress file and the git log. ([Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))
- **Lauren Tan:** "Read the prior trail, don't redo it." ([pstack playbooks](https://github.com/cursor/plugins/tree/main/pstack/skills/poteto-mode))

If the state only lives in the chat, the next session has to guess. In dev-skills, `deliver` keeps plan.md in ExecPlan format, committed with the code. When an upstream API error killed one of my long-running deliveries in Claude Code, I picked it up in MCode: a fresh session read plan.md and the git history and found where it had stopped in under half an hour.

### 5. Someone else decides whether it's right

- **Anthropic:** "Out of the box, Claude is a poor QA agent." Their fix: "Separating the agent doing the work from the agent judging it proves to be a strong lever." ([Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps))
- **OpenAI:** "we've pushed almost all review effort towards being handled agent-to-agent." ([Harness engineering](https://openai.com/index/harness-engineering/))
- **Lauren Tan:** "Run a unit's verifier on a different model family from its worker." ([pstack skills](https://github.com/cursor/plugins/tree/main/pstack/skills))

The author's blind spots live in its context, and models from the same family tend to share them. dev-skills has three layers: a fresh subagent after each milestone, another model family for the gap check and the final verification, and me, reading the decision list before I merge. On my first real run, the first cross-family verification caught an issue that two rounds of same-model checks had missed.

### 6. When the agent gets stuck, fix the repo, not the prompt

- **OpenAI:** "When the agent struggles, we treat it as a signal: identify what is missing—tools, guardrails, documentation—and feed it back into the repository." ([Harness engineering](https://openai.com/index/harness-engineering/))
- **Anthropic:** CLAUDE.md instructions "are advisory," while hooks "are deterministic and guarantee the action happens." ([Claude Code best practices](https://code.claude.com/docs/en/best-practices))
- **Lauren Tan:** "The instruction is the symptom." ([Encode Lessons in Structure](https://github.com/cursor/plugins/tree/main/pstack/skills/principle-encode-lessons-in-structure))

A rule in a prompt is a request the next agent may skip; a rule in code runs every time. In dev-skills, two scripts enforce what must always hold: `freeze.mjs` pins spec.md and verify.md, and `check-delivery.mjs` gates the result. Phase D turns each run's friction into repo tooling.

### 7. Add complexity only when it pays, one piece at a time

- **Anthropic:** they recommend "finding the simplest solution possible, and only increasing complexity when needed." ([Building effective agents](https://www.anthropic.com/engineering/building-effective-agents))
- **OpenAI:** "Prefer a narrow correction to accumulating universal rules for every observed example." ([Codex skill-creator](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md))
- **Lauren Tan:** pstack PR #419 cut 19 instructions. "Each cut held up in A/B runs on tasks that exercise it, with and without the text." ([PR #419](https://github.com/cursor/plugins/pull/419))

I learned this one the hard way. After each trial run I added a rule and a script to check it. `deliver` went from 3 scripts to 11, and its instructions grew by about 70%. Then I cut back to 1 script and less than half the instructions. The whole arc took 32 versions of the workflow in four days.

## How to use it

**What you need**
- Models from two families. I develop in MCode and hand the checks to Codex, a different model family from the one I run in MCode; Claude Code plus Codex works too. The gap check and the final verification must come from the family that didn't do the work, through a CLI that's installed and logged in.
- Node.js 24, git, and `gh` or `glab`.
- An app the agent can start, operate and observe from a worktree (phase A). The [repository readiness guide](https://github.com/coder-xieshijie/dev-skills/blob/main/docs/repository-readiness.md) in dev-skills covers what that takes, and Lauren's [create-verification-skill](https://github.com/cursor/plugins/tree/main/pstack/skills/create-verification-skill) is a good place to start.

**Install** by asking your agent. Paste this into MCode, Claude Code or Codex:

```text
Install dev-skills for me: https://github.com/coder-xieshijie/dev-skills
Follow the "From a clone" steps in its README for the agent you're running in.
If the dev-skills plugin is already installed, stop and tell me instead.
Then list the skills you linked.
```

It clones the repo and links each skill into the folder your agent reads. To update later, ask it to pull the latest dev-skills. MCode is what I use every day, and the experience has been great. If you haven't tried it yet, I'd really recommend it.

**Run** it in the target repo:

```text
/core-grill The request is <link or text>. Put the docs in <dir>/.
/core-spec Write spec.md and verify.md from the decision summary.

# in a new session
/deliver Take over <draft PR link>.
```

1. core-grill asks its questions. Answer them and confirm the decision summary.
2. core-spec writes spec and verify and has the other family check them for gaps. Read the result and confirm. It freezes both files and opens a draft PR.
3. deliver works until the PR is mergeable. Read the decision list at the top, then merge.

In Codex, write `$` instead of `/`.

## Sources

**OpenAI**
- [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/), Ryan Lopopolo (@_lopopolo)
- [Using PLANS.md for multi-hour problem solving](https://developers.openai.com/cookbook/articles/codex_exec_plans) (ExecPlans)
- [Codex skill-creator](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md)

**Anthropic**
- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Building multi-agent systems: when and how to use them](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them)
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)

**Lauren Tan (@poteto)**
- [The Complete Guide to pstack, Pt. 1](https://x.com/poteto/status/2094457600259842065)
- [pstack guide](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md)
- [pstack skills and playbooks](https://github.com/cursor/plugins/tree/main/pstack/skills): poteto-mode (feature, orchestrate, session-pickup), principle-encode-lessons-in-structure, create-verification-skill
- [pstack PR #419](https://github.com/cursor/plugins/pull/419)
- [Her talk on X](https://x.com/poteto/status/2102050467505430555) (September 2026)

---

*First published on [X](https://x.com/world_0618/status/2107848503305113972) on October 7, 2026.*

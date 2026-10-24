# 从模糊想法到可执行验证计划：PM 方法资料包

本文件供你手动上传到 ChatGPT，作为当前项目的方法材料。上传文件不等于安装或自动执行 Skill；网站也不会因此获得你的 ChatGPT 账号权限、模型调用能力或聊天记录。请在 ChatGPT 中明确提出本次任务，再把需要保留的建议带回工作台。

## 使用方式

1. 把本文件和工作台导出的项目材料一起上传到你自己的 ChatGPT 对话。
2. 告诉 ChatGPT 当前要解决哪一个问题，并要求引用材料里的事实；材料未提供的内容标为“待补充”或“假设”。
3. 先保留自己的初始判断，再阅读 AI 建议。记录哪些建议被采纳、修改或拒绝，以及你的理由。
4. 验证开始前约定观察和决策标准；结束后记录原始观察、你的解释与下一步行动。信息不足允许结论为“不确定”。

## 本项目的适用说明

- 初学阶段的小样本访谈、人工服务或可用性观察用于探索问题和形成下一步判断，不要求统计显著性，不得将其写成已验证的市场结论。
- 原版实验设计模板包含 A/B 实验、显著性、检验功效和样本量。只有研究问题、数据和实验条件适合时才使用；其余字段标为“不适用：探索性验证”。不要为了填满模板编造基线、用户、访谈、转化率、p 值或计算结果。
- 数字目标可以是验证前由你明确提出的决策门槛，必须标为“预设门槛”，不能写成观察到的事实。正式统计实验需要写明计算方法与输入，不能借用示例中的结果。
- 模拟用户仅用于发现流程问题和生成待验证假设。模拟内容、AI 建议、个人判断、真实用户观察应分别记录；模拟反馈不计入真实样本。
- 以下示例是上游仓库的教学材料，不是你或本产品的真实用户、业务数据或验证结果。不要把示例内容导入项目证据。
- 原版方法允许转向其他 Skill；本包仅提供下列六项。没有收录的 Skill 并不会被自动调用，可按原文的最小替代产物建议继续，或明确说明需要补充方法。
- 复盘方法中的本地记忆文件协议只适用于具有对应文件和工具的环境。本包不会创建或写入 `.claude/pm-skills.local.md`；在 ChatGPT 中请把复盘写进回复，再由你保存到工作台。

## 六项方法

### 1. 把问题说清楚

明确谁在什么情境下遇到什么困难，分开已知事实和待验证猜想。

- 具体是哪类人，在什么情境下遇到这个问题？
- 他们现在怎样解决？困难出现多频繁，有什么原始证据？
- 如果问题被解决，什么行为会改变？哪些信息还不知道？

来源：[define-problem-statement](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-problem-statement/SKILL.md)

### 2. 找到最危险的假设

选出最可能使想法失败的一项假设，并决定先验证什么。

- 哪个假设如果不成立，这个方向就不值得继续？
- 支持它的是口头意愿，还是用户已经付出的时间、行动或费用？
- 用什么低成本行动，可以尽快获得支持或反对它的证据？

来源：[foundation-build-risk-review](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/foundation-build-risk-review/SKILL.md)

### 3. 写成可验证的判断

把相信的事情写成可被证据推翻的判断，提前约定观察标准。

- 我相信什么改变，会让哪类人产生什么可观察的行为？
- 我主要观察什么？当前情况不知道时，准备怎样补齐？
- 出现什么结果会支持、反对这个判断，或只能说明信息仍不足？

来源：[define-hypothesis](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-hypothesis/SKILL.md)

### 4. 制定验证计划

把一个假设变成明确的招募对象、任务、记录方式和决策规则。

- 找谁参与，从哪里找到，他们需要完成什么真实任务？
- 怎样和当前做法比较？如何减少顺序、材料和协助带来的偏差？
- 由谁在什么时候执行，记录哪些观察，何时结束并作出判断？
- 这是小样本探索还是正式实验？现有证据允许得出什么结论？

来源：[measure-experiment-design](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/measure-experiment-design/SKILL.md)

### 5. 留下我的取舍

保留自己的判断、AI 建议、替代方案和采纳理由，明确个人贡献。

- 看到 AI 建议之前，我自己的判断是什么，依据是什么？
- 还考虑过哪些可行方案？选择当前方案，得到了什么又放弃了什么？
- 我采纳、修改或拒绝了哪些 AI 建议？什么新证据会让我重新考虑？

来源：[develop-design-rationale](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/develop-design-rationale/SKILL.md)

### 6. 用结果修正判断

核对计划和真实观察，记录改判原因与下一步负责人、时间。

- 实际发生了什么？哪些是原始观察，哪些只是我的解释？
- 结果支持或反对哪个判断？有哪些偏差和不能推断的地方？
- 接下来保留、修改或停止什么？由谁在什么时间完成下一步？

来源：[iterate-retrospective](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/iterate-retrospective/SKILL.md)

## 一次协作应留下的记录

| 记录 | 要求 |
| --- | --- |
| 我的初始判断 | 在 AI 建议之前形成的想法、依据和未知点；事后补记需明确标注 |
| AI 建议 | 原文或摘要、对话链接（可选）、使用的方法；不算用户证据 |
| 我的取舍 | 可行替代方案、比较依据、采纳或拒绝理由、预期代价 |
| 验证计划 | 对象、招募方式、任务、对比方式、观察指标、预设门槛、负责人、时间 |
| 验证结果 | 实际日期和对象、原始观察及来源；模拟结果单独标记 |
| 后续判断 | 支持、反对或信息不足；局限、改判原因、下一步行动 |

## 来源、许可与生成说明

- 上游：[Product on Purpose / PM-Skills](https://github.com/product-on-purpose/pm-skills)。
- 版本：v2.33.0；固定提交：`1cef1a9eae10017389863d51e289e0ae41e17fcb`。
- 来源快照：仓库中的 `references/pm-skills`；来源清单：`references/pm-skills.source.json`。
- 许可：Apache-2.0。完整许可证在本文末尾，也单独提供为 `LICENSE`。保留了原文中的来源和署名；风险评审另保留对 bin1874/before-you-build-skill 的原始归属说明。
- 本包由 AIPM 项目添加中文导读、适用说明、六项方法摘要和附录索引；附录原始文件内容未作修改。中文导读与摘要也按 Apache-2.0 提供。
- 生成命令：在 AIPM 仓库执行 `node sites/aipm-studio/scripts/build-method-pack.mjs`；追加 `--check` 可检查是否与生成结果一致。脚本只读取固定快照，无网络调用，无生成时间戳，输出可复现。
- 范围：六项 SKILL.md，以及它们直接引用的模板、示例、风险分类和路由说明；不包含测试、历史或整个方法仓库。

## 附录路径索引与引用规则

附录用原始路径标识文件。原文中的 `references/TEMPLATE.md`、`references/EXAMPLE.md` 等路径，均以所属的 `skills/<skill-id>/` 为起点解析。每个文件前另列出其引用到本文件附录的链接。原文保持在代码块内，以免六套模板的标题和前置元数据互相混淆。

示例中的外部 Figma、Google Docs、Looker 的 `xxx` 链接，以及 `results/guest-checkout-q3-2025.md`，只是上游示例占位符，不存在于本包，也不能作为真实来源。模板方括号内的链接文字是待填写字段。除此之外，本包内所有 `references/*.md` 引用均在生成时校验并映射到以下附录。

- [skills/define-problem-statement/SKILL.md](#source-skills-define-problem-statement-skill-md)
- [skills/define-problem-statement/references/TEMPLATE.md](#source-skills-define-problem-statement-references-template-md)
- [skills/define-problem-statement/references/EXAMPLE.md](#source-skills-define-problem-statement-references-example-md)
- [skills/foundation-build-risk-review/SKILL.md](#source-skills-foundation-build-risk-review-skill-md)
- [skills/foundation-build-risk-review/references/TEMPLATE.md](#source-skills-foundation-build-risk-review-references-template-md)
- [skills/foundation-build-risk-review/references/EXAMPLE.md](#source-skills-foundation-build-risk-review-references-example-md)
- [skills/foundation-build-risk-review/references/risk-taxonomy.md](#source-skills-foundation-build-risk-review-references-risk-taxonomy-md)
- [skills/foundation-build-risk-review/references/routing-map.md](#source-skills-foundation-build-risk-review-references-routing-map-md)
- [skills/define-hypothesis/SKILL.md](#source-skills-define-hypothesis-skill-md)
- [skills/define-hypothesis/references/TEMPLATE.md](#source-skills-define-hypothesis-references-template-md)
- [skills/define-hypothesis/references/EXAMPLE.md](#source-skills-define-hypothesis-references-example-md)
- [skills/measure-experiment-design/SKILL.md](#source-skills-measure-experiment-design-skill-md)
- [skills/measure-experiment-design/references/TEMPLATE.md](#source-skills-measure-experiment-design-references-template-md)
- [skills/measure-experiment-design/references/EXAMPLE.md](#source-skills-measure-experiment-design-references-example-md)
- [skills/develop-design-rationale/SKILL.md](#source-skills-develop-design-rationale-skill-md)
- [skills/develop-design-rationale/references/TEMPLATE.md](#source-skills-develop-design-rationale-references-template-md)
- [skills/develop-design-rationale/references/EXAMPLE.md](#source-skills-develop-design-rationale-references-example-md)
- [skills/iterate-retrospective/SKILL.md](#source-skills-iterate-retrospective-skill-md)
- [skills/iterate-retrospective/references/TEMPLATE.md](#source-skills-iterate-retrospective-references-template-md)
- [skills/iterate-retrospective/references/EXAMPLE.md](#source-skills-iterate-retrospective-references-example-md)

---

<a id="source-skills-define-problem-statement-skill-md"></a>

## 原始文件：skills/define-problem-statement/SKILL.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-problem-statement/SKILL.md) · SHA-256: `494fbd95caeac81bf3681f0c4598a01cda671757db98c85e5c3f6ba15e65479d`

本文件引用：[references/TEMPLATE.md](#source-skills-define-problem-statement-references-template-md)；[references/EXAMPLE.md](#source-skills-define-problem-statement-references-example-md)。

````markdown
---
name: define-problem-statement
description: Creates a clear problem framing document with user impact, business context, and success criteria. Use when starting a new initiative, realigning a drifted project, or communicating up to leadership.
license: Apache-2.0
metadata:
  phase: define
  version: "2.1.0"
  updated: 2026-06-10
  category: problem-framing
  frameworks: [triple-diamond, lean-startup, design-thinking]
  author: product-on-purpose
---
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Problem Statement

A problem statement is a concise document that frames the problem you're solving, articulates the impact on users and the business, and defines clear success criteria. It serves as the foundation for all subsequent product work by ensuring alignment on *what* problem to solve before jumping to *how* to solve it.

## When to Use

- Starting a new initiative or project to establish shared understanding
- Realigning a drifted project back to its original intent
- Communicating up to leadership or stakeholders about priorities
- Evaluating whether a proposed solution actually addresses the core problem
- Onboarding new team members to provide context

## When NOT to Use

- The problem is already agreed and engineering needs the spec -> use `deliver-prd`
- You want to propose and compare solution approaches -> use `develop-solution-brief`
- You are capturing customer motivation rather than a business problem -> use `define-jtbd-canvas`
- The "problem" is really an unvalidated assumption -> frame it with `define-hypothesis` and test it before committing a team to it

## Instructions

When asked to create a problem statement, follow these steps:

1. **Identify the User Segment**
   Ask who is experiencing this problem. Get specific about the user persona, role, or segment. Avoid vague descriptions like "users" - instead target "mobile shoppers completing checkout" or "enterprise admins managing 50+ users."

2. **Understand the Pain Points**
   Explore what friction, frustration, or unmet need the user experiences. Ask probing questions to understand the severity and frequency of the problem. Look for evidence from user research, support tickets, or behavioral data.

3. **Establish Business Context**
   Connect the user problem to business impact. How does this problem affect revenue, retention, growth, or strategic goals? Why should the organization invest in solving this now versus later?

4. **Define Success Metrics**
   Identify how you will measure success. What metrics will move if this problem is solved? Establish current baselines and target improvements. Be specific and time-bound.

5. **Surface Constraints and Considerations**
   Note any technical limitations, resource constraints, regulatory requirements, or dependencies that will shape the solution space.

6. **Capture Open Questions**
   Document what you don't know yet. What assumptions need validation? What additional research is needed?

## Output Format

Use the template in `references/TEMPLATE.md` to structure the output. A complete problem statement fills every template section: Problem Summary; User Impact; Business Context; Success Criteria; Constraints & Considerations; and Open Questions.

## Quality Checklist

Before finalizing, verify:

- [ ] Problem is specific to a defined user segment (not "all users")
- [ ] Impact is quantified with data or reasonable estimates
- [ ] Success metrics have baselines and targets
- [ ] Problem describes the "what" without prescribing the "how"
- [ ] Business context explains why this matters now
- [ ] Open questions are captured for follow-up

## Examples

See `references/EXAMPLE.md` for a completed example.
````

---

<a id="source-skills-define-problem-statement-references-template-md"></a>

## 原始文件：skills/define-problem-statement/references/TEMPLATE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-problem-statement/references/TEMPLATE.md) · SHA-256: `8fc4cd3376be6ef2199bab27b861f3fea99038ba3afe77b6dd8c6b109065422b`

````markdown
---
artifact: problem-statement
version: "1.0"
created: <YYYY-MM-DD>
status: draft
---

# Problem Statement: [Problem Title]

## Problem Summary
<!-- 2-3 sentences that capture the essence of the problem. Should be understandable by anyone in the organization. -->

[Describe the problem in clear, jargon-free language. Focus on the user's experience and the gap between current state and desired state.]

## User Impact

### Who is affected?
<!-- Specific user segment, persona, or role -->

[User segment description]

### How are they affected?
<!-- Describe the friction, frustration, or unmet need -->

[Pain point description]

### Scale of impact
<!-- How many users? How often does this occur? -->

[Quantify the reach and frequency]

## Business Context

### Strategic Alignment
<!-- How does this connect to company goals, OKRs, or strategy? -->

[Connection to business priorities]

### Business Impact
<!-- Revenue, retention, growth, cost implications -->

[Quantified business impact]

### Why Now?
<!-- What makes this urgent or timely? -->

[Timing rationale]

## Success Criteria

| Metric | Current Baseline | Target | Timeline |
|--------|-----------------|--------|----------|
| [Primary metric] | [Current value] | [Target value] | [By when] |
| [Secondary metric] | [Current value] | [Target value] | [By when] |
| [Guardrail metric] | [Current value] | [Maintain] | [Ongoing] |

## Constraints & Considerations

<!-- Technical limitations, resource constraints, regulatory requirements, dependencies -->

- [Constraint 1]
- [Constraint 2]
- [Consideration 1]

## Open Questions

<!-- What don't we know yet? What assumptions need validation? -->

- [ ] [Question 1]
- [ ] [Question 2]
- [ ] [Question 3]
````

---

<a id="source-skills-define-problem-statement-references-example-md"></a>

## 原始文件：skills/define-problem-statement/references/EXAMPLE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-problem-statement/references/EXAMPLE.md) · SHA-256: `2a7240305a44a78646e30a61691feb39e01efc12bdfd14984397c4b008292ba4`

````markdown
---
artifact: problem-statement
version: "1.0"
created: 2026-01-14
status: complete
context: E-commerce company experiencing high checkout abandonment on mobile
---

# Problem Statement: Mobile Checkout Abandonment

## Problem Summary

Mobile shoppers on our e-commerce platform abandon their carts at checkout at significantly higher rates than desktop users. Despite having items in their cart and reaching the checkout page, 73% of mobile users leave without completing their purchase, representing a substantial revenue opportunity and a frustrating experience for customers who intended to buy.

## User Impact

### Who is affected?

Mobile shoppers who add items to their cart and initiate checkout. This segment represents 62% of our total traffic and skews toward younger demographics (18-34) who prefer shopping on their phones.

### How are they affected?

Users report frustration with:
- Small form fields that are difficult to complete on mobile keyboards
- Having to re-enter payment information each session
- Confusion about shipping costs that appear late in the flow
- Slow page loads between checkout steps causing timeouts
- Difficulty applying promo codes on the mobile interface

### Scale of impact

- 2.3 million mobile checkout sessions per month
- 73% abandonment rate (vs. 45% on desktop)
- Approximately 1.68 million abandoned checkouts monthly
- Average cart value of abandoned sessions: $67

## Business Context

### Strategic Alignment

Mobile-first commerce is a key pillar of our 2026 strategy. The executive team has committed to achieving mobile revenue parity with desktop by Q4. Reducing mobile checkout friction directly supports OKR 2.1: "Increase mobile conversion rate by 25%."

### Business Impact

- Potential monthly revenue recovery: $14.8M (assuming 20% of abandoned carts convert)
- Estimated annual impact: $177M revenue opportunity
- Secondary impact: Higher mobile conversion improves CAC payback for mobile ad spend
- Customer lifetime value: Mobile-acquired customers have 23% higher repeat purchase rate

### Why Now?

- Q4 holiday season approaching with 40% of annual mobile traffic
- Competitor launched one-tap checkout in September, creating pressure
- New payment provider integration enables Apple Pay/Google Pay
- Mobile traffic growing 8% MoM while desktop is flat

## Success Criteria

| Metric | Current Baseline | Target | Timeline |
|--------|-----------------|--------|----------|
| Mobile checkout abandonment rate | 73% | 60% | Q1 2026 |
| Mobile conversion rate | 1.8% | 2.3% | Q1 2026 |
| Checkout completion time (mobile) | 4.2 min | 2.5 min | Q1 2026 |
| Mobile revenue as % of total | 38% | 45% | Q2 2026 |
| Customer satisfaction (checkout NPS) | 32 | 50 | Q1 2026 |

## Constraints & Considerations

- Payment provider contract limits changes to payment form UI until March
- Must maintain PCI compliance for any checkout modifications
- iOS and Android apps share checkout webview - changes affect both platforms
- Engineering capacity: 2 engineers available, 6-week runway before feature freeze
- Cannot remove guest checkout option (legal requirement in EU markets)
- Must preserve existing promo code functionality for marketing campaigns

## Open Questions

- [ ] What percentage of abandoners return later on desktop to complete purchase?
- [ ] Are there specific points in the checkout flow where drop-off spikes?
- [ ] How do abandonment rates vary by product category or cart value?
- [ ] What do competitors' mobile checkout flows look like?
- [ ] Would users prefer saved payment methods vs. digital wallet integration?
- [ ] Is shipping cost surprise a larger factor than form friction?
````

---

<a id="source-skills-foundation-build-risk-review-skill-md"></a>

## 原始文件：skills/foundation-build-risk-review/SKILL.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/foundation-build-risk-review/SKILL.md) · SHA-256: `c8ac85095fdc23b1c3f7341e14a785d33db4cf02922b3afda3fb71149eb4baa0`

本文件引用：[references/risk-taxonomy.md](#source-skills-foundation-build-risk-review-references-risk-taxonomy-md)；[references/routing-map.md](#source-skills-foundation-build-risk-review-references-routing-map-md)；[references/TEMPLATE.md](#source-skills-foundation-build-risk-review-references-template-md)；[references/EXAMPLE.md](#source-skills-foundation-build-risk-review-references-example-md)。

````markdown
---
name: foundation-build-risk-review
description: Runs a fast pre-build risk review on a product idea, feature request, or scope change, naming the single assumption most likely to make it fail and returning a clear verdict (build small, validate first, pivot first, or don't build yet) with a no-code validation step. Use before committing build effort, when triaging whether to honor a feature request, or when deciding whether to expand scope, ahead of writing a PRD. For a launched product's pivot-or-persevere decision, use iterate-pivot-decision instead.
license: Apache-2.0
metadata:
  classification: foundation
  version: "1.1.0"
  updated: 2026-08-16
  category: problem-framing
  frameworks: [triple-diamond, lean-startup]
  author: product-on-purpose
---
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
<!-- Adapted from bin1874/before-you-build-skill (Apache-2.0), repositioned PM-neutral. -->
# Build Risk Review

Don't build it yet. First name the one assumption most likely to make it fail.

`foundation-build-risk-review` is a fast, pre-commitment gate for product decisions. Given an idea, a feature request, or a scope change, it returns a **Build Risk Review**: the single biggest risk, the evidence behind it, a verdict, and a concrete no-code validation step, then routes you to the skill that does the next piece of work. It is a foundation hub: its job is to triage and dispatch, not to duplicate the deeper skills.

## Hard gate

Do not write code, scaffold a project, recommend a stack, or design implementation. First answer three things: should this be built, what is most likely to make it fail, and what must be validated before committing.

If the user says the work is for learning, a portfolio, or internal practice, do not judge it by market standards; still flag scope and clarity risks.

## When to Use

- A product idea, MVP, or new bet is about to turn into build work.
- A feature request or scope change has arrived and you need to separate real demand from a polite ask, founder anxiety, or competitor-copying.
- Someone wants a fast "should we build this?" verdict before a PRD, roadmap row, or ticket exists.

## When NOT to Use

| If the ask is | Use instead |
|---|---|
| A launched product's pivot-or-persevere call, weighing usage or market data | `iterate-pivot-decision` |
| You have chosen the assumption and need to design the test | `define-hypothesis` |
| Framing a confirmed problem for the team or leadership | `define-problem-statement` |
| The full nine-block business model, not a single-risk read | `foundation-lean-canvas` |
| Ranking many features or initiatives against each other | `define-prioritization-framework` |

The boundary that matters most: this skill is **forward-looking and pre-commitment** (low or no data); `iterate-pivot-decision` is **retrospective and post-launch** (it weighs market feedback on something already shipped).

## Modes (route first; state the mode at the top)

1. **Pre-build** - a new idea, product, or MVP not yet built. The usual primary risks: demand and distribution.
2. **Feature-change** - a feature request, scope expansion, requirement change, or competitor-copy on an in-progress product. The primary tool here is the demand hierarchy.

If the product is already launched and the question is whether to change direction, hand off to `iterate-pivot-decision`. If the request is too broad to review responsibly, ask exactly one clarifying question (complete the sentence: "this is for [who] in [situation] to solve [problem]"), then proceed. Never run a long questionnaire; at most two questions before a constrained review.

## The review (the contract)

Produce a Build Risk Review with these parts:

1. **Biggest risk (`R1`).** Exactly one primary risk, tagged from `references/risk-taxonomy.md`. Not a long inventory. Add at most three to five supporting risks (`R2`, `R3`, ...).
2. **Demand level (feature-change mode).** Place the request on the hierarchy: L0 founder anxiety or "competitors have it"; L1 one user asked; L2 repeated asks, no behavior proof; L3 workflow blocker; L4 revenue or retention blocker. Build-now is usually justified only at L3 or L4.
3. **Evidence ledger.** List the signal that exists and grade each entry on the strength ladder in `references/risk-taxonomy.md`. Likes, compliments, waitlists, and market-size numbers are NOT demand. Real files, booked calls, payment, repeated manual use, or switching from an existing alternative are.
4. **Verdict** (exactly one): **Build small** / **Validate first** / **Pivot first** / **Don't build yet**. Do not use "Kill".
5. **Validation step.** A specific, no-code or low-code next action (talk to the ten users who do X; manually deliver the result for three of them; collect a preorder, paid call, or deposit), never generic advice like "build an MVP" or "do user research".
6. **Routing.** Send the user to the skill that does the next piece of work (see below).

Be skeptical but useful. Always separate "can be built" from "should be built". Do not flatter the idea or default to encouragement; do not say "this has potential" unless the path is specific.

## Verdict routing

| Verdict | Routes to |
|---|---|
| Build small | `define-problem-statement`, then `deliver-prd` / `deliver-user-stories` |
| Validate first | `define-hypothesis`, then `measure-experiment-design` |
| Pivot first | `foundation-lean-canvas` (re-frame the model) |
| Don't build yet | stop; or `discover-competitive-analysis` / `discover-market-sizing` for an evidence check |
| Several competing requests | `define-prioritization-framework` |

Full map, including the per-risk routing: `references/routing-map.md`.

**If a routed skill is not available, do not ship a bare pointer.** The library is often installed
in part rather than whole, so the skill you route to may not exist in the user's environment. When
you cannot confirm it is available, say so plainly and inline the minimal version of its output so
the review stays executable:

| Routed skill absent | Inline instead |
|---|---|
| `define-hypothesis` | One testable hypothesis in believe / for / will / as-measured-by form |
| `measure-experiment-design` | A three-line experiment sketch: the one decision metric, the sample or duration needed, and the win/lose rule set before running |
| `define-problem-statement` | A two-sentence problem frame: who, in what situation, blocked by what |
| `foundation-lean-canvas` | The three riskiest boxes only: problem, customer segment, unfair advantage |
| `define-prioritization-framework` | A single ranked list with the one criterion that actually decides |
| `discover-competitive-analysis` | The two closest alternatives and the one axis on which you would lose to each today |
| `discover-market-sizing` | One bottom-up estimate: reachable accounts, times a realistic attach rate, times annual revenue per account, labelling each of the three as sourced or assumed. All three factors are required: accounts times attach rate is a customer count, not a market size |
| `deliver-prd` | The problem, the one success metric with its baseline, and what is explicitly out of scope |
| `deliver-user-stories` | The three stories that carry the risk, each with one acceptance criterion that could fail |

A verdict whose next step the user cannot execute is not a finished review. Naming the gap and
supplying the minimum is always better than routing into an environment that cannot follow.

## Output Format

A single Build Risk Review artifact, built from `references/TEMPLATE.md`. Section order: decision header (verdict + one-line rationale), the biggest risk (`R1`), supporting risks, demand level (feature mode), evidence ledger, validation plan, routing, Sources. A fully worked case is in `references/EXAMPLE.md`.

## Quality Checklist

- [ ] Exactly one primary risk is named (`R1`) and tagged from the taxonomy.
- [ ] Feature-change mode places the request on L0 through L4.
- [ ] Every evidence entry is graded; no like, waitlist, or market-size number is counted as demand.
- [ ] Exactly one of the four verdicts is returned.
- [ ] The next step is specific and low or no-code, not generic advice.
- [ ] A routing target is named.
- [ ] No code, stack recommendation, or implementation design is produced (the hard gate held).

## Attribution

Adapted from `bin1874/before-you-build-skill` (Apache-2.0), repositioned PM-neutral. The source skill's external case-memory API call and translate-to-user-language behavior are removed.
````

---

<a id="source-skills-foundation-build-risk-review-references-template-md"></a>

## 原始文件：skills/foundation-build-risk-review/references/TEMPLATE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/foundation-build-risk-review/references/TEMPLATE.md) · SHA-256: `69fc397a88735eb0baab61613ef5005e75304f6f9ee7f83bb4af9810a07028c0`

本文件引用：[references/risk-taxonomy.md](#source-skills-foundation-build-risk-review-references-risk-taxonomy-md)；[references/routing-map.md](#source-skills-foundation-build-risk-review-references-routing-map-md)。

````markdown
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Build Risk Review: <one-line subject>

> Authoring notes are in blockquotes; delete them in the final artifact. Fill every non-optional section. Keep it short: a Build Risk Review is a gate, not a report.

**Mode:** <Pre-build | Feature-change>  |  **Date:** <YYYY-MM-DD>

## Verdict

> Exactly one: Build small / Validate first / Pivot first / Don't build yet. Then one sentence of rationale. Do not use "Kill".

**<Verdict>.** <One-line rationale.>

## Biggest risk

> Exactly one primary risk, `R1`, tagged from references/risk-taxonomy.md. Then at most three to five supporting risks. Do not produce a long inventory.

- **R1 <risk-type>:** <the single assumption most likely to make this fail, stated concretely.>
- R2 <risk-type>: <supporting risk.>
- R3 <risk-type>: <supporting risk.>

## Demand level

> Feature-change mode only. Place the request on L0 through L4 and say why. For pre-build mode write "n/a: new idea".

**L<0-4> - <label>.** <Why this level: founder anxiety, one ask, repeated asks, a workflow blocker, or a revenue/retention blocker?>

## Evidence ledger

> What signal actually exists, each graded on the strength ladder (references/risk-taxonomy.md). Be honest: likes, waitlists, and market-size are not demand. Mark counter-signal too.

| Signal | Strength | What it does or does not prove |
|---|---|---|
| <signal> | <weak / medium / strong> | <reading> |

## Validation plan

> Specific, no-code or low-code next actions with a concrete bar. Never "build an MVP" or "do user research".

1. <action with a pass/fail bar.>
2. <action.>

## Routing

> The next skill to run, from references/routing-map.md.

-> <skill> (<why>).

## Sources

> Real, cited facts only. Mark every invented number `[fictional]`.

---

**Output contract:** one artifact; one `R1`; exactly one verdict; one demand level in feature-change mode; a graded evidence ledger; a no-code next step; a named routing target; no code or implementation design.
````

---

<a id="source-skills-foundation-build-risk-review-references-example-md"></a>

## 原始文件：skills/foundation-build-risk-review/references/EXAMPLE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/foundation-build-risk-review/references/EXAMPLE.md) · SHA-256: `f87abf7d2318229419504396e2cbf9652042448b350664c9a0c10354143cebe7`

本文件引用：[references/risk-taxonomy.md](#source-skills-foundation-build-risk-review-references-risk-taxonomy-md)。

````markdown
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Example: Build Risk Review (feature-change mode)

A worked case showing the full artifact. The scenario is a B2B ecommerce platform whose sales team is pushing to build single sign-on (SSO) after two enterprise prospects raised it. All merchant and deal specifics are `[fictional]`.

---

## Scenario

> The input the skill received.

"Two enterprise prospects asked about SSO in the last month, and Sales says we'll lose them without it. They want me to put SSO on next sprint. We're a 140-merchant B2B catalog platform; most of our paying accounts are mid-market. Should we build SSO now?"

## Prompt

"Run a build risk review on this SSO request before I commit a sprint."

---

# Build Risk Review: SSO for enterprise merchant accounts

**Mode:** Feature-change  |  **Date:** 2026-06-22

## Verdict

**Validate first.** SSO is a plausible enterprise requirement, but the current signal is two prospects raising it in calls, not a confirmed deal-blocker. Committing a sprint now would build on an L2 signal and pull capacity from the activation work that the data says actually moves retention.

## Biggest risk

- **R1 `feature-fit`:** the request is being read as an L4 deal-blocker when the evidence only supports L2 (repeated asks, no behavior proof). Neither prospect has put "no SSO = no deal" in writing, and no current paying merchant has churned over its absence. Building on that is the feature-treadmill trap: it feels urgent because Sales is loud, not because the data says it changes who pays.
- **R2 `distribution`:** even if built, SSO does not by itself reach more enterprise buyers; the constraint upstream is a thin enterprise pipeline `[fictional: 2 active prospects]`, which a feature does not fix.
- **R3 `trust`:** SSO is a trust-tier feature (identity, provisioning), so a thin first version that mishandles SCIM or de-provisioning would do more reputational harm than not having it, raising the real cost above the sprint estimate.

## Demand level

**L2 - repeated asks, no behavior proof.** Two prospects mentioned SSO in sales calls `[fictional]`. That is more than one ask (above L1) but neither has made it a contractual go/no-go, and zero of 140 paying merchants `[fictional]` have raised or churned over it. It is not yet an L3 workflow blocker (merchants complete the core catalog job today without SSO) or an L4 revenue blocker (no signed dependency).

## Evidence ledger

| Signal | Strength | What it does or does not prove |
|---|---|---|
| Two enterprise prospects raised SSO in calls `[fictional]` | medium | real interest from the target segment; not a commitment |
| Sales says "we'll lose them without it" | weak | a forecast, not a written requirement; Sales is incentivized to unblock deals with product |
| "Enterprise buyers expect SSO" (category articles) | weak | a category norm, not proof for these two deals |
| 0 of 140 paying merchants cite SSO `[fictional]` | counter-signal | no retention or activation pressure from the existing base |
| Activation A/B in flight shows onboarding checklist lifts week-2 retention `[fictional]` | strong (for the alternative) | the capacity SSO would consume has a measured return elsewhere |

## Validation plan

1. **Make the deal dependency real.** Ask both prospects to confirm in writing that SSO is a go/no-go requirement with a target date. Pass bar: at least one returns a signed contingency. If neither does, the L4 framing is false and this drops to Defer.
2. **Price the trust tier.** Time-box a half-day spike on the SCIM / de-provisioning surface to replace the sprint estimate with a real one; a trust-tier feature is rarely a one-sprint build.
3. **Hold the line on activation.** Do not pause the in-flight activation A/B; it has a measured retention return that the SSO request does not.

## Routing

-> `define-hypothesis` to frame "SSO unblocks >= $X enterprise ARR this quarter" as a testable claim with a metric and a date, then `define-prioritization-framework` to rank it against the activation work once the spike gives a real cost. If a signed contingency comes back, re-run this review; a confirmed L4 flips the verdict to Build small and routes to `define-problem-statement` -> `deliver-prd`.

## Sources

- All merchant counts, prospect details, and experiment results are `[fictional]` and illustrative.
- Demand-level and evidence-strength definitions: `references/risk-taxonomy.md`.

---

## Why not the other verdicts

> Included here for teaching; a real artifact does not need this section.

- **Build small** would be right at L3/L4 - if a prospect signs an SSO contingency, or a paying merchant churns over it. Today neither is true.
- **Don't build yet** would be too strong: the segment interest is real and SSO is a normal enterprise requirement, so the wedge is not wrong, only unproven.
- **Pivot first** does not apply: nothing here questions the product's direction, only the timing of one feature.
````

---

<a id="source-skills-foundation-build-risk-review-references-risk-taxonomy-md"></a>

## 原始文件：skills/foundation-build-risk-review/references/risk-taxonomy.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/foundation-build-risk-review/references/risk-taxonomy.md) · SHA-256: `b9ba9f6728a0b7ecefa7e6850549711aca448f6c31f99ae91fa9966cb4ff9553`

````markdown
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Risk taxonomy, demand hierarchy, and evidence ladder

The three structures the review runs on. They are the skill's value: a generic prompt does not impose them.

## Risk types

Each type names where a build is most likely to fail, in the library's vocabulary, plus where to route for a deeper look. Tag `R1` (and supporting risks) with one of these.

| Tag | The failure mode | What it looks like | Routes to |
|---|---|---|---|
| `demand` | nobody wants it enough to change behavior | no repeated pull; no urgency over the current workaround | `discover-market-sizing` / `define-hypothesis` |
| `distribution` | you cannot reach the first users | no named channel; "we'll launch and they'll come" | `foundation-lean-canvas` (Channels block) |
| `positioning` | the wedge is too broad, crowded, or generic | "for everyone"; indistinct from incumbents | `discover-competitive-analysis` |
| `monetization` | the buyer or payment model does not fit | subscription for a low-frequency utility; buyer is not the user | `foundation-lean-canvas` (Revenue block) |
| `retention` | users do it once and do not return | a one-time utility framed as ongoing | `measure-experiment-design` |
| `trust` | users will not connect data, accounts, or money | privacy, security, or migration friction | `define-problem-statement` |
| `feature-fit` | the change does not move usage, payment, or retention | scope creep, feature treadmill, competitor-copy, one user asked | `define-prioritization-framework` |

## Demand hierarchy (feature-change mode)

Place a feature request on the ladder. Build-now is usually justified only at L3 or L4; below that, validate or defer.

- **L0 - founder anxiety.** "Competitors have it" or "it feels incomplete." No user signal.
- **L1 - one ask.** A single user requested it; no proof it affects usage, payment, or retention.
- **L2 - repeated asks.** Several target users ask, but there is no behavior proof yet.
- **L3 - workflow blocker.** Users cannot complete the core job without it.
- **L4 - revenue or retention blocker.** Users refuse to pay, churn, or fail activation because it is missing.

## Evidence strength ladder

Grade every entry in the evidence ledger. Do not let weak signal carry a verdict.

- **Weak (not demand):** likes, compliments, waitlist signups, survey "would use", market-size numbers.
- **Medium:** repeated unsolicited requests, competitor traction in the exact wedge, a manual workaround users maintain.
- **Strong:** real files or data handed over, booked calls, a preorder or deposit, repeated manual use, switching away from an existing paid alternative.

The verdict should track the strongest honest signal, not the most dramatic-sounding risk.
````

---

<a id="source-skills-foundation-build-risk-review-references-routing-map-md"></a>

## 原始文件：skills/foundation-build-risk-review/references/routing-map.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/foundation-build-risk-review/references/routing-map.md) · SHA-256: `69d82b6bd6f5d57b1a3d6899b8dded1bf3a13323bb8d61692da706a01092f573`

本文件引用：[references/risk-taxonomy.md](#source-skills-foundation-build-risk-review-references-risk-taxonomy-md)。

````markdown
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Routing map

The Build Risk Review is a gate that dispatches into the rest of the library. Always name a routing target so the user knows the next move.

## By verdict

| Verdict | Means | Route to |
|---|---|---|
| **Build small** | worth a narrow first version | `define-problem-statement`, then `deliver-prd` / `deliver-user-stories` |
| **Validate first** | direction plausible; demand, payment, or distribution unproven | `define-hypothesis`, then `measure-experiment-design` |
| **Pivot first** | the area is plausible but the current wedge is too broad, crowded, or weak | `foundation-lean-canvas` (re-frame the model) |
| **Don't build yet** | too vague, no reachable user, or solved well enough already | stop; or `discover-competitive-analysis` / `discover-market-sizing` for an evidence check |

## By risk type

When a specific risk dominates and warrants a deeper look, route per the "Routes to" column in `references/risk-taxonomy.md` (e.g. a `monetization` risk routes to `foundation-lean-canvas` Revenue; a `demand` risk to `discover-market-sizing`).

## Several competing requests

If the input is not one build decision but a set of requests to rank, hand off to `define-prioritization-framework` (RICE / ICE / MoSCoW). This skill judges one decision's risk of failure; it does not rank a list.

## Boundaries (NOT this skill's job)

- A launched product's pivot-or-persevere call, weighing market feedback -> `iterate-pivot-decision`.
- Framing a confirmed problem for the team or leadership -> `define-problem-statement`.
- Designing the test for a chosen assumption -> `define-hypothesis`.
- The full nine-block business model -> `foundation-lean-canvas`.
````

---

<a id="source-skills-define-hypothesis-skill-md"></a>

## 原始文件：skills/define-hypothesis/SKILL.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-hypothesis/SKILL.md) · SHA-256: `532e6df9892ed3d5925c95b538ff4107d971893c0a7c2edace6f665870cec0af`

本文件引用：[references/TEMPLATE.md](#source-skills-define-hypothesis-references-template-md)；[references/EXAMPLE.md](#source-skills-define-hypothesis-references-example-md)。

````markdown
---
name: define-hypothesis
description: Defines a testable hypothesis with clear success metrics and a validation approach. Use when forming assumptions to test or aligning a team on what success looks like, before any experiment is designed. To design the A/B test or experiment that will validate the hypothesis, use measure-experiment-design.
license: Apache-2.0
metadata:
  phase: define
  version: "2.1.0"
  updated: 2026-06-10
  category: ideation
  frameworks: [triple-diamond, lean-startup, design-thinking]
  author: product-on-purpose
---
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Hypothesis

A hypothesis is a testable prediction about how a change will affect user behavior or business outcomes. It transforms assumptions into explicit statements that can be validated or invalidated through experimentation. Well-formed hypotheses prevent teams from building features based on untested beliefs and create shared understanding of what success looks like.

## When to Use

- After problem framing, before committing to a solution
- When designing experiments or A/B tests
- When team members have differing assumptions about user behavior
- Before investing significant engineering resources in a feature
- When pivoting direction and need to validate the new approach

## When NOT to Use

- You are ready to design the actual A/B test (variants, sample size, duration) -> use `measure-experiment-design`; this skill frames what to test, not how
- The problem itself is still unframed -> use `define-problem-statement` first
- You want to organize many assumptions and ideas into a discovery structure -> use `define-opportunity-tree`
- The team needs the full business-model picture, not one testable claim -> use `foundation-lean-canvas`

## Instructions

When asked to create a hypothesis, follow these steps:

1. **State the Belief**
   Articulate what you believe will happen. Use the structured format: "We believe that [action/change] for [target user] will [expected outcome]." Be specific about the intervention - vague hypotheses can't be tested.

2. **Identify the Target User**
   Define who this hypothesis applies to. A hypothesis about "users" is too broad. Specify the segment: new users in their first week, power users with 10+ sessions, churned users returning, etc.

3. **Define the Expected Outcome**
   What behavior change or result do you expect? Frame it in terms of user actions (complete onboarding, make a purchase, return within 7 days) rather than internal metrics when possible.

4. **Set Success Metrics**
   Choose a primary metric that directly measures the expected outcome. Include secondary metrics that provide context and guardrail metrics that ensure you're not causing harm elsewhere.

5. **Describe Validation Approach**
   How will you test this hypothesis? A/B test, user interviews, prototype testing, cohort analysis? Be specific about sample size, duration, and statistical requirements.

6. **Document Risks and Assumptions**
   What could invalidate this hypothesis beyond the test results? What are you assuming to be true that you haven't validated?

## Output Format

Use the template in `references/TEMPLATE.md` to structure the output. A complete hypothesis document fills every template section: Hypothesis Statement; Background & Rationale; Target User Segment; Success Metrics; Validation Approach; Risks & Assumptions; and Timeline.

## Quality Checklist

Before finalizing, verify:

- [ ] Hypothesis is falsifiable (possible to prove wrong)
- [ ] Success metric has a specific numeric target
- [ ] Target user segment is clearly defined
- [ ] Validation approach is practical and time-bound
- [ ] Pass/fail criteria are unambiguous
- [ ] Hypothesis doesn't assume the solution works

## Examples

See `references/EXAMPLE.md` for a completed example.
````

---

<a id="source-skills-define-hypothesis-references-template-md"></a>

## 原始文件：skills/define-hypothesis/references/TEMPLATE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-hypothesis/references/TEMPLATE.md) · SHA-256: `312cfa2a03067f3e5c64930189041bd15273a95ed1216037e2bb4d5a0a68da8c`

````markdown
---
artifact: hypothesis
version: "1.0"
created: <YYYY-MM-DD>
status: draft
---

# Hypothesis: [Brief Title]

## Hypothesis Statement

**We believe that** [specific action or change]

**for** [target user segment]

**will** [expected outcome/behavior change]

**as measured by** [primary success metric]

## Background & Rationale

### Problem Context
<!-- What problem is this hypothesis attempting to solve? Link to problem statement if available. -->

[Problem context]

### Supporting Evidence
<!-- What data, research, or observations led to this hypothesis? -->

[Evidence that supports this belief]

### Alternative Hypotheses Considered
<!-- What other explanations or approaches did you consider? -->

[Alternative approaches]

## Target User Segment

### Definition
<!-- Specific criteria that define this user segment -->

[User segment definition]

### Segment Size
<!-- How many users fall into this segment? -->

[Estimated count or percentage]

### Current Behavior
<!-- How do these users currently behave? What's the baseline? -->

[Current state]

## Success Metrics

### Primary Metric
<!-- The main metric that determines if the hypothesis is validated -->

| Metric | Current Baseline | Target | Minimum Detectable Effect |
|--------|-----------------|--------|--------------------------|
| [Metric name] | [Current value] | [Target value] | [MDE %] |

### Secondary Metrics
<!-- Additional metrics that provide context -->

| Metric | Current Baseline | Expected Direction |
|--------|-----------------|-------------------|
| [Metric 1] | [Value] | [Increase/Decrease/No change] |
| [Metric 2] | [Value] | [Increase/Decrease/No change] |

### Guardrail Metrics
<!-- Metrics that should NOT be negatively impacted -->

| Metric | Current Value | Acceptable Range |
|--------|--------------|------------------|
| [Metric 1] | [Value] | [Range] |

## Validation Approach

### Method
<!-- How will you test this hypothesis? A/B test, prototype, interviews, etc. -->

[Validation method]

### Sample Size & Duration
<!-- Statistical requirements for the test -->

- Sample size: [Number per variant]
- Duration: [Time period]
- Traffic allocation: [Percentage]

### Pass/Fail Criteria
<!-- What results will validate or invalidate the hypothesis? -->

- **Validated if:** [Specific criteria]
- **Invalidated if:** [Specific criteria]
- **Inconclusive if:** [Specific criteria]

## Risks & Assumptions

### Key Assumptions
<!-- What are you assuming to be true? -->

- [Assumption 1]
- [Assumption 2]

### Risks
<!-- What could go wrong? What might invalidate results? -->

- [Risk 1]
- [Risk 2]

## Timeline

| Phase | Dates | Duration |
|-------|-------|----------|
| Setup & instrumentation | [Dates] | [Duration] |
| Test running | [Dates] | [Duration] |
| Analysis | [Dates] | [Duration] |
| Decision | [Date] | - |
````

---

<a id="source-skills-define-hypothesis-references-example-md"></a>

## 原始文件：skills/define-hypothesis/references/EXAMPLE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/define-hypothesis/references/EXAMPLE.md) · SHA-256: `35107b788c8ba8d83bf089a503ada318210a208724f37c8e03eb6982a594de9c`

````markdown
---
artifact: hypothesis
version: "1.0"
created: 2026-01-14
status: complete
context: SaaS product with low onboarding completion rates testing simplified flow
---

# Hypothesis: Simplified Onboarding Flow

## Hypothesis Statement

**We believe that** reducing the onboarding flow from 7 steps to 3 essential steps

**for** new users signing up for a free trial

**will** increase onboarding completion rate

**as measured by** percentage of users who complete all onboarding steps within their first session

## Background & Rationale

### Problem Context

Our SaaS product has a 34% onboarding completion rate - meaning 66% of new signups never finish setup and experience the core value proposition. User research indicates the current 7-step onboarding feels overwhelming, with significant drop-off occurring at steps 4 and 5 (team invitation and integration setup). Users who don't complete onboarding are 4x more likely to churn within 14 days.

### Supporting Evidence

- Session recordings show users hesitating and abandoning at the team invitation step
- Support tickets frequently ask "Can I skip some of these steps?"
- Competitor analysis shows market leaders use 3-4 step onboarding flows
- Exit survey data: 42% of churned users cite "too complicated to get started"
- Hotjar heatmaps show users scrolling to find a "skip" button that doesn't exist

### Alternative Hypotheses Considered

- **Progress indicators:** Adding a progress bar might reduce anxiety without changing steps - rejected because underlying issue is step count, not visibility
- **Tooltips/guidance:** More help content might reduce confusion - rejected because it adds more cognitive load
- **Optional steps:** Making steps skippable might work - considered as fallback if simplification fails

## Target User Segment

### Definition

New users who:
- Sign up for a free trial (not paid conversion from trial)
- Are the first user from their organization (not invited team members)
- Access the product via web (not mobile app)

### Segment Size

- 12,400 new trial signups per month meeting these criteria
- 8,200 (66%) currently fail to complete onboarding

### Current Behavior

- Average time to complete current onboarding: 18 minutes
- Step 1-3 completion: 78%
- Step 4 (team invitation) completion: 52%
- Step 5 (integration) completion: 41%
- Full completion (all 7 steps): 34%
- Users who complete onboarding activate core feature within 24h: 89%

## Success Metrics

### Primary Metric

| Metric | Current Baseline | Target | Minimum Detectable Effect |
|--------|-----------------|--------|--------------------------|
| Onboarding completion rate | 34% | 50% | 10% relative lift |

### Secondary Metrics

| Metric | Current Baseline | Expected Direction |
|--------|-----------------|-------------------|
| Time to complete onboarding | 18 min | Decrease to <8 min |
| Day-1 core feature activation | 30% | Increase |
| Support tickets (first 24h) | 8.2% of users | Decrease |
| User satisfaction (post-onboarding) | 3.2/5 | Increase |

### Guardrail Metrics

| Metric | Current Value | Acceptable Range |
|--------|--------------|------------------|
| 14-day trial-to-paid conversion | 12% | No decrease >5% relative |
| Team invitation rate (within 7 days) | 23% | No decrease >10% relative |
| Integration connection rate (within 7 days) | 31% | No decrease >10% relative |

## Validation Approach

### Method

A/B test with 50/50 traffic split between:
- **Control:** Current 7-step onboarding flow
- **Treatment:** New 3-step onboarding (account basics, workspace setup, first task creation)

Deferred steps (team invitation, integrations) will be prompted via in-app messaging after initial activation.

### Sample Size & Duration

- Sample size: 3,000 users per variant (6,000 total)
- Duration: 14 days of enrollment + 7 days observation window
- Traffic allocation: 50% control / 50% treatment
- Statistical significance: 95% confidence level
- Statistical power: 80%

### Pass/Fail Criteria

- **Validated if:** Onboarding completion increases by ≥10% relative (34% → 37.4%+) with 95% confidence AND guardrail metrics stay within acceptable range
- **Invalidated if:** Onboarding completion shows no significant change or decreases, OR guardrail metrics breach acceptable range
- **Inconclusive if:** Results don't reach statistical significance within test window - extend test or increase sample

## Risks & Assumptions

### Key Assumptions

- Users who complete a shorter onboarding will still discover team/integration features later
- The 3 essential steps are sufficient to demonstrate core product value
- In-app prompts can effectively drive deferred actions
- Onboarding completion is a leading indicator of retention (not just correlated)

### Risks

- **Feature discovery risk:** Users might never set up teams/integrations if not prompted during onboarding
- **Segment spillover:** Results might not generalize to invited users or mobile signups
- **Novelty effect:** Initial lift might fade as users become accustomed to flow
- **Selection bias:** Users who would have completed 7-step flow might be different from marginal completers

## Timeline

| Phase | Dates | Duration |
|-------|-------|----------|
| Setup & instrumentation | Jan 15-17, 2026 | 3 days |
| Test running | Jan 18-31, 2026 | 14 days |
| Observation window | Feb 1-7, 2026 | 7 days |
| Analysis | Feb 8-10, 2026 | 3 days |
| Decision | Feb 11, 2026 | - |
````

---

<a id="source-skills-measure-experiment-design-skill-md"></a>

## 原始文件：skills/measure-experiment-design/SKILL.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/measure-experiment-design/SKILL.md) · SHA-256: `f6f2f4d84cda845773443e44b30af3c63ac146f1216329b6d78e303782c78122`

本文件引用：[references/TEMPLATE.md](#source-skills-measure-experiment-design-references-template-md)；[references/EXAMPLE.md](#source-skills-measure-experiment-design-references-example-md)。

````markdown
---
name: measure-experiment-design
description: Designs an A/B test or experiment with variants, success metrics, sample size, and duration for an existing hypothesis. Use when planning an experiment to validate a product change or test an assumption you have already framed. To articulate the hypothesis itself first, use define-hypothesis.
license: Apache-2.0
metadata:
  phase: measure
  version: "2.1.0"
  updated: 2026-06-10
  category: validation
  frameworks: [triple-diamond, lean-startup, design-thinking]
  author: product-on-purpose
---
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Experiment Design

An experiment design document defines all parameters needed to run a rigorous A/B test or controlled experiment. It ensures the team aligns on what you're testing, how you'll measure success, and how long to run the test before drawing conclusions. Good experiment design prevents common pitfalls: underpowered tests, unclear success criteria, and decisions based on noise rather than signal.

## When to Use

- Before launching an A/B test to validate a product change
- When testing a hypothesis that requires quantitative validation
- After solution design to validate assumptions before full rollout
- When stakeholders want data-driven evidence for a decision
- To establish a culture of experimentation and learning

## When NOT to Use

- The hypothesis itself is not yet articulated -> use `define-hypothesis` first; this skill designs the test for a claim you already have
- You are analyzing a completed experiment -> use `measure-experiment-results`
- You need the event tracking that will measure the experiment -> use `measure-instrumentation-spec`
- You are gathering opinions rather than running a controlled test -> use `measure-survey-analysis`

## Instructions

When asked to design an experiment, follow these steps:

1. **Articulate the Hypothesis**
   Write a clear, testable hypothesis in the format: "We believe [change] for [users] will [outcome] as measured by [metric]." One hypothesis per experiment - if you're testing multiple things, run multiple experiments.

2. **Define the Variants**
   Describe the control (current experience) and treatment (new experience) in sufficient detail. Include screenshots, mockups, or precise descriptions so anyone can understand what users will see.

3. **Choose Primary and Secondary Metrics**
   Select one primary metric that will determine success or failure. Add 2-3 secondary metrics to understand the broader impact. Include guardrail metrics to catch unintended negative effects.

4. **Calculate Sample Size**
   Determine how many users you need per variant to detect your minimum detectable effect (MDE) with statistical significance. Specify your significance level (typically 0.05) and power (typically 0.80).

5. **Estimate Duration**
   Based on sample size and available traffic, calculate how long the experiment needs to run. Account for weekly patterns - avoid ending mid-week if behavior varies by day.

6. **Define Targeting and Allocation**
   Specify which users are eligible for the experiment and how traffic is split between variants. Document any exclusions (e.g., employees, specific segments).

7. **Set Success Criteria**
   Define upfront what constitutes a win, a loss, or an inconclusive result. This prevents post-hoc rationalization and moving goalposts.

8. **Document Risks and Mitigations**
   Identify what could go wrong and how you'll detect/address it. Include monitoring plans and rollback criteria.

## Output Format

Use the template in `references/TEMPLATE.md` to structure the output. A complete design fills every template section: Overview; Hypothesis; Background; Variants; Metrics; Sample Size & Duration; Audience Targeting; Success Criteria; Risks & Mitigations; Implementation Notes; and References.

## Quality Checklist

Before finalizing, verify:

- [ ] Hypothesis is falsifiable and specific
- [ ] Only one primary metric is defined
- [ ] Sample size calculation is documented with assumptions
- [ ] Duration accounts for traffic patterns and statistical requirements
- [ ] Success criteria are defined before the experiment starts
- [ ] Guardrail metrics protect against unintended harm

## Examples

See `references/EXAMPLE.md` for a completed example.
````

---

<a id="source-skills-measure-experiment-design-references-template-md"></a>

## 原始文件：skills/measure-experiment-design/references/TEMPLATE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/measure-experiment-design/references/TEMPLATE.md) · SHA-256: `8daaf3735f3a9485f25e2d377d4354257aaae5f80558eaba9d9088707afc88f4`

````markdown
---
artifact: experiment-design
version: "1.0"
created: <YYYY-MM-DD>
status: draft
---

# Experiment Design: [Experiment Name]

## Overview

| Field | Value |
|-------|-------|
| **Experiment Name** | [Short descriptive name] |
| **Owner** | [Name, role] |
| **Start Date** | [Planned start date] |
| **End Date** | [Planned end date] |
| **Status** | Draft / Ready / Running / Completed |

## Hypothesis

<!-- Format: We believe [change] for [users] will [outcome] as measured by [metric] -->

**We believe** [proposed change]

**for** [target user segment]

**will** [expected outcome]

**as measured by** [primary metric]

## Background

<!-- Why are we running this experiment? What's the context? -->

[Context explaining why this experiment matters and what led to the hypothesis]

## Variants

### Control (A)

**Description:** [What users currently experience]

**Details:**
- [Specific element 1]
- [Specific element 2]

**Screenshot/Mockup:** [Link or embed]

### Treatment (B)

**Description:** [What users will experience in the new variant]

**Details:**
- [Specific change 1]
- [Specific change 2]

**Screenshot/Mockup:** [Link or embed]

## Metrics

### Primary Metric

| Metric | Definition | Current Baseline | Minimum Detectable Effect |
|--------|------------|------------------|---------------------------|
| [Metric name] | [How it's calculated] | [Current value] | [Smallest change we want to detect] |

### Secondary Metrics

| Metric | Definition | Purpose |
|--------|------------|---------|
| [Metric 1] | [Definition] | [Why we're tracking this] |
| [Metric 2] | [Definition] | [Why we're tracking this] |

### Guardrail Metrics

<!-- Metrics that should NOT decrease -->

| Metric | Definition | Threshold |
|--------|------------|-----------|
| [Metric 1] | [Definition] | [Must not decrease by more than X%] |
| [Metric 2] | [Definition] | [Must not decrease by more than X%] |

## Sample Size & Duration

### Sample Size Calculation

| Parameter | Value |
|-----------|-------|
| **Baseline conversion rate** | [X%] |
| **Minimum detectable effect (MDE)** | [X% relative / X pp absolute] |
| **Statistical significance (alpha)** | [0.05 typical] |
| **Statistical power (1-beta)** | [0.80 typical] |
| **Users per variant** | [Calculated number] |
| **Total users needed** | [Sum across variants] |

### Duration Estimate

| Parameter | Value |
|-----------|-------|
| **Daily eligible traffic** | [X users/day] |
| **Traffic allocation** | [X% to experiment] |
| **Users per day in experiment** | [Calculated] |
| **Minimum duration** | [X days to reach sample size] |
| **Recommended duration** | [X days, accounting for weekly patterns] |

## Audience Targeting

### Inclusion Criteria

- [Criterion 1: e.g., "All logged-in users"]
- [Criterion 2: e.g., "Users in US and Canada"]
- [Criterion 3: e.g., "Users on mobile web"]

### Exclusion Criteria

- [Exclusion 1: e.g., "Employees and internal testers"]
- [Exclusion 2: e.g., "Users in active experiments that may conflict"]

### Traffic Allocation

| Variant | Allocation |
|---------|------------|
| Control (A) | [X%] |
| Treatment (B) | [X%] |

## Success Criteria

<!-- Define BEFORE the experiment starts what each outcome means -->

### Win (Ship Treatment)

[Conditions that constitute a clear win for the treatment, e.g., "Primary metric improves by >= MDE with p < 0.05, and no guardrail metrics regress beyond threshold"]

### Loss (Keep Control)

[Conditions that indicate treatment is worse, e.g., "Primary metric decreases with p < 0.05, OR any guardrail metric regresses beyond threshold"]

### Inconclusive (More Data Needed)

[Conditions that require further investigation, e.g., "Primary metric change is not statistically significant after full duration"]

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How we'll address it] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How we'll address it] |

### Monitoring Plan

- [What we'll monitor during the experiment]
- [Alert thresholds that would trigger early review]
- [Rollback criteria]

## Implementation Notes

<!-- Technical details for engineering -->

- [Feature flag name/ID]
- [Instrumentation requirements]
- [Any technical considerations]

## References

- [Link to related hypothesis document]
- [Link to design mockups]
- [Link to previous related experiments]
````

---

<a id="source-skills-measure-experiment-design-references-example-md"></a>

## 原始文件：skills/measure-experiment-design/references/EXAMPLE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/measure-experiment-design/references/EXAMPLE.md) · SHA-256: `3fa260e770553211a51aa74dc0c0489781467cfe85fca9a255552f9623659433`

````markdown
---
artifact: experiment-design
version: "1.0"
created: 2026-01-14
status: complete
context: E-commerce checkout optimization A/B test
---

# Experiment Design: One-Page Checkout

## Overview

| Field | Value |
|-------|-------|
| **Experiment Name** | checkout-single-page-v1 |
| **Owner** | Maria Santos, Product Manager |
| **Start Date** | January 20, 2026 |
| **End Date** | February 3, 2026 |
| **Status** | Ready |

## Hypothesis

**We believe** replacing our 3-step checkout with a single-page checkout

**for** mobile web users

**will** increase checkout completion rate

**as measured by** checkout conversion rate (orders / checkout starts)

## Background

Mobile checkout abandonment is at 73%, compared to 45% on desktop. User research identified friction points: confusion navigating between steps, anxiety about hidden costs appearing late in the flow, and form field frustration on small screens. A single-page checkout addresses these by showing all information upfront and reducing navigation.

Competitor analysis shows that Amazon, Shopify stores, and Apple use single-page or minimal-step checkouts. Our hypothesis is that reducing cognitive load and providing visibility into the full process will improve conversion.

## Variants

### Control (A)

**Description:** Current 3-step checkout flow

**Details:**
- Step 1: Shipping address entry
- Step 2: Shipping method selection + payment information
- Step 3: Order review and confirmation
- Each step loads a new page
- Progress indicator shows current step

**Screenshot/Mockup:** [designs/checkout-control-v3.png]

### Treatment (B)

**Description:** Single-page checkout with accordion sections

**Details:**
- All sections visible on one page (shipping, payment, review)
- Accordion UI: one section expanded at a time, others collapsed but visible
- Express payment buttons (Apple Pay, Google Pay) at top
- Shipping cost shown immediately based on cart
- Edit any section without losing data

**Screenshot/Mockup:** [designs/checkout-treatment-v2.png]

## Metrics

### Primary Metric

| Metric | Definition | Current Baseline | Minimum Detectable Effect |
|--------|------------|------------------|---------------------------|
| Checkout conversion rate | Orders completed / Checkout sessions started | 27% | 5% relative (1.35 pp absolute) |

### Secondary Metrics

| Metric | Definition | Purpose |
|--------|------------|---------|
| Checkout completion time | Median seconds from checkout start to order | Confirm UX improvement |
| Express payment usage | % of orders via Apple Pay / Google Pay | Track new feature adoption |
| Cart abandonment rate | Carts abandoned before checkout start | Ensure we're not shifting drop-off |

### Guardrail Metrics

| Metric | Definition | Threshold |
|--------|------------|-----------|
| Average order value | Total revenue / Orders | Must not decrease by more than 2% |
| Payment failure rate | Failed payments / Payment attempts | Must not increase by more than 1pp |
| Support tickets (checkout) | CS tickets tagged "checkout" | Must not increase by more than 20% |

## Sample Size & Duration

### Sample Size Calculation

| Parameter | Value |
|-----------|-------|
| **Baseline conversion rate** | 27% |
| **Minimum detectable effect (MDE)** | 5% relative (28.35% target) |
| **Statistical significance (alpha)** | 0.05 (one-tailed) |
| **Statistical power (1-beta)** | 0.80 |
| **Users per variant** | 9,800 |
| **Total users needed** | 19,600 |

Calculation performed using Evan Miller's sample size calculator, assuming one-tailed test (we only ship if treatment is better).

### Duration Estimate

| Parameter | Value |
|-----------|-------|
| **Daily eligible traffic** | 18,000 mobile checkout sessions/day |
| **Traffic allocation** | 80% to experiment (20% holdout for safety) |
| **Users per day in experiment** | 14,400 |
| **Minimum duration** | 2 days to reach sample size |
| **Recommended duration** | 14 days to capture weekly patterns and ensure stability |

We're running for 14 days despite reaching sample size in 2 days to:
- Capture full weekly shopping patterns (weekday vs. weekend)
- Allow time to detect delayed effects on returns/chargebacks
- Ensure novelty effect wears off

## Audience Targeting

### Inclusion Criteria

- Logged-in or guest users
- Mobile web (not native apps - app experiment runs separately)
- Users in US and Canada (payment methods configured)
- Cart value >= $10 (exclude micro-purchases)

### Exclusion Criteria

- Employees (identified by email domain)
- Users enrolled in conflicting experiments (cart-upsell-test, payment-method-test)
- Users who have participated in checkout experiments in past 30 days

### Traffic Allocation

| Variant | Allocation |
|---------|------------|
| Control (A) | 50% |
| Treatment (B) | 50% |

## Success Criteria

### Win (Ship Treatment)

Primary metric (checkout conversion) improves by >= 5% relative with p < 0.05, AND:
- Average order value does not decrease by more than 2%
- Payment failure rate does not increase by more than 1pp
- No critical bugs or UX issues identified

**Action:** Roll out to 100% of mobile web, begin desktop adaptation.

### Loss (Keep Control)

Any of:
- Checkout conversion decreases with p < 0.05
- Any guardrail metric breaches threshold
- Critical UX issues discovered affecting > 1% of users

**Action:** Revert to control, analyze learnings, iterate on design.

### Inconclusive (More Data Needed)

Primary metric change is between -5% and +5% relative and not statistically significant after 14 days.

**Action:** Extend experiment to 21 days if traffic allows. If still inconclusive, treat as neutral and decide based on qualitative factors (user feedback, operational simplicity).

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Apple Pay integration issues | Medium | High | Test extensively in staging; 5% initial ramp with monitoring |
| Page load performance degradation | Low | Medium | Performance budget enforced; lazy-load payment forms |
| Users confused by accordion UX | Low | Medium | Added progress indicators and clear "Continue" buttons |
| Increased payment failures | Low | High | Same payment provider; monitor failure rate hourly |

### Monitoring Plan

- **Real-time dashboard:** Checkout funnel by variant, updated every 5 minutes
- **Alert thresholds:**
  - Payment failure rate > 5% in any 1-hour window
  - Checkout conversion drops > 20% relative to control
  - Error rate > 1% on any checkout action
- **Rollback criteria:** Any alert sustained for 30 minutes triggers automatic rollback
- **Daily check-ins:** Team reviews metrics at 10am daily for first 5 days

## Implementation Notes

- Feature flag: `checkout_single_page_v1` in LaunchDarkly
- Instrumentation: New events `checkout_section_opened`, `checkout_section_completed` for funnel analysis
- Cache invalidation: Clear checkout page cache at experiment start
- Mobile detection: User-Agent parsing; tablet = desktop experience

## References

- Hypothesis Document: Mobile Checkout Improvement (internal doc link)
- Design Mockups (Figma link)
- Previous Experiment: Guest Checkout (results/guest-checkout-q3-2025.md) - 3% lift, informed this design
- User Research: Checkout Friction Study (research PDF)
````

---

<a id="source-skills-develop-design-rationale-skill-md"></a>

## 原始文件：skills/develop-design-rationale/SKILL.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/develop-design-rationale/SKILL.md) · SHA-256: `853395279e4da6fc4fbbb305544be7b28f65cfb7c24f1b6d558ec07610e99f88`

本文件引用：[references/TEMPLATE.md](#source-skills-develop-design-rationale-references-template-md)；[references/EXAMPLE.md](#source-skills-develop-design-rationale-references-example-md)。

````markdown
---
name: develop-design-rationale
description: Documents the reasoning behind design decisions including alternatives considered, trade-offs evaluated, and principles applied. Use when making significant UX decisions, aligning with stakeholders on design direction, or preserving design context for future reference.
license: Apache-2.0
metadata:
  phase: develop
  version: "2.1.0"
  updated: 2026-06-10
  category: specification
  frameworks: [triple-diamond, lean-startup, design-thinking]
  author: product-on-purpose
---
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Design Rationale

A design rationale document captures the "why" behind design decisions.the context, constraints, alternatives considered, and reasoning that led to a particular solution. While designs themselves show what was built, rationale documents preserve institutional knowledge about why it was built that way.

## When to Use

- When making significant UX decisions that affect user experience
- Before design reviews to prepare stakeholder discussions
- When multiple valid approaches exist and the choice needs justification
- To onboard new team members to existing design decisions
- When revisiting past decisions to understand original reasoning
- During design system evolution to document pattern choices

## When NOT to Use

- The decision is architectural or a technology selection -> use `develop-adr` (Nygard format)
- You need stakeholder alignment on the overall solution direction -> use `develop-solution-brief`
- You are documenting exploration findings rather than a decision -> use `develop-spike-summary`
- The decision is trivially reversible and low-stakes: a rationale document adds ceremony; record the reasoning in the PR or ticket instead

## Instructions

When asked to document design rationale, follow these steps:

1. **State the Decision**
   Begin with a clear, one-sentence summary of what design decision was made. This becomes the title and reference point for the document.

2. **Describe the Context**
   Explain the situation that prompted this decision. What problem were you solving? What constraints existed? What user needs informed the direction? Include relevant research findings.

3. **List Options Considered**
   Document at least 2-3 alternatives that were evaluated. For each option, describe what it would look like and its key characteristics. Be fair to all options.avoid strawmen.

4. **Define Evaluation Criteria**
   Specify how options were assessed: usability heuristics, technical feasibility, brand alignment, user research findings, business requirements, or design principles.

5. **Explain the Reasoning**
   Walk through why the chosen option best meets the criteria. Be explicit about trade-offs.what you gained and what you sacrificed. Acknowledge where the decision is reversible vs. irreversible.

6. **Document Trade-offs Accepted**
   Every design decision involves trade-offs. Name what you gave up and why it was acceptable. This honesty helps future teams understand constraints.

7. **Note Follow-up Considerations**
   Capture anything that needs attention later: metrics to watch, conditions that might warrant revisiting the decision, or related decisions to make.

## Output Format

Use the template in `references/TEMPLATE.md` to structure the output. A complete rationale fills every template section: Decision Summary; Context; Options Considered; Evaluation; Decision Rationale; Trade-offs Accepted; Reversibility; Follow-up Considerations; Supporting Materials; and Decision History.

## Quality Checklist

Before finalizing, verify:

- [ ] Decision is clearly stated in one sentence
- [ ] Context explains the "why now" and constraints
- [ ] Multiple alternatives are documented fairly
- [ ] Evaluation criteria are explicit
- [ ] Reasoning addresses why chosen option beats alternatives
- [ ] Trade-offs are honestly acknowledged
- [ ] A reader who inherits this design can reconstruct why the chosen option won without asking anyone

## Examples

See `references/EXAMPLE.md` for a completed example.
````

---

<a id="source-skills-develop-design-rationale-references-template-md"></a>

## 原始文件：skills/develop-design-rationale/references/TEMPLATE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/develop-design-rationale/references/TEMPLATE.md) · SHA-256: `1ead2bd6ea1604f0cd80e8d1a63faa6e5738246d2264c2dcfd5e20bffdcfb6c6`

````markdown
---
artifact: design-rationale
version: "1.0"
created: YYYY-MM-DD
status: draft
---

# Design Rationale: [Decision Title]

## Decision Summary

**Decision:** [One-sentence statement of what was decided]
**Date:** [When decision was made]
**Decision Makers:** [Who was involved]
**Status:** [Proposed | Accepted | Implemented | Deprecated | Superseded by DR-XXX]

---

## Context

### Problem Statement

[What problem or opportunity prompted this decision?]

### User Need

[What user need does this address? Include relevant research.]

### Constraints

| Constraint Type | Description |
|-----------------|-------------|
| Technical | [Technical limitations or requirements] |
| Business | [Business rules or requirements] |
| Timeline | [Time constraints] |
| Resources | [Resource limitations] |
| Brand/Platform | [Brand guidelines or platform conventions] |

### Design Principles Applied

<!-- Which design principles guided this decision -->

- [Principle 1]: [How it applies]
- [Principle 2]: [How it applies]

---

## Options Considered

### Option A: [Name]

**Description:** [What this option looks like]

**Visual/Wireframe:** [Link or embedded image if available]

**Pros:**
- [Advantage 1]
- [Advantage 2]
- [Advantage 3]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

---

### Option B: [Name]

**Description:** [What this option looks like]

**Visual/Wireframe:** [Link or embedded image if available]

**Pros:**
- [Advantage 1]
- [Advantage 2]
- [Advantage 3]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

---

### Option C: [Name] (Selected)

**Description:** [What this option looks like]

**Visual/Wireframe:** [Link or embedded image if available]

**Pros:**
- [Advantage 1]
- [Advantage 2]
- [Advantage 3]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

---

## Evaluation

### Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| [Criterion 1] | High/Med/Low | [What this measures] |
| [Criterion 2] | High/Med/Low | [What this measures] |
| [Criterion 3] | High/Med/Low | [What this measures] |
| [Criterion 4] | High/Med/Low | [What this measures] |

### Comparison Matrix

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| [Criterion 1] | [Score/Rating] | [Score/Rating] | [Score/Rating] |
| [Criterion 2] | [Score/Rating] | [Score/Rating] | [Score/Rating] |
| [Criterion 3] | [Score/Rating] | [Score/Rating] | [Score/Rating] |
| [Criterion 4] | [Score/Rating] | [Score/Rating] | [Score/Rating] |

### User Research Input

<!-- Relevant findings from user research -->

- [Finding 1]
- [Finding 2]

---

## Decision Rationale

### Why Option C?

[Detailed explanation of why this option was chosen over alternatives]

### Key Differentiators

[What specifically made this option better than others]

### Dissenting Opinions

<!-- Capture any disagreement for the record -->

[Any team members who preferred other options and their reasoning]

---

## Trade-offs Accepted

### What We Gave Up

| Trade-off | Impact | Why Acceptable |
|-----------|--------|----------------|
| [Trade-off 1] | [What's affected] | [Why it's okay] |
| [Trade-off 2] | [What's affected] | [Why it's okay] |

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| [Risk 1] | High/Med/Low | [How we'll address] |
| [Risk 2] | High/Med/Low | [How we'll address] |

---

## Reversibility

**Is this decision reversible?** [Yes, easily | Yes, with effort | Partially | No]

**Cost to reverse:** [What would it take to change this later]

**Conditions that would warrant reverting:**
- [Condition 1]
- [Condition 2]

---

## Follow-up Considerations

### Metrics to Monitor

- [Metric 1]: [What it tells us]
- [Metric 2]: [What it tells us]

### Future Decisions Required

- [Related decision 1]
- [Related decision 2]

### Revisit Triggers

<!-- When should we reconsider this decision -->

- [Trigger 1]
- [Trigger 2]

---

## Supporting Materials

- [Link to design files]
- [Link to user research]
- [Link to prototype]
- [Link to related decisions]

---

## Decision History

| Date | Change | Author |
|------|--------|--------|
| [Date] | Initial decision | [Name] |
| [Date] | [Update] | [Name] |

---

*This rationale documents the reasoning at the time of decision. Context may change.*
````

---

<a id="source-skills-develop-design-rationale-references-example-md"></a>

## 原始文件：skills/develop-design-rationale/references/EXAMPLE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/develop-design-rationale/references/EXAMPLE.md) · SHA-256: `0af5960f24f6b3d65dcb3cf48f412ac9771e756c64a72652484030d4a4f2fd8a`

````markdown
---
artifact: design-rationale
version: "1.0"
created: 2026-01-14
status: complete
context: Mobile app navigation redesign for 50+ features
---

# Design Rationale: Primary Navigation Pattern for Mobile App

## Decision Summary

**Decision:** Use a bottom tab bar with 5 primary actions plus a "More" overflow menu for secondary features.
**Date:** January 2026
**Decision Makers:** Sarah (Design Lead), Marcus (PM), Chen (Engineering Lead)
**Status:** Implemented

---

## Context

### Problem Statement

Our mobile app has grown from 12 to 50+ features over three years. The current hamburger menu navigation has become a "junk drawer" where users struggle to find features. Task completion rates have dropped 15% in the past year, and support tickets about "where is X?" have increased 40%.

### User Need

Users need to quickly access core functionality without hunting through menus. Research shows our users typically need the same 5-7 features in 80% of sessions, but they can't remember where those features live in the current navigation.

### Constraints

| Constraint Type | Description |
|-----------------|-------------|
| Technical | Must work across iOS and Android without platform-specific implementations |
| Business | Cannot remove any features; deprecation requires 6-month notice to enterprise clients |
| Timeline | Must ship by end of Q1 to align with marketing campaign |
| Resources | 2 engineers, 1 designer available for implementation |
| Brand/Platform | Must follow both iOS HIG and Material Design enough to feel native on each |

### Design Principles Applied

- **Progressive disclosure:** Surface what's needed, hide what's not until relevant
- **Recognition over recall:** Users shouldn't have to remember where things are
- **Flexibility and efficiency:** Support both novice wayfinding and expert shortcuts

---

## Options Considered

### Option A: Enhanced Hamburger Menu with Categories

**Description:** Keep the hamburger menu but reorganize features into clear categories with icons. Add a "Favorites" section users can customize.

**Pros:**
- Minimal development effort.iterates on existing pattern
- Preserves screen real estate for content
- Familiar pattern for existing users
- Scales to unlimited features

**Cons:**
- Hidden navigation still requires recall ("where's Settings?")
- Extra tap to reach any feature
- User research shows low engagement with customization features
- Doesn't solve core discoverability problem

---

### Option B: Floating Action Button (FAB) with Radial Menu

**Description:** A prominent FAB in the bottom-right that expands to show 6 primary actions in a radial/fan pattern. Secondary features remain in a hamburger menu.

**Pros:**
- Highly discoverable.the FAB draws attention
- Quick access to primary actions (single tap to reveal)
- Visually distinctive and modern
- Works well for task-oriented apps

**Cons:**
- Radial menus have poor accessibility (hard to tap precisely)
- Only practical for 6-8 items; doesn't solve secondary navigation
- Covers content when expanded
- Not a standard pattern on iOS (feels Android-native)

---

### Option C: Bottom Tab Bar with More Menu (Selected)

**Description:** A persistent 5-item bottom tab bar showing the most-used features. The 5th tab is "More" which opens a organized list of all other features.

**Pros:**
- Most accessible pattern.large tap targets, always visible
- Industry standard across both iOS and Android
- Highly discoverable.users instantly see what app does
- Research shows 5 items is optimal for quick scanning
- "More" menu can be organized and searchable

**Cons:**
- Uses 50px of screen height permanently
- Only 4 primary features get direct access
- Requires difficult prioritization decisions
- "More" menu can still become cluttered

---

## Evaluation

### Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Discoverability | High | How easily can users find features? |
| Accessibility | High | Can users with motor or vision impairments use it? |
| Task efficiency | High | How quickly can users complete common tasks? |
| Scalability | Medium | Does it work as features grow? |
| Implementation effort | Medium | How much engineering work? |
| Platform consistency | Medium | Does it feel native on both iOS and Android? |

### Comparison Matrix

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Discoverability | Poor | Good | Excellent |
| Accessibility | Good | Poor | Excellent |
| Task efficiency | Poor | Good | Excellent |
| Scalability | Excellent | Poor | Good |
| Implementation effort | Low | Medium | Medium |
| Platform consistency | Good | Poor | Excellent |

### User Research Input

- Usability testing (n=8): 7/8 users found target feature faster with bottom nav than hamburger
- Analytics: Current top 5 features account for 78% of all feature usage
- Competitive analysis: 4/5 top-rated productivity apps use bottom tab navigation
- User quote: "I wish I didn't have to think about where things are. Just show me."

---

## Decision Rationale

### Why Option C?

The bottom tab bar provides the best balance of discoverability, accessibility, and task efficiency.our three highest-weighted criteria. While it sacrifices some screen real estate and limits direct access to 4 features, user research strongly validates that our users primarily need quick access to a small set of features.

The hamburger menu (Option A) fails to solve our core problem: users still have to remember where features are. The FAB approach (Option B) has significant accessibility concerns and would require iOS users to learn an Android-centric pattern.

### Key Differentiators

1. **Visibility:** Tab bar is always visible, creating constant awareness of primary capabilities
2. **Accessibility:** Large, persistent tap targets meet WCAG requirements without accommodation
3. **Mental model:** Users immediately understand app structure upon opening
4. **Cross-platform:** Pattern works identically on iOS and Android, reducing engineering complexity

### Dissenting Opinions

Chen (Engineering) initially preferred Option A due to lower implementation effort. After reviewing the user research showing 15% task completion decline, he agreed that Option C's benefits justified the additional work.

---

## Trade-offs Accepted

### What We Gave Up

| Trade-off | Impact | Why Acceptable |
|-----------|--------|----------------|
| Screen real estate | 50px permanently used by navigation | On modern devices, this is <5% of screen; content scrolls. User research showed no concern. |
| Secondary feature access | Requires 2 taps for "More" features | 78% of usage is top 5 features; acceptable friction for long tail |
| Feature count limitation | Can only highlight 4 features directly | Forces prioritization; actually a benefit for user clarity |

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Users can't find features in "More" | Medium | Add search within More menu; use clear categories |
| Wrong 4 features selected | Medium | A/B test feature selection; make configurable per user role |
| Enterprise pushback on change | Low | Provide documentation and training materials; grandfather existing muscle memory with shortcuts |

---

## Reversibility

**Is this decision reversible?** Yes, with effort

**Cost to reverse:** Significant.requires navigation rewrite and user re-education. Estimate 4-6 weeks engineering work plus user communication.

**Conditions that would warrant reverting:**
- Task completion rates don't improve after 3 months
- User complaints about tab bar exceed hamburger complaints (with statistical significance)
- A/B test shows no improvement in feature discoverability

---

## Follow-up Considerations

### Metrics to Monitor

- **Task completion rate:** Should improve from 65% to 75%+ for core flows
- **"Where is X?" support tickets:** Should decrease by 30%+
- **Feature discovery:** Track % of users who use features in "More" menu
- **Time to task completion:** Should decrease for top 5 features

### Future Decisions Required

- Which 4 features get tab bar placement (separate decision document)
- "More" menu organization and categories
- Whether to add user customization of tab bar items
- Tablet/iPad navigation pattern (larger screen may warrant different approach)

### Revisit Triggers

- If app feature count exceeds 100 and "More" becomes unwieldy
- If user research reveals significantly different feature usage patterns
- If platform conventions change substantially

---

## Supporting Materials

- [Figma designs: Bottom Navigation Exploration](https://figma.com/file/xxx)
- [User research: Navigation Usability Study](https://docs.google.com/xxx)
- [Analytics: Feature Usage Report Q4 2025](https://looker.com/xxx)
- Related ADR: Mobile Framework Selection (documented separately)

---

## Decision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-14 | Initial decision documented | Sarah Chen |
| 2026-01-14 | Added user research findings | Sarah Chen |

---

*This rationale documents the reasoning at the time of decision. Context may change.*
````

---

<a id="source-skills-iterate-retrospective-skill-md"></a>

## 原始文件：skills/iterate-retrospective/SKILL.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/iterate-retrospective/SKILL.md) · SHA-256: `66f5c087ad20d71e2942884313276e97ec5203b89825bb0de14a46211333d634`

本文件引用：[references/TEMPLATE.md](#source-skills-iterate-retrospective-references-template-md)；[references/EXAMPLE.md](#source-skills-iterate-retrospective-references-example-md)。

````markdown
---
name: iterate-retrospective
description: Facilitates and documents a team retrospective capturing what went well, what to improve, and action items. Use at the end of a sprint, project, or milestone to reflect and improve team practices. To bank individual learnings into organizational memory afterward, use iterate-lessons-log.
license: Apache-2.0
metadata:
  phase: iterate
  version: "2.2.0"
  updated: 2026-06-10
  category: reflection
  frameworks: [triple-diamond, lean-startup, design-thinking]
  author: product-on-purpose
---
<!-- PM-Skills | https://github.com/product-on-purpose/pm-skills | Apache 2.0 -->
# Retrospective

A retrospective is a structured reflection that helps teams learn from their experiences and continuously improve. By regularly examining what went well, what didn't, and what to change, teams build a culture of learning and adaptation. The value isn't just in the discussion.it's in the documented actions and follow-through.

## When to Use

- At the end of every sprint (for agile teams)
- After completing a significant project or milestone
- Following a major incident or outage
- When team dynamics feel off and need addressing
- At regular intervals (monthly, quarterly) even without specific triggers
- When onboarding new team members to establish improvement culture

## When NOT to Use

- You want one durable learning banked for the organization -> use `iterate-lessons-log`; the retro is the ceremony, the log entry outlives it
- You are scoring an OKR cycle at close -> use `measure-okr-grader`
- The reflection must end in a pivot-or-persevere call -> use `iterate-pivot-decision`
- You need a recap of a general (non-retro) meeting -> use `foundation-meeting-recap`

## Instructions

When asked to facilitate or document a retrospective, follow these steps:

1. **Set the Context**
   Define what period or project this retrospective covers, who attended, and any significant events that occurred. This frames the discussion and helps future readers understand the context.

2. **Choose a Format**
   Select a retrospective format that fits the team's needs. Common options include:
   - **Start/Stop/Continue:** Simple and direct
   - **4Ls:** Liked, Learned, Lacked, Longed for
   - **Mad/Sad/Glad:** Emotion-focused
   - **Sailboat:** Visual metaphor (wind=helps, anchor=holds back)

3. **Gather Input**
   Collect observations from all team members. Ensure everyone contributes.quiet voices often have important insights. Group similar items to identify themes.

4. **Discuss and Prioritize**
   Don't try to address everything. Focus the discussion on the most impactful items. Vote or discuss to identify the top 2-3 issues to address.

5. **Define Action Items**
   Convert insights into specific, assignable actions. Every action needs an owner and a due date. Avoid vague improvements like "communicate better."

6. **Review Previous Actions**
   Check the status of action items from the last retrospective. Celebrate completions and discuss blockers for incomplete items. This builds accountability.

7. **Document for Future Reference**
   Capture the key points so they're available for future team members and for tracking patterns over time.

## Project Memory Contract

Active only when `.claude/pm-skills.local.md` exists. With no file, ignore this section entirely
and behave exactly as described above.

- **Reads:** the recent `artifacts[]` entries, so the retrospective can look at what the cycle actually produced instead of relying on recall.
- **Writes:** the lessons as an `interpretation` artifact.
- **Posture:** propose the entry and wait for confirmation before writing, unless
  `memory_auto_append: true` is set, in which case append and echo what was written.
- **Write discipline:** re-read the file immediately before writing, never from the copy that
  produced the proposal. If it changed in between, merge your entry into the current state and
  re-propose rather than overwriting; add only your own entry and leave every other field and
  section byte-identical. Nothing enforces this at runtime and the file is gitignored, so a
  careless whole-file write loses another session's work with no way to recover it.

A retrospective surfaces raw observations, patterns, and commitments at once. Record the durable half, the lessons, under a single tag; a downstream reader needs to know how firmly to weight the entry, and a mixed tag tells it nothing.
## Output Format

Use the template in `references/TEMPLATE.md` to structure the output. A complete retrospective fills every template section: Overview; Previous Retrospective Review; What Went Well; What to Improve; Discussion Notes; Action Items; Parking Lot; Metrics and Trends; Facilitator Notes; and Next Retrospective.

## Quality Checklist

Before finalizing, verify:

- [ ] All attendees had opportunity to contribute
- [ ] Both positives and improvements are captured
- [ ] Action items have owners and due dates
- [ ] Previous retrospective actions are reviewed
- [ ] A reader who missed the retro can tell what was decided and who owns each action from this document alone

## Examples

See `references/EXAMPLE.md` for a completed example.
````

---

<a id="source-skills-iterate-retrospective-references-template-md"></a>

## 原始文件：skills/iterate-retrospective/references/TEMPLATE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/iterate-retrospective/references/TEMPLATE.md) · SHA-256: `c771e69162b86472db140f4c01ae237d65557fed072fbb8e4663eda57dd0da86`

````markdown
---
artifact: retrospective
version: "1.0"
created: YYYY-MM-DD
status: draft
---

# Retrospective: [Sprint/Project Name]

## Overview

**Period Covered:** [Date range or project name]
**Date Held:** [When retrospective occurred]
**Facilitator:** [Who led the session]
**Duration:** [How long]
**Format Used:** [Start/Stop/Continue, 4Ls, Mad/Sad/Glad, etc.]

### Attendees

- [Name, Role]
- [Name, Role]
- [Name, Role]
- [Name, Role]

### Context

<!-- Notable events, releases, or circumstances that affected this period -->

[Brief summary of what happened during this period]

---

## Previous Retrospective Review

### Action Items from Last Retro

| Action | Owner | Status | Notes |
|--------|-------|--------|-------|
| [Action 1] | [Name] | Complete/In Progress/Not Started | [Update] |
| [Action 2] | [Name] | Complete/In Progress/Not Started | [Update] |
| [Action 3] | [Name] | Complete/In Progress/Not Started | [Update] |

---

## What Went Well

<!-- Celebrate successes and reinforce positive behaviors -->

### Team Highlights

- [Success 1]
- [Success 2]
- [Success 3]

### Process Wins

- [What worked well in how we work]
- [What worked well in how we work]

### Individual Shoutouts

- [Recognition for specific contributions]

---

## What to Improve

<!-- Identify challenges and opportunities for growth -->

### Challenges Faced

- [Challenge 1]
- [Challenge 2]
- [Challenge 3]

### Process Pain Points

- [What didn't work well in how we work]
- [What didn't work well in how we work]

### Themes Identified

<!-- Group similar items into themes -->

| Theme | Items | Votes |
|-------|-------|-------|
| [Theme 1] | [Related items] | [Vote count] |
| [Theme 2] | [Related items] | [Vote count] |
| [Theme 3] | [Related items] | [Vote count] |

---

## Discussion Notes

### [Topic 1]

**What was discussed:**
[Summary of discussion]

**Root cause identified:**
[If applicable]

**Proposed solution:**
[What the team agreed to try]

---

### [Topic 2]

**What was discussed:**
[Summary of discussion]

**Root cause identified:**
[If applicable]

**Proposed solution:**
[What the team agreed to try]

---

## Action Items

<!-- Every action needs an owner and due date -->

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| 1 | [Specific action] | [Name] | [Date] | Not Started |
| 2 | [Specific action] | [Name] | [Date] | Not Started |
| 3 | [Specific action] | [Name] | [Date] | Not Started |

### Action Item Details

**Action 1: [Title]**
- What: [Detailed description of what needs to happen]
- Why: [Which improvement this addresses]
- Success criteria: [How we know it's done]

**Action 2: [Title]**
- What: [Detailed description of what needs to happen]
- Why: [Which improvement this addresses]
- Success criteria: [How we know it's done]

---

## Parking Lot

<!-- Items raised but deferred for future discussion -->

- [Topic 1]: [Why deferred]
- [Topic 2]: [Why deferred]

---

## Metrics and Trends

<!-- Optional: track retro patterns over time -->

### Team Health Indicators

| Indicator | This Retro | Last Retro | Trend |
|-----------|------------|------------|-------|
| Team morale (1-5) | [Score] | [Score] | ↑/↓/→ |
| Process satisfaction (1-5) | [Score] | [Score] | ↑/↓/→ |
| Collaboration (1-5) | [Score] | [Score] | ↑/↓/→ |

### Recurring Themes

<!-- Note if issues keep coming up -->

- [Theme that has appeared multiple times]

---

## Facilitator Notes

<!-- Private notes for improving future retros -->

- [What worked in facilitation]
- [What to try differently next time]

---

## Next Retrospective

**Scheduled:** [Date]
**Focus areas:** [Any specific topics to address]

---

*Retrospective documented by [Name] on [Date].*
````

---

<a id="source-skills-iterate-retrospective-references-example-md"></a>

## 原始文件：skills/iterate-retrospective/references/EXAMPLE.md

[查看固定提交中的原文](https://github.com/product-on-purpose/pm-skills/blob/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/iterate-retrospective/references/EXAMPLE.md) · SHA-256: `0ff37744b501b7714ea4c92cc5593cc15d3eb9e0ec73a7dd2d4e800c16617f23`

````markdown
---
artifact: retrospective
version: "1.0"
created: 2026-01-14
status: complete
context: Sprint 14 retrospective after payment feature launch
---

# Retrospective: Sprint 14 - Payment Feature Launch

## Overview

**Period Covered:** January 1-14, 2026 (Sprint 14)
**Date Held:** January 14, 2026
**Facilitator:** Maya Chen, Scrum Master
**Duration:** 60 minutes
**Format Used:** Start/Stop/Continue

### Attendees

- Alex Rivera, Engineering Lead
- Jordan Kim, Senior Engineer
- Sam Patel, Engineer
- Chris Wong, Engineer
- Taylor Brooks, Product Manager
- Maya Chen, Scrum Master

### Context

Sprint 14 included the launch of our new payment processing feature, which was a company priority. The team successfully shipped on time despite a mid-sprint requirements change. We also onboarded a new team member (Chris) during this sprint. There was one production incident (P2) related to payment timeout handling that was resolved within 4 hours.

---

## Previous Retrospective Review

### Action Items from Last Retro

| Action | Owner | Status | Notes |
|--------|-------|--------|-------|
| Create PR template with checklist | Alex | Complete | Now in use, team finds it helpful |
| Add Slack integration to CI pipeline | Jordan | Complete | Notifications working |
| Schedule design sync for Sprint 14 | Taylor | Complete | Held on Jan 3, reduced back-and-forth |
| Document on-call runbook | Sam | In Progress | 70% done, will finish this sprint |

---

## What Went Well

### Team Highlights

- Shipped payment feature on time despite mid-sprint requirements change
- Zero critical bugs found in production after launch
- Team rallied together during the P2 incident.great cross-functional response
- New PR template caught several issues before merge

### Process Wins

- Design sync meeting eliminated 3+ days of async back-and-forth
- Pair programming on complex payment logic reduced bugs
- Daily standups stayed focused and under 15 minutes

### Individual Shoutouts

- Jordan: Stepped up to mentor Chris during onboarding while maintaining velocity
- Sam: On-call response to P2 was exemplary.clear communication, fast resolution
- Taylor: Requirements change was communicated with context, not just "do this"

---

## What to Improve

### Challenges Faced

- Mid-sprint requirements change caused context switching and rework
- Test environment was unstable for 2 days, blocking integration testing
- P2 incident revealed gap in timeout handling documentation
- Chris felt unsure where to find information as new team member

### Process Pain Points

- Requirements changes mid-sprint.how do we protect sprint scope better?
- Flaky tests are getting worse.5 tests failed intermittently this sprint
- On-call runbook is still incomplete.we were lucky Sam knew what to do
- Onboarding documentation is outdated

### Themes Identified

| Theme | Items | Votes |
|-------|-------|-------|
| Test reliability | Flaky tests, unstable test env | 5 |
| Documentation gaps | Runbooks incomplete, onboarding docs outdated | 4 |
| Scope protection | Mid-sprint changes, context switching | 3 |

---

## Discussion Notes

### Test Reliability (Highest Priority)

**What was discussed:**
The team is frustrated with flaky tests. We identified 5 tests that have failed intermittently in the past month. Each failure wastes ~30 minutes investigating and re-running. The test environment instability was a separate issue (AWS configuration) but compounded the frustration.

**Root cause identified:**
- 3 tests have race conditions in async code
- 2 tests depend on external services without proper mocking
- Test env issue was due to expired credentials (now fixed)

**Proposed solution:**
Dedicate 1 story point per sprint to fixing flaky tests until backlog is clear. Start with the 3 race condition tests since those are highest impact.

---

### Documentation Gaps

**What was discussed:**
Chris mentioned that onboarding was harder than it needed to be.docs pointed to systems that no longer exist or had wrong information. The P2 incident also showed that our runbooks are incomplete. If Sam hadn't been on call, resolution would have taken longer.

**Root cause identified:**
- No owner for documentation maintenance
- Docs aren't part of our definition of done
- Runbooks were started but never finished

**Proposed solution:**
1. Sam will finish the on-call runbook this sprint (carryover)
2. Chris will update onboarding docs while experience is fresh
3. Consider adding "docs updated" to PR checklist for relevant changes

---

### Scope Protection

**What was discussed:**
The mid-sprint requirements change (adding Apple Pay support) was justified from a business perspective, but the team felt it was handled poorly. The change added 3 story points mid-sprint without removing anything.

**Root cause identified:**
- No clear escalation path for mid-sprint changes
- PM felt pressure to say yes without consulting team on impact
- We don't have a "scope change" process

**Proposed solution:**
Create a lightweight process: any mid-sprint addition requires (1) PM-Eng discussion of impact, (2) something of equal size removed or explicit scope increase acknowledgment, (3) documented reason. Taylor and Alex will draft this.

---

## Action Items

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| 1 | Fix 3 race condition tests identified in CI | Jordan | Jan 21 | Not Started |
| 2 | Complete on-call runbook (carryover) | Sam | Jan 21 | In Progress |
| 3 | Update onboarding documentation | Chris | Jan 28 | Not Started |
| 4 | Draft scope change process | Taylor + Alex | Jan 17 | Not Started |

### Action Item Details

**Action 1: Fix race condition tests**
- What: Fix the 3 tests identified as having race conditions (test_async_payment, test_webhook_handler, test_batch_process)
- Why: Test reliability theme.reducing CI failures and investigation time
- Success criteria: Tests pass 50 consecutive times in CI

**Action 2: Complete on-call runbook**
- What: Finish documenting P1/P2 response procedures, escalation paths, and common issues
- Why: Documentation gaps theme.P2 incident showed risk
- Success criteria: Runbook reviewed by Alex and used in next on-call rotation

**Action 3: Update onboarding documentation**
- What: Review and update new developer onboarding guide, remove references to deprecated systems
- Why: Chris's experience showed docs are outdated; best to fix while fresh
- Success criteria: New hire (future) can set up environment using only docs

**Action 4: Draft scope change process**
- What: Create 1-page process for handling mid-sprint scope changes
- Why: Scope protection theme.prevent future frustration from unplanned changes
- Success criteria: Team agrees to trial process in Sprint 15

---

## Parking Lot

- **Tech debt backlog review:** We have 47 items in tech debt backlog. Should schedule a grooming session, but not urgent. Defer to Sprint 16 planning.
- **Pair programming formalization:** Team liked pairing on payment feature but want to discuss how to make it more regular. Add to Sprint 16 retro agenda.

---

## Metrics and Trends

### Team Health Indicators

| Indicator | This Retro | Last Retro | Trend |
|-----------|------------|------------|-------|
| Team morale (1-5) | 4.0 | 3.5 | ↑ |
| Process satisfaction (1-5) | 3.5 | 3.5 | → |
| Collaboration (1-5) | 4.5 | 4.0 | ↑ |

### Recurring Themes

- **Test reliability** has appeared in 3 of last 5 retros. This sprint we're committing to fixing the top issues.
- **Documentation** has appeared in 2 of last 5 retros. We now have 2 specific actions to address it.

---

## Facilitator Notes

- Start/Stop/Continue worked well for this team.consider alternating with 4Ls next time for variety
- Should timebox discussion sections more strictly.we ran 5 min over
- Anonymous input submission before meeting helped quieter team members contribute equally

---

## Next Retrospective

**Scheduled:** January 28, 2026
**Focus areas:** Check in on scope change process trial, test reliability progress

---

*Retrospective documented by Maya Chen on January 14, 2026.*
````

---

## Apache-2.0 许可证原文

```text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work.

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to the Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   Copyright 2026 Jonathan Prisant

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

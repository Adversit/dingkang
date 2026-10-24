const zhPairs = `
AI Development|AI 开发
Collaboration workspace|人机协作工作台
AI Development Collaboration|AI 开发协作工作台
A visual workspace for disciplined human–AI development collaboration.|用于明确问题、阶段、决策权与验收证据的人机协作开发工作台。
Start|首页
Workspace|工作台
Method|方法地图
Architecture|架构
Templates|模板
Verification|验证
Releases|版本记录
Source|源码说明
Deep tools|深入工具
No model API|不调用模型 API
Go to start|返回首页
Primary navigation|主导航
Toggle color theme|切换主题
ENTER AT THE RIGHT STAGE|从当前阶段进入
Where are you now?|你目前处于什么状态？
Choose the statement closest to your current state. The method adapts to the work—you do not have to restart from Explore.|选择最符合当前情况的描述。方法应适应任务，不必每次都从探索开始。
ChatGPT is the intelligence layer.|ChatGPT 负责理解与推理。
This site is the presentation, state, and control layer.|本站负责呈现、状态记录与操作控制。
Current work state choices|当前任务状态选项
Core method summary|核心方法概览
Locate the work|定位任务
Current stage, not just topic|识别阶段，而不只是主题
Bound decision freedom|明确决策边界
Explore broadly, execute precisely|充分探索，精确执行
Close the loop|完成验证闭环
Expected → actual → evidence|预期 → 实际 → 证据
Core principles|核心原则
FIRST PRINCIPLES|第一性原理
Problem ≠ proposed solution|真实问题 ≠ 预设方案
PROPOSED SOLUTION|预设方案
“Build me a news website.”|“帮我做一个新闻网站。”
REAL GOAL|真实目标
“Identify AI directions worth watching from the last two weeks.”|“识别最近两周值得关注的 AI 方向。”
MANAGE AI FREEDOM|管理 AI 自由度
Freedom contracts as decisions accumulate.|决策越明确，执行自由度越收敛。
Explore broadly. After a decision, require precise execution and compare expected with actual.|探索时充分展开；决策后精确执行，并比较预期与实际。
HUMAN–AI AUTHORITY|人机决策权
Decision rights remain visible.|让决策权始终清晰。
Human owns|人负责决策
AI supports|AI 提供支持
Goal · priority · scope · product and aesthetic judgment · high-risk choices · final acceptance|目标 · 优先级 · 范围 · 产品与审美判断 · 高风险选择 · 最终验收
Research · decomposition · candidates · implementation · comparison · self-check · evidence gathering|调研 · 拆解 · 候选方案 · 实现 · 对比 · 自检 · 证据收集
WORKING SURFACE|协作工作区
Current collaboration frame|当前协作框架
Review mode · not saved|评审模式 · 内容未保存
Reset|重置
Export brief|导出简报
Method stages|方法阶段
Move backward only when a missing decision blocks correctness.|仅在缺失决策影响正确性时，回到之前的阶段。
Problem context|问题背景
Facts before solutions|先明确事实，再讨论方案
Project or problem|项目或问题
Outcome to achieve|期望达成的结果
Hard constraint|硬性约束
e.g. Multi-task diagnosis|例如：多任务排障
What becomes possible, easier, safer, or more accurate?|希望实现什么能力，或让什么变得更简单、安全、准确？
What cannot be negotiated?|哪些条件不可妥协？
UNDERSTANDING STATE|理解状态
Understanding state|理解状态
Candidate|待确认
Confirmed|已确认
Disputed|有争议
CURRENT STAGE|当前阶段
Core question|核心问题
Exit signal|退出条件
Ready to move on|已具备推进条件
Authority & evidence|决策权与证据
Keep decision rights visible|明确谁有权做什么决定
AI may lead|AI 可主导
EVIDENCE|验收证据
captured|已记录
THE METHOD|方法地图
Nine questions, not nine gates.|九类问题，按需进入。
The stages are a navigation system for decision freedom. Enter where the work is, backtrack only when evidence reveals a missing decision, and keep durable artifacts proportional to risk.|各阶段用于定位当前决策问题。从任务实际状态进入；仅当证据揭示缺失决策时回退，文档投入应与风险相匹配。
DECISION FREEDOM|决策自由度
Freedom should fall as certainty rises.|确定性越高，自由度越收敛。
Early stages benefit from alternatives. Later stages should follow confirmed intent, constraints, and verification criteria.|早期需要探索备选方案，后期应遵循已确认的意图、约束与验收标准。
SMALLEST VERIFIED LOOP|最小验证闭环
Change only what you can observe.|让每次改动都产生可观察的结果。
Small change|小步改动
Observable result|可观察结果
Add complexity only when that complexity is itself the property being tested.|仅当复杂性本身是需要验证的属性时，才增加复杂性。
AUTHORITY|决策权
AI can lead the work. Humans keep the consequential choices.|AI 可主导执行，人掌握关键选择。
Goal · priority · trade-offs|目标 · 优先级 · 权衡
Human|人
Research · draft · implement · compare|调研 · 起草 · 实现 · 对比
ARCHITECTURE WORKSPACE|架构工作区
Think in responsibilities and flows.|围绕职责与流转思考架构。
ASCII is for thinking. Mermaid / C4 is for recording. Draw.io / Figma / PPT is for explaining.|用 ASCII 草图推演，用 Mermaid / C4 记录，用 Draw.io / Figma / PPT 沟通。
WORKING SKETCH|工作草图
ASCII architecture|ASCII 架构草图
Static review|静态评审
MODULES|模块
Module cards|模块卡片
4 defined|已定义 4 个
Orchestrator|主编排模块
Specialist|专业执行模块
Evidence Store|证据存储
Checkpoint|检查点
Chooses the next bounded action and routes execution.|选择边界内的下一步动作，并调度执行。
Performs one domain-specific operation under explicit inputs.|在明确输入下执行领域内操作。
Retains inspectable inputs, outputs and acceptance evidence.|保留可检查的输入、输出与验收证据。
Persists progress so work can pause, resume and be audited.|记录进度，支持暂停、恢复与审计。
Control Flow|控制流
Data Flow|数据流
State Flow|状态流
Who decides what happens next? Routing, approvals, retries and stopping.|谁决定下一步？包括路由、审批、重试与停止。
What information moves, in which format, and across which trust boundary?|哪些信息以什么格式流转，跨越哪些信任边界？
What persists across steps, failures, sessions or parallel work?|哪些状态需要跨步骤、故障、会话或并行任务保留？
DURABLE ARTIFACTS|可复用产物
Use a template only when it reduces risk.|模板应帮助降低风险。
Keep exploration cheap. Formalize only the decisions, interfaces, and evidence that future work needs to recover.|保持探索轻量，只将后续需要追溯的决策、接口和证据正式记录下来。
VERIFICATION|验证
“Done” is not the same as “correct.”|“做完了”不等于“做对了”。
Acceptance needs an explicit expectation, observed evidence, a named gap and a repeatable retest path.|验收需要明确预期、实际证据、具体差距，以及可重复的复验路径。
Expected|预期
Actual|实际
Gap|差距
Fix|修复
Retest|复验
VERIFICATION PLAN|验证计划
Evidence before confidence|用证据支撑判断
4 criteria|4 项标准
Acceptance criterion|验收标准
Evidence|证据
Verification method|验证方法
Result|结果
Status|状态
Pending|待验证
Pass|通过
Task state recommends the correct next stage.|根据任务状态推荐正确的下一阶段。
State-to-route mapping and rendered route.|状态与路径的对应关系，以及展示的路径。
Exercise all eight choices.|逐一检查八个选项。
Reserved for interaction phase.|待交互验证。
All nine stages expose their full contract.|九个阶段都展示完整定义。
WHY, WHAT, INTENT, INPUT, OUTPUT, questions, exit and errors.|原因、职责、意图、输入、输出、关键问题、退出条件及常见错误。
Inspect each Method stage.|逐一查看方法地图中的阶段。
Content model present.|内容结构已提供。
Architecture separates three flow types.|架构明确区分三种流。
Visible flow classification.|可见的流类型说明。
Review workspace labels.|检查工作区标注。
All three are explicit.|三种流均已明确。
Saved forms survive reload.|刷新后恢复已保存的表单。
Content restored after refresh.|刷新后恢复的内容。
Edit, save, reload, compare.|编辑、保存、刷新、对比。
Reserved for persistence phase.|待持久化验证。
RELEASES|版本记录
The method evolves from real collaboration.|方法从真实协作中演进。
Stable lessons become rules, templates, or tools. Project-specific details stay in the project.|稳定经验沉淀为规则、模板或工具，项目特有细节保留在项目中。
Current|当前版本
15 Sep 2026|2026 年 9 月 15 日
Initial experimental release|首个实验版本
Introduces the adaptive stage model, first-principles framing, WHAT / WHY / INTENT module reasoning, verification and convergence, human–AI authority, reusable templates, and evaluation seeds.|引入自适应阶段模型、第一性原理分析、职责／原因／意图模块推理、验证与收敛、人机决策权、可复用模板和评估用例。
experimental|实验版
9 stages|9 个阶段
3 templates|3 个模板
static review|静态评审
RELEASE RECORD|发布记录
Why this version exists|本版本的形成原因
Version|版本
Timestamp|时间
Model|模型
Static visual companion|静态可视化伴侣
Reason|原因
Make task stage, decision rights and acceptance evidence visible.|让任务阶段、决策权和验收证据清晰可见。
Key Changes|主要变更
Nine-stage adaptive map, Module Card, ADR and Verification Plan.|九阶段自适应地图、模块卡片、架构决策记录与验证计划。
Evidence / Feedback|证据与反馈
Seeded from recurring ambiguity, autonomy and acceptance failures in real development work.|源于真实开发中反复出现的歧义、自主权边界与验收问题。
SKILL SOURCE|Skill 源码
The Site explains. The Agent executes.|网站呈现方法，Agent 执行任务。
This visual companion does not run the Skill and does not call an LLM API. Reasoning remains inside ChatGPT, Claude Code, Codex or another Agent environment.|本站提供可视化协作界面，不运行 Skill，也不调用模型 API。推理继续在 ChatGPT、Claude Code、Codex 等 Agent 环境中完成。
Entry and routing contract: when to use the method and how to select a stage.|入口与路由约定：何时使用方法，以及如何选择阶段。
Deeper reasoning, heuristics and stage-specific guidance.|深入推理、启发式规则与阶段指导。
Reusable Module Cards, ADRs and Verification Plans.|可复用的模块卡片、架构决策记录和验证计划。
Deterministic checks and transformations that should not rely on model judgment.|应由确定性逻辑完成的检查与转换。
Cases, rubrics and regression evidence used to evolve the method.|用于方法演进的案例、评分准则与回归证据。
RECOMMENDED ROUTE|建议路径
Open workspace|进入工作台
WHY|原因 WHY
WHAT|职责 WHAT
INTENT|意图 INTENT
INPUT|输入 INPUT
OUTPUT|输出 OUTPUT
KEY QUESTIONS|关键问题
EXIT CONDITION|退出条件
COMMON ERROR|常见错误
MODULE CARD|模块卡片
ADR|架构决策记录 ADR
Copy|复制
Copied|已复制
Module card|模块卡片
Architecture decision record|架构决策记录
Verification plan|验证计划
Make a responsibility boundary explainable and testable.|让职责边界可解释、可验证。
Preserve why a consequential option won.|记录关键方案被选中的原因。
Compare expected and actual with evidence that can falsify the result.|比较预期与实际，并用能证伪结果的证据进行验证。
Stage selected|已选择阶段
Stage changed|已切换阶段
Saving…|内容已编辑 · 尚未保存
Evidence updated|已更新证据
Understanding updated|已更新理解状态
Exit signal marked|已标记退出条件
Exit signal reopened|已重新打开退出条件
Workspace reset|已重置工作台
Theme updated|已切换主题
Brief exported|已导出简报
Reset all locally saved workspace content?|重置当前工作台内容？
`;
const zh = Object.fromEntries(zhPairs.trim().split('\n').map(line => {const i=line.indexOf('|');return [line.slice(0,i),line.slice(i+1)];}));
const stageNames=['探索','对齐','规格','决策','计划','执行','验证','收敛','沉淀'];
['Explore','Align','Specify','Decide','Plan','Execute','Verify','Converge','Learn'].forEach((s,i)=>{zh[s]=`${stageNames[i]} ${s}`;zh[s.toUpperCase()]=`${stageNames[i]} ${s}`;});
let language='zh';
try { language=localStorage.getItem('adc-language')==='en'?'en':'zh'; } catch {}
function t(s){return language==='zh'?(zh[s]||s):s;}
const stageZh=[
['真正的问题或目标是什么？','问题边界已足够清晰，可以继续推理。','AI 自由度高','我只有一个模糊想法','值得追求的目标，以及优先解决谁的问题。','发现假设、探索备选方案，并勾勒最小有效边界。', ['观察到的情况','先描述正在发生什么，不急于解释原因。','期望结果','希望改善哪种判断或能力？','候选问题定义','暂定的问题描述，还不是解决方案。'], ['具体的用户或业务目标','事实与假设已分开','至少一个例子或反例']],
['什么最重要？有哪些约束？','决策空间已有明确边界。','广泛但有边界','目标已知，但需求还不清楚','优先级、非目标、投入预算和重要权衡。','梳理目标与约束，发现冲突并提出待确认假设。',['成功标准','哪些可观察结果能证明成功？','约束','时间、平台、政策、数据、成本、兼容性等。','非目标','哪些内容明确不在本次范围内？'],['成功可被观察','硬性约束明确','非目标能防止范围漂移']],
['哪些行为必须成立？','期望行为可以被检查。','AI 自由度适中','我需要一份可验证的规格','行为意图，以及验收背后的领域判断。','起草需求、边界场景和有区分力的验收示例。',['必要行为','描述结果应满足什么，而不是列实现任务。','验收示例','给定……当……则……','失败边界','规格必须排除哪些错误行为？'],['需求描述行为','边界场景明确','错误实现无法通过检查']],
['选择哪个关键方案？','关键选择有明确负责人和理由。','聚焦选择','我正在权衡关键方案','接受权衡，并对不可逆或高影响决策负责。','从需求推导方案、比较证据并说明后果。',['决策','选定哪个方案？','考虑过的备选方案','排除了哪些可行方案，原因是什么？','重新评估条件','什么新证据出现时应重启决策？'],['备选方案确实可行','后果已被明确','决策负责人清楚']],
['如何让规格成为现实？','任务可按连贯且可验证的增量执行。','受约束','方向已定，需要实施计划','优先级、推进节奏与交付风险的接受程度。','拆解选定路径，明确依赖，优先验证高影响的不确定性。',['优先验证风险','哪个最小实验能否定当前方案？','执行增量','列出每步都能产生可观察结果的任务。','验证路径','每个增量如何检查？'],['规格、决策、计划与任务分开','高影响未知项尽早验证','每个增量都有验证方法']],
['最小的有效改动是什么？','已有可观察的结果。','AI 自由度低','我准备开始实现最小闭环','证据推翻选定路径时，决定是否允许例外。','按明确规则实现、守住边界，暴露阻碍而非猜测。',['当前任务','一个具体、可执行的工作单元。','预期可观察结果','完成后应出现什么，或改变什么？','执行边界','本任务不应决定或修改哪些内容？'],['改动对应已确认计划','结果可观察','任务未隐藏未解决的决策']],
['结果满足原始意图了吗？','差距明确，证据已保留。','以证据为依据','结果已有，需要验收证据','最终主观验收，以及证据无法替代的领域判断。','比较预期与实际，执行有区分力的检查并分类失败。',['预期','根据规格，哪些行为应该成立？','实际','实际发生了什么？证据在哪里？','差距分类','属于实现、规格、决策、环境／数据问题，还是接受的差异？'],['直接比较预期与实际','检查不易被错误结果碰巧通过','已保留日志、测试、截图或指标']],
['还差什么？何时停止？','结果已接受，或回到正确的前置阶段。','聚焦差距','结果仍有差距','接受剩余差异，或重新讨论涉及价值判断的决策。','分类差距，在正确层面修复，并按意图复验。',['剩余差距','具体描述差异，不只说“再优化一下”。','修复层面','是实现、规格、决策还是环境问题？','停止条件','什么证据可以结束本轮迭代？'],['每项差距已分类','在正确层面修复','停止条件明确']],
['哪些经验值得保留？','可复用经验已记录到合适的位置。','提炼筛选','我希望沉淀可复用经验','判断哪些经验足够稳定，可以形成共同实践。','提取可重复经验，更新合适产物，避免过拟合单个案例。',['观察到的经验','真实协作揭示了什么？','通用性检查','经验还适用于哪里？在哪里会失效？','待更新产物','规格、ADR、规则、参考文档、脚本或 Skill 版本？'],['经验有真实实践支持','项目细节与通用行为分开','记录变更及原因']]
];
const detailZh=[
['早期请求常在理解问题之前就指定方案。','检查背景、用户、约束、未知项、证据及相关可能性。','避免过早关闭问题探索空间。','模糊想法、症状、参考材料、部分示例与相关方诉求。','问题定义、未知项、证据清单与候选方向。','什么目标重要？我们假设了什么？什么证据会改变问题定义？','尚未识别真实目标，就开始生成特性或架构。'],
['人与 AI 可能使用相同措辞，却优化不同目标。','对齐目标、优先级、范围、相关方、成功标准与权限边界。','防止局部正确的工作解决了错误问题。','问题定义、候选目标与相关方期望。','一致的目标、非目标、优先级、负责人和验收权。','谁来决定？哪些不在范围内？冲突时优先什么？','把礼貌同意当作定义和优先级一致的证据。'],
['行为、边界和证据不明确，目标就无法执行。','定义场景、接口、数据、约束、边界情况和验收标准。','将意图转为可测试约定，避免过度设计。','已对齐目标、用户、现有系统和已知约束。','行为规格、示例、非目标和可衡量验收标准。','必须发生什么？什么绝不能发生？什么能证明成功？','写模糊愿望，或过早锁定技术设计。'],
['未解决的方案分歧会成为实现中的隐性不一致。','比较并选择方案，记录理由、权衡及重新评估条件。','让不可逆或高影响决策由人负责，且可审计。','规格、候选方案、约束、实验与证据。','决策记录、被否决方案、后果及重新评估条件。','优化什么？放弃什么？什么证据会推翻决策？','只记录最终选择，丢失选择原因。'],
['依赖和检查点不明确，再好的设计也可能失败。','拆解任务、排列依赖，定义接口、检查和交接。','让下一步安全动作清楚，并使改动易于评审。','决策、架构、验收标准与代码库当前状态。','执行顺序、任务边界、风险控制与验证点。','哪些条件必须先成立？什么可并行？哪里应停下检查？','只列待改文件，不说明行为依赖与检查。'],
['实现阶段不受约束的 AI 创造性会带来高成本。','实施有边界的改动，保持约定，记录偏差并检查。','将决策转为可运行产物，不擅自改变问题。','计划、源码背景、接口、约束与验收标准。','可用增量、变更记录、检查结果与暴露的例外。','是否在范围内？假设改变了吗？需要新决策吗？','用顺手重构或新功能想法扩大授权范围。'],
['执行成功并不能证明目标已经达成。','依据预先声明的证据比较预期与实际行为。','让验收建立在可观察证据上，而非信心或工作量。','实现、标准、测试用例、日志、截图与测量。','关联证据的结果、差距、严重程度和复验需求。','预期什么？发生什么？证据是否充分且可复现？','用“已实现”或“测试跑过了”代替验收。'],
['验证会暴露很多差距，但并非都值得再迭代。','排序差距、修复重要问题、复验并作出验收决定。','解决关键差异，避免无止境打磨。','验证结果、差距严重程度、成本及相关方判断。','已接受结果、延期差距、已知限制与结项记录。','哪些差距阻碍目标？哪些可推迟？谁接受剩余风险？','不看影响或范围，修复每个可见瑕疵。'],
['完成的任务包含可复用模式、失效假设和证据。','提炼模式，更新模板、测试、提示词、规则和方法版本。','让下一次协作成本更低、更安全、更准确。','决策、实现历史、证据、反馈与失败案例。','可复用知识、评估用例、发布说明与方法变更。','什么可推广？什么只适用于本项目？下次应改变什么？','复盘只写文档，不更新实际工作产物。']
];
const entryZh=[
['我只有一个模糊想法','先把真实问题与第一个预设方案分开。'],
['目标已知，但需求还不明确','除非目标本身出现争议，否则不必重做探索。'],
['我正在设计架构','规划任务前，明确职责、接口与流类型。'],
['架构已定，需要制定实施计划','除非出现新矛盾，否则不必重做探索与对齐。'],
['我正在实现','收紧 AI 自由度，暴露计划尚未授权的决策。'],
['实现完成，需要验证','先比较预期与实际，再判断工作能否验收。'],
['我正在排查结果偏差','先分类差距：实现、规格、决策、环境或数据。'],
['任务已完成，希望提炼可复用知识','仅将有证据支持的经验沉淀为可复用产物。']
];
const templateZh=[`# 模块：[名称]

## 职责 WHAT
[该模块负责什么？]

## 原因 WHY
[为什么需要它？移除后会出什么问题？]

## 意图 INTENT
[设计要保护什么属性？]

## 输入 INPUT
[输入与读取的状态]

## 输出 OUTPUT
[输出与修改的状态]

## 约束
[硬性边界]

## 评估
[具有区分力的检查]

## 风险
[失败模式、耦合、安全或规模风险]`, `# ADR-[编号]：[决策标题]

## 背景
[问题、约束以及为什么需要决策]

## 决策
[选定方案]

## 备选方案
[其他可行选项]

## 选择原因
[为什么选择该方案]

## 权衡
[该选择放弃了什么]

## 后果
[正面与负面的后续影响]

## 重新评估条件
[什么证据或事件应重启决策]`, `# 验证计划

预期 → 实际 → 差距 → 修复 → 复验

| 验收标准 | 证据 | 验证方法 | 结果 | 状态 |
|---|---|---|---|---|
| [必须成立的行为] | [可检查的证明] | [检查方式] | [实际结果] | 待验证／通过／失败 |

## 差距
[预期与实际之间的关键差异]

## 修复
[解决根因的最小改动]

## 复验
[可重复执行的证据路径]`];

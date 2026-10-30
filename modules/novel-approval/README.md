# 事实受控审阅（有限覆盖）

本模块仅适用于当前主分支普通事实提案。服务端生成报告，不接收客户端提供的检查结论或批准人身份。当前只验证提案结构、原文证据包含、场景版本与 canon 基线；**不会判断陈述是否由原文蕴含，也没有运行 AI 或全书一致性检查**。语义项固定为 `UNKNOWN`，须由当前登录作者针对这一项填写理由。报告不应渲染为全部检查通过。

`POST /api/m/novel-studio/guarded-approval`：同源、可信登录，JSON envelope 与其他档案命令相同，均附 `{commandId,expectedVersion,command}`。响应含 `{version,state,receipt}`；响应丢失时用完全相同命令和版本重试，不能生成新 commandId。版本冲突须保留用户输入并重新读取。

1. `command: {action:'prepare',projectId,proposalId,sessionId,factId}`：构造并封存提案内容与报告，`state.projects[].guardSessions[]` 中可查看提案 hash、报告 hash、证据、固定 profile 和 `awaiting_review`。
2. `command: {action:'approve',projectId,sessionId,reason}`：当前登录作者对报告中 `semantic-not-checked` 定向确认并记录理由，返回 `approved`。理由非空，批准不写事实。
3. `command: {action:'commit',projectId,sessionId}`：服务端重验来源、当前 canon、规则与 profile、提案及报告 hash，原子 CAS 写事实、状态和幂等回执。成功才标记 `committed`。

原 `/canon` 公共入口不再接受新的 `commit_fact`；升级之前成功的请求仍允许同一 commandId 和完全相同内容重放历史回执。草稿和事实提案保持不变。此前直接调用的第三方客户端需要改用三步接口。

本模块不能替代可信权限策略持久版本、角色/协作者管理、异步模型审阅报告、源文件 hash+Unicode 证据范围、分支合并批准和跨章验证。它不声称任何语义质量或全书覆盖率；旧章修订分支目前有自己的合并机制，未接入此报告绑定。

## 时态事件与修订合并

`POST /api/m/novel-studio/guarded-change` 同样使用 `{commandId,expectedVersion,command}` 三步：

1. `command:{action:'prepare',projectId,sessionId,change:{type,projectId,...}}`。`type` 仅允许 `add_temporal_transition`、`add_temporal_knowledge`、`add_temporal_speech`、`retcon_merge`。服务端以当前档案 dry-run 现有领域校验，并封存实际命令、作品快照、目标正式版本；合并还封存源分支与目标头。没有实际写入变化。
2. `command:{action:'approve',projectId,sessionId,reason}`。作者明确承认语义和隐含依赖未经检查，并对当前报告与变更签署定向确认。
3. `command:{action:'commit',projectId,sessionId}`。服务端重验哈希、来源、版本、批准和分支头；领域命令、审阅状态与幂等回执通过同一次档案 CAS 更新。

`guardChangeSessions` 状态为 `awaiting_review/approved/committed`。结构报告不表示叙事语义或未登记的跨场景影响已验证。公共 canon 路由对这些新直接写入返回 409，并允许已成功旧命令的相同请求与幂等键重放回执。

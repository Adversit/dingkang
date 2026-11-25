# 知证 (`zhizheng-research`)｜Spec - Plan - Task

## Spec
- **定位与入口**：论文研究工作台，入口 `/m/zhizheng-research`（源码 `app/m/zhizheng-research/`、`modules/zhizheng-research/`）。
- **核心能力**：研究项目管理、论文检索（Crossref）、PDF/实验结果/日志导入（上限 15 MiB，支持去重）、阅读卡、证据摘录、复刻任务与 AI 辅助（须用户同意）。
- **存储与 API**：原生业务表 + `/api/m/zhizheng-research/workspace`、`/search`、`/files`、`/ai`。文件在模块内独立管理，不计入 Hub 通用文件列表。
- **前端样式**：`modules/zhizheng-research/app/globals.css` + 统一子工作台增强层。

## Plan
- 保持 `save(id, revision, state)` 与 `restore(id, revision, version)` 版本校验不变。
- 统一按钮、卡片与表单的微交互与可读性。

## Task
- [x] 接入全局统一排版与微动效增强样式。
- [x] 在有数据库与模型密钥的环境中抽验项目保存、PDF 上传与版本恢复。

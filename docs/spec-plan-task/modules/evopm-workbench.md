# EvoPM (`evopm-workbench`)｜Spec - Plan - Task

## Spec
- **定位与入口**：产品演进工作台，入口 `/m/evopm-workbench`（源码 `app/m/evopm-workbench/`、`modules/evopm-workbench/`）。
- **核心能力**：产品与反馈信号导入、AI 分析运行、问题聚类（create/merge/split/discard）、需求决策、计划审批、发布与结果评估导出。
- **存储与 API**：`GET/POST /api/m/evopm-workbench/workbench`，POST 携带 `{ revision, requestId, action: { type, ... } }`（Schema 见 `modules/evopm-workbench/lib/domain.ts`）。
- **前端样式**：`modules/evopm-workbench/app/styles.css` + 全局统一增强层。

## Plan
- 保留 `revision` 并发校验与 `actionSchema` 动作契约。
- 统一按钮、表单与面板过渡动画，遵守 `prefers-reduced-motion`。

## Task
- [x] 接入全局统一排版与微动效增强样式。
- [x] 验证加载示例信号与需求决策动作保存正常。

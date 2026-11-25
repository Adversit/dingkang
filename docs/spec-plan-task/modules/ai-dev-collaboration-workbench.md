# AI 研发协作 (`ai-dev-collaboration-workbench`)｜Spec - Plan - Task

## Spec
- **定位与入口**：项目交付与协作画布，主入口 `/m/ai-dev-collaboration-workbench`，交付子页 `/m/ai-dev-collaboration-workbench/delivery`（静态资源位于 `public/apps/ai-dev-collaboration-workbench/`，路由由 `app/m/ai-dev-collaboration-workbench/[[...path]]/route.ts` 与 `modules/ai-dev-collaboration-workbench/dispatch.ts` 分发）。
- **核心能力**：协作画布读写、交付项目管理、事件流与交付材料导出、模型辅助交付、管理员审计台。
- **存储与 API**：`/api/m/ai-dev-collaboration-workbench/*`（`/session`、`/workspace`、`/delivery`、`/delivery/events`、`/delivery/export`、`/delivery/model`、`/admin/*`）。

## Plan
- 保留 `{ data, revision }` 画布版本校验与 `operation_id` 幂等处理。
- 在 `public/apps/ai-dev-collaboration-workbench/index.html` 接入 `/apps/hub-workbench-unified.css`。

## Task
- [x] 在 `public/apps/ai-dev-collaboration-workbench/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证画布与交付子页切换及响应式显示正常。

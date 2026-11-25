# 晚灯 (`wandeng-evening`)｜Spec - Plan - Task

## Spec
- **定位与入口**：数字陪伴与轻复盘，入口 `/m/wandeng-evening`（源码 `app/m/wandeng-evening/page.tsx`、`modules/wandeng-evening/`）。
- **核心能力**：AI 对话（SSE 流 `meta/delta/done/error`）、手账页管理、已确认记忆保存/删除、偏好设置与个人导出（`?export=1`）。
- **存储与 API**：原生业务 API `/api/m/wandeng-evening/state`、`/chat`、`/action`；外层 `ModuleStorageGate` 仅同步虚拟形象界面偏好（`GET/PUT /api/hub/state/wandeng-evening`）。
- **前端样式**：`modules/wandeng-evening/app/globals.css` + 全局统一增强层。

## Plan
- 严禁将对话/手账/记忆写入 `hub_states`；保留 `ModuleStorageGate` 偏好桥接提示。
- 统一对话卡片、手账按钮与焦点态动态反馈。

## Task
- [x] 接入全局统一排版与微动效增强样式。
- [x] 验证手账编辑、SSE 对话与个人导出功能。

# Agent 架构学习 (`agent-architecture-journey`)｜Spec - Plan - Task

## Spec
- **定位与入口**：从零搭建 Agent 互动课程与架构画布，入口 `/apps/agent-architecture-journey/index.html`（静态目录 `public/apps/agent-architecture-journey/`）。
- **核心能力**：分阶段课程、架构图解、代码示例与学习笔记。
- **存储与 API**：通过 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/agent-architecture-journey`（属于 `bridgeModules`）。
- **前端样式**：页面内嵌/引用静态样式 + `/apps/hub-workbench-unified.css`。

## Plan
- 保留 `/hub-storage.js` 加载顺序与课程进度键。
- 引入 `/apps/hub-workbench-unified.css` 统一按钮、卡片悬停、焦点可见性与动态过渡。

## Task
- [x] 在 `public/apps/agent-architecture-journey/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证课程切换、笔记保存与离开 `flushHubModule` 同步正常。

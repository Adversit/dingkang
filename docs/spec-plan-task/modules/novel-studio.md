# AI 小说创作 (`novel-studio`)｜Spec - Plan - Task

## Spec
- **定位与入口**：故事创作画布，主入口 `/apps/novel-studio/canvas.html`；旧版 `/apps/novel-studio/index.html` 保留桥接读取与迁移路径。
- **核心能力**：作品/分支/设定/版本管理、规划预览与执行、上下文编译、起草与审查、`auto-run` SSE 自动多阶段创作、事实变更审批（guarded change）、时间点与 Retcon、封面管理与模型设置。
- **存储与 API**：画布使用原生 `/api/m/novel-studio/*` 接口（`/canon`、`/plan-preview`、`/plan`、`/context`、`/draft`、`/review`、`/auto-preview`、`/auto-run`、`/guarded-change`、`/guarded-approval`、`/temporal`、`/retcon`、`/restore-copy`、`/migrate-storage`、`/model-*`、`/cover`）。
- **离开保护**：通过 `window.HubBeforeLeave` 与 `window.HubCancelLeave` 与门户协同；`postMessage` 支持 `hub:open-menu` 与 `hub:return`。

## Plan
- 严格保留画布 `HubBeforeLeave` 守卫、SSE 流解析与 `previewHash` 校验。
- 在 `canvas.html` 与 `index.html` 接入 `/apps/hub-workbench-unified.css`，提升控件统一质感与动态反馈。

## Task
- [x] 在 `public/apps/novel-studio/canvas.html` 与 `index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证画布编辑未保存时触发离开保护、`postMessage` 返回门户与取消离开正常。

# AI PM Studio (`aipm-studio-dk`)｜Spec - Plan - Task

## Spec
- **定位与入口**：产品构想与验证工作台，入口 `/apps/aipm-studio-dk/index.html`（静态目录 `public/apps/aipm-studio-dk/`）。
- **核心能力**：产品想法发现、PM 方法论资料、验证模型与工具。
- **存储与 API**：通过 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/aipm-studio-dk`。
- **前端样式**：`styles.css`、`validation.css` + `/apps/hub-workbench-unified.css`。

## Plan
- 保留 `HubStorage` 桥接与本地验证逻辑。
- 引入 `/apps/hub-workbench-unified.css` 统一排版、表单焦点、按钮与卡片动态过渡。

## Task
- [x] 在 `public/apps/aipm-studio-dk/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证桌面与移动端布局及存档同步。

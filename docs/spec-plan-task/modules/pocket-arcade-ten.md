# 口袋游乐场 (`pocket-arcade-ten`)｜Spec - Plan - Task

## Spec
- **定位与入口**：即玩小游戏合集与灰烬远征，入口 `/apps/pocket-arcade-ten/index.html`（静态目录 `public/apps/pocket-arcade-ten/`）。
- **核心能力**：13 款小游戏集合 + 灰烬远征子模块（iframe 内跳转）。
- **存储与 API**：通过 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/pocket-arcade-ten`（统一别名 `GET/PUT /api/games/pocket-arcade-ten/state`），主键 `pocket-arcade-v1`、`pocket-ash-expedition-v1` 及解谜子键。

## Plan
- 保留同一外层 iframe 内子页面导航与 `HubStoragePanel` 1 秒轮询重连机制。
- 在 `public/apps/pocket-arcade-ten/index.html` 引入 `/apps/hub-workbench-unified.css`。

## Task
- [x] 在 `public/apps/pocket-arcade-ten/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证从游戏大厅启动与「工作台菜单 → 返回工作台」流程。

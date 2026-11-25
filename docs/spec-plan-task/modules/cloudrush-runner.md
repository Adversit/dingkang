# 逐风奇旅 (`cloudrush-runner`)｜Spec - Plan - Task

## Spec
- **定位与入口**：云端跑酷游戏，入口 `/apps/cloudrush-runner/index.html`（静态目录 `public/apps/cloudrush-runner/`）。
- **核心能力**：跑者、坐骑与宠物选择、关卡推进、金币与最佳距离纪录。
- **存储与 API**：通过 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/cloudrush-runner`（统一别名 `GET/PUT /api/games/cloudrush-runner/state`），主键 `cloudrush.save.v1`。

## Plan
- 保留 `engine.js` 与 `app.js` 跑酷循环与音频逻辑。
- 在 `public/apps/cloudrush-runner/index.html` 引入 `/apps/hub-workbench-unified.css`，统一菜单/结算界面按钮与卡片动态质感。

## Task
- [x] 在 `public/apps/cloudrush-runner/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证新旧存档接口读写一致性与离开 `flushHubModule`。

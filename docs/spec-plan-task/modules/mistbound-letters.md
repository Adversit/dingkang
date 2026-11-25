# 雾海来信 (`mistbound-letters`)｜Spec - Plan - Task

## Spec
- **定位与入口**：群岛送信之旅，入口 `/apps/mistbound-letters/index.html`（静态目录 `public/apps/mistbound-letters/`）。
- **核心能力**：邮船航行、信件投递、资源收集与多结局旅途。
- **存储与 API**：通过 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/mistbound-letters`（统一别名 `GET/PUT /api/games/mistbound-letters/state`），主键 `mistbound-letters-v1`。

## Plan
- 保留「导出旅途」与旧云存档迁移兼容。
- 在 `public/apps/mistbound-letters/index.html` 引入 `/apps/hub-workbench-unified.css`。

## Task
- [x] 在 `public/apps/mistbound-letters/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证航行进度保存与离开刷新保护。

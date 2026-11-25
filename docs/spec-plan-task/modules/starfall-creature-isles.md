# 星屿同行 (`starfall-creature-isles`)｜Spec - Plan - Task

## Spec
- **定位与入口**：精灵探索物语，入口 `/apps/starfall-creature-isles/index.html`（静态目录 `public/apps/starfall-creature-isles/`）。
- **核心能力**：群岛探索、精灵捕捉、队伍编成与偏好设置。
- **存储与 API**：通过 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/starfall-creature-isles`（统一别名 `GET/PUT /api/games/starfall-creature-isles/state`），主要键 `starfall-creature-isles-v1` 等。

## Plan
- 保留探索世界视图与 `starfall-journey.json` 导出导入契约。
- 在 `public/apps/starfall-creature-isles/index.html` 引入 `/apps/hub-workbench-unified.css` 提升面板与按钮动效。

## Task
- [x] 在 `public/apps/starfall-creature-isles/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证存档同步与收藏/继续游戏入口。

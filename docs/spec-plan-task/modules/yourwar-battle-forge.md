# YourWar (`yourwar-battle-forge`)｜Spec - Plan - Task

## Spec
- **定位与入口**：自由布阵战争沙盘，入口 `/apps/yourwar-battle-forge/index.html`（静态目录 `public/apps/yourwar-battle-forge/`）。
- **核心能力**：挑战/沙盘模式、3 个阵型存档槽、兵种部署与战斗模拟。
- **存储与 API**：通过 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/yourwar-battle-forge`（统一别名 `GET/PUT /api/games/yourwar-battle-forge/state`），键为 `yourwar-session-v1` 与 `yourwar-plan-1..3`、`yourwar-audio`。

## Plan
- 保留 3D/沙盘渲染与阵型槽数据结构。
- 在 `public/apps/yourwar-battle-forge/index.html` 引入 `/apps/hub-workbench-unified.css`。

## Task
- [x] 在 `public/apps/yourwar-battle-forge/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证阵型保存与新旧存档接口互通。

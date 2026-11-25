# 云阙三国 (`yunque-sanguo`)｜Spec - Plan - Task

## Spec
- **定位与入口**：群星觉醒三国卡牌 RPG，入口 `/m/yunque-sanguo`（源码 `app/m/yunque-sanguo/page.tsx`、`modules/yunque-sanguo/game/Game.tsx`、`public/assets/yunque-sanguo/game.css`）。
- **核心能力**：武将招募、6 人阵容编成、关卡挑战与养成。
- **存储与 API**：外层 `ModuleStorageGate` 桥接读写 `GET/PUT /api/hub/state/yunque-sanguo`（统一别名 `GET/PUT /api/games/yunque-sanguo/state`），主键 `yunque-sanguo-v2`。

## Plan
- 保持 `ModuleStorageGate` 同步门控与 `yunque-sanguo-v2` 数据结构。
- 通过全局样式增强层统一交互动效与无障碍焦点。

## Task
- [x] 通过 `app/layout.tsx` 接入全局统一排版与微动效增强样式。
- [x] 在 `tests/games-api.test.mjs` 验证 `/api/games/yunque-sanguo/state` 与 `/api/hub/state/yunque-sanguo` 互通。

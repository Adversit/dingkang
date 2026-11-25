# 月下问仙录 (`moonlit-immortal-chronicle`)｜Spec - Plan - Task

## Spec
- **定位与入口**：文字修仙模拟，门户路由 `/m/moonlit-immortal-chronicle`（源码 `app/m/moonlit-immortal-chronicle/page.tsx`、`modules/moonlit-immortal-chronicle/GameFrame.tsx` 嵌套 `/apps/moonlit-immortal-chronicle/index.html`）。
- **核心能力**：境界修炼、宗门经营、奇遇事件与历程记录。
- **存储与 API**：通过内层 iframe 的 `/hub-storage.js` 桥接读写 `GET/PUT /api/hub/state/moonlit-immortal-chronicle`（统一别名 `GET/PUT /api/games/moonlit-immortal-chronicle/state`），主键 `moonlit-immortal-chronicle-v1`。`findModuleStorage()` 递归穿透最多 3 层同源 frame 定位该桥接。

## Plan
- 保持 `GameFrame.tsx` 与内层 iframe 同源通信不变。
- 在 `public/apps/moonlit-immortal-chronicle/index.html` 引入 `/apps/hub-workbench-unified.css`。

## Task
- [x] 在 `public/apps/moonlit-immortal-chronicle/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证嵌套 iframe 下 `flushHubModule()` 正常落盘。

# 吉大校园漫游 (`jlu-campus`)｜Spec - Plan - Task

## Spec
- **定位与入口**：吉林大学前卫南北校区像素漫游与多人同行，入口 `/apps/jlu-campus/index.html`（静态目录 `public/apps/jlu-campus/`，服务端 `lib/campus/server.ts`）。
- **核心能力**：南北校区真实 OSM 几何地图、室内外切换（如日新楼）、房间创建/加入/离开、位置同步、公共广场与房间消息及举报/删除。
- **存储与 API**：
  - 原路径 `/api/campus/*`（`health`、`session`、`me`、`rooms`、`join`、`leave`、`sync`、`teleport`、`snapshot`、`messages`、`ws`）。
  - 统一游戏大厅前缀 `/api/games/jlu-campus/*`（共享 `handleCampusRequest`）。
  - 除 `health` 与 `POST /session` 外均需校园 Bearer Token；Vercel Preview 走 HTTP 同步回退。

## Plan
- 保持渲染引擎 `engine.js`、碰撞数据 `collision-data.json` 与 `interior-layout.js` 不变。
- 在 `public/apps/jlu-campus/index.html` 接入 `/apps/hub-workbench-unified.css`，统一 HUD 面板、按钮与对话框交互动效。

## Task
- [x] 新增 `/api/games/jlu-campus/[...path]` 路由并与 `/api/campus/*` 共享处理器。
- [x] 在 `public/apps/jlu-campus/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 在 D1 已初始化的环境中验证 `/api/games/jlu-campus/health`、建房与 HTTP 同步。

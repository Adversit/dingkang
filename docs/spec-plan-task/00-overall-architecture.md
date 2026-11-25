# 整体架构｜Spec - Plan - Task

## 1. Spec（系统规格与核心边界）

### 1.1 系统定位
「丁康的工作空间」是一个**单入口、四套呈现主题、17 个子工作台**的个人数字工作台。
- **共享注册表**：`lib/hub/catalog.ts` 登记全部 17 个模块（9 个非游戏 + 8 个游戏）。
- **门户编排层**：`app/page.tsx` 负责账号会话、导航、URL 路由（`/?app=<moduleId>&style=<themeId>`）、主题偏好、收藏/最近使用、工作台日历、游戏大厅、文件管理与备份导入导出。
- **四套主题**：`classic`（经典工作台）、`night-harbor`（夜航实验室）、`kinetic`（灵感轨道）、`cozy`（暖居小镇），定义在 `lib/hub/theme.ts`。
- **内部存档模块**：除 17 个可见应用外，`HUB_MODULES`（`lib/hub/server.ts`）还包含 `hub-preferences`（偏好/收藏/最近使用）与 `hub-workspace-calendar`（首页工作记录与计划）。

### 1.2 数据与安全边界（不可破坏的不变量）
1. **服务端身份权威**：所有接口以平台校验后的 `oai-authenticated-user-id`（或 Vercel `/auth/workspace` 会话）为准；`X-Hub-User-Id` 仅用于检测客户端账号切换并立即拒绝跨账号写入（401）。
2. **同源与 CAS 版本校验**：所有变更请求校验 `Origin`（403）；`PUT /api/hub/state/:moduleId` 与 `PUT /api/games/:gameId/state` 使用 `{ values, expectedRevision }` 原子 CAS 写入，版本过期返回 `409` 及最新 `current` 快照。
3. **容量与历史限制**：`values` 最多 200 个键、单值上限 512 KiB、序列化上限 2 MiB，保留最近 20 份历史版本（`hub_state_versions`）。文件上传单文件上限 25 MiB（`hub_files` + R2）。
4. **原生业务表隔离**：`zhiliu-radar`、`zhizheng-research`、`evopm-workbench`、`ai-dev-collaboration-workbench`、`novel-studio`、`wandeng-evening`、`roommate-housekeeper`、`jlu-campus` 各自拥有独立业务表与 API，不得将业务明细塞入 `hub_states`。
5. **离开保护**：切换或关闭子应用前，`app/page.tsx` 必须调用 `flushHubModule()`（`lib/hub/storage-panel.ts`），触发原生 `window.HubBeforeLeave` 或桥接 `HubStorage.flush()`，失败或取消时保留当前 iframe 并调用 `cancelHubModuleLeave()`。
6. **大体积资源包**：`asset-pack/manifest.json` 管理的资源在 `pnpm dev` / `pnpm build:vercel` 前自动通过 `restoreAssets()` 还原；修改前需 `pnpm assets:restore`，修改后需 `pnpm assets:pack`。

---

## 2. Plan（架构演进与部署规划）

1. **双运行时兼容**：同时维护 Cloudflare Workers / Vinext（`pnpm dev` / `pnpm build`）与 Vercel Next.js 16（`pnpm build:vercel`）。服务端路由避免 Node 专属 API，使用 Web Standards `Request`/`Response` 与 `cloudflare:workers` `env` 绑定。
2. **统一前端体验**：门户与 17 个子工作台共享一套排版、间距、动效降级规范（中文正文 >= 16px、辅助 >= 14px，遵循 `prefers-reduced-motion: reduce`）。
3. **测试与 Preview 验收门禁**：任何改动需通过 `tsc --noEmit`、Node 单元测试、`pnpm build:vercel`，并在本地及获准的 Vercel Preview 上验证真实交互与持久化。

---

## 3. Task（整体维护与交接检查表）

- [x] `lib/hub/catalog.ts` 保持 17 个模块的权威注册与 ID 稳定性。
- [x] `lib/hub/server.ts` 维护 `HUB_MODULES`、`hub_states` CAS 与 `hub_files` 归属校验。
- [x] `lib/hub/backup-preview.ts` 支持 `hub-preferences`、`hub-workspace-calendar` 及所有游戏/桥接模块备份预览与合并导入。
- [x] 在本地 `.wrangler/state` 或目标环境执行 D1 migration 后，复核 `/api/hub/health` 与 `/api/games/jlu-campus/health` 返回 `200`。
- [x] 在 Vercel Preview 环境使用测试账号验证登录、跨设备日历读写、文件上传下载及 `409` 冲突恢复。

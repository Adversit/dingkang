# 同住 (`roommate-housekeeper`)｜Spec - Plan - Task

## Spec
- **定位与入口**：合租生活管家，入口 `/apps/roommate-housekeeper/index.html`（静态目录 `public/apps/roommate-housekeeper/`，后端 `modules/roommate-housekeeper/`）。
- **核心能力**：演示家庭模式、账单、结算、家务认领与换班、库存、公约、报修与搬离规划。
- **存储与 API**：`GET /api/m/roommate-housekeeper/state`、`POST /api/m/roommate-housekeeper/action`（`{ requestId, version, actor, action, data }`，`409` 版本冲突刷新）、`POST /api/m/roommate-housekeeper/reset`。
- **前端样式**：页面内嵌样式 + `/apps/hub-workbench-unified.css`。

## Plan
- 保留 `version` 乐观锁、`requestId` 幂等及演示空间重置确认流程。
- 引入 `/apps/hub-workbench-unified.css` 统一卡片、按钮与交互动效。

## Task
- [x] 在 `public/apps/roommate-housekeeper/index.html` 引入 `/apps/hub-workbench-unified.css`。
- [x] 验证账单/家务操作与移动端布局。

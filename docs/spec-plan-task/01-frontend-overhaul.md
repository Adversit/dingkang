# 前端整体改造｜Spec - Plan - Task

## 1. Spec（改造范围与设计规范）

### 1.1 改造目标
1. **首页个人工作台与日历（`hub-workspace-calendar`）**：
   - 在首页直接展示「今日日期（`Asia/Shanghai`）」「未完成计划」「近期记录」「月历（周一至周日）」与「选中日期详情」。
   - 点击日期格仅切换选中日期；新建/编辑记录、新建/编辑/改期/完成计划由明确操作触发。
   - 跨月改期在一次 `PUT /api/hub/state/hub-workspace-calendar` 中同步更新来源月份与目标月份。
   - 切换 4 套主题时保留选中日期与编辑草稿；切换账号时立即清理旧账号状态。
2. **游戏大厅与统一游戏接口（`/api/games`）**：
   - 首页一级目录将 8 款游戏聚合为「游戏大厅」入口；进入游戏大厅后可按原有 ID 打开、继续或收藏。
   - `GET /api/games` 由 `catalog.ts` 生成公开元数据与能力标识。
   - `GET/PUT /api/games/:gameId/state` 复用 `hub_states` 与 `lib/hub/server.ts` CAS，与旧 `/api/hub/state/:moduleId` 读写同一份存档。
   - `/api/games/jlu-campus/*` 复用 `handleCampusRequest`（`lib/campus/server.ts`）。
3. **四套主题与 17 个子工作台视觉/动效统一**：
   - **经典工作台 (`classic`)**：清晰层级、轻 CSS 状态反馈（日期选中、保存成功、面板切换）。
   - **夜航实验室 (`night-harbor`)**：深色山海夜色底色 + `#DFFD56` 荧光点缀 + 明暗分层与轻景深。
   - **灵感轨道 (`kinetic`)**：浅色轨道玻璃态（`#f1f4fa`、`#ffffffc9` 卡片、`#3549C5` 主色）+ `KineticBackdrop` Three.js 雕塑 + `KineticMotion` 指针倾斜/高光/滚动揭示。
   - **暖居小镇 (`cozy`)**：`CozyBaseScene` 2.5D 小岛与 4 座小屋 + 快捷「日历」「游戏大厅」入口，房间过渡结束后可靠解锁交互。
   - **17 个子工作台**：通过 `public/apps/hub-workbench-unified.css`（静态入口）与全局样式层（`/m/*` 路由）统一字体、焦点环、卡片/按钮微动效、表格与对话框质感，同时严格保留各模块原生布局、画布与业务交互，并在 `prefers-reduced-motion: reduce` 下自动降级。

### 1.2 响应式与无障碍要求
- 桌面端（1440px）无固定定位遮挡；移动端（375px / 390px）零横向溢出，日历次要时间线可折叠。
- 中文正文 `>= 16px`，辅助文本 `>= 14px`；所有日历格与控件具备语义化 `aria-label` 与键盘可达性。
- 遵循 `AGENTS.md` 文案约束：无装饰性英文 kicker、副标题口号或冗余描述。

---

## 2. Plan（技术实现方案）

| 模块/文件 | 职责 |
|---|---|
| `lib/hub/workspace-calendar.ts` | 纯函数：自然日、42 格月历、记录/计划 CRUD、跨月改期、分月序列化 |
| `lib/hub/use-workspace-calendar.ts` | React Hook：加载、保存、防抖/队列、`409` 冲突保留草稿与解决、账号隔离 |
| `components/WorkspaceCalendar.tsx` + `.module.css` | 四主题共用的工作台日历 UI |
| `lib/hub/games-client.ts`、`components/GameHall.tsx` + `.module.css` | 统一游戏大厅前端视图与客户端 |
| `app/api/games/route.ts`、`[gameId]/state/route.ts`、`jlu-campus/[...path]/route.ts` | 统一 `/api/games` 后端路由 |
| `app/page.tsx`、`app/globals.css`、`app/kinetic.css`、`components/CozyBaseScene.tsx` | 门户编排、四主题视觉与动效增强 |
| `public/apps/hub-workbench-unified.css` + `app/layout.tsx` | 17 个子工作台统一极简动态样式增强层 |

---

## 3. Task（执行与验收清单）

- [x] 完成 `hub-workspace-calendar` 状态层、Hook、UI 与备份识别。
- [x] 完成 `GameHall` 与 `/api/games/*` 统一接口及新旧存档互通测试。
- [x] 完成四套主题视觉/动效整合及 `CozyBaseScene` 日历/游戏大厅直达入口。
- [x] 完成 `public/apps/hub-workbench-unified.css` 并接入全部 17 个子工作台入口。
- [x] 完成四套主题、17 个子工作台的桌面/移动端视觉一致性与动效降级验证。
- [x] 完成 V2 空间 Bento 重构：顶部状态舱（迷你矩阵日期卡、三色脉搏指标、实时时钟）、三栏 Bento 日历与当前焦点卡片（点阵底纹 + 7 段进度条 + 年份水印时间线）、游戏大厅 Spotlight 焦点舞台与分类胶囊、全站色彩高光 Bento 应用卡片。

# 丁康的工作空间｜Spec-Plan-Task 交接文档索引

> 适用对象：后续接手的工程师与 AI Agent。  
> 代码基线：`Adversit/dingkang`（分支 `codex/frontend-workspace-v1`，基于 `codex/vercel-preview` `562307357f16fffc72f12b6145e230a50fd41e6a`）。

## 文档结构

- **Spec Kit 框架目录**：
  - [项目宪章 (.specify/memory/constitution.md)](../../.specify/memory/constitution.md)
  - [当前改造 Spec (specs/001-frontend-workspace-v1/spec.md)](../../specs/001-frontend-workspace-v1/spec.md)
  - [当前改造 Plan (specs/001-frontend-workspace-v1/plan.md)](../../specs/001-frontend-workspace-v1/plan.md)
  - [当前改造 Tasks (specs/001-frontend-workspace-v1/tasks.md)](../../specs/001-frontend-workspace-v1/tasks.md)
- [00-overall-architecture.md](./00-overall-architecture.md) — **整体架构 Spec-Plan-Task**：17 个注册应用、4 套主题外壳、统一登录/权限、D1/R2 存档与文件契约、备份导入导出、部署与验收命令。
- [01-frontend-overhaul.md](./01-frontend-overhaul.md) — **前端整体改造 Spec-Plan-Task**：4 套主题视觉与动效、首页个人工作台与日历 (`hub-workspace-calendar`)、游戏大厅与统一 `/api/games` 接口、17 个子工作台统一样式与动态交互层。
- **17 个子工作台独立文档**（`modules/<moduleId>.md`）：

### 研究与学习（3）
- [zhiliu-radar](./modules/zhiliu-radar.md) — 知流（AI 情报与每日简报工作台 · V3 三页签极简 Bento 重构）
- [zhizheng-research](./modules/zhizheng-research.md) — 知证（学术文献精读与证据综述工作台 · V3 三步流水线重构）
- [agent-architecture-journey](./modules/agent-architecture-journey.md) — Agent 架构实验室（五大核心机制与实时运行推演沙盘 · V3 互动实验室重构）

### 产品与开发（1 核心活跃 + 2 已合并归档）
- [novel-studio](./modules/novel-studio.md) — AI 小说工坊（三栏沉浸式章节写作、世界观设定与 AI 续写审阅 · V3 重构）
- [evopm-workbench](./modules/evopm-workbench.md) — SpecKit 研发工作台（合并原 AI PM Studio、AI 研发协作与 EvoPM，以 `Signals → /speckit.specify → /speckit.plan & tasks → Delivery` 为主线）
- [aipm-studio-dk](./modules/aipm-studio-dk.md) — AI PM Studio（已并入 SpecKit 研发工作台，置于首页底部归档抽屉）
- [ai-dev-collaboration-workbench](./modules/ai-dev-collaboration-workbench.md) — AI 研发协作（已并入 SpecKit 研发工作台，置于首页底部归档抽屉）

### 生活与陪伴（1 核心活跃 + 1 面试作品归档）
- [wandeng-evening](./modules/wandeng-evening.md) — 晚灯（夜间数字陪伴与轻复盘）
- [roommate-housekeeper](./modules/roommate-housekeeper.md) — 同住（AI 面试作品，已归档置于首页底部归档抽屉）

### 游戏（8，首页聚合于「游戏大厅」）
- [jlu-campus](./modules/jlu-campus.md) — 吉大校园漫游
- [cloudrush-runner](./modules/cloudrush-runner.md) — 逐风奇旅
- [starfall-creature-isles](./modules/starfall-creature-isles.md) — 星屿同行
- [pocket-arcade-ten](./modules/pocket-arcade-ten.md) — 口袋游乐场
- [yourwar-battle-forge](./modules/yourwar-battle-forge.md) — YourWar
- [mistbound-letters](./modules/mistbound-letters.md) — 雾海来信
- [moonlit-immortal-chronicle](./modules/moonlit-immortal-chronicle.md) — 月下问仙录
- [yunque-sanguo](./modules/yunque-sanguo.md) — 云阙三国

## 常用开发与验证命令

```sh
# 本地开发（Vinext + Vite，自动恢复大体积静态资源）
pnpm dev

# TypeScript 严格检查
pnpm exec tsc --noEmit --pretty false

# Node 单元测试（Node v22.14 需加 --experimental-strip-types）
node --experimental-strip-types --test lib/hub/server.test.mjs tests/workspace-calendar.test.mjs tests/games-api.test.mjs tests/module-navigation.test.mjs tests/storage-bridge.test.mjs

# Vercel Next.js 生产构建
pnpm build:vercel
```

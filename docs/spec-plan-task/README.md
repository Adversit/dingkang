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
- [zhiliu-radar](./modules/zhiliu-radar.md) — 知流（个人信息雷达）
- [zhizheng-research](./modules/zhizheng-research.md) — 知证（论文研究工作台）
- [agent-architecture-journey](./modules/agent-architecture-journey.md) — Agent 架构学习

### 产品与开发（4）
- [novel-studio](./modules/novel-studio.md) — AI 小说创作
- [aipm-studio-dk](./modules/aipm-studio-dk.md) — AI PM Studio
- [evopm-workbench](./modules/evopm-workbench.md) — EvoPM（产品演进工作台）
- [ai-dev-collaboration-workbench](./modules/ai-dev-collaboration-workbench.md) — AI 研发协作

### 生活与陪伴（2）
- [wandeng-evening](./modules/wandeng-evening.md) — 晚灯（数字陪伴与轻复盘）
- [roommate-housekeeper](./modules/roommate-housekeeper.md) — 同住（合租生活管家）

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

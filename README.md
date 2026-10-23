<div align="center">

# 丁康的工作空间

### 研究、创造、生活与冒险，在同一处继续。

**15 个应用 · 7 个游戏 · 4 种外观 · 统一账号与持久存储**

[经典工作台](https://dingkang-hub.dingikang.chatgpt.site/?style=classic) · [夜航实验室](https://dingkang-hub.dingikang.chatgpt.site/?style=night-harbor) · [灵感轨道](https://dingkang-hub.dingikang.chatgpt.site/?style=kinetic) · [暖居小镇](https://dingkang-hub.dingikang.chatgpt.site/?style=cozy)

[应用目录](#应用目录) · [架构](#一处修改四种外观共同生效) · [本地运行](#本地运行) · [维护文档](#维护约定与文档)

</div>

[![暖居小镇：可拖动、可点击的 Three.js 三维岛屿](docs/screenshots/cozy.webp)](https://dingkang-hub.dingikang.chatgpt.site/?style=cozy)

这是一个把独立站点整合为个人工作空间的完整项目。信息雷达、论文研究、产品开发、日常陪伴与七段游戏旅程，共用一个入口、一套账号与一组存储资源。各模块保留自己的功能与界面，可以搜索、收藏、继续最近使用的应用，也可以在数据中心管理文件和存档。

**源码公开，线上空间保持私人访问。** 上面的预览链接需要站点授权登录；截图可直接查看。仓库不包含用户数据库、私人附件、迁移快照或服务凭据。

## 四种外观，同一份工作空间

| 经典工作台 · `classic` | 夜航实验室 · `night-harbor` |
|---|---|
| [![经典工作台实际截图](docs/screenshots/classic.webp)](https://dingkang-hub.dingikang.chatgpt.site/?style=classic) | [![夜航实验室实际截图](docs/screenshots/night-harbor.webp)](https://dingkang-hub.dingikang.chatgpt.site/?style=night-harbor) |
| 清晰的侧栏与应用目录，适合专注处理日常。 | 山海夜色与暖灯，给工作留一点安静。 |

| 灵感轨道 · `kinetic` | 暖居小镇 · `cozy` |
|---|---|
| [![灵感轨道实际截图](docs/screenshots/kinetic.webp)](https://dingkang-hub.dingikang.chatgpt.site/?style=kinetic) | [![暖居小镇实际截图](docs/screenshots/cozy.webp)](https://dingkang-hub.dingikang.chatgpt.site/?style=cozy) |
| 流动轨道与交互入口，让研究、创造和生活相遇。 | Three.js 实时渲染的三维小岛；拖动观察，点击建筑进入应用分类。 |

四种外观可以直接切换，已打开的应用保持挂载，游戏与工作内容不因换主题而重载。场景尊重系统的减少动效设置，在页面隐藏或打开应用时暂停背景渲染。暖居小镇包含真实三维模型、相机控制与射线拾取；无 WebGL 时保留可操作的页面入口。

## 应用目录

| 分类 | 应用 | 用途 |
|---|---|---|
| 研究与学习 | [知流](https://dingkang-hub.dingikang.chatgpt.site/?app=zhiliu-radar) | 个人信息雷达：信源、报道、事件与阅读记录 |
| 研究与学习 | [知证](https://dingkang-hub.dingikang.chatgpt.site/?app=zhizheng-research) | 论文研究工作台：阅读、复刻、项目与知识整理 |
| 研究与学习 | [Agent 架构学习](https://dingkang-hub.dingikang.chatgpt.site/?app=agent-architecture-journey) | 学习笔记、示例代码与架构实践 |
| 产品与开发 | [AI PM Studio](https://dingkang-hub.dingikang.chatgpt.site/?app=aipm-studio-dk) | 产品构想、问题发现与验证 |
| 产品与开发 | [EvoPM](https://dingkang-hub.dingikang.chatgpt.site/?app=evopm-workbench) | 反馈分析、需求决策与产品演进 |
| 产品与开发 | [AI 研发协作](https://dingkang-hub.dingikang.chatgpt.site/?app=ai-dev-collaboration-workbench) | 需求、执行、交付与验收，承接造物流程 |
| 生活与陪伴 | [晚灯](https://dingkang-hub.dingikang.chatgpt.site/?app=wandeng-evening) | 数字陪伴、对话与轻复盘 |
| 生活与陪伴 | [同住](https://dingkang-hub.dingikang.chatgpt.site/?app=roommate-housekeeper) | 合租账单、家务和共同日常；保留原演示家庭模式 |
| 游戏 | [逐风奇旅](https://dingkang-hub.dingikang.chatgpt.site/?app=cloudrush-runner) | 跑者、坐骑与浮空岛 |
| 游戏 | [星屿同行](https://dingkang-hub.dingikang.chatgpt.site/?app=starfall-creature-isles) | 精灵伙伴与群岛探索 |
| 游戏 | [口袋游乐场](https://dingkang-hub.dingikang.chatgpt.site/?app=pocket-arcade-ten) | 小游戏合集与灰烬远征 |
| 游戏 | [YourWar](https://dingkang-hub.dingikang.chatgpt.site/?app=yourwar-battle-forge) | 自由布阵的战争沙盘 |
| 游戏 | [雾海来信](https://dingkang-hub.dingikang.chatgpt.site/?app=mistbound-letters) | 邮船、群岛与故事 |
| 游戏 | [月下问仙录](https://dingkang-hub.dingikang.chatgpt.site/?app=moonlit-immortal-chronicle) | 奇遇、宗门与文字修仙 |
| 游戏 | [云阙三国](https://dingkang-hub.dingikang.chatgpt.site/?app=yunque-sanguo) | 武将招募、阵容与关卡 |

应用目录的唯一数据源是 [`lib/hub/catalog.ts`](lib/hub/catalog.ts)。游戏货币、角色、关卡和业务项目保持模块独立，不做跨应用混合。

## 一处修改，四种外观共同生效

主题负责呈现，主站负责导航与操作，模块负责各自业务。新增应用、修复存档或调整导入流程，均在共享实现中完成，四种外观直接复用。

```mermaid
flowchart TB
    Views["经典 · 夜航 · 轨道 · 小镇"] --> Hub["共享主站：目录、账号、导航、偏好"]
    Hub --> Modules["15 个同源应用模块"]
    Modules --> Bridge["浏览器存档桥"]
    Modules --> Native["原生业务 API"]
    Bridge --> Shared["统一存档与文件 API"]
    Shared --> DB["D1 数据库"]
    Native --> DB
    Shared --> Files["R2 对象存储"]
    Native --> Files
```

| 共享职责 | 代码入口 |
|---|---|
| 应用目录与分类 | [`lib/hub/catalog.ts`](lib/hub/catalog.ts) |
| 主题定义、URL 与场景接口 | [`lib/hub/theme.ts`](lib/hub/theme.ts) |
| 导航、收藏、导入与账号状态 | [`app/page.tsx`](app/page.tsx) |
| 三维小镇与动态场景 | [`components/`](components/) · [`lib/hub/cozy-scene.ts`](lib/hub/cozy-scene.ts) |
| 云存档桥与模块启动等待 | [`public/hub-storage.js`](public/hub-storage.js) · [`components/ModuleStorageGate.tsx`](components/ModuleStorageGate.tsx) |
| 保存状态、冲突与本机恢复副本 | [`components/HubStoragePanel.tsx`](components/HubStoragePanel.tsx) |
| 统一 API 与版本检查 | [`lib/hub/server.ts`](lib/hub/server.ts) · [`app/api/hub/`](app/api/hub/) |
| 模块业务实现与 API | [`modules/`](modules/) · [`app/api/m/`](app/api/m/) |

原生页面走 `/m/<module>`，静态应用走 `/apps/<module>`，业务 API 走 `/api/m/<module>`。主站使用同源 iframe 隔离样式、DOM 和模块实例；它们实际运行在统一站点中。

## 数据如何保存

一个 Worker 共用一个 D1 `DB` 和一个 R2 `BUCKET`。D1 包含 **33 张原生业务表 + 3 张统一存储表**；表前缀和账号字段负责隔离。R2 使用用户与模块前缀区分数据中心文件和研究附件。

- **账号归属**：服务端只接受部署平台验证的身份；浏览器提交的用户 ID 不能决定数据归属。
- **游戏与偏好**：保留原存档键和内容，通过统一桥同步到 `hub_states`。页面等待恢复完成后再启动。
- **写入冲突**：使用版本比较与交换，过期写入返回冲突；最近 20 个历史版本保留在 `hub_state_versions`。
- **离线与恢复**：显示实际保存状态，保留待同步内容。采用云端副本前先保存本机恢复副本；离开模块前等待待提交的存档。
- **业务记录**：研究项目、对话、产品工作区等继续由各模块原生 API 保存。
- **附件**：数据中心支持单文件最大 25 MiB，下载须验证归属；文件不以公开 HTML 页面执行。

数据中心的“导出存档”只包含当前账号的统一存档与偏好，**不包含原生业务数据库、附件或历史版本**。完整备份需要分别处理 D1 与 R2。旧域名浏览器存档需要先导出再导入，不能跨域自动读取；一个游戏通过迁移验收也不代表全部旧设备的存档已迁入。详见 [存储说明](docs/unification.md) 和 [迁移流程](docs/migration-2026-10-23.md)。

## 本地运行

技术栈：**React 19 · TypeScript · Vinext / Vite · Cloudflare Workers · D1 / Drizzle · R2 · Three.js**。

需要 Node.js **22.13.0 或更高版本**、Git，以及仓库固定的 **pnpm 11.25.0**。使用已提交的 `pnpm-lock.yaml`，不要另起一份依赖锁文件。

```sh
git clone https://github.com/Adversit/dingkang.git
cd dingkang
pnpm install --frozen-lockfile
pnpm run build
```

首次本地运行需初始化 D1。构建会生成 `dist/server/wrangler.json`；对全新的本地数据库执行：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sad_lucky_pierre.sql
pnpm run dev
```

默认开发入口为 `http://localhost:5173`，以终端实际输出为准。干净检出使用 portable 执行配置；在本机回环开发环境，可通过 `/signin-with-chatgpt?return_to=/` 使用本地测试身份。托管环境的身份由平台提供，本地模拟不会进入生产构建。已应用的迁移不要重复执行；新表结构变更通过 `pnpm run db:generate` 生成后审查 SQL。

查看构建后的 Worker：

```sh
pnpm run start
```

该命令只启动本地预览，不会发布。AI 或外部服务功能需要各模块对应的服务端环境配置；仓库不自带密钥，合并站点也不会自动启用这些服务。

## 测试与部署

从项目根目录运行：

```sh
pnpm exec tsc --noEmit --pretty false
node --test tests/*.test.mjs lib/hub/*.test.mjs
pnpm run build
```

当前整合版本完成了 94 项共享与集成测试、TypeScript 检查和生产构建。人工验收覆盖四种外观的桌面与 375px 移动布局、侧栏、场景动效开关、三维场景拾取，以及应用打开期间切换主题不重载。具体模块还保留各自的测试文件；这不是自动 CI 状态徽章，后续改动仍需重新运行相关检查。

生产部署使用 Sites 的源码发布流程：

1. 保留 `.openai/hosting.json` 的现有站点标识、`DB` / `BUCKET` 绑定和私人访问设置。
2. 完成测试，审查数据库迁移，将锁文件、源码、静态资源和迁移文件一并交给发布流程。
3. 在托管环境配置所需服务凭据，不写入源码、截图、日志或提交历史。
4. 发布后等平台报告成功，再检查登录、D1/R2 健康状态和真实模块读写。

`pnpm run build` 只生成部署产物。直接运行一个未配置可信身份入口的 Worker，不等同于完整的 Sites 部署。平台项目 ID 是部署关联标识，应保留；凭据、运行数据库与用户导出文件不得提交。

## 项目目录

| 路径 | 内容 |
|---|---|
| `app/` | 主站、模块页面、认证辅助与 API 路由 |
| `components/` | 四种外观的共享组件、场景与存档面板 |
| `lib/hub/` | 目录、主题、存储、导入转换与迁移控制 |
| `modules/` | 各应用保留的业务源码、结构与模块测试 |
| `public/apps/` | 静态应用及游戏入口 |
| `public/assets/` | 按模块划分的图片、字体、音频与样式 |
| `db/`、`drizzle/` | 汇总数据库结构与版本化迁移 |
| `tests/` | 存档、备份导入、主题和集成测试 |
| `worker/`、`scripts/` | Worker 入口和开发、构建工具 |
| `docs/` | 架构、迁移、存档说明与实际截图 |

## 维护约定与文档

后续开发以 [Adversit/dingkang](https://github.com/Adversit/dingkang) 为唯一源码仓库。先阅读 [AGENTS.md](AGENTS.md)：应用只登记一次，业务接口和存档格式只维护一套；场景通过回调使用共享操作。切换外观保留模块实例，离开模块先处理未完成的保存。

- [统一站点与存储说明](docs/unification.md)
- [统一存储 API](lib/hub/README.md)
- [存档面板与离开保护](docs/storage-panel.md)
- [迁移流程与验收](docs/migration-2026-10-23.md) · [游戏存档兼容](docs/game-migration.md)
- [研究模块](docs/research-migration.md) · [产品模块](docs/product-migration.md) · [生活与学习模块](docs/personal-migration.md)
- [设计说明](DESIGN.md)

---

<div align="center">

**自己的空间，自己的节奏。**

</div>

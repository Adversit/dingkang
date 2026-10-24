# 游戏合并与存档迁入记录

## 范围与运行方式

本次迁入 7 个完整游戏，保留原玩法、数值、关卡与内容。所有游戏及资源由统一站点实际承载，不跳转到旧站。主站游戏大厅用同源 iframe 打开模块，隔离各游戏的全局样式、DOM 事件、声音生命周期和存储桥实例。

| 游戏 | 统一站点路径 | 原始存档键（桥内逻辑键） |
|---|---|---|
| 逐风奇旅 | `/apps/cloudrush-runner/index.html` | `cloudrush.save.v1` |
| 星屿同行 | `/apps/starfall-creature-isles/index.html` | `starfall-creature-isles-v1`、`-preferences`、`-backup`、`-unreadable` |
| 口袋游乐场 | `/apps/pocket-arcade-ten/index.html`；远征 `/apps/pocket-arcade-ten/rogue/index.html` | `pocket-arcade-v1`、`pocket-ash-expedition-v1`、`ash-audio`、`pocket-puzzle-WaterSort`、`pocket-puzzle-Parking`、`pocket-puzzle-Arrows` |
| YourWar | `/apps/yourwar-battle-forge/index.html` | `yourwar-plan-1/2/3`、`yourwar-audio`；新增 `yourwar-session-v1` |
| 雾海来信 | `/apps/mistbound-letters/index.html` | `mistbound-letters-v1`、`mistbound-letters-backups-v1` |
| 月下问仙录 | `/m/moonlit-immortal-chronicle`；内部文档 `/apps/moonlit-immortal-chronicle/index.html` | `moonlit-immortal-chronicle-v1` |
| 云阙三国 | `/m/yunque-sanguo` | `yunque-sanguo-v2` |

五个原静态站点从原 `dist` 迁入 `public/apps/<slug>`，没有复制服务端 bundle、部署配置、源映射或私有环境配置。月下原本是 HTML 字符串加全局 DOM 脚本，拆为独立游戏文档，资源放到 `public/assets/moonlit-immortal-chronicle`。云阙保留 React 实现，代码在 `modules/yunque-sanguo`，图片、音乐与独立样式在 `public/assets/yunque-sanguo`。

## 统一存储接入

静态文档先加载带 `data-module` 的 `/hub-storage.js`，等待 `window.HubStorage.ready` 后再启动游戏；云阙使用 `ModuleStorageGate`，数据就绪后才挂载游戏。桥负责账号与模块命名空间、云端载入、后续保存及冲突状态；游戏保留原 localStorage 键和 JSON 结构。

雾海与月下移除了原有独立 `/api/save` 同步器，改由统一桥单独负责云同步，避免两个写入器争用版本。游戏自带状态与冲突按钮映射到桥的 `status`、`flush()`、`resolveConflict('local'|'cloud')`。选择云端后刷新游戏内存状态；雾海在冲突选择前保留最近两份本机副本，并拒绝把损坏主存档覆盖成新旅途。

共享桥在采用云端前，将整份待替换本机数据（包括游戏内备份键）保存到原生缓存 `hub.storage.v1:<encoded-user>:<encoded-module>:recovery`，独立于即将全量替换的逻辑 `values`。保留最近一份恢复副本，按账号、模块隔离；刷新和游戏 `localStorage.clear()` 不会删除它。`HubStorage.exportRecoveryData()` 返回标准 `{moduleId,values,revision}` 或 `null`，可交给现有导入流程恢复。备份写入或回读验证失败时保持本机数据与冲突状态，不采用云端，也不刷新。此恢复副本只在当前浏览器中，不包含在云端全量备份接口中。

YourWar 原版只保存三份预案和音量，增加可编辑战局快照，包含模式、九关中的当前关卡、双方阵容、当前阵营、选中兵种和种子。刷新后回到同一阵型的部署阶段；不序列化渲染器或运行中的物理模拟。读取时检查兵种、人数、己方半场、场地范围及挑战预算。原推荐编队存在比手动布阵阈值略近的巨人，存档允许其原间距，避免改变现有关卡或拒绝真实进度。

各游戏的账号、同步设施与备份入口可以共用；角色、资源、关卡、数值和游戏专属 revision 仍留在各自 JSON 中，不能把不同游戏的货币或进度字段合并。口袋大厅与灰烬远征同属一个模块，共享命名空间但使用不同键。

## 旧站导入

`lib/hub/legacy-import.ts` 提供纯转换函数 `convertLegacyGameImport(input, selectedModuleId?)`、检测函数 `detectLegacyGameImport(input)` 与 `GAME_IMPORT_METADATA`。函数只返回 `{moduleId, values, format, warnings}`，不写存储。数据中心负责展示识别结果、确认并合并导入的键；单个原生文件不应清掉同模块的其他偏好或小游戏纪录。

| 来源 | 已核实格式与支持范围 |
|---|---|
| 星屿原导出 | `starfall-journey.json`，原始 v1/v2 游戏状态；不含独立声音偏好 |
| 口袋「灰烬远征」原导出 | `灰烬远征-日期.json`，原始 v1 profile，含装备、天赋、纪录、进行中远征；不代表整个游乐场 |
| 雾海原导出 | `雾海来信_旅途.json`，原始 v1 状态 |
| 逐风、云阙 | 没有原生文件导出按钮；支持从原浏览器取得的已核实原始状态 JSON 或以原键名为键、原字符串为值的备份 |
| 月下 | 没有原生文件导出按钮；支持已核实原始状态、`{save,...}` 包装和旧账号/访客缓存中的单份状态 |
| YourWar | 没有原生文件导出按钮；旧阵型必须附带 `yourwar-plan-1/2/3` 原键名，不能可靠判断匿名数组的存档槽 |
| 标准平台备份 | 保留 `{moduleId,values}` 的字符串映射；调用方用统一模块目录验证 moduleId。旧云端账号与 revision 不作为新账号归属 |

导入有基础结构、原键名与容量检查（最多 200 键、每键 512 KiB、模块 2 MiB）。各游戏原有载入校验继续生效。多游戏浏览器键值备份必须明确选目标游戏；含多份旧账号云缓存则拒绝自动猜选，须单独提取确认的旅途。未知格式、损坏主状态、不带槽位的阵型数组、只有登录标识没有进度的缓存不会导入。

新域名受浏览器同源隔离约束，无法直接读取旧站 localStorage。已有原导出功能的游戏可下载 JSON 后在数据中心导入；没有原导出按钮的旧站需要先取得原浏览器键值备份，不能声称新站会自动抓取。旧云端 `game_saves` 与浏览器本机数据必须分别核验；数据库是否为空不能证明某台设备没有历史存档。实际用户的行数、进度与迁移回执不写入公开文档。

## 已完成验证

- `node_modules/.bin/tsc --noEmit --pretty false` 通过。
- 34 份迁入 JavaScript 的 `node --check` 通过；静态 HTML/CSS 和 JS 模块引用检查未发现缺失资源。
- `tests/legacy-game-import.test.mjs`：原生导出与原始格式、标准信封、旧云包装、旧账号缓存歧义、混合游戏、偏好/槽位、损坏数据及容量边界。
- `modules/mistbound-letters/tests/hub-storage-adapter.test.mjs`：加载、保存、flush、冲突后 live state、损坏主存档保护及离线保存。
- `modules/moonlit-immortal-chronicle/tests/storage-adapter.test.mjs`：开局、重载、旧包装、云冲突、离线及移除旧云请求。
- `modules/yourwar-battle-forge/tests/session-save.test.mjs`：可编辑阵型恢复、预算/兵种/场地/人数校验、存储失败及原推荐关卡兼容。

共享版本已通过生产构建与实际浏览器交互验收。星屿的旧存档导入、游戏状态回读与云同步路径已验证；其余旧设备和游戏存档仍需逐一核验。每次发布都应按实际涉及的模块检查账号读写、冲突处理、刷新恢复及交互，不将单次成功扩大为全部历史数据完成迁移。

# 月下问仙录迁入记录

## 路由与文件

- 新主路由：`/m/moonlit-immortal-chronicle`。
- 同源游戏文档：`/apps/moonlit-immortal-chronicle/index.html`，由主路由内的 iframe 承载。iframe 隔离原游戏的全局 CSS、DOM 事件和存档桥上下文，运行的资源全部来自统一站点，无旧站跳转。
- React 容器：`modules/moonlit-immortal-chronicle/GameFrame.tsx`。
- 资源：`public/assets/moonlit-immortal-chronicle/{game.js,style.css,moonlit-mountains.webp,favicon.svg}`。
- 原页面只有 HTML 字符串与 DOM 游戏脚本，不依赖原 UI 组件、数据库代码或其他框架模块，因此没有复制未使用的模板组件、服务端配置和部署输出。

## 存档兼容

- 统一模块 ID：`moonlit-immortal-chronicle`。
- 主存档键：`moonlit-immortal-chronicle-v1`，值保持游戏的**原始 JSON 状态**（`name`、`realm`、`flags`、`disciples` 等），不增加 `{save: ...}` 外包装。
- `HubStorage` 唯一负责账号/模块命名空间、云端恢复、延迟同步和乐观并发控制。iframe 先加载 `/hub-storage.js` 并等待 `window.HubStorage.ready`，再加载 `game.js`；桥未加载时阻止游戏启动，避免写入不隔离的键。
- 原来的 `/api/save` 请求、独立云端 revision 管理与账号切换逻辑已移除，避免两个存档写入器并行覆盖同一模块。
- 游戏自己的云状态展示映射共享 `status`，冲突按钮调用 `resolveConflict('local'|'cloud')`。读取云端选择完成后重新载入游戏状态。
- 兼容主键中的旧 `{save,revision,dirty}` 格式，以及 `moonlit-immortal-chronicle-v1:guest` 的旧访客包装；后续操作写回统一主键。
- 旧数据库 `game_saves.payload` 可直接写入统一模块的 `values['moonlit-immortal-chronicle-v1']`，值为原 payload 字符串。旧数据库迁移由根任务负责；本子任务未读取或搬迁用户实际数据库行。
- 旧域名浏览器存档必须先在原 origin 导出；新域名无法直接读取。旧用户键 `moonlit-immortal-chronicle-v1:user:<encoded userId>` 不自动猜测归属，迁移时应把确认属于当前用户的 `save` 状态规范化到统一主键。
- 原测试模式、修炼规则、人物、剧情与数值逻辑均保留。

## 验证

已通过：

1. `node --check public/assets/moonlit-immortal-chronicle/game.js`。
2. `node modules/moonlit-immortal-chronicle/tests/storage-adapter.test.mjs`：模拟真实游戏脚本的开局选择、状态保存、重载、旧包装兼容、云冲突选择、离线保存与共享 flush；确认不再请求旧 `/api/save`。
3. 文件检查：四项资源存在；存档桥先于游戏脚本；旧登录跳转不存在。

待根任务统一执行：共享桥集成、真实登录/多设备读写、生产构建及浏览器交互检查。本子任务未修改共享 schema、package、hosting manifest，也未提交或部署。

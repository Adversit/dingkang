# 知流与知证模块迁移记录

本次仅整合站点与持久存储，保留原业务操作和界面。目标站点保持 owner-private；现有站点与数据未删除。

## 路由与资源

| 模块 | 页面 | API | 静态资源 |
|---|---|---|---|
| 知流 | `/m/zhiliu-radar` | `/api/m/zhiliu-radar/radar`、`/api/m/zhiliu-radar/service` | `/assets/zhiliu-radar/` |
| 知证 | `/m/zhizheng-research` | `/api/m/zhizheng-research/workspace`、`files`、`search`、`ai` | `/assets/zhizheng-research/` |

页面以独立 iframe 文档承载，保留各模块原 CSS。页面布局不再输出嵌套 html/body；统一站点根布局负责文档结构。

## 数据库映射

两模块共用 `env.DB`。各模块 `migration.sql` 是原有迁移的合并版本，适用于创建新库；不直接作用于旧站数据库。全局迁移应由主站汇总。`table-map.json` 可供受控数据导入使用。

| 模块 | 原表 | 新表 |
|---|---|---|
| zhiliu-radar | `sources` | `zhiliu_radar__sources` |
| zhiliu-radar | `items` | `zhiliu_radar__items` |
| zhiliu-radar | `item_sources` | `zhiliu_radar__item_sources` |
| zhiliu-radar | `events` | `zhiliu_radar__events` |
| zhiliu-radar | `item_event_links` | `zhiliu_radar__item_event_links` |
| zhiliu-radar | `reading_feedback` | `zhiliu_radar__reading_feedback` |
| zhiliu-radar | `user_preferences` | `zhiliu_radar__user_preferences` |
| zhiliu-radar | `digests` | `zhiliu_radar__digests` |
| zhiliu-radar | `ingestion_runs` | `zhiliu_radar__ingestion_runs` |
| zhiliu-radar | `operation_locks` | `zhiliu_radar__operation_locks` |
| zhiliu-radar | `idempotency` | `zhiliu_radar__idempotency` |
| zhiliu-radar | `site_settings` | `zhiliu_radar__site_settings` |
| zhiliu-radar | `model_outputs` | `zhiliu_radar__model_outputs` |
| zhizheng-research | `projects` | `zhizheng_research__projects` |
| zhizheng-research | `versions` | `zhizheng_research__versions` |
| zhizheng-research | `files` | `zhizheng_research__files` |
| zhizheng-research | `ai_usage` | `zhizheng_research__ai_usage` |

所有索引名称也添加同一模块前缀。字段、外键、唯一约束、知流 `items.job_override` 补丁均保留。

## 文件存储与身份

- 知证共用 `env.BUCKET`，对象 key 为 `zhizheng-research/<ownerId>/<projectId>/<fileId>`。原站 key 为 `<ownerId>/<projectId>/<fileId>`，迁移原文件时需复制到新前缀；数据库文件行的 ID 不变。
- 知证保留 owner_id 项目归属与文件归属检查。所有 API 要求可信的 oai-authenticated-user-id 和 oai-authenticated-user-email。
- 知流复用主站 app/chatgpt-auth.ts，GET/POST 都要求登录；用户偏好、反馈、简报继续按 owner 隔离。信源、公开报道、事件和采集运行是站内共享数据，沿用 owner-private 站点访问边界。若日后向多人开放，应先增加管理员权限，不能直接放开共享数据编辑。
- 知流 service API 不再仅凭 Sites bypass/service bearer 放行：必须同时有平台验证的访客身份。知流所有写请求要求同源 Origin。原站后台更新任务不能不经重新授权直接切到该 API。
- 模块迁移不导入、创建或修改任何模型密钥，不发起模型调用。原模型调用逻辑保留；是否连接由主站服务端配置决定。

## 额外依赖

`fast-xml-parser ^5.11.2`、`@citation-js/core ^0.9.0`、`@citation-js/plugin-bibtex ^0.9.0`、`@citation-js/plugin-csl ^0.9.0`、`@citation-js/plugin-ris ^0.9.0`、`pdfjs-dist ^6.4.299`。

## 验证

- 在空 SQLite 数据库执行两份迁移，创建 17 张表成功。
- 提取原样查询及模板查询，使用 SQLite EXPLAIN 校验 97 条 SQL，全部通过。
- TypeScript 检查发现原源码 .ts 后缀导入与主站设置冲突，已改成无后缀相对导入。
- 不读取或调用模型 API；当前步骤不包含旧生产数据库/对象迁移和线上验收。

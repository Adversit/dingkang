# 知流 (`zhiliu-radar`)｜Spec - Plan - Task

## Spec
- **定位与入口**：个人信息雷达，入口 `/m/zhiliu-radar`（源码 `app/m/zhiliu-radar/`、`modules/zhiliu-radar/`）。
- **核心能力**：信源管理与测试、采集运行、事件编辑/合并/拆分、岗位/简报生成、模型摘要与阅读反馈。
- **存储与 API**：原生业务表 + `/api/m/zhiliu-radar/radar`（GET/POST）与 `/api/m/zhiliu-radar/service`（POST），POST 携带 `{ action, requestId, ... }`；非 `hub_states` 桥接模块。
- **前端样式**：`modules/zhiliu-radar/app/globals.css` + 统一子工作台增强层。

## Plan
- 保持 `requestId` 幂等与采集轮次反馈不变。
- 统一字体、按钮微交互、卡片过渡与焦点环，适配桌面与移动端阅读流。

## Task
- [x] 接入全局统一排版与微动效增强样式。
- [x] 在已绑定 D1 的 Preview 环境中验证 `GET/POST /api/m/zhiliu-radar/radar` 与简报保存。

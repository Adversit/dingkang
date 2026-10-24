# 共享存档面板接入

组件：`components/HubStoragePanel.tsx`；样式限定在 `HubStoragePanel.module.css`，不依赖 portal 全局 CSS。

```tsx
import HubStoragePanel, {flushHubModule, hubStorageMode} from '@/components/HubStoragePanel';

const frameRef = useRef<HTMLIFrameElement>(null);

<HubStoragePanel key={open.id} moduleId={open.id} iframeRef={frameRef}/>
<iframe ref={frameRef} src={open.path} title={open.name}/>

async function closeApp() {
  try {
    await flushHubModule(frameRef.current?.contentWindow ?? null, open.id, window.location.origin);
    setOpen(null);
  } catch (error) {
    // Present the error and KEEP the iframe mounted so unsynced data stays usable.
    setError(error instanceof Error ? error.message : '请先处理存档，再关闭此应用。');
  }
}
```

打开另一模块、返回主页、切换导航等所有会卸载当前 iframe 的动作均应复用关闭前检查。`flushHubModule` 会等待共享桥已有/待处理的保存完成，冲突或保存失败时拒绝；它不自动选择冲突、不清空状态、不创建第二个写入器。`native` 模式不调用此桥，相关业务记录的未保存提示继续由原应用负责。

暖居的固定视角 2.5D 画面中，建筑预览和选中只改变呈现状态；房间里的多边形物件热点与辅助清单都通过主站共享 `onLaunch` 打开应用。返回基地先执行上述关闭检查；成功后按页面会话记住的分类恢复原房间。存档失败时保留应用及房间选择。烘焙美术、视差、局部动态与环境音不创建业务存储，房间记忆也不属于云存档，不能用它代替应用恢复。

`mode` 可显式设为 `bridge` 或 `native`。默认 `hubStorageMode(id)` 将 7 个游戏、Agent 架构、AI PM、晚灯标为 bridge；知流、知证、EvoPM、AI 研发协作、同住及未知模块按独立业务存储处理，只显示「业务记录与附件的保存状态，请查看应用内提示」，不宣称其已同步。

面板会定位当前同源模块的 `HubStorage`（包括月下二层 iframe），监听真实状态与本机缓存错误；显示本机/云端冲突摘要，操作均调用现有 `flush`、`resolveConflict`、`exportData`、`exportRecoveryData`。云端选择仍使用桥的先备份后替换保证。

本机导出不会先 flush，因此离线修改也能取得。导出弹窗提供只读完整 JSON、复制及文件下载；恢复副本使用同样格式，可交给数据中心原有导入流程。面板不提供自动恢复按钮，避免一键覆盖当前存档。

`ModuleStorageGate` 在顶层独立打开时自动显示面板；嵌入 portal 时不重复显示。静态游戏独立 HTML 和月下原 iframe wrapper 未额外注入 React 面板：统一 portal 中使用上述组件即可；如要给所有独立打开入口补齐同一面板，建议统一打开带面板的 frame wrapper，而非给各静态游戏复制一套实现。

入口连接与离开保护测试覆盖同源嵌套与模块隔离、待保存必须等待、冲突/失败不允许离开，以及独立业务存储不伪报 bridge 同步。发布时应联合运行共享桥的冲突与持久化测试，并在实际页面检查打开应用、保存后返回房间与失败留在应用内的流程。

"use client";

import {useEffect, useRef, useState, type RefObject} from 'react';
import type {HubStorageData, HubStorageStatus} from './ModuleStorageGate';
import {findModuleStorage, hubStorageMode, storageErrorMessage, isSignedOutStorageFailure, type HubStorageMode, type ModuleStorageBinding} from '@/lib/hub/storage-panel';
import styles from './HubStoragePanel.module.css';

export {flushHubModule, hubStorageMode} from '@/lib/hub/storage-panel';

export type HubStoragePanelProps = {
  moduleId: string;
  /** Omit only when mounting inside the module document itself. */
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  mode?: HubStorageMode;
  className?: string;
};

const loading: HubStorageStatus = {state: 'loading', revision: 0, updatedAt: null};
const labels: Record<HubStorageStatus['state'], string> = {
  loading: '正在连接存档', saved: '云端已同步', pending: '有待同步的修改',
  offline: '云端暂不可用', conflict: '两份存档待选择', error: '存档连接异常',
};
const errorText = storageErrorMessage;

/** One toolbar for bridge-backed saves. Native business data stays in its own UI. */
export default function HubStoragePanel({moduleId, iframeRef, mode, className = ''}: HubStoragePanelProps) {
  // Evening stores conversations, memories and journal pages through its native
  // API. The state bridge covers only the avatar's interface preference.
  const preferencesOnly = moduleId === 'wandeng-evening';
  const bindingRef = useRef<ModuleStorageBinding | null>(null);
  const generation = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [binding, setBinding] = useState<ModuleStorageBinding | null>(null);
  const [storageMode, setStorageMode] = useState<HubStorageMode>(mode ?? hubStorageMode(moduleId));
  const [status, setStatus] = useState<HubStorageStatus>(loading);
  const [hydrated, setHydrated] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [cacheWarning, setCacheWarning] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cloud, setCloud] = useState<{count: number; revision: number} | null>(null);
  const [cloudError, setCloudError] = useState('');
  const [exported, setExported] = useState<{kind: 'local' | 'recovery'; data: HubStorageData} | null>(null);
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    const current = ++generation.current;
    let active = true, unbind = () => {};
    bindingRef.current = null;
    setBinding(null); setStatus(loading); setHydrated(false); setLoadFailed(false); setSignedOut(false);
    setLocalCount(null); setHasRecovery(false); setCacheWarning(''); setError(''); setBusy(false); setExported(null);
    const sync = () => {
      if (!active || generation.current !== current) return;
      const found = bindingRef.current;
      if (!found) return;
      setStatus(found.bridge.status);
      try {
        setLocalCount(Object.keys(found.bridge.exportData().values).length);
        setHasRecovery(!!found.bridge.exportRecoveryData());
      } catch { /* No storage access until hydration completes. */ }
    };
    const connect = () => {
      if (!active) return;
      const root = iframeRef ? iframeRef.current?.contentWindow ?? null : window;
      const nextMode = mode ?? hubStorageMode(moduleId, root);
      setStorageMode(nextMode);
      if (nextMode === 'native') {
        if (bindingRef.current) { unbind(); bindingRef.current = null; setBinding(null); setExported(null); setError(''); }
        return;
      }
      const found = findModuleStorage(root, moduleId, window.location.origin);
      if (found?.bridge === bindingRef.current?.bridge) return;
      unbind(); bindingRef.current = found; setBinding(found);
      setHydrated(false); setLoadFailed(false); setSignedOut(false); setLocalCount(null); setHasRecovery(false);
      setExported(null); setCopyMessage(''); setCacheWarning(''); setError(''); setBusy(false);
      setStatus(found?.bridge.status ?? loading);
      if (!found) return;
      const onStatus = () => sync();
      const onCacheError = () => {
        if (active) setCacheWarning('本机缓存空间不足。请确认云端已同步，或导出本机副本后再关闭。');
      };
      found.window.addEventListener('hub-storage-status', onStatus);
      found.window.addEventListener('hub-storage-cache-error', onCacheError);
      unbind = () => {
        found.window.removeEventListener('hub-storage-status', onStatus);
        found.window.removeEventListener('hub-storage-cache-error', onCacheError);
      };
      found.bridge.ready.then(() => {
        if (active && bindingRef.current?.bridge === found.bridge) { setHydrated(true); setError(''); sync(); }
      }, cause => {
        if (active && bindingRef.current?.bridge === found.bridge) {
          const guest = isSignedOutStorageFailure(cause, found.bridge);
          setLoadFailed(true); setSignedOut(guest); setError(guest ? '' : errorText(cause)); sync();
        }
      });
      sync();
    };
    connect();
    // Module documents can navigate within the same outer iframe (e.g. arcade → expedition).
    const interval = window.setInterval(connect, 1000);
    const frame = iframeRef?.current;
    frame?.addEventListener('load', connect);
    return () => { active = false; generation.current++; unbind(); clearInterval(interval); frame?.removeEventListener('load', connect); };
  }, [moduleId, iframeRef, mode]);

  useEffect(() => {
    setCloud(null); setCloudError('');
    if (status.state !== 'conflict' || !binding?.bridge.userId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/hub/state/${encodeURIComponent(moduleId)}`, {
          cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
          headers: {'X-Hub-User-Id': binding.bridge.userId!},
        });
        if (!response.ok) throw new Error('暂时无法读取云端摘要；本机存档仍保留。');
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('云端摘要格式异常，请稍后重试。');
        const remote = body as Record<string, unknown>;
        if (typeof remote.revision !== 'number' || !Number.isSafeInteger(remote.revision) || !remote.values || typeof remote.values !== 'object' || Array.isArray(remote.values)) throw new Error('云端摘要格式异常，请稍后重试。');
        if (!controller.signal.aborted) setCloud({count: Object.keys(remote.values).length, revision: remote.revision});
      } catch (cause) { if (!controller.signal.aborted) setCloudError(errorText(cause)); }
    })();
    return () => controller.abort();
  }, [binding, moduleId, status.state]);

  useEffect(() => { if (exported && !dialogRef.current?.open) dialogRef.current?.showModal(); }, [exported]);

  function currentBinding() {
    const root = iframeRef ? iframeRef.current?.contentWindow ?? null : window;
    const found = findModuleStorage(root, moduleId, window.location.origin);
    if (!found || found.bridge !== bindingRef.current?.bridge) throw new Error('应用页面已变化，请等待存档重新连接。');
    return found;
  }
  async function run(action: () => Promise<unknown>) {
    const current = generation.current;
    const currentBridge = bindingRef.current?.bridge;
    setError(''); setBusy(true);
    try { await action(); }
    catch (cause) { if (generation.current === current && bindingRef.current?.bridge === currentBridge) setError(errorText(cause)); }
    finally { if (generation.current === current && bindingRef.current?.bridge === currentBridge) setBusy(false); }
  }
  async function retrySync() {
    const current = currentBinding();
    if (loadFailed) { current.window.location.reload(); return; }
    await current.bridge.flush();
    // An offline hydration can use a clean cached copy. With no dirty values,
    // flush succeeds without a request and leaves status offline. Rehydrate that
    // same document only after flush proves there are no queued writes remaining.
    if (current.bridge.status.state === 'offline') {
      if (currentBinding().bridge !== current.bridge) throw new Error('应用页面已变化，请等待存档重新连接。');
      current.window.location.reload();
    }
  }
  function showExport(kind: 'local' | 'recovery') {
    try {
      const bridge = currentBinding().bridge;
      const data = kind === 'local' ? bridge.exportData() : bridge.exportRecoveryData();
      if (!data) { setError('此应用还没有保留过冲突恢复副本。'); return; }
      setCopyMessage(''); setExported({kind, data});
    } catch (cause) { setError(errorText(cause)); }
  }
  function download() {
    if (!exported) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(exported.data, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url; link.download = `${moduleId}-${exported.kind === 'recovery' ? '恢复副本' : '本机存档'}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyExport() {
    if (!exported) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(JSON.stringify(exported.data, null, 2));
      setCopyMessage('已复制存档 JSON。');
    } catch { setCopyMessage('未能自动复制，可选中上方文本手动复制。'); }
  }

  if (storageMode === 'native') return <aside className={`${styles.panel} ${className}`} aria-label="应用存档"><span className={styles.label}>{moduleId === 'novel-studio' ? '作品存档' : '存档与附件'}</span><span className={styles.description}>{moduleId === 'novel-studio' ? '在「作品」中导出与导入。' : '在应用内查看和管理。'}</span></aside>;

  if (signedOut) return <aside className={`${styles.panel} ${className}`} aria-label="应用存档"><div className={styles.row}><strong className={styles.label}>登录后同步存档</strong><a className={styles.signIn} target="_top" href={`/signin-with-chatgpt?return_to=${encodeURIComponent('/?app=' + moduleId)}`}>登录</a></div></aside>;

  return <aside className={`${styles.panel} ${className}`} aria-label="应用存档">
    {preferencesOnly && <p className={styles.note}>此处仅同步界面偏好。对话、记忆与手账的保存和导出，请使用应用内入口。</p>}
    <div className={styles.row}>
      <div className={styles.state} role="status" aria-live="polite"><span className={styles.dot} data-state={status.state}/><strong>{preferencesOnly ? `界面偏好 · ${labels[status.state]}` : labels[status.state]}</strong></div>
      <div className={styles.actions}>
        {status.state !== 'saved' && <button type="button" disabled={busy || !binding || status.state === 'conflict'} onClick={() => void run(retrySync)}>{busy ? '处理中…' : loadFailed ? '重新加载存档' : status.state === 'offline' ? '重新连接存档' : '重试同步'}</button>}
        <button type="button" disabled={busy || !hydrated} onClick={() => showExport('local')}>{preferencesOnly ? '导出界面偏好' : '导出本机存档'}</button>
        {hasRecovery && <button type="button" disabled={busy || !hydrated} onClick={() => showExport('recovery')}>导出恢复副本</button>}
      </div>
    </div>
    {hydrated && <details className={styles.details}><summary>存档详情</summary><p>版本 {status.revision}{localCount !== null ? `，${localCount} 项记录` : ''}{status.updatedAt ? `。最近同步：${new Date(status.updatedAt).toLocaleString('zh-CN')}` : '。'}</p></details>}
    {(status.state === 'pending' || status.state === 'offline') && <p className={styles.note}>修改尚未全部同步。可导出本机存档，或重试同步后再离开。</p>}
    {status.state === 'conflict' && <div className={styles.conflict}>
      <div className={styles.copies}><span><b>此设备</b>{localCount ?? '—'} 项记录 · 版本 {status.revision}</span><span><b>云端</b>{cloud ? `${cloud.count} 项记录 · 版本 ${cloud.revision}` : cloudError || '正在读取摘要…'}</span></div>
      <p>两份存档不会自动合并。读取云端最新进度前，会先保留此设备的恢复副本。</p>
      <div className={styles.actions}>
        <button type="button" disabled={busy || !hydrated} onClick={() => void run(() => currentBinding().bridge.resolveConflict('local'))}>保留本机并同步</button>
        <button type="button" disabled={busy || !hydrated} onClick={() => void run(() => currentBinding().bridge.resolveConflict('cloud'))}>读取云端，保留本机副本</button>
      </div>
    </div>}
    {cacheWarning && <p className={styles.error} role="alert">{cacheWarning}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!error && status.state === 'error' && <p className={styles.error}>请检查账号与网络；未同步的内容可在恢复连接后继续处理。</p>}
    {exported && <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="hub-export-title" onClose={() => setExported(null)}>
      <div className={styles.row}><h2 id="hub-export-title">{exported.kind === 'local' ? '本机存档副本' : '冲突前的恢复副本'}</h2><button type="button" onClick={() => dialogRef.current?.close()} aria-label="关闭存档导出">关闭</button></div>
      <p>{preferencesOnly ? '此副本仅包含界面偏好，不包含对话、记忆或手账。' : exported.kind === 'local' ? '包含当前设备尚未同步的修改。' : '这是最近一次读取云端前保留的本机内容。'}可在数据中心通过「导入备份」恢复。</p>
      <textarea aria-label="存档 JSON" readOnly spellCheck={false} value={JSON.stringify(exported.data, null, 2)}/>
      <div className={styles.actions}><button type="button" onClick={download}>下载 JSON</button><button type="button" onClick={() => void copyExport()}>复制 JSON</button></div>
      <p className={styles.note} role="status">{copyMessage || '若下载不可用，可以保留上方完整 JSON 文本。'}</p>
    </dialog>}
  </aside>;
}

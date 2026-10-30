"use client";

import { useEffect, useState, type ReactNode } from "react";
import HubStoragePanel from './HubStoragePanel';

export type HubStorageStatus = {
  state: 'loading' | 'saved' | 'pending' | 'offline' | 'conflict' | 'error';
  revision: number;
  updatedAt: string | null;
  message?: string;
};

export type HubStorageData = { moduleId: string; values: Record<string, string>; revision: number };
export type StorageBridge = {
  moduleId: string;
  userId: string | null;
  ready: Promise<unknown>;
  readonly status: HubStorageStatus;
  readonly canLeaveWithoutSaving?: boolean;
  flush(): Promise<HubStorageData>;
  exportData(): HubStorageData;
  exportRecoveryData(): HubStorageData | null;
  importData(values: Record<string, string>): Promise<HubStorageData>;
  resolveConflict(choice: 'local' | 'cloud'): Promise<HubStorageData>;
};

declare global {
  interface Window {
    HubStorage?: StorageBridge;
  }
}

/** Use only inside a module document/iframe, never around the shared hub UI. */
export function ModuleStorageGate({
  moduleId,
  children,
}: {
  moduleId: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => { setStandalone(window.parent === window); }, []);

  useEffect(() => {
    let active = true;
    setReady(false);
    setError(null);
    const fail = (reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "数据暂时无法恢复，请重新加载。");
    };
    const waitForStorage = () => {
      const bridge = window.HubStorage;
      if (!bridge || bridge.moduleId !== moduleId) {
        fail(new Error("当前页面的数据空间与模块不一致，请重新加载。"));
        return;
      }
      bridge.ready.then(() => { if (active) setReady(true); }, fail);
    };
    const onScriptError = () => fail(new Error("存储组件未能加载，请检查网络后重试。"));
    if (window.HubStorage) {
      waitForStorage();
      return () => { active = false; };
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-hub-storage-loader]');
    if (script && script.dataset.module !== moduleId) {
      fail(new Error("一个模块页面只能使用一个数据空间。"));
      return () => { active = false; };
    }
    if (!script) {
      script = document.createElement("script");
      script.src = "/hub-storage.js";
      script.dataset.module = moduleId;
      script.dataset.hubStorageLoader = "true";
      script.addEventListener("load", waitForStorage);
      script.addEventListener("error", onScriptError);
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", waitForStorage);
      script.addEventListener("error", onScriptError);
    }
    return () => {
      active = false;
      script?.removeEventListener("load", waitForStorage);
      script?.removeEventListener("error", onScriptError);
    };
  }, [moduleId]);

  if (ready) return <>{standalone && <HubStoragePanel moduleId={moduleId}/>}{children}</>;
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#faf9f6", color: "#242424", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 460 }} role={error ? "alert" : "status"}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>{error ? "暂时无法打开已保存的数据" : "正在恢复你的数据…"}</p>
        <p style={{ lineHeight: 1.7, opacity: 0.75 }}>{error || "确认账号并同步记录后，将继续打开此模块。"}</p>
        {error && <button type="button" onClick={() => window.location.reload()} style={{ padding: "9px 16px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}>重新加载</button>}
      </div>
    </div>
  );
}

export default ModuleStorageGate;

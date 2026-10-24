import { initialState } from './game.js';
import { normalizeSave } from './save-format.js';

// HubStorage owns identity, namespaces, revision checks and retries. This adapter
// preserves the game's UI contract without a second independent cloud sync loop.
export const LEGACY_KEY = 'mistbound-letters-v1';
const BACKUP_KEY = 'mistbound-letters-backups-v1';
const labels = {
  loading: '正在恢复此账号的旅途…',
  saved: '旅途已同步到云端',
  pending: '已保留本机进度，正在同步…',
  offline: '当前离线，旅途已保存在此设备',
  conflict: '发现两份不同旅途，请选择保留哪一份',
  error: '云端暂不可用，请保留副本后重试',
};

export class CloudSave {
  constructor({storage, apply, changed = () => {}}) {
    this.storage = storage;
    this.apply = apply;
    this.changed = changed;
    this.status = labels.loading;
    this.canPlay = false;
    this.ready = false;
    this.busy = false;
    this.localIssue = false;
    this.conflict = null;
    this.legacy = null;
    this.record = {save: initialState(), revision: 0};
    this.closed = false;
    this.onStatus = event => this.updateStatus(event.detail);
    window.addEventListener('hub-storage-status', this.onStatus);
  }

  updateStatus(status = window.HubStorage?.status) {
    if (this.closed) return;
    const state = status?.state ?? 'error';
    this.status = labels[state] ?? labels.error;
    this.busy = state === 'loading' || state === 'pending';
    this.ready = state !== 'loading';
    this.record.revision = status?.revision ?? this.record.revision;
    this.conflict = state === 'conflict' ? {kind: 'revision', remote: {save: null}} : null;
    this.changed(this);
  }

  readSave() {
    const raw = this.storage?.getItem(LEGACY_KEY);
    if (!raw) return initialState();
    const save = normalizeSave(JSON.parse(raw));
    if (!save) throw new Error('invalid_save');
    return save;
  }

  async connect() {
    if (this.closed) return;
    await window.HubStorage.ready;
    try {
      this.record.save = this.readSave();
      this.localIssue = false;
      this.canPlay = true;
      this.apply(structuredClone(this.record.save));
    } catch {
      // Keep invalid bytes untouched instead of saving defaults over an import.
      this.canPlay = false;
      this.localIssue = true;
      this.status = '旅途存档无法读取，请先在存档中心导出原始记录';
      this.changed(this);
      return;
    }
    this.updateStatus();
  }

  save(state) {
    const save = normalizeSave(state);
    if (!save || !this.canPlay) return false;
    try {
      this.storage.setItem(LEGACY_KEY, JSON.stringify(save));
      this.record.save = save;
      this.localIssue = false;
      this.updateStatus();
      return true;
    } catch {
      this.localIssue = true;
      this.status = '本机保存失败，请立即导出旅途副本';
      this.changed(this);
      return false;
    }
  }

  backup(save, revision, reason) {
    try {
      const raw = this.storage.getItem(BACKUP_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const history = Array.isArray(parsed) ? parsed.slice(-1) : [];
      history.push({save, revision, reason, savedAt: new Date().toISOString()});
      this.storage.setItem(BACKUP_KEY, JSON.stringify(history));
      return true;
    } catch {
      this.localIssue = true;
      return false;
    }
  }

  async flush() {
    await window.HubStorage.flush();
    this.updateStatus();
  }

  async resolve(choice) {
    if (!this.conflict) return false;
    if (!this.backup(this.record.save, this.record.revision, 'before-conflict-resolution')) return false;
    await window.HubStorage.resolveConflict(choice === 'remote' ? 'cloud' : 'local');
    await this.connect();
    return true;
  }

  prepareLegacy() { return false; }
  storageChanged() { /* HubStorage owns cross-tab coordination. */ }
  dispose() {
    this.closed = true;
    window.removeEventListener('hub-storage-status', this.onStatus);
  }
}

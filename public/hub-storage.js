(function () {
  'use strict';
  var script = document.currentScript;
  var moduleId = script && script.getAttribute('data-module');
  if (!moduleId || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(moduleId)) throw new Error('A valid hub storage module is required.');
  if (window.HubStorage) {
    if (window.HubStorage.moduleId !== moduleId) throw new Error('Only one storage module may run in a document.');
    return;
  }

  var storage = window.localStorage;
  var proto = Storage.prototype;
  var native = {
    getItem: proto.getItem, setItem: proto.setItem, removeItem: proto.removeItem,
    clear: proto.clear, key: proto.key, length: Object.getOwnPropertyDescriptor(proto, 'length')
  };
  var values = Object.create(null);
  var userId = null, cacheKey = null, revision = 0, updatedAt = null;
  var initialized = false, dirty = false, disabled = false, replacing = false, mutationVersion = 0;
  var initializationFailed = false, pendingCache = false;
  var conflict = null, inFlight = null, timer = null, retryTimer = null, retryDelay = 5000;
  var status = { state: 'loading', revision: 0, updatedAt: null };
  var api = '/api/hub/state/' + encodeURIComponent(moduleId);
  var hasOwn = Function.call.bind(Object.prototype.hasOwnProperty);

  function copy(input) {
    var out = Object.create(null);
    Object.keys(input).forEach(function (key) { out[key] = input[key]; });
    return out;
  }
  function checkedValues(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Storage values must be an object.');
    var out = Object.create(null);
    Object.keys(input).forEach(function (key) {
      if (typeof input[key] !== 'string') throw new Error('Each storage value must be a string.');
      out[key] = input[key];
    });
    return out;
  }
  function checkedImportValues(input) {
    var out = checkedValues(input), keys = Object.keys(out), encoder = new TextEncoder();
    if (keys.length > 200) throw fault('每个应用最多导入 200 项存档。');
    keys.forEach(function (key) {
      if (!key || key.length > 200 || ['__proto__', 'constructor', 'prototype'].indexOf(key) !== -1) throw fault('备份含不支持的存档键。');
      if (encoder.encode(out[key]).byteLength > 512 * 1024) throw fault('单项存档超过 512 KiB。');
    });
    if (encoder.encode(JSON.stringify(out)).byteLength > 2 * 1024 * 1024) throw fault('此应用存档超过 2 MiB。');
    return out;
  }
  function same(a, b) {
    var keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(function (key) { return hasOwn(b, key) && a[key] === b[key]; });
  }
  function fault(message, name) {
    var error = new Error(message);
    error.name = name || 'HubStorageError';
    return error;
  }
  function publish(state, message) {
    status = { state: state, revision: revision, updatedAt: updatedAt };
    if (message) status.message = message;
    window.dispatchEvent(new CustomEvent('hub-storage-status', { detail: Object.assign({}, status, { moduleId: moduleId }) }));
  }
  function requireReady() {
    if (disabled) throw fault('Account changed or access ended. Reload before continuing.', 'SecurityError');
    if (!initialized) throw fault('Await window.HubStorage.ready before using module storage.', 'InvalidStateError');
  }
  function requireWritable() {
    requireReady();
    if (replacing) throw fault('正在载入导入的存档，请稍后再保存。', 'InvalidStateError');
  }
  function persist() {
    if (!cacheKey || !initialized) return;
    try {
      native.setItem.call(storage, cacheKey, JSON.stringify({
        version: 1, userId: userId, moduleId: moduleId, initialized: true,
        values: values, revision: revision, updatedAt: updatedAt, pending: dirty
      }));
    } catch (error) {
      // Cloud persistence can still succeed when the browser cache is full.
      window.dispatchEvent(new CustomEvent('hub-storage-cache-error', { detail: { moduleId: moduleId, message: String(error && error.message || error) } }));
    }
  }
  function readCache() {
    try {
      var raw = native.getItem.call(storage, cacheKey);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (cached.version !== 1 || cached.userId !== userId || cached.moduleId !== moduleId || cached.initialized !== true || !Number.isSafeInteger(cached.revision) || cached.revision < 0) return null;
      return { values: checkedValues(cached.values), revision: cached.revision, updatedAt: cached.updatedAt || null, pending: cached.pending === true };
    } catch (_) { return null; }
  }
  function preserveRecoveryCopy() {
    // Keep this outside the game's logical values: choosing cloud replaces that
    // whole map, including any game-specific backup keys stored inside it.
    var key = cacheKey + ':recovery';
    var snapshot = JSON.stringify({
      version: 1, userId: userId, moduleId: moduleId,
      values: copy(values), revision: revision, updatedAt: updatedAt,
      pending: dirty, savedAt: new Date().toISOString(), reason: 'before-cloud-conflict'
    });
    try {
      native.setItem.call(storage, key, snapshot);
      if (native.getItem.call(storage, key) !== snapshot) throw fault('Recovery copy could not be verified.');
    } catch (_) {
      var error = fault('无法保留此设备的恢复副本。请先导出本机存档或释放浏览器空间，再读取云端。', 'RecoveryBackupError');
      publish('conflict', error.message);
      throw error;
    }
  }
  function exportRecoveryData() {
    requireReady();
    var raw = native.getItem.call(storage, cacheKey + ':recovery');
    if (!raw) return null;
    var saved = JSON.parse(raw);
    if (saved.version !== 1 || saved.userId !== userId || saved.moduleId !== moduleId ||
        !Number.isSafeInteger(saved.revision) || saved.revision < 0) throw fault('The recovery copy has invalid metadata.');
    return { moduleId: moduleId, values: checkedValues(saved.values), revision: saved.revision };
  }
  function headers(json) {
    var result = { 'X-Hub-User-Id': userId };
    if (json) result['Content-Type'] = 'application/json';
    return result;
  }
  function parseState(body, fallbackValues) {
    var state = body && body.current ? body.current : body;
    if (!state || !Number.isSafeInteger(state.revision) || state.revision < 0) throw fault('The server returned invalid storage metadata.');
    return { values: checkedValues(state.values === undefined ? fallbackValues : state.values), revision: state.revision, updatedAt: state.updatedAt || null };
  }
  async function session() {
    var response = await fetch('/api/hub/session', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw fault('Unable to verify your account.');
    var account = await response.json();
    if (!account.authenticated || typeof account.userId !== 'string' || !account.userId) throw fault('Sign in to load your saved data.', 'SecurityError');
    return account;
  }
  async function assertSession() {
    var account;
    try { account = await session(); }
    catch (error) {
      if (error.name === 'SecurityError') { disabled = true; publish('error', error.message); }
      throw error;
    }
    if (account.userId !== userId) {
      disabled = true;
      publish('error', 'The signed-in account changed. Reload to load that account\'s data.');
      throw fault('The signed-in account changed.', 'SecurityError');
    }
  }
  async function getCloud() {
    var response = await fetch(api, { credentials: 'same-origin', cache: 'no-store', headers: headers(false) });
    if (response.status === 401 || response.status === 403) {
      disabled = true;
      throw fault('Your account no longer has access. Reload to sign in.', 'SecurityError');
    }
    if (!response.ok) throw fault('Cloud data could not be restored (' + response.status + ').');
    return parseState(await response.json());
  }
  function cancelRetry() {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    retryDelay = 5000;
  }
  function queueRetry() {
    if (retryTimer !== null || conflict || disabled || !dirty) return;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      flush().catch(function () {});
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 60000);
  }
  function queueSave() {
    if (timer !== null) clearTimeout(timer);
    if (conflict || disabled) return;
    timer = setTimeout(function () { timer = null; flush().catch(function () {}); }, 650);
  }
  function changed() {
    dirty = true;
    mutationVersion += 1;
    persist();
    publish(conflict ? 'conflict' : 'pending');
    queueSave();
  }
  function setValue(key, value) {
    requireWritable();
    key = String(key); value = String(value);
    if (hasOwn(values, key) && values[key] === value) return;
    values[key] = value;
    changed();
  }
  function removeValue(key) {
    requireWritable(); key = String(key);
    if (!hasOwn(values, key)) return;
    delete values[key]; changed();
  }
  function clearValues() {
    requireWritable();
    if (!Object.keys(values).length) return;
    values = Object.create(null); changed();
  }

  // This realm belongs to one module iframe. The parent document's prototype is untouched.
  // sessionStorage retains its native behavior; only this document's localStorage is scoped.
  proto.getItem = function (key) {
    if (this !== storage) return native.getItem.call(this, key);
    requireReady(); key = String(key);
    return hasOwn(values, key) ? values[key] : null;
  };
  proto.setItem = function (key, value) {
    if (this !== storage) return native.setItem.call(this, key, value);
    if (arguments.length < 2) throw new TypeError('setItem requires a key and value.');
    setValue(key, value);
  };
  proto.removeItem = function (key) {
    if (this !== storage) return native.removeItem.call(this, key);
    removeValue(key);
  };
  proto.clear = function () {
    if (this !== storage) return native.clear.call(this);
    clearValues();
  };
  proto.key = function (index) {
    if (this !== storage) return native.key.call(this, index);
    requireReady();
    var key = Object.keys(values)[Number(index) >>> 0];
    return key === undefined ? null : key;
  };
  Object.defineProperty(proto, 'length', {
    configurable: native.length ? native.length.configurable : true,
    enumerable: native.length ? native.length.enumerable : true,
    get: function () {
      if (this !== storage) return native.length.get.call(this);
      requireReady(); return Object.keys(values).length;
    }
  });

  async function writeOnce(keepalive) {
    requireReady();
    if (conflict) throw fault('Choose local or cloud data before continuing.', 'ConflictError');
    if (!dirty) return exportData();
    if (timer !== null) clearTimeout(timer);
    timer = null;
    var snapshot = copy(values), version = mutationVersion, expected = revision;
    try {
      await assertSession();
      var body = JSON.stringify({ values: snapshot, expectedRevision: expected });
      var response = await fetch(api, {
        method: 'PUT', credentials: 'same-origin', headers: headers(true),
        // Fetch limits keepalive bodies to 64 KiB, while the state API accepts
        // 2 MiB. Ordinary saves must not consume the browser's unload budget.
        body: body, keepalive: keepalive === true && new TextEncoder().encode(body).byteLength <= 64 * 1024
      });
      if (response.status === 401 || response.status === 403) {
        disabled = true;
        throw fault('Your account no longer has access. Reload to sign in.', 'SecurityError');
      }
      if (response.status === 409) {
        var remote = parseState(await response.json());
        // A lost response may make a successful previous write look like a conflict.
        if (same(remote.values, snapshot)) {
          revision = remote.revision; updatedAt = remote.updatedAt;
          dirty = mutationVersion !== version;
          persist(); cancelRetry(); publish(dirty ? 'pending' : 'saved');
          if (dirty) queueSave();
          return exportData();
        }
        conflict = remote;
        persist(); cancelRetry(); publish('conflict', 'Cloud data changed in another session. Choose which copy to keep.');
        throw fault('Cloud data changed in another session.', 'ConflictError');
      }
      if (!response.ok) throw fault('Cloud save failed (' + response.status + ').');
      var saved = parseState(await response.json(), snapshot);
      revision = saved.revision; updatedAt = saved.updatedAt;
      dirty = mutationVersion !== version;
      persist(); cancelRetry(); publish(dirty ? 'pending' : 'saved');
      if (dirty) queueSave();
      return exportData();
    } catch (error) {
      if (error.name !== 'ConflictError') {
        publish(disabled ? 'error' : 'offline', error.message || 'Cloud is unavailable; changes remain queued on this device.');
        persist(); queueRetry();
      }
      throw error;
    }
  }
  async function flush(keepalive) {
    await bridge.ready;
    // Drain changes that arrive during an in-flight save before reporting completion.
    // This also makes importData safe when another autosave was already running.
    for (;;) {
      if (!inFlight) inFlight = writeOnce(keepalive);
      var current = inFlight;
      try { await current; }
      finally { if (inFlight === current) inFlight = null; }
      requireReady();
      if (!dirty) return exportData();
    }
  }
  function exportData() {
    requireReady();
    return { moduleId: moduleId, values: copy(values), revision: revision };
  }
  function reloadModule(reason) {
    window.dispatchEvent(new CustomEvent('hub-storage-reload', { detail: { moduleId: moduleId, reason: reason } }));
    // Only this module document reloads; the parent hub never installs this bridge.
    if (window.location && typeof window.location.reload === 'function') window.location.reload();
  }
  async function importData(input) {
    var imported = checkedImportValues(input);
    await bridge.ready; requireWritable();
    if (conflict) throw fault('请先处理本机与云端的存档冲突，再导入。', 'ConflictError');
    // The running game still holds its old in-memory state. Reject its autosaves
    // until the replacement document has hydrated the imported snapshot.
    replacing = true;
    try {
      if (!same(values, imported)) { values = imported; changed(); }
      var result = await flush();
      reloadModule('import');
      return result;
    } catch (error) { replacing = false; throw error; }
  }
  async function resolveConflict(choice) {
    await bridge.ready; requireReady();
    if (choice !== 'local' && choice !== 'cloud') throw fault('Choose local or cloud.');
    if (!conflict) return exportData();
    if (choice === 'cloud') {
      await assertSession();
      var remote = await getCloud();
      // Another resolution may finish while the fresh cloud read is in flight.
      // Do not replace its recovery copy with the newly adopted cloud values.
      requireReady();
      if (!conflict) return exportData();
      preserveRecoveryCopy();
      values = remote.values; revision = remote.revision; updatedAt = remote.updatedAt;
      conflict = null; dirty = false; mutationVersion += 1;
      persist(); cancelRetry(); publish('saved');
      var result = exportData();
      reloadModule('cloud');
      return result;
    }
    revision = conflict.revision; updatedAt = conflict.updatedAt;
    conflict = null; dirty = true;
    persist(); publish('pending');
    return flush();
  }
  var bridge = {
    moduleId: moduleId, ready: null, flush: flush, exportData: exportData, exportRecoveryData: exportRecoveryData,
    importData: importData, resolveConflict: resolveConflict
  };
  Object.defineProperty(bridge, 'status', { enumerable: true, get: function () { return Object.assign({}, status); } });
  Object.defineProperty(bridge, 'userId', { enumerable: true, get: function () { return userId; } });
  Object.defineProperty(bridge, 'canLeaveWithoutSaving', { enumerable: true, get: function () {
    // Before hydration all logical reads/writes are blocked. Only a failed,
    // untouched initialization can leave without flush; never infer this from
    // an offline/error label after an account or its device cache was loaded.
    return initializationFailed && !initialized && !dirty && !pendingCache &&
      mutationVersion === 0 && !conflict && !inFlight;
  } });
  window.HubStorage = bridge;
  bridge.ready = (async function () {
    try {
      var account = await session();
      userId = account.userId;
      cacheKey = 'hub.storage.v1:' + encodeURIComponent(userId) + ':' + encodeURIComponent(moduleId);
      var cached = readCache(), remote;
      pendingCache = !!(cached && cached.pending);
      try { remote = await getCloud(); }
      catch (error) {
        if (!cached || error.name === 'SecurityError') throw error;
        values = cached.values; revision = cached.revision; updatedAt = cached.updatedAt;
        dirty = cached.pending; initialized = true;
        publish('offline', 'Cloud is unavailable. Using this account\'s saved device copy.');
        queueRetry();
        return bridge;
      }
      initialized = true;
      if (cached && cached.pending && !same(cached.values, remote.values)) {
        values = cached.values; revision = cached.revision; updatedAt = cached.updatedAt; dirty = true;
        if (remote.revision !== cached.revision) {
          conflict = remote;
          publish('conflict', 'Queued changes and cloud data differ. Choose which copy to keep.');
        } else { publish('pending'); queueSave(); }
      } else {
        values = remote.values; revision = remote.revision; updatedAt = remote.updatedAt;
        dirty = false; publish('saved');
      }
      persist();
      return bridge;
    } catch (error) {
      initializationFailed = true;
      publish(error.name === 'SecurityError' ? 'error' : 'offline', error.message || 'Saved data could not be restored.');
      throw error;
    }
  })();
  // Gate/loaders handle the rejection. Avoid an unhandled rejection before they attach.
  bridge.ready.catch(function () {});
  window.addEventListener('online', function () { if (initialized && dirty && !conflict && !disabled) flush().catch(function () {}); });
  window.addEventListener('pagehide', function () { if (initialized && dirty && !conflict && !disabled) flush(true).catch(function () {}); });
}());

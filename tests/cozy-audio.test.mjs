import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/hub/cozy-audio.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;

/** Browser-facing observations only: contexts, audible sources, timers and listeners. */
function browser({deferResume = false} = {}) {
  const contexts = [], timers = new Map(), listeners = new Map(), playing = [];
  let timerId = 0;
  class Parameter {
    value = 0;
    cancelScheduledValues() {}
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
    setTargetAtTime(value) { this.value = value; }
  }
  class Node {
    connections = [];
    disconnected = false;
    gain = new Parameter();
    frequency = new Parameter();
    Q = new Parameter();
    connect(target) { this.connections.push(target); return target; }
    disconnect() { this.connections = []; this.disconnected = true; }
  }
  class Source extends Node {
    started = false;
    stopped = false;
    start() { this.started = true; }
    stop(when) { if (when === undefined || when <= 0) this.stopped = true; }
  }
  class AudioContext {
    state = 'suspended';
    currentTime = 0;
    sampleRate = 8000;
    destination = new Node();
    nodes = [];
    sources = [];
    resumes = 0;
    closes = 0;
    constructor() { contexts.push(this); }
    resume() {
      this.resumes++;
      if (!deferResume) { this.state = 'running'; return Promise.resolve(); }
      return new Promise(resolve => {
        this.releaseResume = () => {
          if (this.state !== 'closed') this.state = 'running';
          resolve();
        };
      });
    }
    close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
    node() { const node = new Node(); this.nodes.push(node); return node; }
    source() { const node = new Source(); this.nodes.push(node); this.sources.push(node); return node; }
    createGain() { return this.node(); }
    createBiquadFilter() { return this.node(); }
    createBufferSource() { return this.source(); }
    createOscillator() { return this.source(); }
    createBuffer(_channels, length) { const data = new Float32Array(length); return {getChannelData: () => data}; }
  }
  const document = {
    hidden: false,
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
    },
    removeEventListener(name, handler) { listeners.get(name)?.delete(handler); },
  };
  const window = {
    AudioContext,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, {callback, delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const sandboxModule = {exports: {}};
  vm.runInNewContext(compiled, {module: sandboxModule, exports: sandboxModule.exports, window, document, Float32Array});
  const controller = sandboxModule.exports.createCozyAudio(value => playing.push(value));
  return {
    controller, contexts, timers, playing,
    audible: () => contexts.some(context => context.state === 'running' && context.sources.some(source => source.started && !source.stopped)),
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    visibility(hidden) {
      document.hidden = hidden;
      for (const handler of [...(listeners.get('visibilitychange') || [])]) handler();
    },
  };
}

test('creating the ambience controller and changing its room never starts audio', () => {
  const environment = browser();
  const {controller, contexts, timers, playing} = environment;
  assert.equal(contexts.length, 0);
  assert.equal(timers.size, 0);
  assert.equal(environment.audible(), false);
  controller.setRoom(true);controller.setRoom(false);controller.door();
  environment.visibility(true);environment.visibility(false);
  assert.equal(contexts.length, 0, 'room, door and visibility events cannot create an AudioContext');
  assert.equal(timers.size, 0);
  assert.ok(!playing.includes(true));
  controller.dispose();
  assert.equal(environment.listenerCount(), 0);
});

test('explicit enable starts quiet ambience once and repeated enable does not duplicate it', async t => {
  const environment = browser();t.after(() => environment.controller.dispose());
  const {controller, contexts, playing} = environment;
  assert.equal(await controller.enable(), true);
  assert.equal(contexts.length, 1);
  assert.equal(environment.audible(), true);
  assert.equal(playing.at(-1), true);
  const sourceCount = contexts[0].sources.length;
  assert.ok(sourceCount > 0);
  assert.equal(await controller.enable(), true);
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].sources.length, sourceCount);
  assert.equal(contexts[0].resumes, 1);
});

test('hiding stops all sound and timers; returning to the page does not resume it', async t => {
  const environment = browser();t.after(() => environment.controller.dispose());
  const {controller, contexts, timers, playing} = environment;
  await controller.enable();
  assert.ok(timers.size > 0, 'outdoor bird calls may be scheduled only after enable');
  const context = contexts[0];
  environment.visibility(true);
  assert.equal(context.state, 'closed');
  assert.ok(context.sources.every(source => source.stopped));
  assert.ok(context.nodes.every(node => node.disconnected));
  assert.equal(timers.size, 0);
  assert.equal(environment.audible(), false);
  assert.equal(playing.at(-1), false);
  assert.equal(await controller.enable(), false, 'hidden pages cannot start audio even through enable');
  const eventsBeforeReturn = playing.length;
  environment.visibility(false);
  assert.equal(contexts.length, 1);
  assert.equal(playing.length, eventsBeforeReturn);
  assert.equal(environment.audible(), false);
  assert.equal(await controller.enable(), true, 'a fresh explicit action can enable sound again');
  assert.equal(contexts.length, 2);
});

test('stop, hidden and dispose cancel an enable whose resume is still pending', async t => {
  for (const action of ['stop', 'hidden', 'dispose']) await t.test(action, async subtest => {
    const environment = browser({deferResume: true});subtest.after(() => environment.controller.dispose());
    const {controller, contexts, timers, playing} = environment;
    const enabling = controller.enable();
    assert.equal(contexts.length, 1);
    assert.equal(contexts[0].sources.length, 0);
    if (action === 'hidden') environment.visibility(true);
    else controller[action]();
    contexts[0].releaseResume();
    assert.equal(await enabling, false);
    assert.equal(contexts[0].state, 'closed');
    assert.equal(environment.audible(), false);
    assert.equal(timers.size, 0);
    assert.ok(!playing.includes(true), 'a stale resume cannot publish a playing state');
    if (action === 'dispose') {
      assert.equal(environment.listenerCount(), 0);
      assert.equal(await controller.enable(), false);
      assert.equal(contexts.length, 1);
    }
  });
});

test('a late old resume cannot stop a newer explicitly enabled context', async t => {
  const environment = browser({deferResume: true});t.after(() => environment.controller.dispose());
  const {controller, contexts, playing} = environment;
  const oldEnable = controller.enable();
  controller.stop();
  const newEnable = controller.enable();
  assert.equal(contexts.length, 2);
  contexts[1].releaseResume();
  assert.equal(await newEnable, true);
  contexts[0].releaseResume();
  assert.equal(await oldEnable, false);
  assert.equal(contexts[0].state, 'closed');
  assert.equal(contexts[1].state, 'running');
  assert.equal(environment.audible(), true);
  assert.equal(playing.at(-1), true);
});

test('indoor mode cancels bird timers without creating or duplicating audio contexts', async t => {
  const environment = browser();t.after(() => environment.controller.dispose());
  const {controller, contexts, timers} = environment;
  controller.setRoom(true);
  await controller.enable();
  assert.equal(timers.size, 0);
  controller.setRoom(false);
  assert.equal(timers.size, 1);
  controller.setRoom(false);
  assert.equal(timers.size, 1, 'changing room repeatedly cannot accumulate bird timers');
  controller.setRoom(true);
  assert.equal(timers.size, 0);
  assert.equal(contexts.length, 1);
  assert.equal(environment.audible(), true);
});

test('dispose removes listeners, closes audio and cancels pending bird calls', async () => {
  const environment = browser();
  const {controller, contexts, timers, playing} = environment;
  await controller.enable();controller.door();
  assert.equal(environment.listenerCount(), 1);
  assert.ok(timers.size > 0);
  controller.dispose();
  assert.equal(environment.listenerCount(), 0);
  assert.equal(timers.size, 0);
  assert.equal(contexts[0].state, 'closed');
  assert.ok(contexts[0].sources.every(source => source.stopped));
  assert.ok(contexts[0].nodes.every(node => node.disconnected));
  const events = playing.length;
  controller.dispose();environment.visibility(true);environment.visibility(false);controller.door();controller.setRoom(false);
  assert.equal(playing.length, events);
  assert.equal(contexts.length, 1);
  assert.equal(timers.size, 0);
  assert.equal(environment.audible(), false);
});

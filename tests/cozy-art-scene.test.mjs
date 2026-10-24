import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import {categories, modules} from '../lib/hub/catalog.ts';
import {cozyRoomArt} from '../lib/hub/cozy-room-art.ts';
import {cozyBuildings, COZY_ART_ASPECT} from '../lib/hub/cozy-world.ts';

// These points identify the visible focal objects in the finished paintings.
// They are independent click fixtures, not centroids derived from hit polygons.
const objectPoints = {
  'zhiliu-radar': [.12, .4], 'zhizheng-research': [.53, .67],
  'agent-architecture-journey': [.88, .28], 'aipm-studio-dk': [.14, .4],
  'evopm-workbench': [.50, .4], 'ai-dev-collaboration-workbench': [.815, .4],
  'wandeng-evening': [.063, .3], 'roommate-housekeeper': [.93, .3],
  'cloudrush-runner': [.18, .2], 'starfall-creature-isles': [.12, .6],
  'pocket-arcade-ten': [.36, .4], 'yourwar-battle-forge': [.53, .68],
  'mistbound-letters': [.75, .39], 'moonlit-immortal-chronicle': [.825, .2],
  'yunque-sanguo': [.93, .6],
};
const settle = () => new Promise(resolve => setImmediate(resolve));

class Events {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type, properties = {}) {
    for (const listener of [...(this.listeners.get(type) || [])]) listener({type, preventDefault() {}, ...properties});
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

/** Execute the production renderer. Only GPU drawing, image I/O and browser events
 * are substituted; scene shapes, transforms, cameras and raycasts are real Three.js. */
async function sceneHarness(t, {width = 1440, height = 660, motion = false, reducedMotion = false} = {}) {
  const host = {clientWidth: width, clientHeight: height, children: [], appendChild(child) { this.children.push(child); }};
  const document = new Events(); document.hidden = false;
  const media = new Events(); media.matches = reducedMotion;
  const frames = new Map(), deferredTextures = new Map(), requestedTextures = [];
  let nextFrame = 0, renderer, observer;
  const captureRenderer = value => { renderer = value; };
  const captureObserver = value => { observer = value; };
  class Canvas extends Events {
    style = {}; capture = new Set(); width = 0; height = 0;
    setAttribute() {}
    getContext() { return null; }
    getBoundingClientRect() { return {left: 37, top: 61, width: host.clientWidth, height: host.clientHeight}; }
    setPointerCapture(id) { this.capture.add(id); }
    hasPointerCapture(id) { return this.capture.has(id); }
    releasePointerCapture(id) { this.capture.delete(id); }
    remove() { host.children = host.children.filter(child => child !== this); }
  }
  document.createElement = tag => { assert.equal(tag, 'canvas'); return new Canvas(); };
  class Renderer {
    domElement = new Canvas(); capabilities = {getMaxAnisotropy: () => 4};
    draws = 0; disposed = false; contextLost = false;
    constructor() { captureRenderer(this); }
    setPixelRatio() {} setClearColor() {} setSize() {}
    render(scene, camera) {
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      this.scene = scene; this.camera = camera; this.draws++;
    }
    dispose() { this.disposed = true; }
    forceContextLoss() { this.contextLost = true; }
  }
  class Loader {
    loadAsync(path) {
      requestedTextures.push(path);
      const pending = deferredTextures.get(path);
      return pending ? pending.promise : Promise.resolve(new THREE.Texture());
    }
  }
  const environment = {
    console, document, window: {devicePixelRatio: 2, matchMedia: () => media},
    ResizeObserver: class { constructor(callback) { this.callback = callback; captureObserver(this); } observe() {} disconnect() { this.disconnected = true; } },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const context = vm.createContext(environment), loaded = new Map();
  const load = name => {
    if (name === 'three') return {...THREE, WebGLRenderer: Renderer, TextureLoader: Loader};
    if (name === './catalog') return {categories, modules};
    if (loaded.has(name)) return loaded.get(name);
    assert.match(name, /^\.\/cozy-[a-z-]+$/);
    const source = fs.readFileSync(new URL(`../lib/hub/${name.slice(2)}.ts`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
    const loadedModule = {exports: {}}; loaded.set(name, loadedModule.exports);
    vm.compileFunction(compiled, ['require', 'module', 'exports'], {parsingContext: context})(load, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  };
  const state = {motion, disabled: false}, calls = {preview: [], select: [], launch: [], transition: [], fail: 0, hover: [], hoverModule: []};
  const controller = await load('./cozy-scene').createCozyScene(host, {
    state: () => state, preview: value => calls.preview.push(value), select: value => calls.select.push(value),
    launch: value => calls.launch.push(value), fail: () => calls.fail++,
    transition: value => calls.transition.push(value),
    hover: value => calls.hover.push(value), hoverModule: value => calls.hoverModule.push(value),
  });
  t.after(() => controller.dispose());
  function projected(point) {
    const position = new THREE.Vector3((point[0] - .5) * COZY_ART_ASPECT, .5 - point[1], .04).project(renderer.camera);
    return {x: position.x, y: position.y, clientX: 37 + (position.x + 1) * host.clientWidth / 2, clientY: 61 + (1 - position.y) * host.clientHeight / 2};
  }
  function pointer(type, point, extra = {}) {
    renderer.domElement.dispatch(type, {button: 0, pointerId: 7, ...projected(point), ...extra});
  }
  function click(point) { pointer('pointerdown', point); pointer('pointerup', point); }
  function advance(now) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); }
  function defer(path) {
    let resolve; const promise = new Promise(done => { resolve = done; });
    const texture = new THREE.Texture();
    const pending = {promise, disposed: false, resolve: () => resolve(texture)};
    texture.addEventListener('dispose', () => { pending.disposed = true; });
    deferredTextures.set(path, pending); return pending;
  }
  return {controller, state, calls, host, document, media, frames, renderer, observer, requestedTextures, click, pointer, projected, advance, defer};
}

test('finished room art covers every catalog application once with valid, nonempty polygons', () => {
  const covered = [];
  for (const category of categories) {
    const art = cozyRoomArt[category.id];
    assert.equal(art.width / art.height, COZY_ART_ASPECT);
    assert.ok(fs.statSync(new URL(`../public${art.src}`, import.meta.url)).size > 0);
    const expected = modules.filter(module => module.category === category.id).map(module => module.id).sort();
    assert.deepEqual(Object.keys(art.hotspots).sort(), expected);
    for (const [id, hotspot] of Object.entries(art.hotspots)) {
      assert.ok(hotspot.label.length > 0); assert.ok(hotspot.polygon.length >= 3);
      let twiceArea = 0;
      for (const [index, point] of hotspot.polygon.entries()) {
        assert.ok(point.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
        const next = hotspot.polygon[(index + 1) % hotspot.polygon.length]; twiceArea += point[0] * next[1] - next[0] * point[1];
      }
      assert.ok(Math.abs(twiceArea) > .002, `${id} needs a usable painted object region`); covered.push(id);
    }
  }
  assert.deepEqual(covered.sort(), modules.map(module => module.id).sort());
  assert.deepEqual(Object.keys(objectPoints).sort(), covered);
});

test('clicking each island building previews it without entering or launching an application', async t => {
  const h = await sceneHarness(t);
  for (const category of categories) h.click(cozyBuildings[category.id].center);
  assert.deepEqual(h.calls.preview, categories.map(category => category.id));
  assert.deepEqual(h.calls.select, []); assert.deepEqual(h.calls.launch, []);
  assert.equal(h.requestedTextures.length, 1, 'selection must not fetch an interior until confirmation');
});

test('real polygon raycasts reach all 15 focal objects in desktop and narrow mobile viewports', async t => {
  for (const [width, height] of [[1440, 660], [375, 590], [320, 720]]) await t.test(`${width} x ${height}`, async subtest => {
    const h = await sceneHarness(subtest, {width, height});
    for (const category of categories) {
      h.controller.enter(category.id, true); await settle();
      for (const app of modules.filter(module => module.category === category.id)) {
        h.controller.highlightModule(app.id);
        const p = h.projected(objectPoints[app.id]);
        assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1, `${app.id} can be brought into the mobile viewport`);
        const before = h.calls.launch.length; h.click(objectPoints[app.id]);
        assert.equal(h.calls.launch.length, before + 1, `${app.id} must have one independent painted target`);
        assert.equal(h.calls.launch.at(-1), app, 'the callback receives the canonical shared catalog entry');
      }
    }
    assert.equal(h.calls.launch.length, modules.length); assert.equal(h.calls.fail, 0);
  });
});

test('empty corners of object bounds do not behave like rectangular click targets', async t => {
  const h = await sceneHarness(t);
  h.click([.706, .037]); assert.deepEqual(h.calls.preview, []);
  for (const [category, point] of [['product', [.249, .14]], ['life', [.12, .8]], ['games', [.77, .81]]]) {
    h.controller.enter(category, true); await settle(); h.click(point);
  }
  assert.deepEqual(h.calls.launch, []);
});

test('mobile building selection centers every house, while dragging never confirms a selection', async t => {
  const h = await sceneHarness(t, {width: 320, height: 720});
  for (const category of categories) {
    h.controller.setSelected(category.id);
    const p = h.projected(cozyBuildings[category.id].center);
    assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1);
    h.click(cozyBuildings[category.id].center);
  }
  assert.deepEqual(h.calls.preview, categories.map(category => category.id));
  const before = h.calls.preview.length, point = cozyBuildings.games.center;
  h.pointer('pointerdown', point); h.pointer('pointermove', point, {clientX: h.projected(point).clientX - 45}); h.pointer('pointerup', point);
  assert.equal(h.calls.preview.length, before); assert.equal(h.calls.launch.length, 0);
});

test('disabled interaction and cancelled pointers cannot start an application', async t => {
  const h = await sceneHarness(t);
  h.state.disabled = true; h.controller.update(); h.click(cozyBuildings.research.center);
  assert.equal(h.calls.preview.length, 0);
  h.state.disabled = false; h.controller.enter('research', true); await settle();
  h.state.disabled = true; h.controller.update(); h.click(objectPoints['zhiliu-radar']); assert.equal(h.calls.launch.length, 0);
  h.state.disabled = false;
  h.pointer('pointerdown', objectPoints['zhiliu-radar']); h.renderer.domElement.dispatch('pointercancel'); h.pointer('pointerup', objectPoints['zhiliu-radar']);
  assert.equal(h.calls.launch.length, 0);
});

test('a late room image cannot replace a newer room or undo returning to the island', async t => {
  const h = await sceneHarness(t), delayed = h.defer(cozyRoomArt.research.src);
  h.controller.enter('research', true); h.controller.enter('product', true); await settle();
  delayed.resolve(); await settle();
  h.click(objectPoints['evopm-workbench']); assert.equal(h.calls.launch.at(-1)?.id, 'evopm-workbench');
  const other = h.defer(cozyRoomArt.games.src);
  h.controller.enter('games', true); h.controller.enter(null, true); other.resolve(); await settle();
  h.click(cozyBuildings.life.center); assert.equal(h.calls.preview.at(-1), 'life');
  assert.equal(h.calls.launch.length, 1); assert.equal(h.calls.fail, 0);
});

test('texture loading and crossfades cannot select hidden buildings or launch unseen objects', async t => {
  const h = await sceneHarness(t, {motion: true}), delayed = h.defer(cozyRoomArt.research.src);
  h.controller.enter('research');
  assert.equal(h.calls.transition.at(-1), true);
  h.click(cozyBuildings.product.center); assert.equal(h.calls.preview.length, 0);
  delayed.resolve(); await settle();
  h.click(objectPoints['zhiliu-radar']); assert.equal(h.calls.launch.length, 0);
  for (let now = 100; now <= 2100; now += 50) h.advance(now);
  assert.equal(h.calls.transition.at(-1), false);
  h.click(objectPoints['zhiliu-radar']); assert.equal(h.calls.launch.at(-1)?.id, 'zhiliu-radar');
  h.controller.enter(null);
  h.click(cozyBuildings.product.center); assert.equal(h.calls.preview.length, 0);
  for (let now = 2200; now <= 4300; now += 50) h.advance(now);
  h.click(cozyBuildings.product.center); assert.equal(h.calls.preview.at(-1), 'product');
  assert.deepEqual(h.calls.transition, [true, false, true, false]);
});

test('a room image that resolves after disposal is released without reactivating the scene', async t => {
  const h = await sceneHarness(t), delayed = h.defer(cozyRoomArt.games.src);
  h.controller.enter('games'); const draws = h.renderer.draws;
  h.controller.dispose(); delayed.resolve(); await settle();
  assert.equal(delayed.disposed, true); assert.equal(h.renderer.draws, draws);
  assert.equal(h.calls.fail, 0); assert.equal(h.frames.size, 0); assert.equal(h.host.children.length, 0);
});

test('reduced motion, hidden pages and disposal stop frame scheduling and release listeners', async t => {
  const h = await sceneHarness(t, {motion: true});
  assert.equal(h.frames.size, 1); h.advance(100); assert.equal(h.frames.size, 1);
  h.document.hidden = true; h.document.dispatch('visibilitychange'); const draws = h.renderer.draws;
  assert.equal(h.frames.size, 0); h.advance(200); assert.equal(h.renderer.draws, draws);
  h.document.hidden = false; h.document.dispatch('visibilitychange'); assert.equal(h.frames.size, 1);
  h.media.matches = true; h.media.dispatch('change'); assert.equal(h.frames.size, 0);
  h.controller.enter('life'); await settle(); h.click(objectPoints['wandeng-evening']);
  assert.equal(h.calls.launch.at(-1)?.id, 'wandeng-evening', 'reduced motion still supports direct room entry and launch');
  h.controller.dispose(); assert.equal(h.frames.size, 0); assert.equal(h.renderer.disposed, true);
  assert.equal(h.renderer.contextLost, true); assert.equal(h.document.listenerCount, 0); assert.equal(h.media.listenerCount, 0);
  assert.equal(h.renderer.domElement.listenerCount, 0); assert.equal(h.host.children.length, 0); assert.equal(h.observer.disconnected, true);
});

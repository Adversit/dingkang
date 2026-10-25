import {createWorld} from './geometry.js';

let world;
self.onmessage = ({data}) => {
  if (data.type === 'load') { world = createWorld(data.data); return; }
  if (data.type !== 'path' || !world) return;
  try {
    const distance = Math.hypot(data.to[0] - data.from[0], data.to[1] - data.from[1]);
    const path = world.findPath(data.from, data.to, {
      cellSize: distance > 200 ? 4 : 2,
      maxNodes: 18000,
    });
    self.postMessage({id: data.id, path});
  } catch {
    self.postMessage({id: data.id, path: null});
  }
};

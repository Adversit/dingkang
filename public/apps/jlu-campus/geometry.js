/** Geometry for the independently sourced OSM campus. All distances are metres. */
const EPS = 1e-8;
export function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
export function pointInRing(p, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    if (distanceToSegment(p, a, b) < EPS) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function pointInPolygon(p, polygon) {
  return pointInRing(p, polygon.outer) && !(polygon.holes || []).some(hole => pointInRing(p, hole));
}
export function pointInFeature(p, feature) {
  return (feature?.polygons || []).some(polygon => pointInPolygon(p, polygon));
}
export function featureBounds(feature) {
  if (feature.bounds) return feature.bounds;
  if (Number.isFinite(feature.x) && Number.isFinite(feature.y)) return [feature.x, feature.y, feature.x, feature.y];
  const points = feature.polygons?.flatMap(polygon => polygon.outer) || feature.lines?.flat() || [];
  return points.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
}
export function createTransform(width, height, angleDeg = 203) {
  const angle = angleDeg * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  const raw = (x, y) => [x * c - y * s, x * s + y * c];
  const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => raw(x, y));
  const left = Math.min(...corners.map(p => p[0])), top = Math.min(...corners.map(p => p[1]));
  const forward = (x, y) => [x * c - y * s - left, x * s + y * c - top];
  const inverse = (x, y) => [(x + left) * c + (y + top) * s, -(x + left) * s + (y + top) * c];
  return {
    forward, inverse, angle: angleDeg,
    width: Math.max(...corners.map(p => p[0])) - left,
    height: Math.max(...corners.map(p => p[1])) - top,
    transformedBounds(bounds) {
      const points = [[bounds[0], bounds[1]], [bounds[2], bounds[1]], [bounds[2], bounds[3]], [bounds[0], bounds[3]]].map(([x, y]) => forward(x, y));
      return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
    },
  };
}
export class SpatialIndex {
  constructor(items = [], cellSize = 64) {
    this.cellSize = cellSize; this.cells = new Map();
    for (const item of items) this.insert(item);
  }
  insert(item) {
    const b = featureBounds(item); if (!b.every(Number.isFinite)) return;
    const s = this.cellSize;
    for (let x = Math.floor(b[0] / s); x <= Math.floor(b[2] / s); x++) for (let y = Math.floor(b[1] / s); y <= Math.floor(b[3] / s); y++) {
      const key = `${x}:${y}`; if (!this.cells.has(key)) this.cells.set(key, []); this.cells.get(key).push(item);
    }
  }
  query(bounds) {
    const s = this.cellSize, result = new Set();
    for (let x = Math.floor(bounds[0] / s); x <= Math.floor(bounds[2] / s); x++) for (let y = Math.floor(bounds[1] / s); y <= Math.floor(bounds[3] / s); y++) {
      for (const item of this.cells.get(`${x}:${y}`) || []) {
        const b = featureBounds(item);
        if (b[0] <= bounds[2] && b[2] >= bounds[0] && b[1] <= bounds[3] && b[3] >= bounds[1]) result.add(item);
      }
    }
    return [...result];
  }
  at(x, y, radius = 0) { return this.query([x - radius, y - radius, x + radius, y + radius]); }
}
function nearRing(point, ring, radius) {
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if (distanceToSegment(point, ring[j], ring[i]) < radius) return true;
  return false;
}
class Heap {
  constructor() { this.values = []; }
  push(item) {
    const values = this.values; values.push(item); let index = values.length - 1;
    while (index) { const parent = (index - 1) >> 1; if (values[parent].f <= item.f) break; values[index] = values[parent]; index = parent; } values[index] = item;
  }
  pop() {
    const values = this.values, first = values[0], last = values.pop();
    if (values.length) {
      let index = 0;
      while (true) { let child = index * 2 + 1; if (child >= values.length) break; if (child + 1 < values.length && values[child + 1].f < values[child].f) child++; if (values[child].f >= last.f) break; values[index] = values[child]; index = child; } values[index] = last;
    }
    return first;
  }
  get length() { return this.values.length; }
}
export function createWorld(data) {
  const buildings = data.buildings || [], water = data.water || [], boundary = data.boundary || [];
  const buildingIndex = new SpatialIndex(buildings), obstacleIndex = new SpatialIndex([...buildings, ...water]);
  const boundaryIndex = new SpatialIndex(boundary, 256), width = data.meta?.width || 1, height = data.meta?.height || 1;
  const withinBoundary = (x, y) => boundary.length ? boundaryIndex.at(x, y).some(feature => pointInFeature([x, y], feature)) : x >= 0 && y >= 0 && x <= width && y <= height;
  function isWalkable(x, y, radius = 0.65) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !withinBoundary(x, y)) return false;
    if (radius > 0 && ![[radius, 0], [-radius, 0], [0, radius], [0, -radius]].every(([dx, dy]) => withinBoundary(x + dx, y + dy))) return false;
    const point = [x, y];
    for (const feature of obstacleIndex.at(x, y, radius)) {
      if (pointInFeature(point, feature)) return false;
      if (radius > 0 && feature.polygons.some(polygon => nearRing(point, polygon.outer, radius) || (polygon.holes || []).some(hole => nearRing(point, hole, radius)))) return false;
    }
    return true;
  }
  function nearestWalkable(x, y, maxRadius = 100) {
    if (isWalkable(x, y)) return [x, y];
    for (let radius = 1; radius <= maxRadius; radius += radius < 10 ? 1 : radius < 40 ? 2 : 4) {
      const count = Math.max(16, Math.ceil(radius * Math.PI));
      for (let n = 0; n < count; n++) { const angle = n * Math.PI * 2 / count, px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius; if (isWalkable(px, py)) return [px, py]; }
    }
    return null;
  }
  const findBuilding = (x, y) => buildingIndex.at(x, y).find(feature => pointInFeature([x, y], feature));
  const entranceCache = new Map();
  const landmarkEntrances = new Map((data.landmarks || []).map(landmark => [landmark.id, landmark.entrance]));
  function getEntrance(building) {
    if (!building) return null;
    if (entranceCache.has(building.id)) return entranceCache.get(building.id);
    const canonicalEntrance = landmarkEntrances.get(building.id);
    if (Array.isArray(canonicalEntrance) && canonicalEntrance.length === 2 && isWalkable(canonicalEntrance[0], canonicalEntrance[1], 0.65)) {
      const point = [...canonicalEntrance]; entranceCache.set(building.id, point); return point;
    }
    const bounds = featureBounds(building), center = building.center || [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
    const candidates = (data.pois || []).filter(poi => (poi.tags?.entrance && poi.tags.entrance !== 'no') && poi.x >= bounds[0] - 5 && poi.x <= bounds[2] + 5 && poi.y >= bounds[1] - 5 && poi.y <= bounds[3] + 5);
    // Prefer surveyed entrance nodes. Exterior test avoids teleporting into an enclosed courtyard.
    for (const poi of candidates) {
      const result = nearestWalkable(poi.x, poi.y, 14);
      if (result && !building.polygons.some(polygon => pointInRing(result, polygon.outer))) { entranceCache.set(building.id, result); return result; }
    }
    // For buildings lacking entrances use the nearest walkable exterior edge, not the centroid.
    const edges = [];
    for (const polygon of building.polygons || []) for (let i = 1; i < polygon.outer.length; i++) {
      const a = polygon.outer[i - 1], b = polygon.outer[i]; const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      edges.push({point: middle, distance: Math.hypot(middle[0] - center[0], middle[1] - center[1])});
    }
    edges.sort((a, b) => a.distance - b.distance);
    for (const edge of edges) {
      const result = nearestWalkable(edge.point[0], edge.point[1], 12);
      if (result && !building.polygons.some(polygon => pointInRing(result, polygon.outer))) { entranceCache.set(building.id, result); return result; }
    }
    const fallback = nearestWalkable(bounds[0] - 2, bounds[3] + 2, 80);
    entranceCache.set(building.id, fallback); return fallback;
  }
  function lineWalkable(a, b, radius = 0.65) {
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1]), count = Math.max(1, Math.ceil(distance / 0.7));
    for (let index = 0; index <= count; index++) { const t = index / count; if (!isWalkable(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, radius)) return false; }
    return true;
  }
  function findPath(from, to, {cellSize = 2, maxNodes = 60000} = {}) {
    if (!from || !to) return null;
    const start = nearestWalkable(from[0], from[1], 10), goal = nearestWalkable(to[0], to[1], 12);
    if (!start || !goal) return null;
    if (lineWalkable(start, goal)) return [start, goal];
    const s = cellSize, cache = new Map();
    const walk = (x, y) => { const key = `${x},${y}`; if (!cache.has(key)) cache.set(key, isWalkable(x * s, y * s)); return cache.get(key); };
    function gridNear(point) {
      const x = Math.round(point[0] / s), y = Math.round(point[1] / s);
      for (let radius = 0; radius <= 4; radius++) for (let dx = -radius; dx <= radius; dx++) for (let dy = -radius; dy <= radius; dy++) if (walk(x + dx, y + dy) && lineWalkable(point, [(x + dx) * s, (y + dy) * s])) return [x + dx, y + dy];
      return null;
    }
    const startGrid = gridNear(start), goalGrid = gridNear(goal); if (!startGrid || !goalGrid) return null;
    const key = (x, y) => `${x},${y}`, heuristic = (x, y) => Math.hypot(goalGrid[0] - x, goalGrid[1] - y);
    const open = new Heap(), costs = new Map(), parents = new Map(), closed = new Set(), startKey = key(...startGrid), goalKey = key(...goalGrid);
    open.push({x: startGrid[0], y: startGrid[1], g: 0, f: heuristic(...startGrid)}); costs.set(startKey, 0);
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    let expanded = 0;
    while (open.length && expanded++ < maxNodes) {
      const current = open.pop(), id = key(current.x, current.y); if (closed.has(id)) continue;
      if (id === goalKey) {
        const result = [goal]; let cursor = id;
        while (cursor) { const [x, y] = cursor.split(',').map(Number); result.push([x * s, y * s]); cursor = parents.get(cursor); }
        result.push(start); result.reverse();
        // String-pulling is bounded: every retained segment is checked for foot clearance.
        const smooth = [result[0]]; let index = 0;
        while (index < result.length - 1) { let next = Math.min(result.length - 1, index + 24); while (next > index + 1 && !lineWalkable(result[index], result[next])) next--; smooth.push(result[next]); index = next; }
        return smooth;
      }
      closed.add(id);
      for (const [dx, dy] of directions) {
        const nx = current.x + dx, ny = current.y + dy, nextId = key(nx, ny);
        if (closed.has(nextId) || !walk(nx, ny) || (dx && dy && (!walk(current.x + dx, current.y) || !walk(current.x, current.y + dy)))) continue;
        // Thin obstacles can lie between valid grid nodes.
        if (!lineWalkable([current.x * s, current.y * s], [nx * s, ny * s])) continue;
        const cost = current.g + (dx && dy ? Math.SQRT2 : 1);
        if (cost >= (costs.get(nextId) ?? Infinity)) continue;
        costs.set(nextId, cost); parents.set(nextId, id); open.push({x: nx, y: ny, g: cost, f: cost + heuristic(nx, ny)});
      }
    }
    return null;
  }
  const preferred = buildings.find(building => /日新楼/.test(building.name || '')) || buildings.find(building => /图书馆|理化楼/.test(building.name || '')) || buildings[0];
  const canonicalSpawn = data.meta?.spawn;
  let spawn = Array.isArray(canonicalSpawn) && canonicalSpawn.length === 2 && isWalkable(canonicalSpawn[0], canonicalSpawn[1], 0.65) ? [...canonicalSpawn] : getEntrance(preferred) || nearestWalkable(width / 2, height / 2, Math.max(width, height));
  if (!spawn) { for (const road of data.roads || []) { for (const line of road.lines || []) { spawn = line.find(point => isWalkable(...point)); if (spawn) break; } if (spawn) break; } }
  return {data, width, height, buildingIndex, obstacleIndex, isWalkable, nearestWalkable, findBuilding, getEntrance, lineWalkable, findPath, spawn: spawn || [width / 2, height / 2]};
}

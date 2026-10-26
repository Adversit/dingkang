# Campus rendering iteration — 2026-10-26

This change applies the first concrete fixes from the reference-site study.

- Outdoor character bodies now use a consistent 1.2 × zoom scale. At the 10 px/metre world scale, a 20 px base body is about 2.4 metres high; low zoom no longer clamps the character independently of the map.
- All visible ground chunks remain pinned for the entire frame. The budget grows with the viewport, and eviction runs after rendering against offscreen chunks only. A 1363 × 936 view at zoom 0.4 no longer churns through the previous 48-entry limit.
- Rixin and library floors/walls are separate from raised furniture sprites. Cabinet fronts, shelves and table legs extend above their authoritative ground footprints. Furniture and both local/remote characters use one depth queue; nameplates stay in a readable overlay. Furniture is cached individually and culled using its raised bounds.
- Rixin forecourt benches, planters, bicycle racks and the noticeboard join the same exterior depth queue instead of being drawn after every character.
- Facades have window mullions, deterministic curtain/AC variations, end piers and downpipes. Roof seams are anchored to the building rather than screen coordinates.
- Layout revisions, collision rectangles, navigation coordinates, seven entrances, network messages and storage contracts are unchanged.

## Validation

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` — passed.
- Six campus test suites — 79 tests passed.
- New behavior checks cover zoom proportionality, stationary chunk reuse beyond 48 visible tiles, bounded cache eviction after travel, and furniture/player draw-order reversal in both interiors.
- Actual Canvas rendering compared before/after at desktop and 390 × 844 mobile dimensions for Rixin, the library and the forecourt.
- Managed preview served successfully, but the cloud browser could not reach its URL (connection refused). The offline Canvas checks are not browser interaction or performance measurements. Online interaction verification follows deployment.

## Boundaries

This is the first rendering iteration, not a claim of matching the entire reference.
Building segmentation, building texture caching, environment occlusion and richer landscape art remain separate work. No reference-site source or artwork was copied into this implementation.


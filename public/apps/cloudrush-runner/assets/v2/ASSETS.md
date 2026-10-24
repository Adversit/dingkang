# Cloudrush Odyssey v2 art assets

Generated 2026-10-10 with the built-in `image_gen.imagegen` tool. All imagery is original for this project. Existing project hero sprites were the identity and costume references; no third-party game artwork was copied.

## Runtime files

- `world-sunset.webp`: 1536 × 1024, amber sandstone canyons, ruined sun temples and autumn trees.
- `world-night.webp`: 1536 × 1024, moonlit crystal groves and astronomical observatory islands.
- `hero-pose-{hero}-{pose}.webp`: true RGBA sprites. Hero 0 = orange pilot; 1 = teal ninja; 2 = violet mage. Pose 0 = upright riding; 1 = low racing crouch; 2 = tucked airborne jump; 3 = seated skill cast.

Backgrounds are exported at WebP quality 89. Sprites are exported with lossless WebP encoding and alpha preserved. The character atlas is cropped into individual poses, then trimmed to the visible alpha bounds (alpha > 8 used only to locate the crop) plus 8 pixels. Faint alpha pixels inside each retained crop remain unchanged. Crouch sprites were generated separately to achieve a naturally low, wide body pose; they are reduced proportionally to 384 px wide for runtime use. No character image was squashed or synthesized with code.

Generated PNG originals and rejected atlas layout variants remain outside the repository under the session's generated_images directory. The files listed above are the selected runtime deliverables.

## Sprite dimensions

| Hero | Upright (0) | Low crouch (1) | Air (2) | Cast (3) |
| --- | --- | --- | --- | --- |
| Pilot (0) | 260 × 284 | 384 × 165 | 275 × 273 | 336 × 276 |
| Ninja (1) | 280 × 301 | 384 × 170 | 262 × 281 | 356 × 299 |
| Mage (2) | 297 × 282 | 384 × 155 | 300 × 281 | 367 × 279 |

All twelve sprites have alpha extrema 0–255. Preserve the supplied aspect ratio when drawing. The cast sprites include a small magic effect at the right edge and therefore have a wider canvas than the upright sprites. Anchor feet consistently and allow extra width for casting to avoid shrinking the rider merely to accommodate that effect.

## Generation prompts

### sunset

Use case: stylized-concept. Asset type: original illustrated panoramic game background for Cloudrush Odyssey, a polished fantasy side-scrolling runner. Create a NEW independent world: monumental floating sandstone canyon islands and ancient sun temples at golden sunset, layered distant cliffs, broken arches, hanging aqueducts, wind-carved pillars, small autumn red trees, warm peach cloud sea. Beautiful intricate hand-painted stylized 3D illustration with soft volumetric light, refined rounded forms, atmospheric perspective, an optimistic sense of adventure. Sky golden apricot fading to rose, sandstone amber and terra cotta with turquoise architectural inlays. Panoramic landscape 1536x1024. Subject architecture primarily in middle 60 percent; lower quarter must be quiet layered cloud mist with no sharp close foreground, so game obstacles read clearly above it. No characters, creatures, people, text, UI, logos or watermark. Do not recreate an emerald grass castle world recolored: use clearly original desert canyon landforms and architecture. Balanced horizontal scenery useful as a looping scroll, left/right edges similar sky/cloud density. Rich production-quality game environment, legible large silhouette hierarchy, no black outlines.

### night

Use case: stylized-concept. Asset type: original illustrated panoramic game background for Cloudrush Odyssey, a polished fantasy side-scrolling runner. Create a NEW independent world: moonlit floating crystal grove islands with an ancient astronomical observatory and elegant bronze star-ring armillary structures, giant luminous pale teal crystal clusters, sparse twisted lavender trees, delicate curving bridges, distant tiny floating islands and silver-blue mist. Large pearl moon above a calm starfield, subtle aurora arc. Soft stylized hand-painted 3D fantasy illustration, intricate yet readable, atmospheric depth, refined rounded forms, a magical peaceful night adventure. Teal, midnight blue, violet and softly glowing silver palette; controlled highlights rather than neon everywhere. Panoramic landscape 1536x1024. Main silhouettes in middle 60 percent, lower quarter quiet layered blue-violet cloud mist with no hard foreground details so gameplay reads clearly. No characters, creatures, people, text, UI, logos or watermark. Do not recolor a daytime castle world: create distinct crystal groves and observatory structures. Balanced horizontal scenery useful as a looping scroll, left/right edges similar sky/cloud density. Production-quality painted environment, no black outlines.

### poses

Use case: identity-preserve. Asset type: professional transparent 2D game sprite atlas. The THREE supplied images are identity/style references for three existing original chibi heroes. Create ONE atlas of those same characters in riding action poses, precisely 4 EQUAL WIDTH COLUMNS by 3 EQUAL HEIGHT ROWS. Landscape canvas 1536x1024. Every cell contains exactly ONE full-body character facing RIGHT in side / slight three-quarter profile; consistent scale and entire figure with hair/accessories inside its cell; generous transparent padding of at least 20 pixels. Row 1: exact orange-haired pilot identity, goggles on head, gold scarf, blue jacket, cream trousers, blue/gold boots. Row 2: exact dark-haired teal ninja identity, cat-ear headband, long high ponytail, teal scarf, dark leggings and teal/gold accents. Row 3: exact lavender-haired celestial mage identity, gold star hairpin, violet dress with white ruffle, purple/gold scarf, white/gold boots. FOUR POSES repeated in each row: Column 1 = seated upright riding an INVISIBLE saddle, thighs mostly horizontal, knees bent down and boots pointing down, both hands forward holding invisible reins; clearly seated, NOT RUNNING. Column 2 = low forward crouch while still SEATED with bent knees, torso leaning forward over invisible saddle, full silhouette low, hands stretched forward. Column 3 = airborne leap, knees tucked forward/up, body upright alert, arms balancing. Column 4 = skill casting while SEATED riding invisible saddle, knees bent downward, one arm extended forward with small tasteful glowing magic around hand, other hand holding invisible reins. No actual mounts, no saddles, no reins visible, no additional objects. Preserve exact polished chibi 3D-painted style and costume identity of references. CRITICAL actual transparent alpha background everywhere outside figures; no checkerboard, no colored boxes, no floor, no drop shadows, no glow outside hand effects, no text, no labels, no borders. Exact uniform 4x3 grid layout is essential for automated equal-cell cropping. No character overlaps its cell boundaries.

### Atlas layout refinement (selected source for upright, air and cast)

Production sprite atlas layout refinement ONLY. Keep all twelve characters, identities, costumes, rendering style and the EXACT poses in this source image. All characters still face right. Keep a precise 4-column by 3-row equal-cell layout. IMPORTANT: shrink EVERY figure uniformly to about 78 percent of its current cell occupancy and center within its own cell, leaving generous clear transparent margins on EVERY side so no hair/scarf/boot/glow touches another cell or the outside canvas edge. Maintain each figure complete and intact. Prefer a 1536x1152 landscape canvas for twelve 384x384 square cells; if another canvas size is used, keep all cells equal. The bottom of each figure's boots should align to the same baseline within its cell. Preserve riding with bent legs in columns 1 and 4, low seated crouch in column 2, tucked airborne leap in column 3. Keep the same three rows: orange pilot, teal ninja, violet mage. Preserve TRUE transparent alpha everywhere outside the twelve figures, including all margins. No colored background, no floor, no shadow, no labels, no grid lines, no new objects.

### Final crouch, hero 0

Use case: identity-preserve. ONE transparent original game sprite of the same orange-haired pilot with gold-rim goggles on head, golden scarf, blue jacket, cream trousers and blue-gold boots in the reference. Preserve face, costume, chibi proportions, colors, and polished 3D-painted game illustration style. New pose: a VERY LOW, wide forward racing crouch on an INVISIBLE mount, facing RIGHT. Torso nearly horizontal like a racing jockey ducking under a low branch, head lowered and reaching forward right, chest low, both arms reaching forward near shoulder height, BOTH knees folded backward and boots tucked backward closely beside hips. No hanging vertical legs. Overall visible figure is 2 to 2.2 times as WIDE as TALL. Do NOT squash anatomy. Natural bent posture with dynamic flowing hair and scarf trailing left. Exactly ONE full-body figure centered on transparent canvas, generous empty margins at least 80px on every side, every finger/boot/scarf inside image. No mount, no saddle, no ground, no cast shadow, no text, no frame. True alpha transparent background, NO gradient backdrop. Full, sharp, beautiful sprite for use at about 100x50 pixels in a runner game.

### Final crouch, hero 1

Use case: identity-preserve. ONE transparent original game sprite of the same dark-haired teal ninja with cat-ear headband, long black ponytail, teal scarf, dark fitted outfit with teal and gold trim and dark boots in the reference. Preserve face, costume, chibi proportions, colors, and polished 3D-painted game illustration style. New pose: a VERY LOW, wide forward racing crouch on an INVISIBLE mount, facing RIGHT. Torso nearly horizontal like a racing jockey ducking under a low branch, head lowered and reaching forward right, chest low, both arms reaching forward near shoulder height, BOTH knees folded backward and boots tucked backward closely beside hips. No hanging vertical legs. Overall visible figure is 2 to 2.2 times as WIDE as TALL. Do NOT squash anatomy. Natural bent posture with dynamic flowing hair and scarf trailing left. Exactly ONE full-body figure centered on transparent canvas, generous empty margins at least 80px on every side, every finger/boot/scarf inside image. No mount, no saddle, no ground, no cast shadow, no text, no frame. True alpha transparent background, NO gradient backdrop. Full, sharp, beautiful sprite for use at about 100x50 pixels in a runner game.

### Final crouch, hero 2

Use case: identity-preserve. ONE transparent original game sprite of the same lavender-haired celestial mage with gold star hairpin, violet and gold dress with white ruffle, purple-gold scarf, white and gold boots in the reference. Preserve face, costume, chibi proportions, colors, and polished 3D-painted game illustration style. New pose: a VERY LOW, wide forward racing crouch on an INVISIBLE mount, facing RIGHT. Torso nearly horizontal like a racing jockey ducking under a low branch, head lowered and reaching forward right, chest low, both arms reaching forward near shoulder height, BOTH knees folded backward and boots tucked backward closely beside hips. No hanging vertical legs. Overall visible figure is 2 to 2.2 times as WIDE as TALL. Do NOT squash anatomy. Natural bent posture with dynamic flowing hair and scarf trailing left. Exactly ONE full-body figure centered on transparent canvas, generous empty margins at least 80px on every side, every finger/boot/scarf inside image. No mount, no saddle, no ground, no cast shadow, no text, no frame. True alpha transparent background, NO gradient backdrop. Full, sharp, beautiful sprite for use at about 100x50 pixels in a runner game.

## Source identifiers

- Sunset: `exec-f51a6518-34a6-411e-8bfb-4ed9c928143e.png`
- Night: `exec-8ad01f82-6695-41ff-9567-0220b7c73db1.png`
- Upright / air / cast atlas: `exec-51c49efa-5c32-47eb-806d-3e09847dac52.png`
- Pilot crouch: `exec-98e1f344-0102-450d-8e67-1f3419d4785c.png`
- Ninja crouch: `exec-6e9a4747-09b7-4cfa-b2e7-7f3bad443af3.png`
- Mage crouch: `exec-b8706def-2b8e-4851-b695-dda34fd90a7b.png`

## Additional mount poses

`mount-pose-{mount}-{pose}.webp` adds naturally crouched mounts (pose 0) and airborne mounts (pose 1). Mount 0 is the orange fox, mount 1 the teal griffin, and mount 2 the robot tiger. Each sprite is cropped from the generated RGBA atlas to its visible alpha boundary with approximately 8 pixels of surrounding space and saved as lossless WebP. Neighboring cells are excluded. No mount has been vertically squashed. Griffin wings stay folded during crouching and open during flight.

Generation source: `exec-04ac542f-c9a1-4fe1-8a1a-515b985a793b.png` (1254 × 1254, true RGBA). The original project mount sprites were identity references.

| Mount | Crouch (0) | Airborne (1) |
| --- | --- | --- |
| Fox (0) | 645 × 260 | 574 × 352 |
| Griffin (1) | 663 × 291 | 550 × 455 |
| Robot tiger (2) | 673 × 256 | 551 × 322 |

All mount sprites retain alpha extrema 0–255. At 145 px drawn width, crouching poses are approximately 56–64 px tall; the raised fox tail and griffin feather crest contribute to image height. Airborne fox and tiger are approximately 89 and 85 px tall at that width. The griffin's extended wings require about 120 px of total image height; keep its body scale consistent and allow wings to extend above the body instead of shrinking the entire mount into the smaller ground collision box.

### Mount atlas prompt

Use case: identity-preserve. Professional original game mount SPRITE ATLAS with exactly SIX full creatures, based on the three supplied identity references. Maintain their polished chibi 3D-painted illustration style, materials and costume identities; restore any nose/extremity that the reference crop cuts off. TRUE transparent alpha background. Layout: exactly THREE ROWS by TWO COLUMNS, all six cells equal, square canvas around 1536x1536. Each creature centered in its own cell with at least 50px CLEAR TRANSPARENT MARGIN on every side. No overlapping cells, no cropped ears, tails or wings. ALL creatures face RIGHT in side profile. Row 1: cheerful orange-gold fox mount, white muzzle/chest, thick fluffy orange tail with cream tip, ornate turquoise saddle and harness with gold filigree and jade jewel. Row 2: turquoise/sky-blue griffin mount, white eagle-like face and chest, teal feather crest, blue-teal wings with cream/gold feather accents, feline hindquarters, turquoise tail, dark teal saddle/harness with gold and jade accents. Row 3: friendly robot tiger mount with dark graphite and violet armor panels, glowing cyan stripes, round cyan eye, cyan joint lights, segmented curved tail, gold saddle with turquoise jewels. COLUMN 1 in ALL THREE ROWS: VERY LOW CROUCH/DASH POSE, long horizontal silhouette roughly THREE times as wide as tall, belly low, all four legs bent and tucked under body, paws low and streamlined, head/neck lowered forward, back nearly flat with a usable saddle surface, tail trailing left. Griffin folds wings neatly along back; no outstretched wings in this column. This is a naturally crouching animal, NOT a vertically squashed standing image. COLUMN 2: AIRBORNE LEAP, body lifted, all legs naturally tucked under belly, head alert facing right, tail flowing left; griffin has elegant spread wings angled upward/back without hiding saddle. Same mount proportions and saddle design in both poses; warm appealing expressions. Mounts ONLY: no riders, no human figures, no ground, no drop shadow, no effects, no props, no text, no grid lines. Crisp readable silhouette, transparent margins are essential for automatic cropping.


# 暖居室内美术：实际生成提示词

这四张画面使用内置图像生成工具制作，依据用户海岛参考的暖阳、自然材质和细致工艺设计。它们是用于固定视角 2.5D 场景的烘焙环境画面，不是不带光照的 PBR 材质，也不是可任意旋转的模型。

应用物件的点击范围来自最终图像测量，见 [`lib/hub/cozy-room-art.ts`](../../lib/hub/cozy-room-art.ts)。实时动态、光点和交互由渲染代码处理，不烘焙界面文字。

| 资产 | 尺寸 | WebP 大小 | 可交互物件 |
|---|---|---:|---|
| [研习书屋](../../public/assets/hub/cozy/rooms/research-v2.webp) | 1672 × 941 | 288780 B | 星象仪、手稿、架构画 |
| [造物工坊](../../public/assets/hub/cozy/rooms/product-v2.webp) | 1672 × 941 | 286562 B | 画架、齿轮、电脑工作台 |
| [日常小屋](../../public/assets/hub/cozy/rooms/life-v2.webp) | 1672 × 941 | 250114 B | 落地灯、钥匙架 |
| [冒险收藏室](../../public/assets/hub/cozy/rooms/games-v2.webp) | 1672 × 941 | 356720 B | 风景画、玻璃花园、街机、沙盘、邮船、卷轴、将旗 |

PNG 原图转为 WebP，保留原尺寸，质量 90。没有额外生成文字或界面。全部最终 WebP 已逐张检查：木纹、黄铜、玻璃、织物的表现可区分；重要物件有清晰轮廓；画面有实用的光源与接触阴影。移动端应采用横向观察/物件聚焦，不能只居中裁切后隐藏左右物件。

## 研习书屋

```text
Use case: stylized-concept. Asset type: final high-resolution interactive game room background, 16:9 landscape. Create one exquisitely detailed pre-rendered 3D interior of a warm observatory library on a magical Mediterranean island, with the tactile miniature craftsmanship of a premium cozy life-simulation game. This is production environment artwork, not a UI mockup. Full bleed, a coherent room filling the entire frame, no floating platform, no outer border, no lettering, no interface, no people.
Camera: elevated three-quarter view from the missing front wall, approximately 28 degrees downward, looking into an inviting room. Show believable depth, complete floor, rear walls, furniture, all important objects fully visible. A large arched window on the left reveals a hazy turquoise sea. A sea-green copper observatory ceiling arc, pale irregular stone, warm plaster, aged oak beams, floorboards with natural grain, woven rug, shelves of richly textured books, potted vines, cushions, glass, brass, warm table lamps. Late afternoon sun and soft bounced light, delicate cinematic ambient occlusion, subtle atmospheric depth, refined realistic miniature scale, exceptionally detailed materials; no low-poly geometry and no flat colors.
There are three distinct, easily clickable hero objects with generous separation: at the left by the window, a large intricate brass armillary sphere on a freestanding pedestal; at front-center, a substantial oak desk with a visibly open illuminated research manuscript and scattered diagrams (purely decorative marks, no legible text); on the right rear wall, one large framed architectural systems drawing with geometric lines and circles, clearly separated from the desk. These three objects must be beautifully rendered and visually unmistakable. Smaller decor supports them without hiding their silhouettes.
Palette: honeyed oak, warm ivory limestone, patinated sea-green brass, moss, restrained burgundy books. It should feel like entering the lovely observatory building on an exquisitely detailed sunlit island with gardens and lanterns. Avoid doll-like toys, oversized blocky furniture, icon illustrations, clinical white walls, text, watermarks, labels, UI panels, grids or split compositions.
```

## 造物工坊

```text
Use case: stylized-concept. Asset type: final high-resolution cozy-game interior background, 16:9 landscape. Create one exquisitely detailed pre-rendered 3D interior on a magical Mediterranean island. Premium crafted miniature architecture, full-bleed immersive room filling the entire frame, elevated front three-quarter camera from missing front wall about 25 degrees downward. No exterior platform, no border, no people, no text, no UI, no labels. Realistic aged oak grain, warm plaster and limestone, patinated brass, linen, woven rugs, glass, potted vines, carefully crafted furniture, rich small details. Late-afternoon sun from a sea-view window, warm practical lamps, soft bounced light, delicate cinematic ambient occlusion, visible material texture, realistic refined geometry. No low-poly blocks or flat colors. Hero objects have clear separation and unobstructed silhouettes so they can be clicked in a game. The whole image feels warm, peaceful, expensive and beautifully lived-in.
Scene: a delightful maker's atelier beneath timber rafters and a skylight, in a little island workshop, warm oak floors and a woven rug, pale limestone arch, plants and tools arranged with care. Exactly three dominant hero stations: LEFT is a freestanding oak artist's easel holding a large canvas of abstract botanical design, front-center is a handsome articulated brass mechanical gear sculpture on its own small workbench, RIGHT is a beautiful wooden computer workstation under the window with one clearly visible modern desktop monitor, keyboard and warm lamp; monitor has an abstract soft green wallpaper, no readable text. All three stations are spatially separate and visible in full. The brass mechanism should feature large ornate interlocking gears and a polished circular base; the computer should be recognizable. Main desk and foreground decor must not obscure them. Sea-green and warm amber accents, natural soft sunlight, tactile craft objects. Avoid neon, cyberpunk, modern office chairs, excessive clutter, extra monitor screens, typography or symbols pretending to be UI.
```

## 日常小屋

```text
Use case: stylized-concept. Asset type: final high-resolution cozy-game interior background, 16:9 landscape. Create one exquisitely detailed pre-rendered 3D interior on a magical Mediterranean island. Premium crafted miniature architecture, full-bleed immersive room filling the entire frame, elevated front three-quarter camera from missing front wall about 25 degrees downward. No exterior platform, no border, no people, no text, no UI, no labels. Realistic aged oak grain, warm plaster and limestone, patinated brass, linen, woven rugs, glass, potted vines, carefully crafted furniture, rich small details. Late-afternoon sun from a sea-view window, warm practical lamps, soft bounced light, delicate cinematic ambient occlusion, visible material texture, realistic refined geometry. No low-poly blocks or flat colors. Hero objects have clear separation and unobstructed silhouettes so they can be clicked in a game. The whole image feels warm, peaceful, expensive and beautifully lived-in.
Scene: a deeply welcoming small seaside cottage living room, inspired by a lovingly curated cozy life-simulation game. Cream plaster walls, curved doorway, oak beams, embroidered green sofa at the LEFT, low round wooden tea table, linen curtains, pottery, flowers, antique hearth, soft cushions, woven rug and golden light. Exactly two obvious interactive hero objects: a large elegant brass FLOOR LAMP with a pleated ivory shade glowing warmly next to the LEFT sofa, clearly silhouetted with its entire stand visible; and an attractive wooden wall-mounted KEY RACK in the RIGHT entry alcove, large enough to be clearly visible, with three polished brass keys hanging on hooks below a small shelf with a little flower pot. Make the key rack visually prominent at eye height, unobstructed by furniture. Cozy detail and believable textures throughout, an arched sea-view window, inviting handmade interior. Do not put any lettering on the key rack. No labels, people, UI or text.
```

## 冒险收藏室

```text
Use case: stylized-concept. Asset type: final high-resolution cozy-game interior background, 16:9 landscape. Create one exquisitely detailed pre-rendered 3D interior on a magical Mediterranean island. Premium crafted miniature architecture, full-bleed immersive room filling the entire frame, elevated front three-quarter camera from missing front wall about 25 degrees downward. No exterior platform, no border, no people, no text, no UI, no labels. Realistic aged oak grain, warm plaster and limestone, patinated brass, linen, woven rugs, glass, potted vines, carefully crafted furniture, rich small details. Late-afternoon sun from a sea-view window, warm practical lamps, soft bounced light, delicate cinematic ambient occlusion, visible material texture, realistic refined geometry. No low-poly blocks or flat colors. Hero objects have clear separation and unobstructed silhouettes so they can be clicked in a game. The whole image feels warm, peaceful, expensive and beautifully lived-in.
Scene: a magical explorer's collection room inside a beautiful seaside pavilion, curved timber beams and patterned warm fabric ceiling, wooden floor and a large moss-green woven rug, amber lanterns, exquisite shelves and plants. It is a refined adventure collector's den, not a toy room. SEVEN distinct unobstructed hero objects, all generously separated, clearly recognizable:
1 LEFT BACK WALL: one large framed painting of a floating cloud island landscape.
2 LEFT FRONT: a glass terrarium on an elegant low pedestal, containing a tiny lush enchanted garden with a small glowing creature, intricate glass and copper framing.
3 MIDDLE BACK: a freestanding beautiful retro arcade cabinet in sea-green lacquered wood, small colorful abstract screen without text, two controls.
4 FRONT CENTER: a large tabletop war-game landscape diorama on a low oak table, detailed miniature terrain, little soldiers and flags, clearly separated from terrarium.
5 RIGHT BOOKSHELF, MID HEIGHT: a detailed large wooden mail sailing ship model with white sails, openly displayed and unmistakable.
6 RIGHT REAR WALL ABOVE SHELVES: one large vertical hanging silk scroll, moonlit Chinese mountain landscape.
7 RIGHT FOREGROUND: an elegant freestanding red-and-gold embroidered ancient Chinese military banner with ornamental dragon pattern and tasseled pole, no readable characters.
Composition must keep all seven objects visible and spaced apart, not overlapped. Do not make duplicate hero objects. Match the exquisite sunlit island craftsmanship, rich woodgrain, aged metal, glass, embroidery and foliage. Warm light, tactile surfaces, inviting peaceful mood, tasteful and sophisticated.
```

## 接入检查

- 热点键使用现有模块 ID，保留共享 `onLaunch` 接口。
- 多边形以图像左上角为原点，坐标范围为 0–1；灯光坐标也使用同一空间。
- 冒险收藏室中邮船位于山水卷轴前方，卷轴热点避开被船帆遮挡的部分，聚焦时优先选择上方月亮和山景。
- 这些画面只能支持有限视差；过大的相机角度会暴露烘焙画面没有的背面。


# 暖居海岛：游戏场景美术提示词

这份规范用于继续开发丁康工作空间的暖居外观。视觉基准是用户提供的海岛参考图，项目内对应 `public/assets/hub/cozy/island-v2.webp`。后续室内、物件和动态层都应以同一张图校准材质、色彩与光线。

## 使用方式

总指导用于约束负责设计与实现的代理；单张资产提示词用于图像生成；动态提示词用于编写渲染和交互。三者分别执行，避免一次生成请求同时承担绘图、建模和程序逻辑。

本轮采用固定镜头的烘焙美术与实时 WebGL 局部动态，形成有限视差的 2.5D 场景。完整画面里的光影是美术的一部分，不能把它当成不带光照的 PBR 基础色贴图，再强加一套不一致的全局照明。任意角度自由漫游需要另行制作完整三维模型、UV 与材质。

## 1. 美术总指导：给 Astra / 场景实现代理

```text
你负责这个项目的游戏场景美术、灯光与交互表现。

目标：把个人工作空间呈现为一座可以进入小屋、触碰物件的小岛。
以附图为视觉质量和风格基准，保留它的温暖日照、海水色阶、自然材质、
精细建筑工艺与安静的生活气息。每个房间中的应用通过物件进入。

先分析参考图，形成一页美术规范，再按规范制作资产和实现交互。
分析必须涉及构图、镜头、明暗层次、材质差异、细节密度和视觉焦点。

构图：固定的高位三分之四视角，海岛与四座建筑有清晰空间层次。
石阶、花园小径和木桥连接观星书屋、创作工坊、生活小屋、冒险收藏屋。
水面和天空保留呼吸空间；建筑、门口和可交互物件保持清晰轮廓。
前景岩石与花草、中景建筑、远景海雾分层，有限视差不能破坏透视。

材质：有纹理方向和接缝的旧橡木；边角圆润、色泽不完全一致的石块；
逐片搭接的青灰屋瓦；轻微氧化的黄铜；有厚度、反射与透光感的玻璃；
具有纤维和褶皱的亚麻布；叶片与花簇分层，避免整团均匀的绿色球体。
使用痕迹应服从用途：把手被磨亮，石阶边缘变圆，墙脚有少量苔藓。

光照：左上方温暖日光，天空与海面提供偏冷的柔和补光。
檐下和物件接触处有柔和遮蔽；窗内灯、路灯和壁灯呈低亮度琥珀光。
保持屋瓦、枝叶和木纹细节，不用强泛光掩盖材质，不让全部表面像塑料。

细节：围绕实际用途摆放书籍、工具、茶杯、花盆、卷轴和收藏品。
留出走动与操作空间。交互物件的大小、亮度、轮廓需高于普通装饰，
但应自然属于房间；避免把应用入口做成悬浮科技面板。

动效：缓慢的海水与岸边泡沫、微风中的叶片和布幔、薄云与远雾、
少量光尘、低频灯火变化。每种动态有自己的方向、速度和发生区域。
建筑和硬质家具保持稳定，禁止让整张背景统一扭曲、漂浮或呼吸。

交互：悬停时出现细薄暖金轮廓；单击建筑进入选中状态，显示名称和进入按钮；
确认进入后镜头温和推进到门口，再过渡到对应小屋。
物件悬停显示应用名称与用途，点击通过既有统一接口启动。
返回仍回到原房间。移动端先选中再确认，键盘也能完成全部操作。

界面：画面占据主视口。控件数量少、文字清楚，正文至少16px，辅助文字至少14px。
不把主画面分割成仪表盘卡片，不叠加宣传口号、密集说明或装饰性数字。

声音：由用户主动开启；海风、轻浪和稀疏鸟鸣保持安静，室内声音更柔和。
关闭音效、切到后台或离开场景时停止声音。

验收：把实现截图与参考图并排比较。逐项检查建筑比例、材质辨识、植被层次、
暖冷光关系、物件可读性和界面侵占面积。发现偏差就指出具体位置再修正。
分别提交实际桌面画面、手机画面、建筑选择、室内物件和返回流程的验证结果。
不要仅凭“功能可点击”宣布美术完成。
```

## 2. 室内画面：给图像生成模型

每次只制作一个房间，并附同一张海岛风格参考。以下模板中的用途、物件和位置需要按实际房间替换。

```text
Asset type: high-detail pre-rendered game environment plate.
Reference image: the attached coastal island is the style, material, palette,
and lighting reference. Create an interior belonging to that exact world.

Scene: [房间用途与建筑类型]. An inviting, carefully furnished miniature interior,
viewed through an open front wall, from a restrained elevated three-quarter camera.
Fill a wide 16:9 frame with the room; keep the full usable floor and important objects visible.

Interactive focal objects: [物件名称与明确位置].
Give each object a distinct, readable silhouette and enough empty space around it.
Decorative objects must not obscure or compete with these focal objects.

Materials: naturally grained oak, softly uneven plaster, aged brass,
clear thick glass, woven linen, glazed ceramics, leather-bound books and layered foliage.
Fine construction details, believable joins, rounded worn edges, restrained patina.
Detailed stylized realism with handcrafted charm and physically plausible material response.

Lighting: warm late-afternoon window light, cool soft sky fill, subtle amber practical lamps,
gentle contact shadows and bounce light. Preserve detail in shadows and highlights.
The room feels lived in, peaceful and lovingly maintained.

Output: one finished environment plate, no text, no logos, no UI, no frame, no people.
Keep the visual density and craftsmanship of the reference.
Avoid crude geometric props, uniformly smooth surfaces, toy-like plastic,
excessive bloom, fisheye distortion, arbitrary clutter and inaccessible focal objects.
```

| 房间 | 需要清晰呈现的物件 |
|---|---|
| 研习书屋 | 左侧窗边的黄铜星象仪；前方桌上的研究手稿；右墙的架构画 |
| 造物工坊 | 左侧画架；中央铜齿轮装置；右侧电脑工作台 |
| 日常小屋 | 沙发旁的落地灯；玄关墙面的钥匙架 |
| 冒险收藏室 | 云岛画、玻璃花园、街机、战争沙盘、邮船、山水卷轴、将旗 |

生成后依据实际图像重新标注物件范围，不能把提示词指定的位置直接当作最终点击坐标。

## 3. 单件物品：独立细化或局部改图

```text
以附图为编辑对象，只细化指定的[物件]，保持房间构图、相机、其他物品与光照不变。
它的用途是[用途]，应具备[结构部件]，使用[材料及表面状态]。
增加真实的边缘、接缝、厚度、局部磨损和接触阴影，让它在缩小到游戏界面时仍可辨认。
把装饰集中在轮廓和功能部件上，保持周边空隙，不新增文字或界面。
```

例如星象仪：黄铜经纬环、细刻度的视觉纹理、木质支座和侧向旋钮；玻璃花园：玻璃厚度、细金属框、苔藓、微缩植物与可辨认的小精灵。应用名称由网页文字层呈现，不烘焙进图片。

## 4. 实时动态与选中反馈：给渲染实现代理

```text
在已批准的美术画面上增加实时效果，保持静态美术质量。
为海水、瀑布、云雾、树冠、布幔、灯窗分别建立准确的局部范围。
海水有缓慢流向、细碎反光和岸边泡沫；水的位移不能污染岩石、桥或房屋。
树冠和布幔仅有轻微周期变化，同一阵风下方向一致，频率与延迟不同。
远雾缓慢流动，前景薄云保留透明度，不遮蔽建筑入口。
灯光在真实灯窗附近产生柔和低频变化，不能把全屏亮度一起调高调低。

悬停、选中、进入三种状态分开实现。选中高亮沿真实建筑轮廓，名称清晰，
确认按钮与建筑有明确对应。进入前保留短暂停顿，再柔和推进与淡化。
相机移动保持有限幅度，避免暴露烘焙画面缺少的背面，也避免用户晕动。

保留画面中所有可交互物件的准确点击范围，桌面和手机都要实测。
减少动效模式改为直接切换，隐藏页面停止渲染，释放时清理全部资源。
音频由明确用户操作启动，默认关闭，不用自动播放营造氛围。
不新增独立业务接口，使用现有模块注册与onLaunch。
```

## 5. 固定的美术检查问题

- 画面缩到实际显示尺寸后，四座建筑和主要物件是否仍能辨认？
- 木、石、玻璃、金属、布料是否有不同的视觉表现？
- 光源方向和阴影是否一致？白墙和灯窗是否保留细节？
- 动态是否只发生在应该动的地方？停止动态后画面是否仍然完整？
- 选中反馈是否与建筑或物件的实际轮廓贴合？
- 手机中是否存在看得见却点不到、被控件挡住或被裁掉的入口？
- 同一套资产是否能支持默认、悬停、选中、进入、返回与减少动效状态？

## 参考依据

以下是提示词结构与灯光方法的参考；上述项目提示词为根据用户海岛参考图编写的原创方案，并非引用的现成“神奇提示词”。

- [OpenAI imagegen：Game assets template 与示例](https://github.com/openai/skills/blob/main/skills/.system/imagegen/references/sample-prompts.md#game-assets-template)：区分环境、角色、图标和纹理资产，明确场景、构图、光照与约束。
- [Adobe Firefly：Prompting & Controls Guide](https://community.adobe.com/p/firefly-image-guide)：分清风格参考和构图参考，使用具体的角度、材质、光线和颜色描述，逐项迭代。
- [Epic：Light a Scene](https://dev.epicgames.com/documentation/en-us/unreal-engine/artist-02-light-a-scene)：区分环境与局部照明，并用局部光引导可交互区域的注意力。

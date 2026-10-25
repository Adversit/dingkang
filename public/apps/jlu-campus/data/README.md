# 吉林大学前卫校区地图数据

此数据由 OpenStreetMap 官方 API 独立取得，下载日期 2026-10-25。来源、原始文件 SHA-256 与许可见 sources.json；完整质量检查与缺项见 data-quality.json。

## 可直接使用的文件

- qianwei-south.json：前卫南区（边界 way/298032902），主漫游场景。
- qianwei-north.json：前卫北区（边界 relation/20216071），完整已标注边界，内容较稀疏。
- overview.svg：由南区真实几何生成的轻量俯视预览，非实景照片。

## 坐标和结构

原始数据 WGS84，经 pyproj 转为 EPSG:32651（UTM zone 51N），再平移为局部米制坐标。x 向东，y 向南，尚未进行展示旋转。meta.origin 为平移前的投影原点，meta.width/height 与 meta.bounds 为边界包围盒。meta.spawn 是经过建筑和水域排除的安全路面点。

boundary/buildings/water/surfaces 每条要素包含 id、name、tags、bounds、polygons；polygon 为 {outer:[[x,y],...],holes:[[[x,y],...]]}。中心点 center 为面内代表点，不能直接当作传送点。

roads/barriers 每条要素包含 id、name、tags、bounds、lines；lines 为多条 [[x,y],...]。roads 保留原始 nodeRefs，完整OSM快照保留所有节点拓扑；裁剪后线段端点不一定对应原节点，应以坐标几何或原始快照建图。

pois 为 {id,name,tags,x,y}，入口通过 tags.entrance 判断，校门/门通过 tags.barrier=gate 判断，不能将所有入口称为校门。

landmarks 与全部建筑一一对应，包含 id、name、named、entrance:[x,y]、entranceNodeId、entranceBasis、tags。无名建筑使用“未命名建筑 · OSM编号”。entrance 是校界内、建筑/湖面外约 1.5 米的可步行道路最近点，是游戏安全目标，**不是实测门槛**。有入口节点时以入口为参考，否则以建筑内代表点为参考。

## 处理与范围

建筑按面内代表点落在校界内保留；道路、地表、水域与障碍线裁剪至校界。多多边形关系保留全部内院孔洞。南区地表600个含广场、喷泉、停车格，POI284个含树木，因此与采用更窄分类的旧统计不同。数据条目数量不代表现实覆盖率。

北区仅3栋建筑有名称，0个入口节点，不能将其显示成“现实细节全部核验完成”。没有围墙线不代表现实没有围墙。缺少高度字段时的游戏楼高和外观均为美术设定。

## 许可

© OpenStreetMap contributors，数据和派生数据库按 ODbL 1.0 提供，见 LICENSE_DATA.txt。公开游戏应保留可见署名及许可链接，并保持所用派生数据库可获得。

## 复现

源码仓库 docs/campus/map-source/ 中包含压缩原始 OSM、分层 WGS84 GeoJSON 与 convert_osm.py。解压同目录全部 .osm.gz 后，安装 shapely、pyproj 并运行 python convert_osm.py，可生成相同结构的 JSON。

转换脚本由本项目独立编写，MIT 许可。未拷贝参考站程序、美术和官方三维地图资源。

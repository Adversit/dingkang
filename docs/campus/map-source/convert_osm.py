#!/usr/bin/env python3
"""Independent OSM snapshot → campus GeoJSON and metre-coordinate game layers.

Requirements: Python 3, shapely, pyproj.
Run: python convert_osm.py
Data licence: ODbL 1.0 (OpenStreetMap contributors).
Code licence: MIT.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import json, hashlib, datetime, collections
from shapely.geometry import Point, Polygon, MultiPolygon, LineString, MultiLineString, mapping
from shapely.ops import unary_union, polygonize, transform, nearest_points
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat()
PROJ = Transformer.from_crs('EPSG:4326', 'EPSG:32651', always_xy=True)

def tags(e):
    return {t.attrib['k']: t.attrib['v'] for t in e.findall('tag')}

def load_osm(paths):
    nodes, ways, relations = {}, {}, {}
    for path in paths:
        root = ET.parse(path).getroot()
        for e in root:
            ident = e.get('id')
            if e.tag == 'node':
                nodes[ident] = {'coord': (float(e.get('lon')), float(e.get('lat'))), 'tags': tags(e)}
            elif e.tag == 'way':
                ways[ident] = {'refs': [n.get('ref') for n in e.findall('nd')], 'tags': tags(e)}
            elif e.tag == 'relation':
                relations[ident] = {'members': [m.attrib for m in e.findall('member')], 'tags': tags(e)}
    return nodes, ways, relations

def relation_geom(rel, ways, nodes, warnings, ident):
    groups = {'outer': [], 'inner': []}
    for m in rel['members']:
        if m['type'] != 'way' or m.get('role','') not in ('outer', 'inner', ''):
            continue
        w = ways.get(m['ref'])
        if not w or any(r not in nodes for r in w['refs']):
            warnings.append(f'{ident}: missing way/member nodes: {m["ref"]}')
            return None
        cs = [nodes[r]['coord'] for r in w['refs']]
        if len(cs) >= 2:
            groups['inner' if m.get('role') == 'inner' else 'outer'].append(LineString(cs))
    if not groups['outer']:
        return None
    outer = unary_union(list(polygonize(groups['outer'])))
    if groups['inner']:
        inner = unary_union(list(polygonize(groups['inner'])))
        outer = outer.difference(inner)
    if outer.is_empty:
        return None
    if not outer.is_valid:
        outer = outer.buffer(0)
    return outer if outer.geom_type in ('Polygon', 'MultiPolygon') else None

def polygon_parts(geom):
    if geom.geom_type == 'Polygon':
        return [geom]
    if geom.geom_type == 'MultiPolygon':
        return list(geom.geoms)
    if geom.geom_type == 'GeometryCollection':
        return [p for g in geom.geoms for p in polygon_parts(g)]
    return []

def line_parts(geom):
    if geom.geom_type == 'LineString':
        return [geom]
    if geom.geom_type in ('MultiLineString', 'GeometryCollection'):
        return [p for g in geom.geoms for p in line_parts(g)]
    return []

def rounded(coords):
    return [[round(x, 2), round(y, 2)] for x,y in coords]

def classify(t):
    if t.get('building') and t.get('building') != 'no': return 'buildings'
    if t.get('natural') == 'water' or t.get('waterway') == 'riverbank' or t.get('landuse') in ('reservoir', 'basin'): return 'water'
    if t.get('barrier'): return 'barriers'
    if t.get('highway') and t.get('area') != 'yes': return 'roads'
    if any(k in t for k in ('landuse', 'leisure', 'natural')) or t.get('area') == 'yes' or t.get('place') in ('square','islet') or t.get('amenity') in ('parking','parking_space','bicycle_parking','fountain'): return 'surfaces'
    return None

def make(campus, boundary_id):
    supplemental_ids=['20175924','20707723','20707725'] if campus=='south' else ['20824167']
    supplemental_paths=[ROOT/f'relation-{r}.osm' for r in supplemental_ids]
    nodes, ways, relations = load_osm([ROOT/f'{campus}-raw.osm',ROOT/f'boundary-{campus}.osm', *supplemental_paths])
    warnings=[]
    if boundary_id.startswith('way/'):
        w=ways[boundary_id.split('/')[1]]
        boundary=Polygon([nodes[r]['coord'] for r in w['refs']])
        boundary_tags=w['tags']
    else:
        rel=relations[boundary_id.split('/')[1]]
        boundary=relation_geom(rel, ways, nodes, warnings, boundary_id)
        boundary_tags=rel['tags']
    if boundary is None: raise ValueError('No campus boundary')
    projected_boundary=transform(PROJ.transform,boundary)
    left,bottom,right,top=projected_boundary.bounds
    def local(x,y,z=None):
        e,n=PROJ.transform(x,y)
        return e-left,top-n
    def output_geom(g): return transform(local,g)
    data={k:[] for k in ('boundary','buildings','water','surfaces','roads','pois','barriers')}
    geo={k:{'type':'FeatureCollection','features':[]} for k in data}
    used_members=set()
    candidates=[]
    for rid,r in relations.items():
        t=r['tags'];kind=classify(t)
        if t.get('type')!='multipolygon' or not kind or f'relation/{rid}'==boundary_id: continue
        # Incomplete unrelated relations near bbox boundaries are skipped.
        g=relation_geom(r,ways,nodes,warnings,f'relation/{rid}')
        if g is not None and g.intersects(boundary):
            candidates.append((f'relation/{rid}',kind,t,g,{}))
            used_members.update(m['ref'] for m in r['members'] if m['type']=='way')
    for wid,w in ways.items():
        if wid in used_members or f'way/{wid}'==boundary_id: continue
        t=w['tags'];kind=classify(t)
        if not kind or len(w['refs'])<2: continue
        if any(r not in nodes for r in w['refs']): continue
        cs=[nodes[r]['coord'] for r in w['refs']]
        is_area=kind in ('buildings','water','surfaces') and cs[0]==cs[-1] and len(cs)>3
        if kind in ('buildings','water','surfaces') and not is_area: continue
        g=Polygon(cs) if is_area else LineString(cs)
        if not g.is_valid: g=g.buffer(0) if is_area else g
        if g.is_empty or not g.intersects(boundary): continue
        candidates.append((f'way/{wid}',kind,t,g,{'nodeRefs':w['refs']} if kind=='roads' else {}))
    candidates.insert(0,(boundary_id,'boundary',boundary_tags,boundary,{}))
    for ident,kind,t,g,extra in candidates:
        if kind=='buildings' and not boundary.covers(g.representative_point()): continue
        if kind in ('roads','barriers','surfaces','water'): g=g.intersection(boundary)
        lg=output_geom(g)
        f={'id':ident,'name':t.get('name',t.get('name:zh','')),'tags':t,'bounds':[round(v,2) for v in lg.bounds],**extra}
        if kind in ('roads','barriers'):
            ls=line_parts(lg)
            if not ls: continue
            f['lines']=[rounded(x.coords) for x in ls]
        else:
            ps=polygon_parts(lg)
            if not ps: continue
            f['polygons']=[{'outer':rounded(x.exterior.coords),'holes':[rounded(i.coords) for i in x.interiors]} for x in ps]
            f['center']=[round(lg.representative_point().x,2),round(lg.representative_point().y,2)]
        data[kind].append(f)
        geo[kind]['features'].append({'type':'Feature','id':ident,'properties':{'osm_id':ident,**t},'geometry':mapping(g)})
    for nid,n in nodes.items():
        t=n['tags'];g=Point(n['coord'])
        if not t or not boundary.covers(g): continue
        # Keep actionable/name-bearing campus POIs, trees and access nodes.
        if not any(k in t for k in ('name','entrance','barrier','amenity','tourism','natural','leisure','shop','historic','highway')): continue
        x,y=local(*n['coord'])
        ident=f'node/{nid}'
        data['pois'].append({'id':ident,'name':t.get('name',''),'tags':t,'x':round(x,2),'y':round(y,2)})
        geo['pois']['features'].append({'type':'Feature','id':ident,'properties':{'osm_id':ident,**t},'geometry':mapping(g)})
    def feature_polygons(f):
        return [Polygon(p['outer'], p['holes']) for p in f['polygons']]
    local_boundary=output_geom(boundary)
    obstacles=unary_union([g for k in ('buildings','water') for f in data[k] for g in feature_polygons(f)]).buffer(1.5)
    allowed=local_boundary.buffer(-0.5).difference(obstacles)
    navigable=[]
    for road in data['roads']:
        t=road['tags']
        if t.get('foot')=='no' or t.get('access') in ('no','private') or t.get('highway') in ('construction','proposed','motorway','trunk'): continue
        for line in road['lines']:
            candidate=LineString(line).intersection(allowed)
            navigable.extend(line_parts(candidate))
    road_geometry=unary_union(navigable)
    entry_points=[p for p in data['pois'] if p['tags'].get('entrance') not in (None,'no')]
    landmarks=[]
    for b in data['buildings']:
        shape=unary_union(feature_polygons(b))
        choices=[p for p in entry_points if shape.distance(Point(p['x'],p['y']))<2]
        choices.sort(key=lambda p: 0 if p['tags'].get('entrance')=='main' else 1)
        anchor=Point(choices[0]['x'],choices[0]['y']) if choices else shape.representative_point()
        safe=nearest_points(anchor, road_geometry)[1]
        landmarks.append({'id':b['id'],'name':b['name'] or f'未命名建筑 · {b["id"].split("/")[-1]}','named':bool(b['name']),'entrance':[round(safe.x,2),round(safe.y,2)],
                          'entranceNodeId':choices[0]['id'] if choices else None,
                          'entranceBasis':'nearest safe walkable road to OSM entrance' if choices else 'nearest safe walkable road to building representative point',
                          'tags':b['tags']})
    spawn_name='日新楼' if campus=='south' else '理化楼'
    spawn=next((p['entrance'] for p in landmarks if p['name']==spawn_name),landmarks[0]['entrance'])
    stats={k:len(v) for k,v in data.items()}
    data['landmarks']=landmarks
    stats.update({'buildingHoles':sum(len(p['holes']) for b in data['buildings'] for p in b['polygons']),
      'namedBuildings':sum(bool(b['name']) for b in data['buildings']),
      'buildingsWithLevels':sum('building:levels' in b['tags'] for b in data['buildings']),
      'buildingsWithHeight':sum('height' in b['tags'] for b in data['buildings']),
      'entranceNodes':sum('entrance' in p['tags'] for p in data['pois']),
      'gateNodes':sum(p['tags'].get('barrier')=='gate' for p in data['pois'])})
    data['meta']={'schemaVersion':1,'id':f'qianwei-{campus}','name':'吉林大学前卫'+('南区' if campus=='south' else '北区'),
      'source':'https://api.openstreetmap.org/api/0.6/','boundarySource':f'https://www.openstreetmap.org/{boundary_id}',
      'license':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/',
      'attribution':'© OpenStreetMap contributors','attributionUrl':'https://www.openstreetmap.org/copyright',
      'downloadedAt':NOW,'projection':'EPSG:32651; local x=easting-origin.easting, y=origin.northing-northing; units metres; no display rotation',
      'origin':{'easting':left,'northing':top},'width':round(right-left,2),'height':round(top-bottom,2),
      'bounds':{'minX':0,'minY':0,'maxX':round(right-left,2),'maxY':round(top-bottom,2)},'spawn':spawn,'boundsWgs84':list(boundary.bounds),'counts':stats,
      'filtering':'Buildings kept when representative point is inside campus. Roads/barriers/surfaces/water geometries clipped to boundary. Polygon holes retained. Tagged POIs filtered to campus. All original topology and OSM tags remain in raw snapshots.',
      'warnings':['OSM is a volunteer map; element counts are not coverage estimates.','Missing floor/height fields are not inferred measurements.','Door nodes are building entrances, not necessarily campus gates.','No barrier ways does not mean no real walls.','Road access, construction and steps tags must be respected by navigation.','Decorative assets generated by the application are artistic, not surveyed.']+warnings,
      'rawFiles':[{'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()} for file in [ROOT/f'{campus}-raw.osm',ROOT/f'boundary-{campus}.osm',*supplemental_paths]]}
    out=ROOT/f'qianwei-{campus}.json';out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    folder=ROOT/f'geojson-{campus}';folder.mkdir(exist_ok=True)
    for k,v in geo.items():(folder/f'{k}.geojson').write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print(campus,json.dumps(stats),f'{data["meta"]["width"]}x{data["meta"]["height"]}m',f'{out.stat().st_size} bytes',f'{len(warnings)} skipped incomplete relation messages')

if __name__=='__main__':
    make('south','way/298032902')
    make('north','relation/20216071')

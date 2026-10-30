/**
 * Conservative, explicit-event temporal projection.
 *
 * This module does not extract facts from prose. The caller must supply ONLY
 * canon-approved structured events, with stable entity and predicate IDs, and
 * must provide a server-side sourceCurrent(record) predicate which validates
 * ownership, the committed source revision and quoted evidence. Never pass a
 * client-supplied `current` flag as this predicate.
 */
const IDENTIFIER = /^[A-Za-z0-9_-]{1,80}$/;
const DECIMAL = /^-?(?:0|[1-9]\d{0,8})(?:\.\d{1,6})?$/;
const id = v => typeof v === 'string' && IDENTIFIER.test(v);
const nonempty = (v, max = 1000) => typeof v === 'string' && !!v.trim() && v.length <= max;
export class TemporalError extends Error { constructor(message,status=422){super(message);this.status=status;} }

export function parseMoment(value) {
  if (typeof value !== 'string' || !DECIMAL.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function requireId(value, label) { if (!id(value)) throw new TemporalError(`${label}无效。`); }
function requireSource(record) {
  if (!record.source || !id(record.source.sceneId) || !id(record.source.revisionId) || !nonempty(record.source.evidence, 2000)) {
    throw new TemporalError('结构化事件需要场景、版本和原文证据。');
  }
}
function validTransition(item) {
  if (!item || typeof item !== 'object') throw new TemporalError('事件格式无效。');
  for (const [value, name] of [[item.id,'事件'],[item.entityId,'实体'],[item.predicateId,'属性']]) requireId(value,name);
  if (!['world','belief'].includes(item.layer) || !['set','clear','unknown'].includes(item.op)) throw new TemporalError('状态层或事件操作无效。');
  if (item.layer === 'belief') requireId(item.subjectId,'信念主体');
  else if (item.subjectId !== undefined && item.subjectId !== '') throw new TemporalError('世界事实不能带信念主体。');
  if (item.op === 'set' && !nonempty(item.value, 500)) throw new TemporalError('状态变化缺少值。');
  if (item.op !== 'set' && item.value !== undefined && item.value !== '') throw new TemporalError('清除或未知操作不能附带值。');
  if (item.at !== null && parseMoment(item.at) === null) throw new TemporalError('事件时点必须为数字序号或未知。');
  requireSource(item);
}
function validKnowledge(item) {
  if (!item || typeof item !== 'object') throw new TemporalError('知情记录格式无效。');
  for (const [value,name] of [[item.id,'知情事件'],[item.characterId,'角色'],[item.eventId,'所知事件']]) requireId(value,name);
  if (!['knows','forgets','uncertain'].includes(item.op) || (item.at !== null && parseMoment(item.at) === null)) throw new TemporalError('知情事件状态或时点无效。');
  requireSource(item);
}
function validSpeech(item) {
  if (!item || typeof item !== 'object') throw new TemporalError('话语格式无效。');
  requireId(item.id,'话语'); requireId(item.speakerId,'说话人');
  if (!nonempty(item.text,2000) || (item.at !== null && parseMoment(item.at) === null) || !Array.isArray(item.audienceIds) || !item.audienceIds.every(id)) throw new TemporalError('话语内容、时点或听众无效。');
  requireSource(item);
}
export function isTemporalCommand(type) {return ['add_temporal_transition','add_temporal_knowledge','add_temporal_speech'].includes(type)}

/** Apply a user-confirmed event to a cloned server state; caller supplies CAS. */
export function applyTemporalCommand(state, command, now = new Date().toISOString()) {
  if (!state || !Array.isArray(state.projects) || !command || !isTemporalCommand(command.type)) throw new TemporalError('时态命令无效。');
  requireId(command.projectId,'作品');
  const project = state.projects.find(p=>p.id===command.projectId);
  if (!project) throw new TemporalError('作品不存在。',404);
  const temporal = project.temporal || {transitions:[],knowledge:[],speeches:[]};
  if (!Array.isArray(temporal.transitions) || !Array.isArray(temporal.knowledge) || !Array.isArray(temporal.speeches)) throw new TemporalError('时态档案格式无效。',500);
  const record = {id:command.id,at:command.at,source:command.source};
  if (command.type==='add_temporal_transition') Object.assign(record,{entityId:command.entityId,predicateId:command.predicateId,layer:command.layer,subjectId:command.subjectId || '',op:command.op,value:command.value || ''});
  else if (command.type==='add_temporal_knowledge') Object.assign(record,{characterId:command.characterId,eventId:command.eventId,op:command.op});
  else Object.assign(record,{speakerId:command.speakerId,text:command.text,audienceIds:command.audienceIds});
  if (command.type==='add_temporal_transition') validTransition(record);
  else if (command.type==='add_temporal_knowledge') validKnowledge(record);
  else validSpeech(record);
  if ([...temporal.transitions,...temporal.knowledge,...temporal.speeches].some(x=>x.id===record.id)) throw new TemporalError('事件标识已存在。',409);
  const sourceScene = project.scenes?.find(s=>s.id===record.source.sceneId), sourceRevision = sourceScene?.revisions?.at(-1);
  if (!sourceRevision || sourceRevision.id!==record.source.revisionId || sourceScene.draft!==sourceRevision.body || sourceScene.title!==sourceRevision.title || !sourceRevision.body.includes(record.source.evidence)) throw new TemporalError('来源正文或版本已经变化，请重新确认。',409);
  if (command.type==='add_temporal_knowledge') {
    const target=temporal.transitions.find(x=>x.id===record.eventId && x.layer==='world');
    if (!target) throw new TemporalError('知情记录必须引用本作品的世界状态事件。',422);
    if (target.at !== null && record.at !== null && parseMoment(record.at)<parseMoment(target.at)) throw new TemporalError('知情时点不能早于所引用的状态事件。',422);
  }
  if (command.type==='add_temporal_speech' && !sourceRevision.body.includes(record.text)) throw new TemporalError('话语内容须出现在来源正文中。',422);
  project.temporal=temporal;
  if (command.type==='add_temporal_transition') temporal.transitions.push({...record,createdAt:now});
  else if (command.type==='add_temporal_knowledge') temporal.knowledge.push({...record,createdAt:now});
  else temporal.speeches.push({...record,createdAt:now});
  project.canonVersion=(project.canonVersion||0)+1;
  return {type:command.type,eventId:record.id,canonVersion:project.canonVersion};
}
const keyOf = item => JSON.stringify([item.layer, item.subjectId || '', item.entityId, item.predicateId]);
const sourceUsable = (resolver, record) => resolver(record.source, record) === true;

/**
 * An event is an explicit assignment of ONE single-valued predicate from its
 * story instant onward. A later assignment supersedes the prior assignment;
 * this rule cannot safely be used for multivalued attributes. At an identical
 * instant conflicting values are reported, never arbitrarily ordered.
 * Unknown time and unverified latest evidence block conclusions. Only an
 * omniscient view returns world facts without an explicit knowledge grant.
 */
export function projectAsOf(input, options) {
  if (!input || !Array.isArray(input.transitions) || !Array.isArray(input.knowledge) || !Array.isArray(input.speeches)) throw new TemporalError('请提供结构化事件、知情记录和话语数组。');
  if (input.transitions.length + input.knowledge.length + input.speeches.length > 10000) throw new TemporalError('事件数量超出本次计算上限。');
  if (!options || parseMoment(options.asOf) === null || !['omniscient','limited'].includes(options.perspective) || typeof options.sourceCurrent !== 'function') throw new TemporalError('查询时点、视角或服务端证据校验器无效。');
  if (options.perspective === 'limited') requireId(options.characterId,'视角角色');
  const at = parseMoment(options.asOf), seen = new Set();
  for (const list of [input.transitions,input.knowledge,input.speeches]) for (const entry of list) {
    if (seen.has(entry?.id)) throw new TemporalError('事件标识不能重复。');
    seen.add(entry?.id);
  }
  input.transitions.forEach(validTransition); input.knowledge.forEach(validKnowledge); input.speeches.forEach(validSpeech);
  const groups = new Map();
  for (const event of input.transitions) {
    const key = keyOf(event); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(event);
  }
  const states = [];
  for (const events of groups.values()) {
    const first = events[0];
    const base = {layer:first.layer, subjectId:first.subjectId || '', entityId:first.entityId, predicateId:first.predicateId};
    if (events.some(x => x.at === null)) {states.push({...base,status:'UNKNOWN',reason:'存在时点未知的状态变化。',eventIds:events.filter(x=>x.at===null).map(x=>x.id)});continue;}
    const eligible = events.filter(x => parseMoment(x.at) <= at);
    if (!eligible.length) {states.push({...base,status:'UNKNOWN',reason:'指定时点之前没有明确状态。',eventIds:[]});continue;}
    const max = Math.max(...eligible.map(x => parseMoment(x.at)));
    const latest = eligible.filter(x => parseMoment(x.at) === max);
    if (latest.some(x => !sourceUsable(options.sourceCurrent,x))) {states.push({...base,status:'UNKNOWN',reason:'最新状态的来源无效或待复核。',eventIds:latest.map(x=>x.id)});continue;}
    if (latest.some(x=>x.op==='unknown')) {states.push({...base,status:'UNKNOWN',reason:'作者记录了未知状态。',eventIds:latest.map(x=>x.id)});continue;}
    const values = new Set(latest.map(x => JSON.stringify([x.op,x.op==='set'?x.value:''])));
    if (values.size > 1) {states.push({...base,status:'CONFLICT',reason:'同一时点出现互斥状态。',eventIds:latest.map(x=>x.id)});continue;}
    states.push({...base,status:latest[0].op==='clear'?'UNSET':'KNOWN',value:latest[0].op==='set'?latest[0].value:null,at:latest[0].at,eventIds:latest.map(x=>x.id),sources:latest.map(x=>x.source)});
  }
  let visibleStates=states, excluded=[];
  if (options.perspective==='limited') {
    visibleStates=[];
    for (const state of states) {
      if (state.layer==='belief') {
        if (state.subjectId===options.characterId) visibleStates.push(state);
        else excluded.push({...state,reason:'其他角色的信念不向当前视角暴露。'});
        continue;
      }
      // Only an explicit, source-verified knowledge grant for every supporting
      // event may expose a known world state. State conflicts/unknowns stay out.
      if (state.status!=='KNOWN') {excluded.push({...state,reason:'世界状态不确定，无法作为角色已知事实。'});continue;}
      const known=state.eventIds.every(eventId=>{
        const k=input.knowledge.filter(x=>x.characterId===options.characterId&&x.eventId===eventId);
        if(k.some(x=>x.at===null))return false;
        const eligible=k.filter(x=>parseMoment(x.at)<=at);if(!eligible.length)return false;
        const max=Math.max(...eligible.map(x=>parseMoment(x.at))),last=eligible.filter(x=>parseMoment(x.at)===max);
        return last.length>0&&last.every(x=>x.op==='knows'&&sourceUsable(options.sourceCurrent,x));
      });
      if(known)visibleStates.push(state);else excluded.push({...state,reason:'没有可验证的角色知情记录。'});
    }
  }
  const speeches=[];
  for(const speech of input.speeches){
    if(speech.at===null || parseMoment(speech.at)>at || !sourceUsable(options.sourceCurrent,speech))continue;
    if(options.perspective==='limited' && speech.speakerId!==options.characterId && !speech.audienceIds.includes(options.characterId))continue;
    speeches.push({id:speech.id,speakerId:speech.speakerId,text:speech.text,at:speech.at,source:speech.source});
  }
  return {asOf:options.asOf,perspective:options.perspective,states:visibleStates,excluded,speeches,notice:'仅投影作者确认的结构化单值状态变化；话语和信念不等于世界事实，未建模或证据无效的内容不能视为已知。'};
}

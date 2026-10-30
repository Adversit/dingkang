import test from 'node:test';
import assert from 'node:assert/strict';
import { selectModel } from '../modules/novel-ai/model-selection.mjs';
import { compileContext, generateFromPreview } from '../modules/novel-ai/context.mjs';
import { analyze, buildAnalysisMessages } from '../modules/novel-ai/analysis.mjs';

const archive = {version:1,state:{projects:[{id:'p',canonVersion:0,scenes:[{id:'s',title:'场景',draft:'门开了。',revisions:[{id:'r',title:'场景',body:'门开了。'}]}],facts:[]}]}};
const input = {projectId:'p',sceneId:'s',revisionId:'r',instruction:'续写',storyMoment:'1',perspective:'omniscient',pov:'',factIds:[]};

test('the writer may specify an OpenAI model or use the configured default', () => {
  assert.equal(selectModel(undefined,'gpt-6.1-sol'),'gpt-6.1-sol');
  assert.equal(selectModel('  gpt-6-luna  ','gpt-6.1-sol'),'gpt-6-luna');
  assert.equal(selectModel('ft:gpt-4.1:org:name:id','gpt-6.1-sol'),'ft:gpt-4.1:org:name:id');
  assert.equal(selectModel('', 'gpt-6.1-sol'), 'gpt-6.1-sol');
});

test('invalid model IDs and credentials are rejected without echoing the input', () => {
  for (const value of ['sk-example-secret','sess-example','<script>', 'x'.repeat(102), 123, {}]) {
    assert.throws(() => selectModel(value,'gpt-6.1-sol'), error => error.status === 400 && !error.message.includes(String(value)));
  }
  assert.throws(() => selectModel('', ''), error => error.status === 503);
});

test('preview binds the chosen model and provider receives exactly the chosen model', async () => {
  const first = await compileContext(input,archive,selectModel('gpt-6-luna','gpt-6.1-sol'));
  const second = await compileContext(input,archive,selectModel('gpt-6.1-sol',''));
  assert.notEqual(first.previewHash,second.previewHash);
  let actual;
  const result=await generateFromPreview(first,{key:'test',model:'gpt-6-luna',fetchImpl:async (_url,opts)=>{
    actual=JSON.parse(opts.body);
    return Response.json({model:'gpt-6-luna',choices:[{finish_reason:'stop',message:{content:'候选正文'}}]});
  }});
  assert.equal(actual.model,'gpt-6-luna'); assert.equal(result.model,'gpt-6-luna');
  await assert.rejects(generateFromPreview(first,{key:'test',model:'gpt-6.1-sol'}),error=>error.status===409);
});

test('changing the credential source or its settings revision invalidates the old preview without disclosing key material', async () => {
  const base=await compileContext(input,archive,'gpt-6-luna','https://api.openai.com/v1',{source:'NOVEL_OPENAI_API_KEY',revision:0});
  const changed=await compileContext(input,archive,'gpt-6-luna','https://api.openai.com/v1',{source:'OPENAI_CHATGPT',revision:1});
  assert.notEqual(base.previewHash,changed.previewHash);
  assert.equal(changed.credentialSource,'OPENAI_CHATGPT');
  assert.equal(changed.credentialRevision,1);
  assert.ok(!('key' in changed));
});

test('author guidance is bounded and appears only in the user message used for extraction', async () => {
  const data={mode:'extract',scene:{text:'门开了。',revisionId:'r'},facts:[],guidance:'关注人物持物变化'};
  const messages=buildAnalysisMessages(data);
  assert.equal(JSON.parse(messages[1].content).guidance,'关注人物持物变化');
  assert.ok(!messages[0].content.includes(data.guidance));
  assert.throws(()=>buildAnalysisMessages({...data,guidance:'x'.repeat(2001)}));
  let sent;
  await analyze(data,{key:'test',model:'gpt-6-luna',fetchImpl:async(_url,opts)=>{
    sent=JSON.parse(opts.body);
    return Response.json({model:'gpt-6-luna',choices:[{finish_reason:'stop',message:{content:'{"candidates":[]}'}}]});
  }});
  assert.equal(sent.model,'gpt-6-luna');assert.deepEqual(sent.messages,messages);
});

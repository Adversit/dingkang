'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Check,LoaderCircle,MessageSquare,ShieldCheck,X} from 'lucide-react';
import {modules} from '@/lib/hub/catalog';

const categories=[['bug','功能故障'],['feature','功能建议'],['experience','使用体验'],['other','其他']] as const;
type Draft={moduleId:string;category:string;title:string;content:string;expected:string;contact:string};
const emptyDraft=(moduleId='hub'):Draft=>({moduleId,category:'bug',title:'',content:'',expected:'',contact:''});

function currentContext(){
  const url=new URL(window.location.href);
  const requested=url.searchParams.get('app')||url.searchParams.get('module');
  const selected=modules.find(item=>item.id===requested)||modules.find(item=>url.pathname===item.path||url.pathname.startsWith(item.path+'/'));
  return {moduleId:selected?.id||'hub',pagePath:selected?.path||url.pathname};
}

export function FeedbackForm({initialModule='hub',pagePath,onClose}:{initialModule?:string;pagePath?:string;onClose?:()=>void}){
  const [draft,setDraft]=useState<Draft>(()=>emptyDraft(initialModule));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState('');
  const request=useRef<{fingerprint:string;id:string}|null>(null),inFlight=useRef(false);
  const heading=useRef<HTMLHeadingElement>(null);
  function change(field:keyof Draft,value:string){setDraft(current=>({...current,[field]:value}));setError('');}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(inFlight.current)return;
    const payload={...draft,title:draft.title.trim(),content:draft.content.trim(),expected:draft.expected.trim(),contact:draft.contact.trim(),pagePath:pagePath||currentContext().pagePath};
    if(!payload.title||!payload.content){setError('请填写反馈标题和具体情况。');return;}
    const fingerprint=JSON.stringify(payload);
    if(!request.current||request.current.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
    inFlight.current=true;setBusy(true);setError('');
    try{
      const response=await fetch('/api/hub/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})});
      const data=await response.json().catch(()=>({})) as {id?:string;receiptId?:string;error?:string};
      if(!response.ok)throw Error(data.error||'反馈暂未确认保存，请稍后重试。');
      const id=data.id||data.receiptId;
      if(!id)throw Error('未收到反馈回执，请重试确认。');
      setReceipt(id);
      requestAnimationFrame(()=>heading.current?.focus());
    }catch(cause){setError(cause instanceof Error?cause.message:'网络暂时不可用。请保留内容后重试。');}
    finally{inFlight.current=false;setBusy(false);}
  }
  if(receipt)return <div className="feedback-success" role="status"><span className="feedback-success-icon"><Check size={28}/></span><h2 ref={heading} tabIndex={-1}>反馈已收到</h2><p>负责人会查看你的反馈，整理后的需求需经人工审阅确认。</p><p className="feedback-receipt">回执：<code>{receipt}</code></p><div className="feedback-actions"><button className="feedback-button" onClick={()=>{setReceipt('');setDraft(emptyDraft(draft.moduleId));request.current=null;}}>再提交一条</button>{onClose&&<button className="feedback-button primary" onClick={onClose}>完成</button>}</div></div>;
  return <form className="feedback-form" onSubmit={submit} aria-busy={busy}>
    <p className="feedback-notice">可匿名提交。内容仅供站点负责人审阅；请勿填写密码、密钥或其他敏感信息。</p>
    <div className="feedback-field-grid">
      <label>相关应用<select value={draft.moduleId} onChange={event=>change('moduleId',event.target.value)} disabled={busy}><option value="hub">工作空间整体</option>{modules.map(module=><option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
      <label>反馈类型<select value={draft.category} onChange={event=>change('category',event.target.value)} disabled={busy}>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label>反馈标题<input required maxLength={120} value={draft.title} onChange={event=>change('title',event.target.value)} disabled={busy} placeholder="简要描述你遇到的问题或建议" autoFocus/></label>
    <label>具体情况<textarea required maxLength={4000} rows={5} value={draft.content} onChange={event=>change('content',event.target.value)} disabled={busy} placeholder="你在做什么？遇到了什么？如果是故障，请说明如何重现。"/><span className="feedback-field-hint">{draft.content.length} / 4000</span></label>
    <label>期望结果 <span className="feedback-optional">选填</span><textarea maxLength={2000} rows={3} value={draft.expected} onChange={event=>change('expected',event.target.value)} disabled={busy} placeholder="你希望怎样改进？这会帮你解决什么问题？"/></label>
    <label>联系方式 <span className="feedback-optional">选填</span><input maxLength={180} value={draft.contact} onChange={event=>change('contact',event.target.value)} disabled={busy} placeholder="如希望补充交流，可留下邮箱或其他联系方式" autoComplete="off"/></label>
    {error&&<p className="feedback-error" role="alert">{error}</p>}
    <div className="feedback-actions">{onClose&&<button type="button" className="feedback-button" onClick={onClose} disabled={busy}>取消</button>}<button type="submit" className="feedback-button primary" disabled={busy}>{busy&&<LoaderCircle size={18} className="feedback-spin"/>}{busy?'正在提交':'提交反馈'}</button></div>
  </form>;
}

export default function FeedbackEntry(){
  const [visible,setVisible]=useState(false),[isOwner,setIsOwner]=useState(false),[opened,setOpened]=useState(false);
  const [context,setContext]=useState({moduleId:'hub',pagePath:'/'});
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(window.top!==window.self||window.location.pathname.startsWith('/feedback'))return;
    setVisible(true);
    let disposed=false;
    void fetch('/api/hub/feedback/session',{cache:'no-store'}).then(async response=>response.ok?await response.json() as {isOwner?:boolean}:null).then(data=>{if(!disposed)setIsOwner(data?.isOwner===true);}).catch(()=>{});
    return()=>{disposed=true;};
  },[]);
  function open(){setContext(currentContext());setOpened(true);dialog.current?.showModal();}
  function close(){if(dialog.current?.querySelector('[aria-busy="true"]'))return;dialog.current?.close();setOpened(false);trigger.current?.focus();}
  if(!visible)return null;
  return <div className="feedback-entry">
    <button className="feedback-float" ref={trigger} onClick={open} aria-haspopup="dialog" aria-expanded={opened}><MessageSquare size={19}/><span>反馈</span></button>
    <dialog className="feedback-dialog" ref={dialog} aria-labelledby="feedback-title" onCancel={event=>{if(dialog.current?.querySelector('[aria-busy="true"]'))event.preventDefault();}} onClose={()=>{setOpened(false);trigger.current?.focus();}} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();}}}>
      <div className="feedback-heading"><h2 id="feedback-title">发送反馈</h2><button className="feedback-icon-button" aria-label="关闭反馈" onClick={close}><X size={22}/></button></div>
      {opened&&<FeedbackForm initialModule={context.moduleId} pagePath={context.pagePath} onClose={close}/>}
      {isOwner&&<a className="feedback-review-link" href="/feedback/review" target="_blank" rel="noopener noreferrer"><ShieldCheck size={17}/>查看反馈与需求审阅</a>}
    </dialog>
  </div>;
}

'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,Download,LoaderCircle,RefreshCw,ShieldCheck} from 'lucide-react';
import {modules} from '@/lib/hub/catalog';

type Analysis={summary:string;classification:'candidate'|'bug'|'needs_evidence'|'noise';reason:string;missingEvidence:string[];acceptance:string[];relatedIds:string[]};
type Feedback={id:string;module_id:string;category:string;title:string;content:string;expected?:string;page_path:string;created_at:string;status:string;version:number;analysis:Analysis|null;review_note?:string};
type Report={id:string;period_start:string;period_end:string;summary:string;created_at:string};
type Data={feedback:Feedback[];reports:Report[];isOwner:boolean;hasMore?:boolean;nextOffset?:number|null};
const statuses=[['all','全部'],['new','待整理'],['pending_review','待审阅'],['approved','已批准'],['needs_evidence','待补证据'],['rejected','已驳回']] as const;
const labels=Object.fromEntries(statuses),categories:Record<string,string>={bug:'功能故障',feature:'功能建议',experience:'使用体验',other:'其他'};
const classifications:Record<string,string>={candidate:'需求候选',bug:'故障候选',needs_evidence:'证据不足',noise:'非行动性反馈'};
const time=(value:string)=>new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});

export default function FeedbackReview(){
  const [status,setStatus]=useState('pending_review'),[data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[authStatus,setAuthStatus]=useState(0);
  const [loadingMore,setLoadingMore]=useState(false);
  const [feedbackId,setFeedbackId]=useState<string|null>(null);
  const [notes,setNotes]=useState<Record<string,string>>({}),[saving,setSaving]=useState<string|null>(null),[notice,setNotice]=useState('');
  const generation=useRef(0),busy=useRef(false);
  async function load(selected=status,append=false){
    const version=++generation.current;setLoading(true);setLoadingMore(append);setError('');
    try{
      const offset=append?data?.nextOffset||0:0;
      const response=await fetch('/api/hub/feedback/review?status='+encodeURIComponent(selected)+'&offset='+offset+(feedbackId?'&id='+encodeURIComponent(feedbackId):''),{cache:'no-store'});
      const body=await response.json().catch(()=>({})) as Data&{error?:string};
      if(generation.current!==version)return;
      if(!response.ok){setAuthStatus(response.status);setData(null);throw Error(body.error||'暂时无法读取反馈。');}
      setAuthStatus(0);setData(previous=>append&&previous?{...body,feedback:[...new Map([...previous.feedback,...body.feedback].map(item=>[item.id,item])).values()]}:body);
    }catch(cause){if(generation.current===version)setError(cause instanceof Error?cause.message:'暂时无法连接服务器。');}
    finally{if(generation.current===version){setLoading(false);setLoadingMore(false);}}
  }
  useEffect(()=>{const id=new URLSearchParams(location.search).get('feedback')||'';setFeedbackId(id);if(id)setStatus('all');},[]);
  useEffect(()=>{if(feedbackId===null)return;void load(status);return()=>{generation.current++;};},[status,feedbackId]);
  function showAll(){const url=new URL(location.href);url.searchParams.delete('feedback');history.replaceState(history.state,'',url.pathname+url.search+url.hash);setFeedbackId('');setStatus('all');setNotice('');}
  async function decide(item:Feedback,decision:'approved'|'rejected'|'needs_evidence'){
    if(busy.current)return;const note=(notes[item.id]||'').trim();
    if(!note){setError('请先填写这条反馈的审阅理由或开发范围。');document.getElementById('note-'+item.id)?.focus();return;}
    busy.current=true;setSaving(item.id);setError('');setNotice('');
    try{
      const response=await fetch('/api/hub/feedback/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,expectedVersion:item.version,decision,note})});
      const body=await response.json().catch(()=>({})) as {error?:string};
      if(response.status===409){await load();setError('记录已被更新。已重新加载，请核对最新内容后再次审阅。');return;}
      if(!response.ok)throw Error(body.error||'审阅结果未保存，请重试。');
      setNotes(current=>{const next={...current};delete next[item.id];return next;});
      await load();setNotice(decision==='approved'?'已批准并加入开发候选列表。尚未启动开发或发布。':decision==='rejected'?'已保存驳回理由。':'已标记为待补证据。');
    }catch(cause){setError(cause instanceof Error?cause.message:'审阅结果未确认保存，请刷新后重试。');}
    finally{busy.current=false;setSaving(null);}
  }
  async function exportApproved(){
    if(busy.current)return;busy.current=true;setSaving('export');setError('');
    try{
      const approved=new Map<string,Feedback>();let offset:number|null=0;
      while(offset!==null){
        const response=await fetch('/api/hub/feedback/review/approved?offset='+offset,{cache:'no-store'});
        const body=await response.json().catch(()=>({})) as Data&{error?:string};
        if(!response.ok)throw Error(body.error||'无法导出已批准需求。');
        for(const item of body.feedback||[])if(item.status==='approved')approved.set(item.id,item);
        if(body.hasMore&&(typeof body.nextOffset!=='number'||body.nextOffset<=offset))throw Error('分页信息不完整，导出已停止，请刷新后重试。');
        offset=body.hasMore?body.nextOffset!:null;
      }
      const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),developmentStarted:false,feedback:[...approved.values()]},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='已批准需求-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(cause){setError(cause instanceof Error?cause.message:'导出暂时未完成。');}
    finally{busy.current=false;setSaving(null);}
  }
  return <main className="feedback-page"><div className="feedback-page-inner">
    <nav className="feedback-page-nav"><a href="/"><ArrowLeft size={18}/>工作空间</a><a href="/feedback">提交反馈</a></nav>
    <header className="feedback-page-header"><div><h1>反馈与需求审阅</h1><p>每日 AI 摘要在 ChatGPT 查看；这里保留原始反馈和你的决策。只有你确认的需求才能进入开发候选列表，不会自动开发或发布。</p></div><button className="feedback-button" onClick={()=>void load()} disabled={loading||!!saving}><RefreshCw size={17} className={loading?'feedback-spin':''}/>刷新</button></header>
    {authStatus===401?<section className="feedback-panel feedback-access"><ShieldCheck size={32}/><h2>请使用站点负责人的账号登录</h2><p>反馈汇总和审阅仅对负责人开放。</p><a className="feedback-button primary" href={'/signin-with-chatgpt?return_to='+encodeURIComponent('/feedback/review'+(feedbackId?'?feedback='+encodeURIComponent(feedbackId):''))} target="_top">使用 ChatGPT 登录</a></section>:authStatus===403?<section className="feedback-panel feedback-access"><ShieldCheck size={32}/><h2>当前账号无审阅权限</h2><p>你仍可通过反馈入口提交建议。</p><a className="feedback-button" href="/feedback">发送反馈</a></section>:<>
      {data&&data.reports?.length>0&&<section className="feedback-panel feedback-digests"><h2>每日整理</h2>{data.reports.map(report=><details key={report.id}><summary>{time(report.created_at)}<span>查看整理</span></summary><p>{report.summary}</p><small>覆盖时间：{time(report.period_start)} 至 {time(report.period_end)}（北京时间）</small></details>)}</section>}
      {feedbackId?<div className="feedback-filters"><button className="active" onClick={showAll} disabled={!!saving}><ArrowLeft size={16} style={{display:'inline-block',verticalAlign:'middle',marginRight:6}}/>查看全部反馈</button></div>:<nav className="feedback-filters" aria-label="反馈状态">{statuses.map(([value,label])=><button key={value} className={status===value?'active':''} onClick={()=>setStatus(value)} disabled={!!saving} aria-pressed={status===value}>{label}</button>)}</nav>}
      {data&&status==='approved'&&<div className="feedback-actions feedback-export"><button className="feedback-button" onClick={()=>void exportApproved()} disabled={!!saving||loading}><Download size={17}/>导出已批准需求</button></div>}
      {notice&&<p className="feedback-confirmation" role="status"><Check size={18}/>{notice}</p>}
      {error&&<p className="feedback-error" role="alert">{error}</p>}
      {loading&&!loadingMore?<div className="feedback-panel feedback-empty" role="status"><LoaderCircle size={24} className="feedback-spin"/><p>正在读取反馈…</p></div>:data?.feedback?.length===0?<div className="feedback-panel feedback-empty"><MessageSquareIcon/><h2>{feedbackId?'未找到这条反馈':'暂无'+(status==='all'?'':labels[status])+'反馈'}</h2><p>{feedbackId?'请核对日报中的反馈链接，或查看全部反馈。':'新提交的反馈会进入待审阅列表。每日 AI 摘要在 ChatGPT 查看。'}</p></div>:<div className="feedback-review-list">{data?.feedback?.map(item=><article className="feedback-panel feedback-review-card" key={item.id}>
        <div className="feedback-card-top"><span className={'feedback-status status-'+item.status}>{labels[item.status]||item.status}</span><span>{modules.find(module=>module.id===item.module_id)?.name||'工作空间整体'} · {categories[item.category]||item.category}</span><time dateTime={item.created_at}>{time(item.created_at)}</time></div>
        <h2>{item.title}</h2><p className="feedback-original">{item.content}</p>{item.expected&&<div className="feedback-detail"><h3>用户期望</h3><p>{item.expected}</p></div>}
        <details className="feedback-source"><summary>来源与回执</summary><p>页面：{item.page_path}</p><p>回执：<code>{item.id}</code></p></details>
        {item.analysis?<section className="feedback-analysis"><div className="feedback-analysis-title"><h3>AI 整理建议</h3><span>{classifications[item.analysis.classification]||item.analysis.classification}</span></div><p>{item.analysis.summary}</p><p>{item.analysis.reason}</p>{item.analysis.missingEvidence?.length>0&&<div><h4>待补充证据</h4><ul>{item.analysis.missingEvidence.map((line,index)=><li key={index}>{line}</li>)}</ul></div>}{item.analysis.acceptance?.length>0&&<div><h4>建议验收条件</h4><ul>{item.analysis.acceptance.map((line,index)=><li key={index}>{line}</li>)}</ul></div>}{item.analysis.relatedIds?.length>0&&<p className="feedback-related">相关反馈：{item.analysis.relatedIds.join('、')}</p>}</section>:<p className="feedback-notice">可根据原始反馈审阅，也可参考 ChatGPT 中的每日整理，在下方记录最终决定。</p>}
        {item.review_note&&<div className="feedback-detail"><h3>已保存的审阅意见</h3><p>{item.review_note}</p></div>}
        <label className="feedback-review-note" htmlFor={'note-'+item.id}>审阅理由 / 确认的开发范围<textarea id={'note-'+item.id} maxLength={2000} rows={3} value={notes[item.id]||''} onChange={event=>setNotes(current=>({...current,[item.id]:event.target.value}))} placeholder="说明批准的范围、驳回理由，或仍需补充的信息" disabled={!!saving}/></label>
        <div className="feedback-actions review-actions"><button className="feedback-button" disabled={!!saving} onClick={()=>void decide(item,'needs_evidence')}>需补证据</button><button className="feedback-button" disabled={!!saving} onClick={()=>void decide(item,'rejected')}>驳回</button><button className="feedback-button primary" disabled={!!saving} onClick={()=>void decide(item,'approved')}>{saving===item.id&&<LoaderCircle size={17} className="feedback-spin"/>}确认需求</button></div>
      </article>)}</div>}
      {(!loading||loadingMore)&&data?.hasMore&&<div className="feedback-actions feedback-pagination"><span>已显示 {data.feedback.length} 条</span><button className="feedback-button" disabled={!!saving||loading} onClick={()=>void load(status,true)}>{loadingMore&&<LoaderCircle size={17} className="feedback-spin"/>}{loadingMore?'正在加载':'加载更多'}</button></div>}
    </>}
  </div></main>;
}

function MessageSquareIcon(){return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;}

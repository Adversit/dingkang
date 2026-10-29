'use client';

import {useEffect,useState} from 'react';
import {ArrowLeft,ShieldCheck} from 'lucide-react';
import {FeedbackForm} from '@/components/FeedbackEntry';
import {modules} from '@/lib/hub/catalog';

export default function FeedbackPage(){
  const [moduleId,setModuleId]=useState<string|null>(null),[isOwner,setIsOwner]=useState(false);
  useEffect(()=>{
    const requested=new URLSearchParams(location.search).get('module');
    setModuleId(modules.some(module=>module.id===requested)?requested!:'hub');
    let disposed=false;
    void fetch('/api/hub/feedback/session',{cache:'no-store'}).then(async response=>response.ok?await response.json() as {isOwner?:boolean}:null).then(data=>{if(!disposed)setIsOwner(data?.isOwner===true);}).catch(()=>{});
    return()=>{disposed=true;};
  },[]);
  return <main className="feedback-page"><div className="feedback-page-inner compact"><nav className="feedback-page-nav"><a href="/"><ArrowLeft size={18}/>工作空间</a>{isOwner&&<a href="/feedback/review"><ShieldCheck size={18}/>需求审阅</a>}</nav><header className="feedback-page-header"><h1>发送反馈</h1></header><section className="feedback-panel">{moduleId===null?<p role="status">正在准备反馈表单…</p>:<FeedbackForm initialModule={moduleId} pagePath="/feedback"/>}</section></div></main>;
}

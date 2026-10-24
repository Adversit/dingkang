import {createSeed,applyAction,UserError,splitAmount,balances,today,dayAfter,activeOn,available} from './domain.mjs';
const need=(ok,msg)=>{if(!ok)throw new UserError(msg);};
const productId=()=>crypto.randomUUID();
const clean=(v,max=200)=>{need(typeof v==='string'&&v.trim()&&v.trim().length<=max,'请填写有效内容（最多 '+max+' 字）');return v.trim();};
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const count=(n,min=0,max=100000000)=>{need(Number.isSafeInteger(n)&&n>=min&&n<=max,'请输入范围内的有效数字');return n;};
const distinct=a=>[...new Set(a)];
const portionWeights=parts=>{const total=parts.reduce((n,p)=>n+p.cents,0);return parts.map(p=>p.cents/total*100);};
const findRecord=(a,id)=>a.find(x=>x.id===id)||(()=>{throw new UserError('记录不存在');})();
const liveMembers=(s,date=today())=>s.members.filter(m=>activeOn(s,m.id,date)).map(m=>m.id);
const event=(s,actor,text)=>{s.activity.unshift({id:productId(),actor,text,time:new Date().toISOString()});s.activity=s.activity.slice(0,80);};
export function stockInfo(item,date=today()){
 const batches=item.batches||[{id:'legacy-'+item.id,quantity:item.quantity,expiry:item.expiry||''}];
 const physical=batches.reduce((n,b)=>n+b.quantity,0),expired=batches.filter(b=>b.expiry&&b.expiry<date).reduce((n,b)=>n+b.quantity,0);
 return {physical,expired,usable:physical-expired,batches};
}
function updateItem(item){const x=stockInfo(item);item.quantity=x.physical;item.expiry=item.batches.filter(b=>b.quantity>0&&b.expiry).map(b=>b.expiry).sort()[0]||'';}
export function normalizeState(input){
 const s=structuredClone(input);s.corrections??=[];s.purchasePlans??=[];s.repairs??=[];s.handovers??=[];s.comments??=[];
 for(const i of s.inventory){i.batches??=[{id:'legacy-'+i.id,quantity:i.quantity,expiry:i.expiry||''}];if(i.owner&&!i.claimDue)i.claimDue=dayAfter(s.created||today(),1);updateItem(i);}
 for(const p of s.proposals){p.required??=s.members.map(m=>m.id);p.deadline??=dayAfter(p.date||today(),7);if(p.status==='voting'&&p.deadline<today())p.status='expired';}
 for(const c of [...s.corrections,...s.purchasePlans])if(c.status==='voting'&&c.deadline<today())c.status='expired';
 for(const x of s.swaps)if(x.status==='pending'&&[x.mine,x.other].some(id=>s.tasks.find(t=>t.id===id)?.date<today()))x.status='expired';
 return s;
}
export function createState(){const s=normalizeState(createSeed());s.repairs=[{id:'repair-demo',title:'厨房水龙头持续滴水',area:'厨房',description:'关紧后仍在滴水，接水杯每天都要倒一次。',urgency:'普通',reporter:'b',owner:null,status:'open',date:today(),history:[]}];return s;}
export function billTotal(s,billId){return s.bills.filter(b=>b.id===billId||b.adjustmentOf===billId).reduce((n,b)=>n+b.cents,0);}
export function handoverBlockers(s,h){
 const balance=balances(s)[h.member]||0;
 return {balance,pending:s.payments.filter(p=>p.status==='pending'&&[p.from,p.to].includes(h.member)).length,disputes:s.bills.filter(b=>b.dispute&&(b.payer===h.member||b.shares.some(x=>x.member===h.member))).length,corrections:s.corrections.filter(c=>c.status==='voting'&&c.required.includes(h.member)).length,checklist:Object.values(h.checks).every(Boolean)};
}
function requestDecision(s,actor,record,vote,onPass){
 need(record.status==='voting','协商已结束，请查看最新结果');need(record.required.includes(actor),'你不在这次协商的参与人中');need(['yes','no'].includes(vote),'请选择同意或再议');
 record.votes[actor]=vote;
 if(record.required.every(id=>record.votes[id])){if(record.required.every(id=>record.votes[id]==='yes')){record.status='approved';onPass?.();}else record.status='rejected';}
}
function signedAdjustment(s,bill,newCents,title,kind,actor){
 const shares=bill.shares.filter(x=>x.cents>0);const next=newCents?splitAmount(Math.abs(newCents),shares.map(x=>x.member),portionWeights(shares)):shares.map(x=>({member:x.member,cents:0}));
 const signed=next.map(p=>({...p,cents:newCents<0?-p.cents:p.cents}));
 const entry={id:productId(),title,category:kind,date:today(),payer:bill.payer,cents:newCents,mode:'equal',shares:signed,dispute:null,adjustmentOf:bill.id,kind,createdBy:actor};s.bills.unshift(entry);return entry;
}
export function performAction(input,actor,action,data={}){
 let s=normalizeState(input);need(s.members.some(m=>m.id===actor),'室友不存在');const date=today();let message='已保存';
 const item=()=>findRecord(s.inventory,data.id),task=()=>findRecord(s.tasks,data.id);
 if(action==='changeLeave'){
  const l=findRecord(s.leaves,data.id);need(l.member===actor&&!l.cancelled,'只能调整自己的有效请假');need(['return','cancel','extend'].includes(data.mode),'请选择调整方式');
  const oldEnd=l.end;l.history??=[];l.history.push({start:l.start,end:l.end,mode:data.mode,date});
  if(data.mode==='extend'){
   need(validDate(data.end)&&data.end>l.end&&data.end<=dayAfter(date,31),'延长后的日期应晚于原结束日期，且不超过未来 31 天');
   need(!s.leaves.some(x=>x.id!==l.id&&!x.cancelled&&x.member===actor&&x.start<=data.end&&x.end>oldEnd),'延期与其他请假重叠');l.end=data.end;
   const ids=[];s.tasks.filter(t=>t.assignee===actor&&t.status==='todo'&&t.date>oldEnd&&t.date<=l.end).forEach(t=>{t.status='open';t.reason=l.type;ids.push(t.id);});s.swaps.filter(x=>x.status==='pending'&&[x.mine,x.other].some(id=>ids.includes(id))).forEach(x=>x.status='expired');
   message='已延长请假，新增影响的 '+ids.length+' 项任务待补位';
  }else{need(l.end>=date,'这条请假已经结束');if(data.mode==='cancel')need(l.start>=date,'已经开始的请假请使用提前返家');l.cancelled=true;l.returnedAt=date;message='已恢复可排班状态；已有人接班的安排保留，未认领任务可由你主动接回';}
  event(s,actor,message);
 }else if(action==='releaseTask'){
  const t=task();need(t.status==='todo'&&t.assignee===actor,'只能为自己的待办申请协助');t.status='open';t.reason=clean(data.reason,80);s.swaps.filter(x=>x.status==='pending'&&[x.mine,x.other].includes(t.id)).forEach(x=>x.status='expired');message='任务已开放求助，仍会显示待协调直到有人接班';event(s,actor,'为「'+t.title+'」发起求助：'+t.reason);
 }else if(action==='comment'){
  const type=data.type;const collection={bill:s.bills,proposal:s.proposals,repair:s.repairs}[type];need(collection,'讨论类型无效');findRecord(collection,data.id);need(s.comments.length<300,'讨论记录已达演示上限');s.comments.push({id:productId(),target:data.id,type,actor,text:clean(data.text,400),time:new Date().toISOString()});message='想法已记录，室友可继续回应';
 }else if(action==='requestCorrection'){
  const b=findRecord(s.bills,data.id);need(!b.adjustmentOf&&b.cents>0,'请在原始账单上发起更正');need(b.payer===actor||b.shares.some(p=>p.member===actor),'只有相关室友可以提出更正');need(!s.corrections.some(c=>c.bill===b.id&&c.status==='voting'),'这笔账单已有待确认的更正');need(!s.payments.some(p=>p.status==='pending'),'先确认或撤回已登记的转账，再调整账单');count(data.cents);const total=billTotal(s,b.id);need(data.cents!==total,'新金额与现有金额相同');need(!s.bills.some(x=>x.adjustmentOf===b.id&&x.kind==='退款'),'已有退款记录，请继续通过退款处理，避免混淆原始金额');
  s.corrections.unshift({id:productId(),bill:b.id,from:total,to:data.cents,reason:clean(data.reason),author:actor,required:distinct([b.payer,...b.shares.map(p=>p.member)]),votes:{[actor]:'yes'},status:'voting',date,deadline:dayAfter(date,7)});message='更正已发起，相关室友全员同意后才调整余额';event(s,actor,'发起「'+b.title+'」的金额更正');
 }else if(action==='voteCorrection'){
  const c=findRecord(s.corrections,data.id),b=findRecord(s.bills,c.bill);requestDecision(s,actor,c,data.vote,()=>{
   need(!s.payments.some(p=>p.status==='pending'),'先处理待确认转账再完成更正');need(billTotal(s,b.id)===c.from,'原账单已发生变化，请重新提出更正');
   // The difference between cumulative splits preserves every cent across corrections.
   const positive=b.shares.filter(p=>p.cents>0),parts=c.to?splitAmount(c.to,positive.map(p=>p.member),portionWeights(positive)):positive.map(p=>({member:p.member,cents:0}));
   const oldShares=Object.fromEntries(positive.map(p=>[p.member,0]));s.bills.filter(x=>x.id===b.id||x.adjustmentOf===b.id).forEach(x=>x.shares.forEach(p=>oldShares[p.member]=(oldShares[p.member]||0)+p.cents));
   const adjustment=signedAdjustment(s,b,c.to-c.from,'更正 · '+b.title,'金额更正',actor);adjustment.shares=parts.map(p=>({member:p.member,cents:p.cents-oldShares[p.member]}));b.dispute=null;c.adjustment=adjustment.id;event(s,actor,'全员确认了「'+b.title+'」金额更正');
  });message=c.status==='approved'?'更正已生效，原账与调整记录均已保留':c.status==='rejected'?'未达成一致，原金额保持不变':'已记录意见，等待相关室友';
 }else if(action==='refundBill'){
  const b=findRecord(s.bills,data.id);need(!b.adjustmentOf&&b.payer===actor,'由原垫付人登记已经收到的商家退款');need(!b.dispute&&!s.corrections.some(c=>c.bill===b.id&&c.status==='voting'),'请先处理该账单的争议或更正');need(!s.payments.some(p=>p.status==='pending'),'请先确认或撤回待确认转账');count(data.cents,1,billTotal(s,b.id));const reason=clean(data.reason);
  const others=s.bills.filter(x=>x.adjustmentOf===b.id&&x.kind==='退款');const refunded=-others.reduce((n,x)=>n+x.cents,0);const gross=s.bills.filter(x=>x.id===b.id||(x.adjustmentOf===b.id&&x.kind!=='退款')).reduce((n,x)=>n+x.cents,0);const positive=b.shares.filter(p=>p.cents>0);const totalParts=splitAmount(refunded+data.cents,positive.map(p=>p.member),portionWeights(positive));
  const entry=signedAdjustment(s,b,-data.cents,'退款 · '+b.title,'退款',actor);entry.reason=reason;entry.shares=totalParts.map(p=>({member:p.member,cents:-p.cents-others.reduce((n,x)=>n+(x.shares.find(y=>y.member===p.member)?.cents||0),0)}));need(refunded+data.cents<=gross,'累计退款不能超过有效账单金额');message='退款已按原分摊关系返还，历史转账记录保留';event(s,actor,'登记了「'+b.title+'」的商家退款');
 }else if(action==='planPurchase'){
  const i=item();count(data.cents,1);count(data.quantity,1,9999);need(validDate(data.due)&&data.due>=date,'请填写预计完成日期');need(!s.purchasePlans.some(p=>p.item===i.id&&['voting','approved'].includes(p.status)),'该物品已有有效采购计划');const required=distinct(data.people||liveMembers(s));need(required.length>0&&required.every(id=>liveMembers(s).includes(id)),'请选择目前在住的分摊室友');
  const p={id:productId(),item:i.id,title:i.name,cents:data.cents,quantity:data.quantity,reason:clean(data.reason),author:actor,required,votes:required.includes(actor)?{[actor]:'yes'}:{},status:'voting',date,deadline:data.due,due:data.due};s.purchasePlans.unshift(p);if(required.length===1&&required[0]===actor)p.status='approved';message='已提交采购预算，参与分摊的室友全部同意后可购买';event(s,actor,'发起「'+i.name+'」采购预算协商');
 }else if(action==='votePurchase'){
  const p=findRecord(s.purchasePlans,data.id);requestDecision(s,actor,p,data.vote);message=p.status==='approved'?'采购预算已获全员同意':p.status==='rejected'?'预算需再协商，尚未产生费用':'已记录意见';
 }else if(action==='cancelPlan'){
  const p=findRecord(s.purchasePlans,data.id);need(p.author===actor&&['voting','approved','rejected','expired'].includes(p.status),'只有发起人能结束自己的未完成计划');p.status='cancelled';message='采购计划已结束，可以提出新预算';
 }else if(action==='extendPurchase'||action==='takePurchase'){
  const i=item();need(i.owner,'目前没有采购认领');if(action==='extendPurchase'){need(i.owner===actor,'只能延长自己的采购认领');need(validDate(data.due)&&data.due>=date&&data.due<=dayAfter(date,14),'预计完成日应在未来 14 天内');i.claimDue=data.due;message='预计采购日期已更新';}else{need(i.claimDue<date,'认领尚未逾期，请先与认领人沟通');need(activeOn(s,actor,date),'搬离后不能接手新采购');i.owner=actor;i.claimDue=dayAfter(date,1);message='已接手逾期采购，原认领人不能再提交补货';}event(s,actor,message+'「'+i.name+'」');
 }else if(action==='discardStock'){
  const i=item();const b=findRecord(i.batches,data.batch);count(data.quantity,1,b.quantity);const reason=clean(data.reason,100);b.quantity-=data.quantity;updateItem(i);event(s,actor,'处理了 '+data.quantity+i.unit+i.name+'：'+reason);message='已登记丢弃，不产生新的 AA 费用';
 }else if(action==='consume'){
  const i=item(),info=stockInfo(i);count(data.quantity,1,info.usable);let remain=data.quantity;const batches=i.batches.filter(b=>!b.expiry||b.expiry>=date).sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999'));for(const b of batches){const n=Math.min(b.quantity,remain);b.quantity-=n;remain-=n;}updateItem(i);message=stockInfo(i).usable<=i.threshold?'已登记消耗，可用库存已触发补货提醒':'已按临期优先登记消耗';event(s,actor,'使用了 '+data.quantity+i.unit+i.name);
 }else if(action==='restock'){
  const i=item();need(i.owner===actor,'请先认领采购');count(data.quantity,1,9999);count(data.cents);need(i.quantity+data.quantity<=9999,'库存数量过大');need(!data.expiry||validDate(data.expiry),'有效期格式不正确');need(!data.expiry||data.expiry>=date,'新购入物品不能已经过期');
  const plan=data.plan?findRecord(s.purchasePlans,data.plan):null;const existing=s.purchasePlans.find(p=>p.item===i.id&&['voting','approved'].includes(p.status));
  if(data.cents>20000||existing){need(plan&&plan.item===i.id&&plan.status==='approved','超过 200 元或已有采购计划时，须先完成预算同意并选择该计划');need(data.cents<=plan.cents&&data.quantity===plan.quantity,'金额超预算或数量改变，请结束旧计划并重新协商');}
  const people=plan?.required||liveMembers(s);need(people.length>0,'没有可分摊的在住室友');
  if(data.cents){s=applyAction(s,actor,'addBill',{title:'采购'+i.name,category:'公共采购',cents:data.cents,payer:actor,date,mode:'equal',people}).state;}
  const fresh=findRecord(s.inventory,i.id);fresh.batches.push({id:productId(),quantity:data.quantity,expiry:data.expiry||''});fresh.owner=null;fresh.claimDue=null;updateItem(fresh);if(plan)findRecord(s.purchasePlans,plan.id).status='completed';message=data.cents?'补货与 AA 已同时保存，新旧批次分别保留有效期':'补货已保存，新旧批次分别管理';event(s,actor,'完成了「'+i.name+'」补货');
 }else if(action==='reportRepair'){
  need(s.repairs.length<80,'报修记录已达演示上限');need(['普通','影响生活','紧急'].includes(data.urgency),'请选择紧急程度');s.repairs.unshift({id:productId(),title:clean(data.title,60),area:clean(data.area,20),description:clean(data.description,400),urgency:data.urgency,reporter:actor,owner:null,status:'open',date,history:[]});message='报修已登记，等待有人跟进';event(s,actor,'报修「'+data.title+'」');
 }else if(action==='repairAction'){
  const r=findRecord(s.repairs,data.id),mode=data.mode;
  if(mode==='claim'){need(r.status==='open'&&activeOn(s,actor,date),'当前无法认领');r.owner=actor;r.status='handling';message='已由你跟进维修';}
  else if(mode==='release'){need(r.owner===actor&&r.status==='handling','只能转出自己跟进中的报修');r.owner=null;r.status='open';message='已交回待跟进，处理记录保留';}
  else if(mode==='ready'){need(r.owner===actor&&r.status==='handling','只有跟进人能登记维修完成');r.status='review';r.result=clean(data.note,300);message='已提交维修结果，等待另一位室友验收';}
  else if(mode==='accept'){need(r.status==='review'&&actor!==r.owner&&activeOn(s,actor,date),'需要另一位在住室友验收');r.status='closed';r.reviewer=actor;r.closed=date;message='验收通过，报修已关闭';}
  else if(mode==='reopen'){need(r.status==='review'&&actor!==r.owner,'需要另一位室友反馈验收问题');r.status='handling';r.feedback=clean(data.note,300);message='已退回继续处理，验收反馈已记录';}
  else need(false,'不支持的报修操作');r.history.push({actor,mode,date,note:data.note||''});event(s,actor,message+'「'+r.title+'」');
 }else if(action==='planMoveOut'){
  const m=findRecord(s.members,actor);need(validDate(data.date)&&data.date>=date,'搬离日期不能早于今天');need(!s.handovers.some(h=>h.member===actor&&h.status!=='cancelled'),'已有退租交接记录');m.moveOutDate=data.date;
  const released=s.tasks.filter(t=>t.assignee===actor&&t.date>=data.date&&t.status==='todo');released.forEach(t=>{t.status='open';t.reason='退租交接';});s.swaps.filter(x=>x.status==='pending'&&released.some(t=>[x.mine,x.other].includes(t.id))).forEach(x=>x.status='expired');
  s.inventory.filter(i=>i.owner===actor).forEach(i=>{i.owner=null;i.claimDue=null;});s.repairs.filter(r=>r.owner===actor&&r.status==='handling').forEach(r=>{r.owner=null;r.status='open';});
  s.handovers.push({id:productId(),member:actor,date:data.date,status:'planned',checks:{keys:false,room:false,meters:false,property:false},note:clean(data.note||'按约定完成房间和公共事务交接',300)});message='退租计划已建立，搬离日起停止新排班；欠款、待收款与历史记录保留';event(s,actor,'计划于 '+data.date+' 搬离，待办已转交协调');
 }else if(action==='checkHandover'){
  const h=findRecord(s.handovers,data.id);need(h.member===actor&&h.status!=='cancelled','只能更新自己的交接单');need(Object.hasOwn(h.checks,data.key),'交接项无效');h.checks[data.key]=!!data.done;message='交接进度已更新';
 }else if(action==='finishMoveOut'){
  const h=findRecord(s.handovers,data.id);need(h.member===actor&&h.status==='planned','交接状态已变化');need(h.date<=date,'还未到搬离日期');need(Object.values(h.checks).every(Boolean),'请先完成房间、钥匙、表计和物品交接');h.status='moved';message='已记录实际搬离，未结账款继续保留，不能当作全部结清';event(s,actor,'完成实物交接并搬离，历史账务仍可处理');
 }else if(action==='cancelMoveOut'){
  const h=findRecord(s.handovers,data.id);need(h.member===actor&&h.status==='planned','已搬离后不能取消计划');h.status='cancelled';delete findRecord(s.members,actor).moveOutDate;message='已取消搬离计划，转出的任务不会强制取回，可主动认领';event(s,actor,message);
 }else if(action==='propose'){
  need(activeOn(s,actor,date),'搬离后不参与新公约');const r=findRecord(s.rules,data.rule);need(!s.proposals.some(p=>p.rule===r.id&&p.status==='voting'),'已有这条公约的讨论');const required=liveMembers(s);s.proposals.unshift({id:productId(),rule:r.id,title:clean(data.title,60),content:clean(data.content,500),author:actor,required,votes:{[actor]:'yes'},status:'voting',date,deadline:dayAfter(date,7)});message='提案已发布，7 天内相关在住室友全员同意后生效';
 }else if(action==='vote'){
  const p=findRecord(s.proposals,data.id);requestDecision(s,actor,p,data.vote,()=>{const r=findRecord(s.rules,p.rule);r.history.unshift({version:r.version,content:r.content,date});r.content=p.content;r.version++;r.read=[];});if(p.status==='approved'){p.status='passed';message='全员一致通过，新公约已生效';event(s,actor,'通过公约「'+p.title+'」');}else if(p.status==='rejected'){p.status='rework';message='仍有不同意见，旧公约继续有效，可在讨论区说明原因';}else message='已记录你的意见';
 }else{
  if(action==='requestPayment')need(!s.corrections.some(c=>c.status==='voting'),'账单正在更正，请先完成相关协商');
  if(['claimPurchase','addItem','reportRepair'].includes(action))need(activeOn(s,actor,date),'搬离后不能认领新的公共事务');
  if(action==='addBill'){
   need(data.people?.every(id=>activeOn(s,id,data.date)),'参与人中有已搬离室友，请根据费用实际发生日期选择参与人');
   need(data.category!=='公共采购'||data.cents<=20000,'超过 200 元的公共采购，请到公共物品关联已通过的预算完成补货记账');
   const duplicates=s.bills.filter(b=>!b.adjustmentOf&&b.cents===data.cents&&b.date===data.date&&b.payer===data.payer);
   need(!duplicates.length||data.duplicateReason?.trim(),'发现同一天、同垫付人、同金额的账单，请填写“非重复原因”后再保存');
  }
  const r=applyAction(s,actor,action,data);s=r.state;message=r.message;
  if(action==='claimPurchase')findRecord(s.inventory,data.id).claimDue=dayAfter(date,1);
  if(action==='cancelPurchase')findRecord(s.inventory,data.id).claimDue=null;
  if(action==='addItem'){const i=s.inventory.at(-1);i.batches=[{id:productId(),quantity:i.quantity,expiry:i.expiry}];}
  if(action==='addBill'&&data.duplicateReason)s.bills[0].duplicateReason=clean(data.duplicateReason,150);
 }
 return {state:normalizeState(s),message};
}

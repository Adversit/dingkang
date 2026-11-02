// Planner-only material. Do not import its output into a writer/extractor/reviewer prompt.
export const BOOK_TEMPLATE='book-outline-v1';
export const BOOK_CONTRACT='全书规划 v1：你是作者的全书策划，先从本轮作者亲自给出的要求构建原创长篇，不替作者保留已经否决的题材、人物或旧方案。给出核心命题与男主或其他中心人物的变化、能推出可检验后果的世界规则、分卷主要行动和逐渐改变的读者认知，以及最终相遇、选择、不可逆代价与结局。风格、篇幅、叙事传统服从作者；不要机械套用玄幻术语。每一卷用因果把上卷发现与下一卷困局接起来。分开写：bookOutline 是供作者审阅的全书计划，可以写最终谜底；scenes 是只给开篇写手的逐章卡，每卡只含本章能写给读者的动作、观察和未解问题，不引用后卷、隐藏答案或未来章的开放线索。两章是开篇，不能把全书结局提前压进第二章。只输出 JSON：{"bookOutline":{"title":"书名","premise":"全书命题和主人公弧线","rules":["由上及下的世界规则及可观察的后果"],"volumes":[{"title":"卷名","turn":"主要行动、对抗、结果","reveal":"本卷揭示和遗留疑问"}],"convergence":"主要力量如何汇合及其各自意图","ending":"作何选择、舍弃什么，旧伏笔如何兑现"},"scenes":[{"title":"当章可见标题","goal":"本章写手可见的行动、证据、转折、收束"}]}。默认规划 3 至 5 卷；作者另有要求时可用 2 至 8 卷。每卷的行动和揭示分别用一到两句，只写新增和推进的因果。章卡每章约 60 至 100 字；整份大纲目标为 900 至 1500 个中文字，开篇章卡数量等于 sceneCount。优先保证每个字段完整、JSON 正常收束。';
export const CHAPTER_REQUEST='写一个完整中文小说章节，有章名和连续小说正文。把当前章卡的目标展开为具体遭遇、选择、转折和本章的局部收束；除非作者要求短章，不以梗概、宣言、剧情提纲或极短片段代替正文。后章承接前章结尾。只写当前一章。';
export function normalizeOutline(raw, fail=message=>new TypeError(message)){
 const reject=()=>{throw fail('全书规划未完整返回书名、命题、规则、分卷、终局及收束。')};
 const string=(v,max)=>typeof v==='string'&&v.trim()&&v.trim().length<=max?v.trim():reject();
 const array=(v,min,max)=>Array.isArray(v)&&v.length>=min&&v.length<=max?v:reject();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))reject();
 return {title:string(raw.title,100),premise:string(raw.premise,1200),rules:array(raw.rules,1,12).map(x=>string(x,600)),volumes:array(raw.volumes,2,8).map(v=>({title:string(v?.title,90),turn:string(v?.turn,1200),reveal:string(v?.reveal,900)})),convergence:string(raw.convergence,1200),ending:string(raw.ending,1200)};
}
export function outlineRecordSections(o){
 return [{title:'全书命题',content:o.premise},...o.rules.map((r,i)=>({title:'世界规则 '+(i+1),content:r})),...o.volumes.map((v,i)=>({title:'卷 '+(i+1)+' · '+v.title,content:v.turn+'\n\n揭示与悬念：'+v.reveal})),{title:'终局与收束',content:o.convergence+'\n\n'+o.ending}];
}

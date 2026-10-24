// Citation.js parses exchange formats. Imported content stays unverified metadata.
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-ris';
import '@citation-js/plugin-csl';
import { Paper,uid,now,normalizeDOI } from './domain';
export function importReferences(text:string,filename:string):Paper[]{const data=new Cite(text).data;if(!data.length||data.length>300)throw new Error('每次请导入 1–300 条参考文献');return data.map((p:any)=>({id:uid(),title:String(p.title??'未命名文献'),doi:normalizeDOI(p.DOI??''),authors:(p.author??[]).map((a:any)=>a.literal??[a.given,a.family].filter(Boolean).join(' ')).join(', '),year:String(p.issued?.['date-parts']?.[0]?.[0]??''),source:`文件导入 ${filename} / ${now()}`,verified:false,abstract:String(p.abstract??''),fileId:'',readStatus:p.abstract?'abstract':'metadata',updatedAt:now()}));}
export function toCSL(papers:Paper[]){return papers.map(p=>({id:p.id,type:'article-journal',title:p.title,DOI:p.doi||undefined,author:p.authors?p.authors.split(/[,，]/).map(a=>({literal:a.trim()})):[],issued:p.year&&/^\d{4}$/.test(p.year)?{'date-parts':[[Number(p.year)]]}:undefined}));}
export function toBibtex(papers:Paper[]){return new Cite(toCSL(papers)).format('bibtex');}

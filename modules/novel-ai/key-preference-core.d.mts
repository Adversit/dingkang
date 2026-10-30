export const SOURCES: readonly ['NOVEL_OPENAI_API_KEY','OPENAI_CHATGPT'];
export class KeyPreferenceError extends Error { status:number; constructor(message:string,status?:number); }
export type NovelKeySource='NOVEL_OPENAI_API_KEY'|'OPENAI_CHATGPT';
export interface Adapter {load(owner:string):Promise<{source:string;revision:number}|null>;compareAndSwap(owner:string,revision:number,source:NovelKeySource,at:string):Promise<boolean>}
export function readPreference(adapter:Adapter,owner:string):Promise<{source:NovelKeySource;revision:number}>;
export function selectPreference(adapter:Adapter,owner:string,source:unknown,expectedRevision:unknown,available:(source:NovelKeySource)=>boolean):Promise<{source:NovelKeySource;revision:number}>;

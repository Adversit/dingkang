export type NovelKeySource='NOVEL_OPENAI_API_KEY'|'OPENAI_CHATGPT';
export function getNovelKeyBinding(owner:string):Promise<{key:string;source:NovelKeySource;revision:number}>;
export function resolveNovelKey(owner:string):Promise<string>;
export function novelKeyStatus(owner:string):Promise<{source:NovelKeySource;revision:number;available:Record<NovelKeySource,boolean>}>;
export function saveNovelKeyPreference(owner:string,source:unknown,expectedRevision:unknown):Promise<{source:NovelKeySource;revision:number}>;

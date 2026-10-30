import type {ConnectionSource} from './connection-sources.mjs';
import type {ProviderModelList} from './models-list.mjs';
export type NovelKeySource=string;
export function getNovelKeyBinding(owner:string):Promise<{key:string;source:NovelKeySource;revision:number}>;
export function resolveNovelKey(owner:string):Promise<string>;
export function novelKeyStatus(owner:string):Promise<{source:NovelKeySource;revision:number;available:Record<NovelKeySource,boolean>;environmentVariables:ConnectionSource[]}>;
export function saveNovelKeyPreference(owner:string,source:unknown,expectedRevision:unknown):Promise<{source:NovelKeySource;revision:number}>;
export function testNovelConnection(owner:string,source:unknown,expectedRevision:unknown):Promise<ProviderModelList & {connected:boolean;selectedSource:string;preferenceRevision:number;sourceRevision:number;fetchedAt:string}>;

export type WritingStyle = 'general'|'xuanhuan'|'mystery';
export type WritingRole = 'planner'|'writer'|'extract'|'review';
export interface WritingProfile {styleId:WritingStyle;authorConstraints:string;revealNow:string}
export const WRITING_STYLES:ReadonlyArray<{id:WritingStyle;label:string}>;
export function normalizeStyleId(raw:unknown,ErrorClass?:new(message:string)=>Error):WritingStyle;
export function normalizeWritingProfile(raw:unknown,ErrorClass?:new(message:string)=>Error):WritingProfile;
export function publicBrief(profile:WritingProfile,sceneIndex?:number,options?:{plan?:boolean}):{authorConstraints?:string;revealNow?:string;laterClueScenes?:number[]};
export function roleSystem(role:WritingRole,styleId?:WritingStyle,additional?:string,contractOverride?:string):string;

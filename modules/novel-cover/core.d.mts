export const MAX_BYTES:number;
export class CoverError extends Error {status:number;}
export function projectId(v:unknown):string;
export function coverKey(owner:string,id:string):Promise<string>;
export function saveCover(store:R2Bucket,key:string,bytes:Uint8Array,mime:string|null,token:string|null):Promise<{etag:string;mime:string;width:number;height:number;size:number}>;
export function generateCover(args:{key:string;model:unknown;prompt:unknown;models:{id:string}[]}):Promise<Uint8Array>;

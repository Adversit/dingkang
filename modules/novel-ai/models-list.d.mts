export class ModelListError extends Error { status:number; constructor(message:string,status?:number); }
export function listProviderModels(key:string, options?:{fetchImpl?:typeof fetch,timeoutMs?:number}):Promise<{models:Array<{id:string;ownedBy:string|null;created:number|null;shutdownDate:string|null}>;truncated:boolean;rejected:number}>;

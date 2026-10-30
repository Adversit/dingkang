export function previewRestore(adapter:any,owner:string,input:any):Promise<{expectedVersion:number;summary:unknown;previewHash:string;notice:string}>;
export function restoreCopy(adapter:any,owner:string,input:any):Promise<unknown>;

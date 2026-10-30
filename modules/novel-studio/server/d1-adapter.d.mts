export const LEGACY_MAX_BYTES:number;
export const EXPANDED_MAX_BYTES:number;
export function d1ArchiveAdapter(db:D1Database):{mode:string;maxStateBytes:number;load(owner:string):Promise<{version:number;state_json:string}|null>;compareAndSwap(owner:string,version:number,state:string,now:string):Promise<boolean>};
export function migrateToExpanded(db:D1Database,owner:string,expectedVersion:number,now?:string):Promise<{version:number}>;

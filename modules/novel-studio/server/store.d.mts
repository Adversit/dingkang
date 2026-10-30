type Row = {version:number;state_json:string};
type Adapter = {load(owner:string):Promise<Row|null>;compareAndSwap(owner:string,version:number,state:string,now:string):Promise<boolean>; mode?:string; maxStateBytes?:number};
export function readArchive(adapter:Adapter,owner:string):Promise<{version:number;state:any;storageMode:string;maxStateBytes:number}>;
export function executeCommand(adapter:Adapter,owner:string,request:unknown,now?:string):Promise<{version:number;state:unknown;storageMode:string;maxStateBytes:number;receipt:Record<string,unknown>}>;

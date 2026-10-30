type Row = {version:number;state_json:string};
type Adapter = {load(owner:string):Promise<Row|null>;compareAndSwap(owner:string,version:number,state:string,now:string):Promise<boolean>};
export function readArchive(adapter:Adapter,owner:string):Promise<{version:number;state:unknown}>;
export function executeCommand(adapter:Adapter,owner:string,request:unknown,now?:string):Promise<{version:number;state:unknown;receipt:Record<string,unknown>}>;

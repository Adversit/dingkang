export class NovelError extends Error { status:number; constructor(message:string,status?:number); }
export function initialState(): {schema:number;projects:unknown[];imports:string[]};
export function applyCommand(state:unknown,command:unknown,now?:string): {state:unknown;receipt:Record<string,unknown>};
export function applyGuardedFactCommand(state:unknown,command:unknown,now?:string): {state:unknown;receipt:Record<string,unknown>};

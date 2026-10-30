export class RetconError extends Error {status:number;constructor(message:string,status?:number)}
export function applyRetconCommand(state:any,command:any,now?:string):Record<string,unknown>;
export function readRetcon(state:any,projectId:string,branchId:string):Record<string,unknown>;
export function impactReport(project:any,branch:any):Record<string,unknown>;

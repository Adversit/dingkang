export type ModelListFailureCode='MODEL_NOT_CONFIGURED'|'MODEL_AUTH_FAILED'|'MODEL_ACCESS_DENIED'|'MODEL_REQUEST_LIMIT'|'MODEL_PROVIDER_ERROR'|'MODEL_EMPTY_RESPONSE'|'MODEL_RESPONSE_TOO_LARGE'|'MODEL_RESPONSE_INVALID'|'MODEL_REQUEST_TIMEOUT'|'MODEL_NETWORK_ERROR'|'MODEL_RESPONSE_READ_ERROR'|'MODEL_RUNTIME_ERROR';
export class ModelListError extends Error {status:number;code:ModelListFailureCode;category:string;providerStatus:number|null;constructor(code?:ModelListFailureCode,providerStatus?:number|null)}
export function modelListFailure(error:unknown):{error:string;code:ModelListFailureCode;category:string;providerStatus:number|null}|null;
export interface ProviderModel {id:string;ownedBy:string|null;created:number|null;shutdownDate:string|null;writingCandidate:boolean}
export interface ProviderModelList {models:ProviderModel[];writingModels:ProviderModel[];excludedCount:number;truncated:boolean;rejected:number}
export function isWritingCandidate(id:string):boolean;
export function listProviderModels(key:string, options?:{fetchImpl?:typeof fetch,timeoutMs?:number}):Promise<ProviderModelList>;

export type ModelFallbackInfo={requestedModel:string;selectedModel:string;reason:'model_not_found'|'model_access'|'endpoint_incompatible'};
type ErrorCtor=new(message:string,status?:number)=>Error;
export function providerModelError(response:Response,model:string,ErrorClass?:ErrorCtor):Promise<Error>;
export function createTextFallback(options:{model:string;key:string;baseUrl?:string;fetchImpl?:typeof fetch;checkBinding?:()=>boolean|Promise<boolean>;onSwitch?:(info:ModelFallbackInfo)=>void|Promise<void>;ErrorClass?:ErrorCtor}):{readonly currentModel:string;readonly switchInfo:ModelFallbackInfo|null;run<T>(invoke:(actualModel:string)=>Promise<T>):Promise<T>};

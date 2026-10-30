export interface ConnectionSource {name:string;configured:boolean;eligible:boolean}
export function validSourceName(name:unknown):name is string;
export function looksLikeOpenAIKey(value:unknown):boolean;
export function discoverConnectionSources(bindings:Record<string,unknown>):ConnectionSource[];
export function readConnectionSecret(bindings:Record<string,unknown>,source:string):string;

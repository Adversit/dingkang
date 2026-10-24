import { env } from 'cloudflare:workers';
import { moduleDb } from './module-db';
export function runtime(){const bindings=env as typeof env & {OPENAI_API_KEY?:string;OPENAI_MODEL?:string};return {db:moduleDb(bindings.DB!),config:{key:bindings.OPENAI_API_KEY,model:bindings.OPENAI_MODEL}};}

import { getChatGPTUser } from '../../chatgpt-auth';
import { runtime } from '../../../lib/runtime';
import { handleState } from '../../../lib/service';
export const dynamic='force-dynamic';
export async function GET(req:Request){const user=await getChatGPTUser();const {db,config}=runtime();return handleState(req,user?.userId||null,db,config);}

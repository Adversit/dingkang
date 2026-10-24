import { getChatGPTUser } from '../../chatgpt-auth';
import { runtime } from '../../../lib/runtime';
import { handleChat } from '../../../lib/service';
export async function POST(req:Request){const user=await getChatGPTUser();const {db,config}=runtime();return handleChat(req,user?.userId||null,db,config);}

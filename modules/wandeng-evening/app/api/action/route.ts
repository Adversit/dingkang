import { getChatGPTUser } from '../../chatgpt-auth';
import { runtime } from '../../../lib/runtime';
import { handleAction } from '../../../lib/service';
export async function POST(req:Request){const user=await getChatGPTUser();return handleAction(req,user?.userId||null,runtime().db);}

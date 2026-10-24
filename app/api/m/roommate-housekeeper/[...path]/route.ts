import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import householdWorker from "@/modules/roommate-housekeeper/src/worker.mjs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error:"AUTH_REQUIRED"},{status:401,headers:{"Cache-Control":"no-store"}});
  const url = new URL(request.url);
  url.pathname = url.pathname.replace("/api/m/roommate-housekeeper/", "/api/");
  return householdWorker.fetch(new Request(url,request), {...env, HUB_USER_ID: user.userId});
}
export const GET = handle;
export const POST = handle;

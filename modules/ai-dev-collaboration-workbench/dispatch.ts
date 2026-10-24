import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createWorker } from "./server/worker.mjs";
import { assets } from "./server/assets.mjs";

const worker = createWorker(assets);
const modulePrefix = "/m/ai-dev-collaboration-workbench";
const apiPrefix = "/api/m/ai-dev-collaboration-workbench";
const authHeaders = ["oai-authenticated-user-id", "oai-authenticated-user-email", "oai-authenticated-user-full-name", "oai-authenticated-user-full-name-encoding"];

/** Use the hub's identity and DB binding; only route paths change for the retained worker. */
export async function dispatch(request: Request) {
  const user = await getChatGPTUser();
  const url = new URL(request.url);
  if (url.pathname === apiPrefix || url.pathname.startsWith(apiPrefix + "/")) {
    url.pathname = "/api" + url.pathname.slice(apiPrefix.length);
  } else if (url.pathname === modulePrefix || url.pathname.startsWith(modulePrefix + "/")) {
    url.pathname = url.pathname.slice(modulePrefix.length) || "/";
  } else {
    return new Response("Not found", {status: 404});
  }
  const headers = new Headers(request.headers);
  for (const name of authHeaders) headers.delete(name);
  if (user) {
    headers.set("oai-authenticated-user-id", user.userId);
    headers.set("oai-authenticated-user-email", user.email);
    headers.set("oai-authenticated-user-full-name", encodeURIComponent(user.displayName));
    headers.set("oai-authenticated-user-full-name-encoding", "percent-encoded-utf-8");
  }
  const rewritten = new Request(url.toString(), request);
  const authenticated = new Request(rewritten, {headers});
  return worker.fetch(authenticated, env);
}

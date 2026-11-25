import { env } from 'cloudflare:workers';
import { handleCampusRequest } from '@/lib/campus/server';

export const dynamic = 'force-dynamic';

function handle(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/api\/games\/jlu-campus(?=\/|$)/, '/api/campus');
  const rewritten = new Request(url, request);
  return handleCampusRequest(rewritten, env);
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };

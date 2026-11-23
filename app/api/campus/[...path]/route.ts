import { env } from 'cloudflare:workers';
import { handleCampusRequest } from '@/lib/campus/server';

export const dynamic = 'force-dynamic';

function handle(request: Request) {
  return handleCampusRequest(request, env);
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };

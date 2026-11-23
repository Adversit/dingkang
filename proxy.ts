import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import { isOwnerAccount, isVercelWorkspace, sessionCookie, workspaceAuth } from '@/lib/platform/supabase-auth';

const userIdHeader = 'oai-authenticated-user-id';
const emailHeader = 'oai-authenticated-user-email';
const fullNameHeader = 'oai-authenticated-user-full-name';
const nameEncodingHeader = 'oai-authenticated-user-full-name-encoding';

export async function proxy(request: NextRequest) {
  if (!isVercelWorkspace()) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  for (const name of [userIdHeader, emailHeader, fullNameHeader, nameEncodingHeader, 'cf-connecting-ip']) {
    requestHeaders.delete(name);
  }

  const cookieUpdates = new Map<string, {value: string; options: CookieOptions}>();
  const hasSession = request.cookies.getAll().some(({ name }) =>
    name === sessionCookie || name.startsWith(sessionCookie + '.'),
  );
  if (hasSession && !request.nextUrl.pathname.startsWith('/auth/workspace')) {
    const auth = workspaceAuth({
      getAll: () => request.cookies.getAll(),
      setAll(updates) {
        for (const { name, value, options } of updates) {
          request.cookies.set(name, value);
          cookieUpdates.set(name, {value, options});
        }
      },
    });
    if (auth) {
      const { data: { user }, error } = await auth.auth.getUser();
      if (!error && isOwnerAccount(user)) {
        requestHeaders.set(userIdHeader, user.id);
        requestHeaders.set(emailHeader, user.email);
      }
    }
  }

  const cookie = request.headers.get('cookie');
  if (cookie) requestHeaders.set('cookie', cookie);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, {value, options}] of cookieUpdates) response.cookies.set(name, value, options);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/|apps/).*)'],
};

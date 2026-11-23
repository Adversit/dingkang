import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

export const sessionCookie = 'workspace-auth';

export function isVercelWorkspace() {
  return process.env.WORKSPACE_TARGET === 'vercel' || process.env.VERCEL === '1';
}

export function ownerEmail() {
  return process.env.WORKSPACE_OWNER_EMAIL?.trim().toLowerCase();
}

export function workspaceAuth(cookieMethods: CookieMethodsServer) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !ownerEmail()) return null;
  return createServerClient(url, key, {
    cookies: cookieMethods,
    cookieOptions: {
      name: sessionCookie,
      secure: new URL(url).protocol === 'https:' && process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
  });
}

export function isOwnerAccount(user: User | null | undefined): user is User & {email: string} {
  const owner = ownerEmail();
  return Boolean(owner && user?.email_confirmed_at && user.email?.toLowerCase() === owner);
}

export async function serverWorkspaceAuth() {
  const jar = await cookies();
  return workspaceAuth({
    getAll: () => jar.getAll(),
    setAll(updates) {
      for (const { name, value, options } of updates) jar.set(name, value, options);
    },
  });
}

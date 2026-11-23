import { isOwnerAccount, isVercelWorkspace, ownerEmail, serverWorkspaceAuth } from '@/lib/platform/supabase-auth';

export const dynamic = 'force-dynamic';

function returnPath(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  const origin = 'https://workspace.invalid';
  const url = new URL(value, origin);
  if (url.origin !== origin || /^\/(?:auth\/workspace|signin-with-chatgpt|signout-with-chatgpt)/.test(url.pathname)) return '/';
  return url.pathname + url.search + url.hash;
}

function signinPage(path: string, issue = '', signout = false) {
  const escaped = path.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const mode = signout ? 'signout' : 'signin';
  const title = signout ? '退出工作空间' : '登录工作空间';
  const fields = signout ? '' : '<label>邮箱<input type="email" name="email" autocomplete="username" required></label><label>密码<input type="password" name="password" autocomplete="current-password" required></label>';
  return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:1rem system-ui,sans-serif;color:#182337;background:#f3f5fa;margin:0;padding:6vh 1rem}main{max-width:29rem;margin:auto;padding:2rem;border:1px solid #dce3ee;border-radius:1.25rem;background:white}h1{margin-top:0}input,button{box-sizing:border-box;font:inherit;border:1px solid #aab8cf;border-radius:.5rem;padding:.7rem;width:100%;margin:.45rem 0 1rem}label{display:block}button{background:#223b61;color:white;cursor:pointer}a{color:#223b61}[role=alert]{color:#9b291d}</style>
<main><h1>${title}</h1>${issue ? `<p role="alert">${issue}</p>` : ''}<form method="post" action="/auth/workspace?action=${mode}">
<input type="hidden" name="return_to" value="${escaped}">${fields}<button>${signout ? '确认退出' : '登录'}</button></form><a href="/">返回工作台</a></main></html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'; base-uri 'none'",
    },
  });
}

export async function GET(request: Request) {
  if (!isVercelWorkspace()) return new Response(null, {status: 404});
  const params = new URL(request.url).searchParams;
  return signinPage(returnPath(params.get('return_to')), ownerEmail() ? '' : '登录服务正在配置。', params.get('action') === 'signout');
}

export async function POST(request: Request) {
  if (!isVercelWorkspace()) return new Response(null, {status: 404});
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return new Response(null, {status: 403});
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) {
    return new Response(null, {status: 415});
  }

  const form = await request.formData();
  const path = returnPath(String(form.get('return_to') ?? ''));
  const client = await serverWorkspaceAuth();
  if (!client) return signinPage(path, '登录服务正在配置。');

  if (url.searchParams.get('action') === 'signout') {
    await client.auth.signOut({scope: 'local'});
    return new Response(null, {status: 303, headers: {Location: path, 'Cache-Control': 'no-store'}});
  }

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (email !== ownerEmail() || !password || password.length > 512) {
    return signinPage(path, '邮箱或密码无效。');
  }
  const {data, error} = await client.auth.signInWithPassword({email, password});
  if (error || !isOwnerAccount(data.user)) return signinPage(path, '邮箱或密码无效。');
  return new Response(null, {status: 303, headers: {Location: path, 'Cache-Control': 'no-store'}});
}

// Only the owner sees names. Values stay in the Worker and are never returned.
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,127}$/;
const RESERVED = /^(?:CF_|CLOUDFLARE_|OAI_|SITES_|SITE_|FEEDBACK_|NODE_|VITE_|NEXT_|WRANGLER_|AWS_|AZURE_)/i;
const INTERNAL = /(?:^|_)(?:SALT|PASSWORD|SESSION|COOKIE|SIGNING|PRIVATE|DATABASE|DB|EMAIL|MODEL|BASE_URL)(?:_|$)/i;
export function validSourceName(name) {
  return typeof name === 'string' && NAME.test(name) && !RESERVED.test(name) && !INTERNAL.test(name);
}
export function looksLikeOpenAIKey(value) {
  return typeof value === 'string' && /^sk-[A-Za-z0-9_-]{16,512}$/.test(value.trim());
}
/** Runtime bindings, not the machine's process environment. No value is emitted. */
export function discoverConnectionSources(bindings) {
  const found = [];
  for (const name of Object.keys(bindings || {}).sort()) {
    if (!validSourceName(name)) continue;
    const value = bindings[name];
    if (typeof value !== 'string') continue;
    const eligible = looksLikeOpenAIKey(value);
    if (!eligible) continue;
    found.push({name, configured: !!value.trim(), eligible});
  }
  return found;
}
export function readConnectionSecret(bindings, source) {
  if (!validSourceName(source) || !Object.hasOwn(bindings, source)) return '';
  const value = bindings[source];
  return looksLikeOpenAIKey(value) ? value.trim() : '';
}

import { postgresBinding } from './postgres-binding';
import { supabaseStorage } from './supabase-storage';

const functions = {
  get FEEDBACK_OWNER_EMAIL() {
    return process.env.FEEDBACK_OWNER_EMAIL || process.env.WORKSPACE_OWNER_EMAIL;
  },
  get DB() {
    return process.env.WORKSPACE_DATABASE_URL
      ? postgresBinding() as unknown as D1Database
      : undefined;
  },
  get BUCKET() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY || !process.env.WORKSPACE_DATABASE_URL) return undefined;
    return supabaseStorage as unknown as R2Bucket;
  },
};

export const env: Cloudflare.Env = new Proxy(functions, {
  get(target, key, receiver) {
    if (typeof key !== 'string' || key in target) return Reflect.get(target, key, receiver);
    return process.env[key];
  },
});

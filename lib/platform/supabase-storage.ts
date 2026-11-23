import { headers } from 'next/headers';
import { withPostgresObjectLock } from './postgres-binding';
import { serverWorkspaceAuth } from './supabase-auth';

export const workspaceBucket = 'workspace-files';

async function storageScope() {
  const [client, requestHeaders] = await Promise.all([serverWorkspaceAuth(), headers()]);
  const owner = requestHeaders.get('oai-authenticated-user-id');
  if (!client || !owner || !/^[a-f\d-]{36}$/i.test(owner)) {
    throw new Error('Workspace Storage requires an authenticated account.');
  }
  return {bucket: client.storage.from(workspaceBucket), owner};
}

type StorageScope = Awaited<ReturnType<typeof storageScope>>;

function statusCode(error: Error) {
  if ('statusCode' in error && error.statusCode) return Number(error.statusCode);
  return 'status' in error ? Number(error.status) : undefined;
}

async function objectInfo({bucket, owner}: StorageScope, key: string) {
  const {data, error} = await bucket.info(`${owner}/${key}`);
  if (error) {
    if (statusCode(error) === 404) return null;
    throw error;
  }
  const etag = data.etag ?? '';
  return {
    key,
    size: data.size,
    etag: etag.replace(/^"|"$/g, ''),
    httpEtag: etag.startsWith('"') ? etag : '"' + etag + '"',
    httpMetadata: { contentType: data.contentType },
  };
}

function cleanEtag(etag: string | null | undefined) {
  return etag?.replace(/^"|"$/g, '');
}

export const supabaseStorage = {
  async head(key: string) {
    return objectInfo(await storageScope(), key);
  },
  async get(key: string) {
    const scope = await storageScope();
    const info = await objectInfo(scope, key);
    if (!info) return null;
    const { data, error } = await scope.bucket.download(`${scope.owner}/${key}`);
    if (error) throw error;
    return { ...info, body: data.stream() };
  },
  async put(key: string, value: Blob | ArrayBuffer | Uint8Array | string, options?: R2PutOptions) {
    const scope = await storageScope();
    const path = `${scope.owner}/${key}`;
    const condition = options?.onlyIf;
    const ifMatch = cleanEtag(condition instanceof Headers ? condition.get('if-match') : condition?.etagMatches);
    const ifNoneMatch = cleanEtag(condition instanceof Headers ? condition.get('if-none-match') : condition?.etagDoesNotMatch);
    const http = options?.httpMetadata;
    const contentType = http instanceof Headers ? http.get('content-type') ?? undefined : http?.contentType;
    const body = value instanceof Uint8Array ? new Uint8Array(value).buffer : value;
    async function upload() {
      if (ifMatch || ifNoneMatch) {
        const before = await objectInfo(scope, key);
        if (ifMatch && (!before || (ifMatch !== '*' && before.etag !== ifMatch))) return null;
        if (ifNoneMatch && before && (ifNoneMatch === '*' || before.etag === ifNoneMatch)) return null;
      }
      const upsert = ifNoneMatch !== '*';
      const {error} = await scope.bucket.upload(path, body, {contentType, upsert, metadata: options?.customMetadata});
      if (error) {
        if (!upsert && statusCode(error) === 409) return null;
        throw error;
      }
      return objectInfo(scope, key);
    }
    return ifMatch || ifNoneMatch ? withPostgresObjectLock(`${workspaceBucket}/${path}`, upload) : upload();
  },
  async delete(key: string | string[]) {
    const {bucket, owner} = await storageScope();
    const keys = typeof key === 'string' ? [key] : key;
    const {error} = await bucket.remove(keys.map(key => `${owner}/${key}`));
    if (error) throw error;
  },
};

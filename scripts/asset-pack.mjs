import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, realpath, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MANIFEST = 'asset-pack/manifest.json';
const CHUNK_BYTES = 220000;
const MAX_ASSET_BYTES = 256 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const fail = message => { throw new Error(`Asset pack: ${message}`); };

function validatePath(path, prefix) {
  if (typeof path !== 'string' || !path.startsWith(`${prefix}/`) ||
      path.split('/').some(part => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part))) {
    fail(`unsafe path ${JSON.stringify(path)}; expected a relative ${prefix}/ path without traversal.`);
  }
  if (prefix === 'asset-pack/parts' && !/^asset-pack\/parts\/[a-f0-9]{40}-(?:[a-f0-9]{16}-)?\d+\.b64$/.test(path)) {
    fail(`invalid part path ${path}.`);
  }
  return path;
}

function integer(value, name, maximum = MAX_ASSET_BYTES) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) fail(`invalid ${name}.`);
}

function digest(value, length, name) {
  if (typeof value !== 'string' || !(new RegExp(`^[a-f0-9]{${length}}$`)).test(value)) fail(`invalid ${name}.`);
}

// Reject symlinks in every existing path segment, including intermediate directories.
async function inspectPath(root, path) {
  let current = root;
  const segments = path.split('/');
  for (let index = 0; index < segments.length; index++) {
    current = join(current, segments[index]);
    let stat;
    try { stat = await lstat(current); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (stat.isSymbolicLink()) fail(`symlinks are not allowed: ${path}.`);
    if (index < segments.length - 1 ? !stat.isDirectory() : !stat.isFile()) {
      fail(`expected ${index < segments.length - 1 ? 'directory' : 'regular file'} at ${current}.`);
    }
    if (index === segments.length - 1) return stat;
  }
  return null;
}

async function readSafe(root, path, maximum = MAX_ASSET_BYTES) {
  const stat = await inspectPath(root, path);
  if (!stat) fail(`missing file ${path}.`);
  if (stat.size > maximum) fail(`file is too large: ${path}.`);
  const file = await open(join(root, path), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    if (!(await file.stat()).isFile()) fail(`not a regular file: ${path}.`);
    const bytes = await file.readFile();
    if (bytes.length > maximum) fail(`file is too large: ${path}.`);
    return bytes;
  } finally { await file.close(); }
}

async function readManifest(root, manifestPath) {
  if (manifestPath !== MANIFEST) fail(`manifest must be ${MANIFEST}.`);
  const manifest = JSON.parse((await readSafe(root, MANIFEST, 4 * 1024 * 1024)).toString('utf8'));
  if (manifest?.format !== 'dingkang-asset-pack' || manifest.version !== 1 ||
      manifest.codec !== 'zlib-base64' || manifest.chunkBytes !== CHUNK_BYTES ||
      !Array.isArray(manifest.assets) || !manifest.assets.length || manifest.assets.length > 1000) {
    fail('unsupported or invalid manifest.');
  }
  const targets = new Set();
  for (const asset of manifest.assets) {
    validatePath(asset?.path, 'public');
    if (targets.has(asset.path)) fail(`duplicate target ${asset.path}.`);
    targets.add(asset.path);
  }
  for (const path of targets) {
    const segments = path.split('/');
    for (let index = 2; index < segments.length; index++) {
      if (targets.has(segments.slice(0, index).join('/'))) fail(`target is also a parent directory: ${path}.`);
    }
  }
  return manifest;
}

function validateAsset(asset) {
  integer(asset.bytes, `${asset.path} byte length`);
  integer(asset.compressedBytes, `${asset.path} compressed length`, MAX_ASSET_BYTES + 1024 * 1024);
  digest(asset.sha256, 64, `${asset.path} SHA-256`);
  digest(asset.gitBlobSha1, 40, `${asset.path} Git blob SHA-1`);
  if (!Array.isArray(asset.parts) || !asset.parts.length || asset.parts.length > 1300) fail(`invalid parts for ${asset.path}.`);
  let compressedBytes = 0;
  const paths = new Set();
  for (const [index, part] of asset.parts.entries()) {
    validatePath(part?.path, 'asset-pack/parts');
    if (paths.has(part.path)) fail(`duplicate part ${part.path}.`);
    paths.add(part.path);
    integer(part.compressedBytes, `${part.path} compressed length`, CHUNK_BYTES);
    integer(part.base64Bytes, `${part.path} encoded length`, Math.ceil(CHUNK_BYTES / 3) * 4);
    digest(part.sha256, 64, `${part.path} SHA-256`);
    if (!part.compressedBytes || part.base64Bytes !== Math.ceil(part.compressedBytes / 3) * 4 ||
        (index < asset.parts.length - 1 && part.compressedBytes !== CHUNK_BYTES)) fail(`invalid chunk sizes for ${part.path}.`);
    compressedBytes += part.compressedBytes;
  }
  if (compressedBytes !== asset.compressedBytes) fail(`compressed length mismatch for ${asset.path}.`);
}

async function decodeAsset(root, asset) {
  const chunks = [];
  for (const part of asset.parts) {
    const encoded = await readSafe(root, part.path, Math.ceil(CHUNK_BYTES / 3) * 4);
    if (encoded.length !== part.base64Bytes || hash(encoded) !== part.sha256) fail(`part checksum or length mismatch: ${part.path}.`);
    const text = encoded.toString('utf8');
    const decoded = Buffer.from(text, 'base64');
    if (decoded.toString('base64') !== text || decoded.length !== part.compressedBytes) fail(`invalid base64: ${part.path}.`);
    chunks.push(decoded);
  }
  const compressed = Buffer.concat(chunks);
  let decoded;
  try {
    const result = inflateSync(compressed, { maxOutputLength: Math.max(1, asset.bytes + 1), info: true });
    if (result.engine.bytesWritten !== compressed.length) fail(`trailing compressed data for ${asset.path}.`);
    decoded = result.buffer;
  } catch (error) { fail(`cannot inflate ${asset.path}: ${error.message}`); }
  if (decoded.length !== asset.bytes || hash(decoded) !== asset.sha256 || gitBlob(decoded) !== asset.gitBlobSha1) {
    fail(`decoded checksum or length mismatch: ${asset.path}.`);
  }
  return decoded;
}

async function ensureParents(root, path) {
  let current = root;
  for (const segment of path.split('/').slice(0, -1)) {
    current = join(current, segment);
    try { await mkdir(current); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`unsafe parent directory ${current}.`);
  }
}

async function matchesExisting(root, asset) {
  if (!(await inspectPath(root, asset.path))) return false;
  const current = await readSafe(root, asset.path);
  if (current.length !== asset.bytes || hash(current) !== asset.sha256) {
    fail(`existing file differs: ${asset.path}. Your edit was preserved. Run pnpm assets:pack to adopt intentional changes, or move this file aside before restoring.`);
  }
  return true;
}

async function temporaryFile(root, path, bytes) {
  await ensureParents(root, path);
  const target = join(root, path);
  const temporary = join(dirname(target), `.asset-pack-${randomUUID()}.tmp`);
  const file = await open(temporary, 'wx', 0o644);
  try { await file.writeFile(bytes); await file.sync(); }
  catch (error) { await file.close(); await unlink(temporary).catch(() => {}); throw error; }
  await file.close();
  return { target, temporary };
}

/** Verify the entire pack and existing targets before restoring any missing file. */
export async function restoreAssets({ root = ROOT, manifestPath = MANIFEST } = {}) {
  root = await realpath(root);
  const manifest = await readManifest(root, manifestPath);
  for (const asset of manifest.assets) validateAsset(asset);
  const missing = [];
  let skipped = 0;
  for (const asset of manifest.assets) {
    const bytes = await decodeAsset(root, asset);
    if (await matchesExisting(root, asset)) skipped++;
    else missing.push({ asset, bytes });
  }
  let restored = 0;
  for (const { asset, bytes } of missing) {
    const { target, temporary } = await temporaryFile(root, asset.path, bytes);
    try {
      await inspectPath(root, asset.path);
      // link is an atomic, same-directory no-replace install. Unlike rename, it
      // cannot overwrite a local edit created between preflight and publication.
      try { await link(temporary, target); restored++; }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        await matchesExisting(root, asset);
        skipped++;
      }
    } finally { await unlink(temporary); }
  }
  return { restored, skipped };
}

async function replaceGenerated(root, path, bytes) {
  if (await inspectPath(root, path)) {
    if ((await readSafe(root, path)).equals(bytes)) return;
  }
  const { target, temporary } = await temporaryFile(root, path, bytes);
  try { await inspectPath(root, path); await rename(temporary, target); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

/** Explicitly adopt source changes. Sources are read as bytes, never executed. */
export async function packAssets({ root = ROOT, manifestPath = MANIFEST } = {}) {
  root = await realpath(root);
  const previous = await readManifest(root, manifestPath);
  const oldParts = new Set();
  for (const asset of previous.assets) {
    if (!Array.isArray(asset.parts)) fail(`invalid parts for ${asset.path}.`);
    for (const part of asset.parts) oldParts.add(validatePath(part?.path, 'asset-pack/parts'));
  }
  const manifest = { format: 'dingkang-asset-pack', version: 1, codec: 'zlib-base64', chunkBytes: CHUNK_BYTES, assets: [] };
  const generated = new Map();
  for (const { path } of previous.assets) {
    const bytes = await readSafe(root, path);
    const compressed = deflateSync(bytes, { level: 9 });
    const gitBlobSha1 = gitBlob(bytes);
    // Include the compressed digest so a zlib-version change cannot replace
    // parts referenced by the previous manifest before its atomic publication.
    const compressedId = hash(compressed).slice(0, 16);
    const parts = [];
    for (let offset = 0, index = 0; offset < compressed.length; offset += CHUNK_BYTES, index++) {
      const chunk = compressed.subarray(offset, offset + CHUNK_BYTES);
      const content = Buffer.from(chunk.toString('base64'), 'ascii');
      const partPath = `asset-pack/parts/${gitBlobSha1}-${compressedId}-${index}.b64`;
      parts.push({ path: partPath, base64Bytes: content.length, compressedBytes: chunk.length, sha256: hash(content) });
      generated.set(partPath, content);
    }
    manifest.assets.push({ path, bytes: bytes.length, sha256: hash(bytes), gitBlobSha1, compressedBytes: compressed.length, parts });
  }
  // Validate all destinations before the first mutation; source paths are never written.
  for (const path of new Set([...oldParts, ...generated.keys()])) await inspectPath(root, path);
  for (const [path, bytes] of generated) await replaceGenerated(root, path, bytes);
  // Publish the manifest last so a failed write cannot reference incomplete parts.
  await replaceGenerated(root, MANIFEST, Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  for (const path of oldParts) if (!generated.has(path)) {
    await inspectPath(root, path);
    await unlink(join(root, path)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return { assets: manifest.assets.length, parts: generated.size };
}

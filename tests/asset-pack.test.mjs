import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, relative} from 'node:path';
import {inflateSync} from 'node:zlib';
import {packAssets, restoreAssets} from '../scripts/asset-pack.mjs';

const manifestPath = 'asset-pack/manifest.json';
const digest = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const gitBlob = bytes => digest(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]), 'sha1');
function noise(length) {
  const bytes = Buffer.alloc(length);
  for (let offset = 0; offset < length; offset += 32) {
    const block = createHash('sha256').update(`asset-pack-fixture:${offset}`).digest();
    block.copy(bytes, offset, 0, Math.min(block.length, length - offset));
  }
  return bytes;
}
async function save(root, path, bytes) {
  await mkdir(dirname(join(root, path)), {recursive: true});
  await writeFile(join(root, path), bytes);
}
async function writeManifest(root, manifest) {
  await save(root, manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
const readManifest = async root => JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
async function fixture(t, entries) {
  const temporary = await mkdtemp(join(tmpdir(), 'dingkang-asset-pack-'));
  t.after(() => rm(temporary, {recursive: true, force: true}));
  const root = join(temporary, 'root');
  await mkdir(root);
  const assets = new Map(Object.entries(entries));
  for (const [path, bytes] of assets) await save(root, path, bytes);
  // pack intentionally accepts old metadata: the current source is authoritative.
  await writeManifest(root, {
    format: 'dingkang-asset-pack', version: 1, codec: 'zlib-base64', chunkBytes: 220000,
    assets: [...assets].map(([path, bytes]) => ({
      path, bytes: bytes.length, sha256: '0'.repeat(64), gitBlobSha1: '0'.repeat(40),
      compressedBytes: 0, parts: [],
    })),
  });
  return {root, temporary, assets};
}
async function removeAssets(root, assets) {
  for (const path of assets.keys()) await rm(join(root, path));
}
async function treeSnapshot(root) {
  const files = {};
  async function visit(directory) {
    for (const entry of (await readdir(directory, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files[relative(root, path)] = (await readFile(path)).toString('base64');
      else files[relative(root, path)] = '<non-file>';
    }
  }
  await visit(root);
  return files;
}
async function assertMissing(root, assets) {
  for (const path of assets.keys()) await assert.rejects(readFile(join(root, path)), {code: 'ENOENT'});
}

test('pack and restore round-trip binary, Unicode and empty files across multiple parts', async t => {
  const {root, assets} = await fixture(t, {
    'public/nested/world.bin': noise(610123),
    'public/hello.txt': Buffer.from('暖居里的应用\nHello, world!\n'),
    'public/empty.bin': Buffer.alloc(0),
  });
  const packed = await packAssets({root});
  const manifest = await readManifest(root);
  assert.equal(manifest.format, 'dingkang-asset-pack');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.codec, 'zlib-base64');
  assert.deepEqual(new Set(manifest.assets.map(asset => asset.path)), new Set(assets.keys()));
  assert.equal(packed.assets, assets.size);
  assert.equal(packed.parts, manifest.assets.reduce((sum, asset) => sum + asset.parts.length, 0));
  assert.ok(manifest.assets.find(asset => asset.path.endsWith('world.bin')).parts.length > 1);
  for (const asset of manifest.assets) {
    const original = assets.get(asset.path);
    assert.equal(asset.bytes, original.length);
    assert.equal(asset.sha256, digest(original));
    assert.equal(asset.gitBlobSha1, gitBlob(original));
    const chunks = [];
    for (const part of asset.parts) {
      const encoded = await readFile(join(root, part.path));
      assert.match(encoded.toString('ascii'), /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
      assert.equal(part.base64Bytes, encoded.length);
      assert.equal(part.sha256, digest(encoded));
      const compressed = Buffer.from(encoded.toString('ascii'), 'base64');
      assert.equal(part.compressedBytes, compressed.length);
      chunks.push(compressed);
    }
    const compressed = Buffer.concat(chunks);
    assert.equal(asset.compressedBytes, compressed.length);
    assert.deepEqual(inflateSync(compressed), original);
  }
  await removeAssets(root, assets);
  assert.deepEqual(await restoreAssets({root}), {restored: assets.size, skipped: 0});
  for (const [path, bytes] of assets) assert.deepEqual(await readFile(join(root, path)), bytes);
  const restoredTree = await treeSnapshot(root);
  assert.deepEqual(await restoreAssets({root}), {restored: 0, skipped: assets.size});
  assert.deepEqual(await treeSnapshot(root), restoredTree, 'skipping correct assets must not alter any file');
});

test('shared game audio is restored at both destinations from one set of parts', async t => {
  const paths = [
    'public/apps/pocket-arcade-ten/assets/audio/battle.mp3',
    'public/apps/starfall-creature-isles/assets/audio/battle.mp3',
  ];
  const repositoryManifest = JSON.parse(await readFile(new URL('../asset-pack/manifest.json', import.meta.url), 'utf8'));
  const configured = paths.map(path => repositoryManifest.assets.find(asset => asset.path === path));
  assert.ok(configured.every(Boolean), 'both game audio destinations must be included in the repository pack');
  assert.deepEqual(configured[0].parts, configured[1].parts);
  assert.equal(configured[0].sha256, configured[1].sha256);

  const bytes = noise(440123);
  const {root, assets} = await fixture(t, Object.fromEntries(paths.map(path => [path, bytes])));
  const packed = await packAssets({root});
  const manifest = await readManifest(root);
  assert.equal(packed.assets, 2);
  assert.equal(packed.parts, manifest.assets[0].parts.length, 'shared bytes must not create duplicate parts');
  assert.deepEqual(manifest.assets[0].parts, manifest.assets[1].parts);
  await removeAssets(root, assets);
  assert.deepEqual(await restoreAssets({root}), {restored: 2, skipped: 0});
  for (const path of paths) assert.deepEqual(await readFile(join(root, path)), bytes);
  assert.deepEqual(await restoreAssets({root}), {restored: 0, skipped: 2});
});

test('packing is deterministic and explicit repacking adopts edited source bytes', async t => {
  const path = 'public/world.bin';
  const {root, assets} = await fixture(t, {[path]: noise(250345)});
  const firstResult = await packAssets({root});
  const firstTree = await treeSnapshot(join(root, 'asset-pack'));
  assert.deepEqual(await packAssets({root}), firstResult);
  assert.deepEqual(await treeSnapshot(join(root, 'asset-pack')), firstTree);
  const edited = Buffer.concat([assets.get(path), Buffer.from('intentional asset revision')]);
  await save(root, path, edited);
  await packAssets({root});
  assert.equal((await readManifest(root)).assets[0].sha256, digest(edited));
  const updatedTree = await treeSnapshot(join(root, 'asset-pack'));
  await packAssets({root});
  assert.deepEqual(await treeSnapshot(join(root, 'asset-pack')), updatedTree);
  await rm(join(root, path));
  assert.deepEqual(await restoreAssets({root}), {restored: 1, skipped: 0});
  assert.deepEqual(await readFile(join(root, path)), edited);
});

test('a damaged later part rejects the batch without writing earlier missing assets', async t => {
  const {root, assets} = await fixture(t, {'public/a.bin': Buffer.from('first'), 'public/z.bin': noise(440123)});
  await packAssets({root});
  const manifest = await readManifest(root);
  const part = manifest.assets.at(-1).parts.at(-1);
  const encoded = await readFile(join(root, part.path), 'utf8');
  await save(root, part.path, (encoded[0] === 'A' ? 'B' : 'A') + encoded.slice(1));
  await removeAssets(root, assets);
  const before = await treeSnapshot(root);
  await assert.rejects(restoreAssets({root}));
  await assertMissing(root, assets);
  assert.deepEqual(await treeSnapshot(root), before, 'a failed batch leaves neither partial assets nor temporary files');
});

test('restore rejects non-canonical base64 and invalid decoded asset metadata', async t => {
  for (const damage of ['newline', 'bytes', 'sha256']) await t.test(damage, async subtest => {
    const {root, assets} = await fixture(subtest, {'public/source.bin': Buffer.from('metadata must match the decoded source')});
    await packAssets({root});
    const manifest = await readManifest(root), asset = manifest.assets[0];
    if (damage === 'newline') {
      const part = asset.parts[0];
      const encoded = Buffer.from((await readFile(join(root, part.path), 'utf8')) + '\n');
      await save(root, part.path, encoded);
      part.base64Bytes = encoded.length;part.sha256 = digest(encoded);
    } else if (damage === 'bytes') asset.bytes++;
    else asset.sha256 = '0'.repeat(64);
    await writeManifest(root, manifest);
    await removeAssets(root, assets);
    const before = await treeSnapshot(root);
    await assert.rejects(restoreAssets({root}));
    assert.deepEqual(await treeSnapshot(root), before);
  });
});

test('an existing edited asset is never overwritten and blocks all restore writes', async t => {
  const {root, assets} = await fixture(t, {
    'public/a-missing.bin': Buffer.from('restore this only after the entire batch is valid'),
    'public/m-correct.bin': Buffer.from('already correct'),
    'public/z-edited.bin': Buffer.from('original'),
  });
  await packAssets({root});
  await rm(join(root, 'public/a-missing.bin'));
  const edited = Buffer.from('important local edit');
  await save(root, 'public/z-edited.bin', edited);
  const before = await treeSnapshot(root);
  await assert.rejects(restoreAssets({root}));
  assert.deepEqual(await treeSnapshot(root), before);
  assert.deepEqual(await readFile(join(root, 'public/z-edited.bin')), edited);
  assert.deepEqual(await readFile(join(root, 'public/m-correct.bin')), assets.get('public/m-correct.bin'));
  await assert.rejects(readFile(join(root, 'public/a-missing.bin')), {code: 'ENOENT'});
});

test('asset paths must remain unambiguous public-relative paths for pack and restore', async t => {
  for (const badPath of ['../escape.bin', 'public/../escape.bin', 'public/../../escape.bin', 'private/source.bin', '/public/source.bin', 'public\\..\\escape.bin']) {
    await t.test(badPath, async subtest => {
      const {root, temporary} = await fixture(subtest, {'public/source.bin': Buffer.from('safe source')});
      await packAssets({root});
      const outside = join(temporary, 'escape.bin');
      await writeFile(outside, 'outside sentinel');
      const manifest = await readManifest(root);manifest.assets[0].path = badPath;
      await writeManifest(root, manifest);
      const before = await treeSnapshot(temporary);
      await assert.rejects(restoreAssets({root}));
      await assert.rejects(packAssets({root}));
      assert.deepEqual(await treeSnapshot(temporary), before);
      assert.equal(await readFile(outside, 'utf8'), 'outside sentinel');
    });
  }
});

test('part paths cannot escape the pack even when an external valid part exists', async t => {
  const {root, temporary, assets} = await fixture(t, {'public/source.bin': Buffer.from('safe source')});
  await packAssets({root});
  const manifest = await readManifest(root), part = manifest.assets[0].parts[0];
  await writeFile(join(temporary, 'external.b64'), await readFile(join(root, part.path)));
  part.path = '../external.b64';await writeManifest(root, manifest);await removeAssets(root, assets);
  const before = await treeSnapshot(temporary);
  await assert.rejects(restoreAssets({root}));
  assert.deepEqual(await treeSnapshot(temporary), before);
  await assertMissing(root, assets);
});

test('symlinked asset directories and encoded parts cannot escape the root', async t => {
  await t.test('asset directory', async subtest => {
    const path = 'public/linked/source.bin', content = Buffer.from('same bytes outside still cannot be adopted');
    const {root, temporary} = await fixture(subtest, {[path]: content});
    await packAssets({root});
    const outside = join(temporary, 'outside');await mkdir(outside);await writeFile(join(outside, 'source.bin'), content);
    await rm(join(root, 'public/linked'), {recursive: true});await symlink(outside, join(root, 'public/linked'), 'dir');
    const before = await treeSnapshot(temporary);
    await assert.rejects(restoreAssets({root}));
    await assert.rejects(packAssets({root}));
    assert.deepEqual(await treeSnapshot(temporary), before);
  });
  await t.test('part file', async subtest => {
    const {root, temporary, assets} = await fixture(subtest, {'public/source.bin': Buffer.from('safe source')});
    await packAssets({root});
    const part = (await readManifest(root)).assets[0].parts[0];
    const outside = join(temporary, 'external.b64');await writeFile(outside, await readFile(join(root, part.path)));
    await rm(join(root, part.path));await symlink(outside, join(root, part.path));await removeAssets(root, assets);
    const before = await treeSnapshot(temporary);
    await assert.rejects(restoreAssets({root}));
    assert.deepEqual(await treeSnapshot(temporary), before);
    await assertMissing(root, assets);
  });
});

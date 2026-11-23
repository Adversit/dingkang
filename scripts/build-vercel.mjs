import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { restoreAssets } from './asset-pack.mjs';

await restoreAssets();
const cli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const result = spawnSync(process.execPath, [cli, 'build', '--webpack'], {
  env: { ...process.env, WORKSPACE_TARGET: 'vercel' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

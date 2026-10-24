import { restoreAssets } from './asset-pack.mjs';

try {
  const { restored, skipped } = await restoreAssets();
  console.log(`Assets verified: ${restored} restored, ${skipped} already present.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

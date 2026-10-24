import { packAssets } from './asset-pack.mjs';

try {
  const { assets, parts } = await packAssets();
  console.log(`Packed ${assets} assets into ${parts} verified parts. Commit asset-pack/ with your change.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

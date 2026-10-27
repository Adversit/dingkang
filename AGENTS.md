# Working on Dingkang Workspace

The canonical development repository is `https://github.com/Adversit/dingkang`.
Keep subsequent feature changes here. Preserve the existing Site identity and audience when deploying.

## One implementation, four presentations

- `lib/hub/catalog.ts` is the shared application registry.
- `lib/hub/theme.ts` defines the four themes and `HubSceneProps`.
- `app/page.tsx` owns account, navigation, preferences and import orchestration.
- Scene components receive callbacks. Do not introduce theme-specific business APIs, save formats or duplicate modules.
- Opening or changing a theme must preserve the active module and its progress. Flush pending storage before leaving a module.
- Keep Chinese body text at least 16px and supporting text at least 14px. Respect reduced motion and stop background rendering when hidden.

## Interface copy

- Keep the hub themes and application screens free of decorative small copy: no slogan subtitles, duplicate category eyebrows, English kickers, or routine card descriptions. Use names, headings and controls directly.
- Preserve actual content, instructions needed to act, live status, errors, data limits and required attribution. Do not blanket-hide small tags or muted text. Close spacing left by removed captions.

## Data and deployment

- Server identity is authoritative. Never trust a client-supplied user ID for ownership.
- Keep version checks and conflict handling on all unified-state writes.
- Preserve each module's native API and storage boundaries.
- Never commit credentials, user exports, runtime databases or private migration receipts.
- The platform project IDs in deployment and migration configuration are identifiers, not credentials. Do not replace them during routine updates.

## Packed static resources

- `asset-pack/manifest.json` lists the large static resources stored as verified repository parts. Development and build entry points restore them offline before Vite runs.
- Before editing a listed resource, run `pnpm assets:restore`. After an intentional edit, run `pnpm assets:pack` and commit the updated manifest and parts together; the original large files stay ignored. Never hand-edit base64 parts or bypass a restore checksum failure.
- Restoration preserves any differing local file and fails instead of overwriting it. Move an unwanted local copy aside before restoring, or explicitly repack to adopt an intended change. Keep pack files outside `public/` and never include user saves or credentials.

## Validation

Run TypeScript checks and the relevant Node tests before publishing. For theme or scene changes, inspect desktop and mobile layouts and actual interactions. Use the checked-in lockfile. Do not mark a deployment successful until the hosting service reports success.

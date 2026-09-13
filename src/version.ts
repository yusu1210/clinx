import { readFileSync } from 'node:fs';

// Package version describes the implementation; record format versions are separate.
const manifest: unknown = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
if (
  manifest === null ||
  typeof manifest !== 'object' ||
  !('version' in manifest) ||
  typeof manifest.version !== 'string'
)
  throw new Error('Invalid clinx package version');
export const version = manifest.version;
// Bump when saved execution facts must be interpreted differently, not for packaging changes.
export const evidenceProtocolVersion = 2;

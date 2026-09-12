import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fixture, put } from './helpers.mjs';
import { releaseFindings, assertPublicFile } from '../scripts/release-scan.mjs';

test('public-file checks reject credential paths, private endpoints and task history', () => {
  for (const path of [
    '.env.production',
    'nested/.env.local',
    '.clinx/runs/x.json',
    'node_modules/x',
    'examples/app/target/result.xml',
    'credentials.pem',
    '.DS_Store',
    'examples/.DS_Store',
    'clinx/tasks/task/checkpoints/00000001.json',
  ])
    assert.ok(releaseFindings(path, '').length > 0, path);
  const cases = [
    ['https://' + 'example.corp.' + 'invalid/path', 'private-host'],
    ['/' + 'Users/' + 'example/project/', 'local-home'],
    ['-----BEGIN ' + 'PRIVATE KEY-----', 'private-key'],
    ['ghp_' + 'a'.repeat(36), 'access-token'],
    ['npm_' + 'a'.repeat(36), 'access-token'],
    ['//registry.invalid/:_authToken=' + 'a'.repeat(36), 'registry-auth'],
  ];
  for (const [value, id] of cases) assert.ok(releaseFindings('source.txt', value).includes(id));
  assert.deepEqual(releaseFindings('LICENSE', 'MIT License'), []);
  assert.deepEqual(releaseFindings('.npmrc', 'registry=https://registry.npmjs.org\n'), []);
  assert.deepEqual(releaseFindings('docs/example.md', '/path/to/project'), []);
});

test('public-file diagnostics do not print the potentially sensitive match', async () => {
  const dir = await fixture();
  const path = join(dir, 'public.txt');
  const secret = 'ghp_' + 'b'.repeat(36);
  await put(path, secret);
  await assert.rejects(assertPublicFile(path, 'public.txt'), (error) => {
    assert.match(error.message, /access-token/);
    assert.ok(!error.message.includes(secret));
    return true;
  });
});

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = fileURLToPath(new URL('../', import.meta.url));

// Public guides have paired languages. Agent instructions and domain fixtures do not.
export async function translationSnapshot(directory = root) {
  const directories = [''];
  for (const entry of await readdir(join(directory, 'examples'), { withFileTypes: true }))
    if (entry.isDirectory()) directories.push(`examples/${entry.name}`);
  const pairs = [];
  for (const dir of directories) {
    const names = await readdir(join(directory, dir));
    const guides = names.filter((name) =>
      dir.startsWith('examples/')
        ? name === 'README.md'
        : name.endsWith('.md') && !name.endsWith('.zh-CN.md') && name !== 'AGENTS.md',
    );
    for (const name of names.filter((name) => name.endsWith('.zh-CN.md')))
      assert.ok(
        guides.includes(name.replace(/\.zh-CN\.md$/, '.md')),
        `Unpaired translation: ${join(dir, name)}`,
      );
    for (const name of guides) {
      const source = dir ? `${dir}/${name}` : name;
      const translation = source.replace(/\.md$/, '.zh-CN.md');
      await addPair(source, translation);
    }
  }
  assert.deepEqual(
    (await readdir(join(directory, 'docs'))).filter((name) => name.endsWith('.md')).sort(),
    ['README.md'],
    'Keep guides in docs/en and docs/zh-CN; docs/README.md selects the language',
  );
  async function guides(dir, prefix = '') {
    const found = [];
    for (const entry of await readdir(join(directory, dir, prefix), { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) found.push(...(await guides(dir, path)));
      else if (entry.isFile() && path.endsWith('.md')) found.push(path);
      else if (entry.isSymbolicLink()) throw new Error(`Unsupported guide link: ${dir}/${path}`);
    }
    return found.sort();
  }
  const english = await guides('docs/en'),
    chinese = await guides('docs/zh-CN');
  assert.deepEqual(
    english,
    chinese,
    'Unpaired translation: English and Chinese guide paths differ',
  );
  for (const name of english) await addPair(`docs/en/${name}`, `docs/zh-CN/${name}`);
  async function addPair(source, translation) {
    const [original, translated] = await Promise.all([
      readFile(join(directory, source)),
      readFile(join(directory, translation)),
    ]);
    for (const [from, to, bytes] of [
      [source, translation, original],
      [translation, source, translated],
    ])
      assert.ok(
        bytes.toString().includes(`](${relative(dirname(from), to).split('\\').join('/')})`),
        `Missing language link: ${from}`,
      );
    pairs.push({
      source,
      translation,
      sourceSha256: hash(original),
      translationSha256: hash(translated),
    });
  }
  return { version: 1, pairs: pairs.sort((a, b) => a.source.localeCompare(b.source, 'en')) };
}

export async function checkTranslations(directory = root) {
  const expected = await translationSnapshot(directory);
  const actual = JSON.parse(await readFile(join(directory, 'docs/translations.json'), 'utf8'));
  assert.deepEqual(Object.keys(actual).sort(), ['pairs', 'version'], 'Invalid translation record');
  assert.equal(actual.version, 1, 'Unsupported translation record');
  assert.ok(Array.isArray(actual.pairs), 'Translation pairs must be an array');
  assert.equal(
    actual.pairs.length,
    expected.pairs.length,
    'Translation pair inventory changed; review added/removed guides',
  );
  assert.equal(
    new Set(actual.pairs.map((p) => p.source)).size,
    actual.pairs.length,
    'Duplicate translation source',
  );
  const entries = new Map(actual.pairs.map((p) => [p.source, p]));
  for (const pair of expected.pairs) {
    const saved = entries.get(pair.source);
    assert.ok(saved, `Missing translation review: ${pair.source}`);
    assert.deepEqual(
      Object.keys(saved).sort(),
      ['source', 'sourceSha256', 'translation', 'translationSha256'],
      `Invalid translation review: ${pair.source}`,
    );
    assert.equal(saved.translation, pair.translation, `Translation path mismatch: ${pair.source}`);
    assert.ok(
      saved.sourceSha256 === pair.sourceSha256 &&
        saved.translationSha256 === pair.translationSha256,
      `Translation review required: ${pair.source} / ${pair.translation}. Review both guides before updating docs/translations.json; hashes do not establish semantic equivalence.`,
    );
  }
  return expected.pairs.length;
}

if (
  process.argv[1] &&
  (await realpath(process.argv[1]).catch(() => null)) ===
    (await realpath(fileURLToPath(import.meta.url)))
) {
  if (process.argv.length === 3 && process.argv[2] === '--snapshot')
    process.stdout.write(JSON.stringify(await translationSnapshot(), null, 2) + '\n');
  else if (process.argv.length === 2)
    process.stdout.write(
      `PASS: ${await checkTranslations()} translation pairs match reviewed bytes; semantic equivalence requires review.\n`,
    );
  else {
    process.stderr.write('Usage: node scripts/translations.mjs [--snapshot]\n');
    process.exitCode = 3;
  }
}

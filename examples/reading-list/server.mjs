import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, open, rename, mkdir, realpath, mkdtemp, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), 'public');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--port', '--data-dir'].includes(args[i]) || !args[i + 1]) {
    throw new Error(
      'Usage: node server.mjs [--port 0..65535] [--data-dir /tmp/isolated-directory]',
    );
  }
  options[args[i]] = args[i + 1];
}
const port = Number(options['--port'] ?? 0);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port.');
const tempRoot = await realpath(tmpdir());
// macOS exposes both a per-user temporary directory and /tmp.
const tempRoots = [tempRoot, await realpath('/tmp').catch(() => tempRoot)];
const isTemporary = (path, allowRoot = false) =>
  tempRoots.some((root) => (allowRoot && path === root) || path.startsWith(root + sep));
let dataDir;
if (options['--data-dir']) {
  const candidate = resolve(options['--data-dir']);
  // Resolve existing parents first, so a symlink cannot redirect writes out of temporary storage.
  const parent = await realpath(dirname(candidate));
  if (!isTemporary(parent, true)) {
    throw new Error('Data directory must be inside the system temporary directory.');
  }
  await mkdir(join(parent, candidate.split(sep).at(-1)), { mode: 0o700 }).catch((error) => {
    if (error.code !== 'EEXIST') throw error;
  });
  dataDir = await realpath(candidate);
} else {
  dataDir = await mkdtemp(join(tempRoot, 'reading-list-'));
}
if (!isTemporary(dataDir))
  throw new Error('Data directory must be an isolated temporary directory.');

const dataPath = join(dataDir, 'books.json');
const lockPath = join(dataDir, 'server.lock');
const lock = await open(lockPath, 'wx', 0o600).catch((error) => {
  if (error.code === 'EEXIST')
    throw new Error(
      `Data directory is locked: ${lockPath}. Stop its server first; see README for crash recovery.`,
    );
  throw error;
});
await lock.writeFile(String(process.pid));
let books = [];
try {
  const saved = JSON.parse(await readFile(dataPath, 'utf8'));
  if (
    !Array.isArray(saved) ||
    saved.some(
      (b) =>
        typeof b.id !== 'string' ||
        typeof b.title !== 'string' ||
        typeof b.author !== 'string' ||
        typeof b.read !== 'boolean',
    )
  ) {
    throw new Error('Invalid saved reading list.');
  }
  books = saved;
} catch (error) {
  if (error.code !== 'ENOENT') {
    await lock.close();
    await unlink(lockPath);
    throw new Error('Saved reading list could not be read; it was not overwritten.', {
      cause: error,
    });
  }
}

const identities = [
  { role: 'reader', token: randomBytes(24).toString('hex') },
  { role: 'librarian', token: randomBytes(24).toString('hex') },
];
function authenticate(req) {
  const supplied = req.headers.authorization?.match(/^Bearer ([a-f0-9]{48})$/)?.[1] ?? '';
  return identities.find(
    ({ token }) =>
      supplied.length === token.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(supplied)),
  )?.role;
}
const fail = (status, message) => Object.assign(new Error(message), { status });
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}
async function body(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw fail(415, 'Send JSON with Content-Type: application/json.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw fail(413, 'Request is too large.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch {
    throw fail(400, 'Enter a valid JSON object.');
  }
}
let pendingWrite = Promise.resolve();
function mutate(change) {
  const operation = pendingWrite.then(async () => {
    const { next, result } = change(books);
    if (next !== books) {
      const temporaryPath = join(dataDir, `books-${randomUUID()}.tmp`);
      let handle;
      try {
        handle = await open(temporaryPath, 'wx', 0o600);
        await handle.writeFile(JSON.stringify(next, null, 2) + '\n');
        await handle.sync();
        await handle.close();
        handle = undefined;
        await rename(temporaryPath, dataPath);
        books = next;
      } catch (error) {
        await handle?.close().catch(() => {});
        await unlink(temporaryPath).catch(() => {});
        console.error('Reading list save failed:', error.code ?? error.message);
        throw fail(500, 'Could not save the reading list. Your change was not saved.');
      }
    }
    return result;
  });
  pendingWrite = operation.catch(() => {});
  return operation;
}

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  try {
    const expectedHost = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== expectedHost)
      throw fail(403, 'Use the loopback URL shown at startup.');
    if (req.headers.origin && req.headers.origin !== `http://${expectedHost}`)
      throw fail(403, 'Cross-origin requests are not allowed.');
    const path = new URL(req.url, `http://${expectedHost}`).pathname;
    if (staticFiles.has(path) && req.method === 'GET') {
      const [file, contentType] = staticFiles.get(path);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(await readFile(join(publicDir, file)));
      return;
    }
    if (!path.startsWith('/api/')) throw fail(404, 'Not found.');
    const role = authenticate(req);
    if (!role) throw fail(401, 'A valid demo access code is required.');
    if (path === '/api/session' && req.method === 'GET') return json(res, 200, { role });
    if (path === '/api/books' && req.method === 'GET') return json(res, 200, { books });
    if (path === '/api/books' && req.method === 'POST') {
      const value = await body(req);
      if (Object.keys(value).some((key) => !['title', 'author'].includes(key)))
        throw fail(400, 'Only title and author may be submitted.');
      for (const field of ['title', 'author']) {
        if (
          typeof value[field] !== 'string' ||
          !value[field].trim() ||
          value[field].trim().length > 120
        ) {
          throw fail(
            400,
            `${field === 'title' ? 'Title' : 'Author'} must contain 1–120 characters.`,
          );
        }
      }
      const book = {
        id: randomUUID(),
        title: value.title.trim(),
        author: value.author.trim(),
        read: false,
      };
      await mutate((current) => ({ next: [...current, book], result: book }));
      return json(res, 201, { book });
    }
    const match = path.match(/^\/api\/books\/([a-f0-9-]+)\/read$/);
    if (match && req.method === 'PATCH') {
      if (role !== 'librarian')
        throw fail(403, 'Only the librarian can mark a recommendation as read.');
      const value = await body(req);
      if (Object.keys(value).length !== 1 || value.read !== true)
        throw fail(400, 'The supported action is {"read":true}.');
      const book = await mutate((current) => {
        const found = current.find((entry) => entry.id === match[1]);
        if (!found) throw fail(404, 'Recommendation not found.');
        const updated = { ...found, read: true };
        return {
          next: found.read
            ? current
            : current.map((entry) => (entry.id === found.id ? updated : entry)),
          result: updated,
        };
      });
      return json(res, 200, { book });
    }
    throw fail(404, 'Not found.');
  } catch (error) {
    if (!error.status) console.error('Request failed:', error.message);
    if (!res.headersSent)
      json(res, error.status ?? 500, {
        error: error.status ? error.message : 'The server could not complete this request.',
      });
    else res.end();
  }
});
server.requestTimeout = 10_000;
server.headersTimeout = 10_000;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  server.close(async () => {
    await pendingWrite;
    await lock.close();
    await unlink(lockPath);
  });
  server.closeIdleConnections();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.once('error', async (error) => {
  await lock.close();
  await unlink(lockPath);
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(
    JSON.stringify({
      url: `http://127.0.0.1:${server.address().port}`,
      dataDir,
      demoCodes: Object.fromEntries(identities.map(({ role, token }) => [role, token])),
    }),
  );
  console.log(
    'Local demo only. Paste a demo code into the browser. Codes rotate at each start. Stop: Ctrl+C.',
  );
});

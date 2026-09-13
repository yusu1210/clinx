// Heuristics for this project's public source/package, not a general secret scanner.
// Report rule IDs and filenames only; never echo potentially sensitive contents.
import { lstat, readFile } from 'node:fs/promises';

const contentRules = [
  ['private-host', /https?:\/\/[^\s/]*\.(?:corp|internal)\./i],
  ['local-home', new RegExp('/' + '(?:Users|home)/[^/\s]+/')],
  ['windows-home', /[A-Z]:\\Users\\[^\\\s]+\\/i],
  ['private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  [
    'access-token',
    /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,255}|npm_[A-Za-z0-9]{36}|AKIA[A-Z0-9]{16})\b/,
  ],
  ['registry-auth', /(?:_authToken|_password|_auth)\s*=\s*(?!\$\{)[A-Za-z0-9+/=_-]{12,}/],
];

export function releaseFindings(path, content) {
  const issues = [];
  const parts = path.replaceAll('\\', '/').split('/');
  if (parts.includes('.DS_Store')) issues.push('os-metadata');
  if (
    parts.some((p) =>
      ['.git', '.clinx', '.agents', 'node_modules', 'target', 'coverage'].includes(p),
    )
  )
    issues.push('private-or-generated-path');
  if (
    parts.some(
      (p) =>
        /^\.env(?:\.|$)/.test(p) ||
        /\.(?:pem|p12|pfx|key|tgz)$/.test(p) ||
        /^id_(?:rsa|ed25519)$/.test(p),
    )
  )
    issues.push('credential-or-archive-path');
  if (/\bclinx\/tasks\/[^/]+\/(?:checkpoints|revisions)\//.test(parts.join('/')))
    issues.push('task-history');
  if (/(?:^|\/)clinx\/install-backups\//.test(parts.join('/')) || parts[0] === 'artifacts')
    issues.push('private-release-or-install-backup');
  if (
    /(?:^|\/)clinx\/(?:installation\.json$|agent-entry\.md$|skills\/)/.test(parts.join('/')) &&
    parts.join('/') !== 'templates/workspace/clinx/agent-entry.md'
  )
    issues.push('local-skill-installation');
  for (const [id, pattern] of contentRules) if (pattern.test(content)) issues.push(id);
  return issues;
}

export async function assertPublicFile(path, label = path) {
  const info = await lstat(path);
  if (!info.isFile() || info.size > 8 * 1024 * 1024)
    throw new Error(`Unsupported public file: ${label}`);
  const content = await readFile(path, 'utf8');
  const issues = releaseFindings(label, content);
  if (issues.length)
    throw new Error(`Public-file review required: ${label} [${issues.join(', ')}]`);
  return content;
}

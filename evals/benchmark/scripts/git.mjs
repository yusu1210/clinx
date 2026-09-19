import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function initializeRepository(cwd, controlRoot) {
  const hooks = join(controlRoot, '.git-hooks');
  await mkdir(hooks, { recursive: true, mode: 0o700 });
  // Benchmark setup must not inherit a developer's repository redirection,
  // signing, hooks or global/system Git configuration.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
  );
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const git = (args) =>
    execFileSync('git', ['-c', `core.hooksPath=${hooks}`, '-c', 'commit.gpgSign=false', ...args], {
      cwd,
      env,
      stdio: 'pipe',
    });
  git(['init', '-q']);
  git(['config', 'user.name', 'clinx benchmark']);
  git(['config', 'user.email', 'benchmark@example.invalid']);
  git(['add', '.']);
  git(['commit', '-qm', 'benchmark baseline']);
}

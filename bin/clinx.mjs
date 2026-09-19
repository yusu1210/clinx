#!/usr/bin/env node
const args = process.argv.slice(2);
process.stdout.on('error', (error) => {
  // A consumer such as head may close its pipe after reading enough output.
  if (error.code === 'EPIPE') process.exit(0);
  process.exit(3);
});
const fail = (code, error, hint, causeCode) => {
  process.stderr.write(
    args.includes('--json')
      ? JSON.stringify({ code, error, hint, ...(causeCode ? { causeCode } : {}) }) + '\n'
      : `Error [${code}]: ${error}\n${causeCode ? `Cause: ${causeCode}\n` : ''}Next: ${hint}\n`,
  );
  process.exitCode = 3;
};
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 16)) {
  fail(
    'UNSUPPORTED_RUNTIME',
    'clinx requires Node.js 22.16 or newer.',
    'Use a supported Node.js runtime. This does not change the target project language.',
  );
} else {
  let main;
  try {
    ({ main } = await import('../dist/cli.js'));
    if (typeof main !== 'function') throw new TypeError('Missing CLI entrypoint');
  } catch (error) {
    // Publish known diagnostic codes only, never arbitrary messages, paths or stacks.
    const known = new Set([
      'EMFILE',
      'ENFILE',
      'EACCES',
      'EPERM',
      'ENOENT',
      'ERR_MODULE_NOT_FOUND',
      'MODULE_NOT_FOUND',
      'ERR_PACKAGE_PATH_NOT_EXPORTED',
      'ERR_UNKNOWN_FILE_EXTENSION',
    ]);
    const causeCode = known.has(error?.code)
      ? error.code
      : error instanceof SyntaxError
        ? 'SYNTAX_ERROR'
        : 'UNKNOWN';
    const exhausted = causeCode === 'EMFILE' || causeCode === 'ENFILE';
    fail(
      exhausted ? 'RESOURCE_LIMIT' : 'INSTALLATION_INCOMPLETE',
      'Cannot load the clinx CLI.',
      exhausted
        ? 'Check the process and system open-file limits and other open files, then retry with available capacity.'
        : 'Check the cause code and package access. Reinstall the reviewed package with its dependencies if incomplete. Contributors running a source checkout should run npm ci and npm run build.',
      causeCode,
    );
  }
  if (typeof main === 'function') {
    try {
      process.exitCode = await main(args);
    } catch {
      fail(
        'CLI_FAILED',
        'The clinx command failed unexpectedly.',
        'Inspect any effects before retrying. Report the command and runtime to the maintainer without private input contents.',
      );
    }
  }
}

#!/usr/bin/env node
const args = process.argv.slice(2);
process.stdout.on('error', (error) => {
  // A consumer such as head may close its pipe after reading enough output.
  if (error.code === 'EPIPE') process.exit(0);
  process.exit(3);
});
const fail = (code, error, hint) => {
  process.stderr.write(
    args.includes('--json')
      ? JSON.stringify({ code, error, hint }) + '\n'
      : `Error [${code}]: ${error}\nNext: ${hint}\n`,
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
  try {
    const { main } = await import('../dist/cli.js');
    process.exitCode = await main(args);
  } catch {
    fail(
      'INSTALLATION_INCOMPLETE',
      'Cannot load the clinx CLI.',
      'Reinstall the reviewed package with its dependencies. Contributors running a source checkout should run npm ci and npm run build.',
    );
  }
}

#!/usr/bin/env node
import { init } from '../src/init.js';

const args = process.argv.slice(2);
const help = `Usage: npx @kolyach/eslint-config init [--skip-install]

Connect ESLint and Prettier to an npm JavaScript/React project.
Run from the directory containing package.json.
Existing custom configs are never overwritten. Existing scripts are preserved.

  --skip-install  Create configs and scripts without installing dependencies
  --help, -h      Show help
  --version, -v   Show version`;

try {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(help);
  } else if (args.length === 1 && ['--version', '-v'].includes(args[0])) {
    const { readFile } = await import('node:fs/promises');
    const pkg = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    console.log(pkg.version);
  } else if (
    args[0] === 'init' &&
    args.slice(1).every((arg) => arg === '--skip-install')
  ) {
    await init(process.cwd(), { skipInstall: args.includes('--skip-install') });
  } else {
    throw new Error(help);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

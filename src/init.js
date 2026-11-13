import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ownPackage = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);

export const eslintConfig = `import config from '@kolyach/eslint-config';

export default config;
`;
export const prettierConfig = '"@kolyach/eslint-config/prettier"\n';

const scripts = {
  lint: 'eslint .',
  'lint:fix': 'eslint . --fix',
  format: 'prettier --write .',
  'format:check': 'prettier --check .',
};

const isConfig = (name) =>
  /^eslint\.config\./u.test(name) ||
  /^\.eslintrc(?:\.|$)/u.test(name) ||
  /^\.prettierrc(?:\.|$)/u.test(name) ||
  /^prettier\.config\./u.test(name);

async function checkConfigs(cwd, pkg) {
  if ('eslintConfig' in pkg || 'prettier' in pkg) {
    throw new Error(
      'Existing config in package.json. Migrate it manually first.',
    );
  }
  for (const name of (await readdir(cwd)).filter(isConfig)) {
    const expected = {
      'eslint.config.mjs': eslintConfig,
      '.prettierrc.json': prettierConfig,
    }[name];
    if (
      !expected ||
      (await readFile(path.join(cwd, name), 'utf8')).replaceAll(
        '\r\n',
        '\n',
      ) !== expected
    ) {
      throw new Error(`Existing config: ${name}. Migrate it manually first.`);
    }
  }
}

function npmCommand(args) {
  const npmCli = process.env.npm_execpath;
  if (npmCli && path.basename(npmCli) === 'npm-cli.js') {
    return [process.execPath, [npmCli, ...args]];
  }
  if (process.platform === 'win32') {
    const quotedArgs = args.map((arg) => `"${arg}"`).join(' ');
    return [
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', `npm ${quotedArgs}`],
    ];
  }
  return ['npm', args];
}

function install(cwd) {
  const args = [
    'install',
    '--save-dev',
    `${ownPackage.name}@${ownPackage.version}`,
    ...Object.entries(ownPackage.peerDependencies).map(
      ([name, version]) => `${name}@${version}`,
    ),
  ];
  const [command, commandArgs] = npmCommand(args);
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error(
      'npm install failed. Configs and scripts were not written. Check npm output and retry.',
    );
  }
}

function addScripts(pkg, log) {
  pkg.scripts ??= {};
  for (const [name, command] of Object.entries(scripts)) {
    if (name in pkg.scripts && pkg.scripts[name] !== command) {
      log(`Keeping existing script: ${name}`);
    } else {
      pkg.scripts[name] = command;
    }
  }
}

export async function init(
  cwd,
  { skipInstall = false, runInstall = install, log = console.log } = {},
) {
  const packagePath = path.join(cwd, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  } catch {
    throw new Error('Run init in a project with a valid package.json.');
  }
  await checkConfigs(cwd, pkg);
  if (!skipInstall) {
    await runInstall(cwd);
    // npm updates dependency fields; retain those changes.
    pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  }
  addScripts(pkg, log);
  await writeFile(path.join(cwd, 'eslint.config.mjs'), eslintConfig);
  await writeFile(path.join(cwd, '.prettierrc.json'), prettierConfig);
  await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  log(
    'ESLint and Prettier configured. Run npm run lint and npm run format:check.',
  );
  if (skipInstall) {
    log(
      `Dependencies were not installed. Run: npm install -D ${ownPackage.name}@${ownPackage.version} ${Object.entries(
        ownPackage.peerDependencies,
      )
        .map(([name, version]) => `${name}@"${version}"`)
        .join(' ')}`,
    );
  }
}

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ESLint } from 'eslint';
import prettier from 'prettier';
import config from '../index.js';
import { init, eslintConfig, prettierConfig } from '../src/init.js';

const quiet = () => {};
const fixture = async (t, pkg = {}) => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'kolyach-eslint-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(path.join(cwd, 'package.json'), JSON.stringify(pkg));
  return cwd;
};

test('init supports ESM and CommonJS projects and is repeatable', async (t) => {
  for (const type of ['module', 'commonjs']) {
    const cwd = await fixture(t, { type, scripts: { build: 'vite build' } });
    await init(cwd, { skipInstall: true, log: quiet });
    const before = await readFile(path.join(cwd, 'package.json'), 'utf8');
    await init(cwd, { skipInstall: true, log: quiet });
    assert.equal(
      await readFile(path.join(cwd, 'package.json'), 'utf8'),
      before,
    );
    const pkg = JSON.parse(before);
    assert.equal(pkg.type, type);
    assert.equal(pkg.scripts.build, 'vite build');
    assert.equal(pkg.scripts.lint, 'eslint .');
    assert.equal(pkg.scripts['lint:fix'], 'eslint . --fix');
    assert.equal(pkg.scripts.format, 'prettier --write .');
    assert.equal(pkg.scripts['format:check'], 'prettier --check .');
    assert.equal(
      await readFile(path.join(cwd, 'eslint.config.mjs'), 'utf8'),
      eslintConfig,
    );
    assert.equal(
      await readFile(path.join(cwd, '.prettierrc.json'), 'utf8'),
      prettierConfig,
    );
  }
});

test('preserves existing scripts and npm dependency changes', async (t) => {
  const cwd = await fixture(t, { scripts: { lint: 'custom-lint' } });
  let called = false;
  await init(cwd, {
    log: quiet,
    runInstall: async (directory) => {
      called = true;
      assert.equal(directory, cwd);
      const pkgPath = path.join(cwd, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      pkg.devDependencies = { eslint: '^9.37.0' };
      await writeFile(pkgPath, JSON.stringify(pkg));
    },
  });
  const pkg = JSON.parse(
    await readFile(path.join(cwd, 'package.json'), 'utf8'),
  );
  assert.equal(called, true);
  assert.equal(pkg.scripts.lint, 'custom-lint');
  assert.equal(pkg.devDependencies.eslint, '^9.37.0');
});

test('refuses existing configs before installing or writing', async (t) => {
  for (const name of [
    'eslint.config.js',
    'eslint.config.mjs',
    '.eslintrc.json',
    '.prettierrc.json',
    'prettier.config.cjs',
  ]) {
    const cwd = await fixture(t);
    await writeFile(path.join(cwd, name), 'custom config');
    await assert.rejects(
      init(cwd, { runInstall: () => assert.fail('must not install') }),
      /Existing config/u,
    );
    assert.equal(await readFile(path.join(cwd, name), 'utf8'), 'custom config');
    assert.equal(await readFile(path.join(cwd, 'package.json'), 'utf8'), '{}');
  }
  for (const pkg of [{ prettier: {} }, { eslintConfig: {} }]) {
    const cwd = await fixture(t, pkg);
    await assert.rejects(init(cwd), /Existing config in package.json/u);
  }
});

test('failed install does not create configs or modify scripts', async (t) => {
  const cwd = await fixture(t);
  await assert.rejects(
    init(cwd, {
      runInstall: () => {
        throw new Error('install failed');
      },
    }),
    /install failed/u,
  );
  await assert.rejects(readFile(path.join(cwd, 'eslint.config.mjs')), {
    code: 'ENOENT',
  });
  assert.equal(await readFile(path.join(cwd, 'package.json'), 'utf8'), '{}');
});

test('missing or invalid package.json is rejected', async (t) => {
  const cwd = await fixture(t);
  await writeFile(path.join(cwd, 'package.json'), 'invalid');
  await assert.rejects(init(cwd), /valid package.json/u);
  await rm(path.join(cwd, 'package.json'));
  await assert.rejects(init(cwd), /valid package.json/u);
});

test('CLI exposes help/version and rejects unknown arguments', () => {
  const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args]);
  assert.match(run('--help').stdout.toString(), /Usage:/u);
  assert.equal(run('--version').stdout.toString().trim(), '0.1.0');
  assert.equal(run('init', '--unknown').status, 1);
});

test('exported config lints JSX and enforces the original rules', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: config,
  });
  const [result] = await eslint.lintText(
    'const App = () => <img src="test.png" />;\nexport default App;\n',
    { filePath: 'fixture.jsx' },
  );
  assert.ok(
    result.messages.some((message) => message.ruleId === 'jsx-a11y/alt-text'),
  );
  const resolved = await eslint.calculateConfigForFile('fixture.jsx');
  assert.deepEqual(resolved.rules.complexity, [2, 10]);
  assert.deepEqual(resolved.rules['max-depth'], [2, 3]);
  assert.deepEqual(resolved.rules['react/prop-types'], [0]);
  assert.equal(await eslint.isPathIgnored('legacy/file.js'), true);
});

test('Prettier resolves the package export', async () => {
  const options = await prettier.resolveConfig(
    fileURLToPath(new URL('../index.js', import.meta.url)),
  );
  assert.deepEqual(options, { singleQuote: true, jsxSingleQuote: false });
  assert.equal(
    await prettier.format('const x = "hello"', { ...options, parser: 'babel' }),
    `const x = 'hello';\n`,
  );
});

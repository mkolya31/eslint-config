# @kolyach/eslint-config

Личный ESLint flat config и конфиг Prettier Максима Коляченко.
Первая версия поддерживает JavaScript/JSX и React, npm, Node.js >= 20.19,
ESLint 9 и Prettier 3. TypeScript требует отдельного конфига и парсера.

## Быстрое подключение

После публикации пакета запустите в каталоге проекта с `package.json`:

```sh
npx @kolyach/eslint-config init
```

Команда устанавливает в `devDependencies` сам пакет, ESLint, Prettier и TypeScript 5,
создаёт `eslint.config.mjs` и `.prettierrc.json`, добавляет скрипты:npm

```sh
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

`eslint.config.mjs` работает как в ESM, так и в CommonJS-проекте.
Существующие скрипты сохраняются с сообщением в консоли. Если конфиги уже
существуют, команда прекращает работу до установки: перенесите свои настройки
вручную. Повторный запуск с созданными командой конфигами допустим.
Для создания файлов без установки используйте `init --skip-install`;
команда напечатает инструкцию по установке зависимостей.
Инициализатор использует npm; для других менеджеров подключайте пакет вручную.

## Ручное подключение

```sh
npm install -D @kolyach/eslint-config eslint@^9.37.0 prettier@^3.6.2 typescript@^5.9.3
```

`eslint.config.mjs`:

```js
import config from '@kolyach/eslint-config';

export default [
  ...config,
  {
    rules: {
      // Переопределения для конкретного проекта.
    },
  },
];
```

`.prettierrc.json`:

```json
"@kolyach/eslint-config/prettier"
```

Для расширения Prettier используйте `prettier.config.mjs` вместо JSON:

```js
import config from '@kolyach/eslint-config/prettier' with { type: 'json' };

export default { ...config, printWidth: 100 };
```

Правила ESLint и порядок пресетов перенесены из `pod-kirpich` без изменений:
recommended JS, React, React Hooks, JSX accessibility, SonarJS и
eslint-config-prettier, затем личные правила. Сохраняются исключения
`legacy/**`, `mockups/**`, `node_modules/**`, `output/**`, browser/node globals,
ограничения сложности и размера файлов. React определяется автоматически.
Настройки Prettier: `singleQuote: true`, `jsxSingleQuote: false`.
TypeScript 5 нужен для работы SonarJS 4.2.2, даже при проверке JavaScript.
Версия ограничена через peer dependency; SonarJS 4.2.2 поддерживает TypeScript >=5 <6.1.0.
Обновление зависимости `@kolyach/eslint-config` обновляет общие настройки.

## Разработка и проверка до публикации

```sh
npm ci
npm test
npm run lint
npm run format:check
npm pack --dry-run
```

Для локальной проверки выполните `npm pack`, затем в тестовом проекте:

```sh
npm install -D /absolute/path/kolyach-eslint-config-0.1.0.tgz
npx kolyach-eslint-config init --skip-install
npm run lint
npm run format:check
```

ESLint и Prettier устанавливаются npm как peer dependencies. При необходимости
их можно установить явно командой из раздела ручного подключения.

## Публикация

```sh
npm login
npm publish --access public
```

Нужны права публикации в scope `@kolyach`. Перед публикацией автоматически
выполняются lint, проверка форматирования и тесты. Пакет не содержит исходников
или файлов проекта `pod-kirpich`, кроме перенесённых настроек.

## Проверка версии перед релизом

Workflow `.github/workflows/version-check.yml` проверяет PR в `production`:
версия в `package.json` должна отличаться от версии в текущей ветке `production`.
При совпадении проверка `Version differs from production` завершается ошибкой.
Перед слиянием обновите версию и lockfile, например:

```sh
npm version patch --no-git-tag-version
```

Чтобы ошибка блокировала слияние, добавьте `Version differs from production`
в обязательные status checks правила защиты ветки `production` на GitHub.
Проверка сравнивает версии на различие; порядок версий и наличие версии в npm
она не проверяет. Прямой push в `production` этот PR workflow не запускает.

Справка: [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files),
[Prettier shared config](https://prettier.io/docs/sharing-configurations),
[npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/).

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

export default [
  {
    ignores: ['legacy/**', 'mockups/**', 'node_modules/**', 'output/**'],
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  sonarjs.configs.recommended,
  prettier,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      'no-nested-ternary': 'error',
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      'jsx-quotes': ['error', 'prefer-double'],
      'react/jsx-no-bind': [
        'error',
        { allowArrowFunctions: false, allowBind: false, allowFunctions: true },
      ],
      'react/prop-types': 'off',
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'prefer-arrow-callback': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },
];

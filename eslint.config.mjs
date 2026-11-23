import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Escrita de HTML por texto abre caminho para XSS e vazamento de dados: use DOM ou JSX. */
const noHtmlStrings = [
  {
    property: 'innerHTML',
    message: 'Evite innerHTML. Use JSX/React ou createElement + textContent.',
  },
  {
    property: 'outerHTML',
    message: 'Evite outerHTML. Use JSX/React ou createElement + textContent.',
  },
  { property: 'insertAdjacentHTML', message: 'Evite insertAdjacentHTML. Use JSX/React ou DOM.' },
  { object: 'document', property: 'write', message: 'Não use document.write.' },
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'frontend/public/**'] },
  {
    files: ['frontend/src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ClyrivaPushTest: 'readonly' },
    },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'error',
        { args: 'after-used', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/no-danger': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-restricted-properties': ['error', ...noHtmlStrings],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'after-used', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },
);

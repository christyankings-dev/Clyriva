import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['frontend/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ClyrivaPushTest: 'readonly' },
    },
    plugins: { react, 'react-hooks': hooks },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'error',
        { args: 'after-used', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];

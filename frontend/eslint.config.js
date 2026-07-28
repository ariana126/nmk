// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    // The orval-generated API client. `ng lint` sees src/**/*.ts, src/**/*.html and a11y/**/*.ts
    // (angular.json's lintFilePatterns), and there is nothing to fix in code no one hand-edits.
    ignores: ['src/app/api/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // templateAccessibility covers ARIA validity, labels and alternative text, but not
      // these two. They are the statically checkable slice of focus management: a positive
      // tabindex pulls an element out of DOM order and wrecks the tab sequence, and a button
      // with no type silently submits the form around it. The rest of focus management —
      // focus moved and returned, trapped in a modal, visibly indicated — is a review item;
      // see the accessibility section of CLAUDE.md.
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/button-has-type': 'error',
    },
  },
]);

// @ts-check
import eslint from '@eslint/js';
import nestjsTyped from '@darraghor/eslint-plugin-nestjs-typed';
import eslintPluginJest from 'eslint-plugin-jest';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginSecurity from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  nestjsTyped.configs.flatRecommended,
  eslintPluginUnicorn.configs.recommended,
  eslintPluginSecurity.configs.recommended,
  // Test-quality rules apply only to the co-located unit tests.
  {
    ...eslintPluginJest.configs['flat/recommended'],
    files: ['**/*.spec.ts'],
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      // The rule fires on any identifier containing "password" that is assigned a string
      // literal, which is exactly what a spec covering password handling is made of: fake
      // hashes (`hashed-original-password`), fake digests, and the `passwordResetToken` /
      // `passwordReset*` keys asserted against the persistence record. That last group cannot
      // be renamed away — they are Prisma column names, not variables the test chose. None of
      // the hits is a real credential, and no spec ships. Scoped to `**/*.spec.ts` on purpose:
      // a hardcoded password in production code is still an error.
      'sonarjs/no-hardcoded-passwords': 'off',
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
    },
  },
  // Prettier last so eslint-config-prettier can switch off stylistic conflicts.
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // unused-imports owns unused-symbol reporting; keep the TS rule off to avoid duplicates.
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'sonarjs/todo-tag': 'off',
      // House style: domain/DTO abbreviations (dto, repo, vo, props) are intentional.
      'unicorn/prevent-abbreviations': 'off',
      // Prisma and class-validator model absence with `null`.
      'unicorn/no-null': 'off',
      // Output is CommonJS (no `"type": "module"`, tsconfig `module: nodenext`), where
      // top-level await is unavailable; `void bootstrap()` is the NestJS entrypoint idiom.
      'unicorn/prefer-top-level-await': 'off',
      // Near-zero signal on this codebase; property access is not attacker-controlled.
      'security/detect-object-injection': 'off',
      // Providers are registered through barrel spreads (`...Controllers`,
      // `...CommandHandlers`) and the `{ provide: Token, useClass: Impl }` DI pattern — the
      // module's canonical convention — neither of which this rule can follow, so it only
      // yields false positives here. Real wiring gaps surface at boot / in acceptance tests.
      '@darraghor/nestjs-typed/injectable-should-be-provided': 'off',
      // Swagger response-doc completeness is a separate, opt-in initiative — not a
      // correctness concern that should block linting.
      '@darraghor/nestjs-typed/api-method-should-specify-api-response': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);

import { FlatCompat } from '@eslint/eslintrc';
import security from 'eslint-plugin-security';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

// Next.js's recommended rules (React hooks, accessibility basics, <img>/<a> misuse) plus the security plugin's rules that
// can actually find bugs in an app like this (eval, child_process, unsafe fs paths, buffer misuse, timing-unsafe compares).
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'drizzle/**', 'e2e/**', 'scripts/**', 'public/**', 'next-env.d.ts', 'next.config.js', 'src/lib/security-headers.js'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  security.configs.recommended,
  {
    rules: {
      // Object keys here come from typed unions and Drizzle columns, not request data, so this rule is almost all noise.
      'security/detect-object-injection': 'off',
      // This rule only pattern-matches nested quantifiers and cannot tell a delimited, linear pattern from a backtracking one. Every
      // regex that handles user-controlled text is instead benchmarked against adversarial input in tests/regex-safety.test.ts
      // (that is how the quadratic Markdown table-separator and SVG-prolog patterns were found and fixed).
      'security/detect-unsafe-regex': 'off',
      // `_name` marks an intentionally unused destructured field (used to drop a key from an object).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
];

export default config;

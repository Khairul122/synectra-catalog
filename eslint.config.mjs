import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/.dev/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
      'graphify-out/**',
      '*.py',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);

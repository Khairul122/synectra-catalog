import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { build } from 'esbuild';

await build({
  absWorkingDir: process.cwd(),
  entryPoints: ['src/server-entry.ts'],
  outfile: '.dev/server.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: 'inline',
  plugins: [
    {
      name: 'tsconfig-paths',
      setup(buildContext) {
        buildContext.onResolve({ filter: /^@\// }, (args) => {
          const basePath = path.resolve(process.cwd(), 'src', args.path.slice(2));
          const filePath = `${basePath}.ts`;
          return { path: fs.existsSync(filePath) ? filePath : path.join(basePath, 'index.ts') };
        });
      },
    },
  ],
});

await import('../.dev/server.mjs');

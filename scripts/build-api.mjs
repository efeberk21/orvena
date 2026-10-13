import { build } from 'esbuild';
// Bundle CJS/ESM dependencies together: the Vercel loader cannot require ESM
// transitive dependencies even though standard Node 24 can.
await build({
  entryPoints: ['apps/relayer/src/vercel.ts'],
  outfile: 'apps/relayer/dist/vercel.bundle.mjs',
  bundle: true, platform: 'node', format: 'esm', target: 'node24',
  banner: { js: "import { createRequire as orvenaCreateRequire } from 'node:module'; const require = orvenaCreateRequire(import.meta.url);" },
  logLevel: 'warning'
});

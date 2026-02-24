import { build } from 'esbuild';

const entryPoints = [
  'src/background.ts',
  'src/content.ts',
  'src/popup/popup.ts',
  'src/options/options.ts',
  'src/release-notes/release-notes.ts',
];

await build({
  entryPoints,
  bundle: true,
  outdir: 'dist',
  outbase: 'src',
  target: 'firefox78',
  format: 'iife',
  sourcemap: false,
  logLevel: 'info',
  loader: { '.md': 'text' },
});

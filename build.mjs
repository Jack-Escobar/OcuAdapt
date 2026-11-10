// Empaqueta extensión (dist/) y página de prueba (dist/test-harness/ y test-harness/).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/popup', { recursive: true });
mkdirSync('dist/fonts', { recursive: true });
mkdirSync('dist/colortest', { recursive: true });
mkdirSync('dist/widget', { recursive: true });
mkdirSync('dist/test-harness', { recursive: true });

const common = { bundle: true, target: 'chrome110', sourcemap: false, logLevel: 'info', legalComments: 'none' };

await build({
  ...common,
  entryPoints: {
    background: 'src/extension/background.ts',
    content: 'src/extension/content.ts',
    'popup/popup': 'src/extension/popup/popup.ts',
    'colortest/colortest': 'src/extension/colortest/colortest.ts',
  },
  outdir: 'dist',
  format: 'iife',
});

await build({ ...common, entryPoints: { 'ocuadapt-widget': 'src/widget/index.ts' }, outdir: 'dist/widget', format: 'iife', minify: true });

await build({
  ...common,
  entryPoints: { harness: 'test-harness/harness.ts' },
  outdir: 'dist/test-harness',
  format: 'iife',
});

cpSync('src/extension/manifest.json', 'dist/manifest.json');
cpSync('src/extension/popup/popup.html', 'dist/popup/popup.html');
cpSync('src/extension/popup/popup.css', 'dist/popup/popup.css');
cpSync('src/extension/colortest/colortest.html', 'dist/colortest/colortest.html');
cpSync('src/extension/colortest/colortest.css', 'dist/colortest/colortest.css');
cpSync('test-harness/widget-demo.html', 'dist/test-harness/widget-demo.html');
cpSync('test-harness/index.html', 'dist/test-harness/index.html');
cpSync('test-harness/harness.css', 'dist/test-harness/harness.css');
cpSync('dist/test-harness/harness.js', 'test-harness/harness.js');

// Fuentes empaquetadas localmente (SIL OFL); sin CDN.
const fonts = [
  ['@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible-latin-400-normal.woff2'],
  ['@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible-latin-700-normal.woff2'],
  ['@fontsource/inter', 'inter-latin-400-normal.woff2'],
  ['@fontsource/inter', 'inter-latin-700-normal.woff2'],
];
for (const [pkg, file] of fonts) {
  const src = `node_modules/${pkg}/files/${file}`;
  if (!existsSync(src)) throw new Error(`Falta la fuente ${src}`);
  cpSync(src, `dist/fonts/${file}`);
  cpSync(src, `dist/test-harness/${file}`);
  cpSync(src, `dist/widget/${file}`);
  cpSync(src, `test-harness/${file}`);
}
console.log('OK → dist/');

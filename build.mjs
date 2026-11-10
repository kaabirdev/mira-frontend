import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagesDir = path.join(root, 'src', 'pages');
const partialsDir = path.join(root, 'src', 'partials');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function readPartial(name) {
  const file = path.join(partialsDir, name.replace(/^partials[\\/]/, ''));
  if (!fs.existsSync(file)) throw new Error(`Missing partial: ${name}`);
  return fs.readFileSync(file, 'utf8');
}

let pageCount = 0;

for (const file of walk(pagesDir)) {
  if (!file.endsWith('.html')) continue;

  const rel = path.relative(pagesDir, file);
  const depth = rel.split(path.sep).length - 1;
  const base = '../'.repeat(depth);

  let html = fs.readFileSync(file, 'utf8');

  const title = (html.match(/<!--\s*@title\s+([\s\S]*?)\s*-->/) || [, 'Mira — Push Notification Infrastructure'])[1];
  const desc = (html.match(/<!--\s*@desc\s+([\s\S]*?)\s*-->/) || [, 'Mira is push notification infrastructure for web, Android and iOS by LazyTown.']) [1];

  html = html.replace(/<!--\s*@title[\s\S]*?-->\s*/, '').replace(/<!--\s*@desc[\s\S]*?-->\s*/, '');

  html = html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, name) => readPartial(name));

  html = html
    .replaceAll('%BASE%', base)
    .replaceAll('%TITLE%', title)
    .replaceAll('%DESC%', desc);

  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  pageCount++;
}

// Copy JS
const jsSrc = path.join(root, 'src', 'js');
const jsOut = path.join(root, 'assets', 'js');
fs.mkdirSync(jsOut, { recursive: true });
for (const file of walk(jsSrc)) {
  if (!file.endsWith('.js')) continue;
  const dest = path.join(jsOut, path.relative(jsSrc, file));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}

// Copy vendor libraries
const vendor = [
  ['node_modules/alpinejs/dist/cdn.min.js', 'assets/vendor/alpine.min.js'],
  ['node_modules/chart.js/dist/chart.umd.js', 'assets/vendor/chart.umd.js'],
  ['node_modules/lucide/dist/umd/lucide.min.js', 'assets/vendor/lucide.min.js'],
];
for (const [src, dest] of vendor) {
  fs.mkdirSync(path.dirname(path.join(root, dest)), { recursive: true });
  fs.copyFileSync(path.join(root, src), path.join(root, dest));
}

// Copy static assets
const staticAssets = [['src/assets/favicon.svg', 'assets/favicon.svg']];
for (const [src, dest] of staticAssets) {
  fs.mkdirSync(path.dirname(path.join(root, dest)), { recursive: true });
  fs.copyFileSync(path.join(root, src), path.join(root, dest));
}

// Copy fonts (latin subsets only)
const fonts = [
  ['node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2', 'plus-jakarta-sans-latin.woff2'],
  ['node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-italic.woff2', 'plus-jakarta-sans-latin-italic.woff2'],
  ['node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'jetbrains-mono-latin.woff2'],
];
fs.mkdirSync(path.join(root, 'assets', 'fonts'), { recursive: true });
for (const [src, dest] of fonts) {
  fs.copyFileSync(path.join(root, src), path.join(root, 'assets', 'fonts', dest));
}

console.log(`Built ${pageCount} pages.`);

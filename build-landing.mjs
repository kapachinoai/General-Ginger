// Builds landing/index.html (a normal web page for Cloudflare Pages) from landing/page.html.
// Run after editing the page:  node build-landing.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('./landing/page.html', import.meta.url), 'utf8')
  .replace('/*I18N*/', () => readFileSync(new URL('./landing/i18n.js', import.meta.url), 'utf8').trim()); // translations
const cut = src.indexOf('</style>') + '</style>'.length;      // title, meta, fonts and styles go in <head>
const head = src.slice(0, cut), body = src.slice(cut);
writeFileSync(new URL('./landing/index.html', import.meta.url),
`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body.trim()}
</body>
</html>
`);
console.log('Built landing/index.html');

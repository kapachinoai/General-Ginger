// Copies sim.js into general-ginger-flight.html so the game stays one file.
// Run after editing sim.js:  node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('./general-ginger-flight.html', import.meta.url);
const html = readFileSync(file, 'utf8');
const sim = readFileSync(new URL('./sim.js', import.meta.url), 'utf8');
const start = '// <GGSIM>', end = '// </GGSIM>';
const a = html.indexOf(start), b = html.indexOf(end);
if (a < 0 || b < 0) throw new Error('GGSIM markers not found in the HTML');
writeFileSync(file, html.slice(0, a + start.length) + '\n' + sim + '\n' + html.slice(b));
console.log('Inlined sim.js into general-ginger-flight.html');

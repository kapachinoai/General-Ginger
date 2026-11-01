// Builds everything you upload to Cloudflare:
//   site/                 -> drag into Cloudflare Pages (landing page at /, game at /play/)
//   dist/worker-bundle.js -> paste into the Cloudflare Worker editor (one file, no tools needed)
// Put your Worker address in site.config.json first, then run:  node build-site.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
const here = p => new URL(p, import.meta.url);
const cfg = JSON.parse(readFileSync(here('./site.config.json'), 'utf8'));
const clean = v => String(v || '').trim().replace(/'/g, '');
const API = clean(cfg.api).replace(/\/+$/, '');
const SB_URL = clean(cfg.supabaseUrl).replace(/\/+$/, '');
const SB_KEY = clean(cfg.supabaseAnonKey);

execSync('node build.mjs', { cwd: here('.'), stdio: 'inherit' });
execSync('node build-landing.mjs', { cwd: here('.'), stdio: 'inherit' });

rmSync(here('./site'), { recursive: true, force: true });
mkdirSync(here('./site/play'), { recursive: true });
const landing = readFileSync(here('./landing/index.html'), 'utf8').replace("const WAITLIST_API = '';", `const WAITLIST_API = '${API}';`);
const game = readFileSync(here('./general-ginger-flight.html'), 'utf8').replace("const GG_API = '';", `const GG_API = '${API}';`)
  .replace("const SUPABASE_URL = '';", `const SUPABASE_URL = '${SB_URL}';`)
  .replace("const SUPABASE_ANON_KEY = '';", `const SUPABASE_ANON_KEY = '${SB_KEY}';`);
writeFileSync(here('./site/index.html'), landing);
copyFileSync(here('./landing/king.webp'), here('./site/king.webp'));
writeFileSync(here('./site/play/index.html'), game);

mkdirSync(here('./dist'), { recursive: true });
const sim = readFileSync(here('./sim.js'), 'utf8');
const worker = readFileSync(here('./worker.js'), 'utf8').replace("import './sim.js';", '').replace('const GGSim = globalThis.GGSim;', '');
writeFileSync(here('./dist/worker-bundle.js'), `// General Ginger Worker: one file, ready to paste into the Cloudflare editor.\n// Built by build-site.mjs from sim.js + worker.js. Do not edit here.\n${sim}\n${worker}`);
console.log(API ? `Built site/ and dist/worker-bundle.js using API ${API}` : 'Built site/ and dist/worker-bundle.js (no API set: game runs in practice mode, waitlist shows a preview message)');

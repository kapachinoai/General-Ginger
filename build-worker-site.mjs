// Builds ONE Cloudflare Worker that serves the landing page (/), the game (/play/)
// and the game server (POST /session, /submit, /waitlist, /me, /profile).
//   node build-worker-site.mjs https://general-ginger.yourname.workers.dev
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
const here = p => new URL(p, import.meta.url);
const origin = (process.argv[2] || '').replace(/\/+$/, '');
if (!origin) throw new Error('Pass the Worker address, e.g. node build-worker-site.mjs https://general-ginger.yourname.workers.dev');
const cfg = JSON.parse(readFileSync(here('./site.config.json'), 'utf8'));
writeFileSync(here('./site.config.json'), JSON.stringify({ ...cfg, api: origin }, null, 2) + '\n');
execSync('node build-site.mjs', { cwd: here('.'), stdio: 'inherit' });

const kingPath = process.argv[3] || './landing/king.webp';
const assets = {
  '/': { type: 'text/html; charset=utf-8', body: readFileSync(here('./site/index.html'), 'utf8') },
  '/play/': { type: 'text/html; charset=utf-8', body: readFileSync(here('./site/play/index.html'), 'utf8') },
  '/king.webp': { type: 'image/webp', b64: readFileSync(kingPath).toString('base64') }
};
const worker = readFileSync(here('./dist/worker-bundle.js'), 'utf8').replace('export default {', 'const api = {');
const out = `${worker}
// ---------- Website (landing page + game) ----------
const SITE = ${JSON.stringify(assets)};
function serveAsset(path) {
  if (path === '/play' || path === '/play/index.html') path = '/play/';
  if (path === '/index.html') path = '/';
  const a = SITE[path];
  if (!a) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  const body = a.b64 ? Uint8Array.from(atob(a.b64), c => c.charCodeAt(0)) : a.body;
  return new Response(body, { headers: {
    'Content-Type': a.type,
    'Cache-Control': a.b64 ? 'public, max-age=604800' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  } });
}
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'GET' || request.method === 'HEAD') return serveAsset(new URL(request.url).pathname);
    return api.fetch(request, env, ctx);
  }
};
`;
mkdirSync(here('./dist'), { recursive: true });
writeFileSync(here('./dist/general-ginger-worker.js'), out);
console.log(`Built dist/general-ginger-worker.js (${(out.length / 1024).toFixed(0)} KB) for ${origin}`);

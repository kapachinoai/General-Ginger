/*
 * General Ginger Flight — score verification Worker (Cloudflare Workers).
 *
 *   POST /session  -> { sessionId, seed }       issue a one-time game seed
 *   POST /submit   -> { verified, score, points, reason? }
 *        body: { sessionId, ticks, score, digest, log }
 *
 * The Worker replays the input log with the same sim.js the phone uses.
 * Points are only accepted when its replay gives exactly the phone's score.
 *
 *   POST /me       -> { signedIn, tag, total, today, dailyCap }  (needs sign-in)
 *   POST /profile  -> { ok, tag }  body: { tag }                  (needs sign-in)
 *   POST /login    -> { ok, access_token, refresh_token }  body: { tag, password }
 *   POST /waitlist -> see below (no sign-in)
 *   GET  /music    -> the game's soundtrack MP3 (KV key asset:music)
 *
 * Needs a KV namespace bound as SESSIONS (see wrangler.toml).
 * Sign-in and saved points use Supabase. Set these in the Worker's settings:
 *   SUPABASE_URL          e.g. https://abcd.supabase.co      (variable)
 *   SUPABASE_ANON_KEY     the project's public anon key         (variable)
 *   SUPABASE_SERVICE_KEY  the project's service_role key         (SECRET, never in the game)
 *   DAILY_POINTS_CAP      optional, default 1500                 (variable)
 *   ALLOWED_ORIGIN        your site's address, e.g. https://generalginger.pages.dev
 * Without SUPABASE_URL the Worker runs in test mode: everyone is "guest"
 * and points are only logged in KV.
 */
import './sim.js';
const GGSim = globalThis.GGSim;

const SESSION_TTL_SECONDS = 60 * 60; // a seed must be used within an hour
const MIN_REALTIME_RATIO = 0.9;      // a game can't be finished faster than real time

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    // GET /music -> the game's soundtrack (stored in KV as "asset:music")
    if (request.method === 'GET' && new URL(request.url).pathname === '/music') {
      const audio = await env.SESSIONS.get('asset:music', 'arrayBuffer');
      if (!audio) return json({ error: 'no music' }, 404);
      return new Response(audio, { headers: { ...cors, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=604800' } });
    }
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
    const path = new URL(request.url).pathname;

    if (path === '/waitlist') return waitlist(request, env, json);
    if (path === '/login') return login(request, env, json);
    if (path === '/stats') return stats(env, json);

    try {
      const user = await requireUser(request, env);

      if (path === '/me') {
        if (!supabaseOn(env)) return json({ signedIn: false });
        const prof = await getProfile(env, user);
        const today = await pointsToday(env, user);
        return json({ signedIn: true, tag: prof ? prof.tag : null, total: prof ? prof.total_points : 0, today, dailyCap: dailyCap(env) });
      }

      if (path === '/profile') {
        if (!supabaseOn(env)) return json({ ok: false, reason: 'Sign-in is not set up yet.' }, 400);
        const body = await request.json().catch(() => ({}));
        const tag = String(body.tag || '').trim();
        if (!/^[A-Za-z0-9_]{3,15}$/.test(tag)) return json({ ok: false, reason: 'Gamer tag must be 3 to 15 letters, numbers or underscores.' }, 400);
        const same = await findTag(env, tag); // tags are unique ignoring capitals: Ada_Flies and ada_flies are the same player
        if (same.some(p => p.id !== user)) return json({ ok: false, reason: 'That gamer tag is taken. Try another.' }, 409);
        const r = await sb(env, 'POST', '/rest/v1/profiles?on_conflict=id', { id: user, tag }, { Prefer: 'resolution=merge-duplicates,return=representation' });
        if (r.status === 409) return json({ ok: false, reason: 'That gamer tag is taken. Try another.' }, 409);
        if (!r.ok) return json({ ok: false, reason: 'Could not save your gamer tag. Try again.' }, 500);
        return json({ ok: true, tag });
      }

      if (path === '/session') {
        if (supabaseOn(env) && !(await getProfile(env, user))) return json({ error: 'Choose a gamer tag first.' }, 409);
        const sessionId = crypto.randomUUID();
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        const seed = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
        await env.SESSIONS.put(
          `s:${sessionId}`,
          JSON.stringify({ seed, user, issuedAt: Date.now(), v: GGSim.VERSION }),
          { expirationTtl: SESSION_TTL_SECONDS }
        );
        return json({ sessionId, seed, version: GGSim.VERSION });
      }

      if (path === '/submit') {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.sessionId !== 'string') return json({ verified: false, reason: 'bad request' }, 400);

        const key = `s:${body.sessionId}`;
        const raw = await env.SESSIONS.get(key);
        if (!raw) return json({ verified: false, reason: 'unknown or used session' }, 400);
        await env.SESSIONS.delete(key); // each seed works once
        const sess = JSON.parse(raw);

        if (sess.user !== user) return json({ verified: false, reason: 'session belongs to another user' }, 403);
        if (sess.v !== GGSim.VERSION) return json({ verified: false, reason: 'game version changed, update the app' }, 409);

        const ticks = body.ticks;
        const bad = GGSim.validateLog(body.log, ticks);
        if (bad) return json({ verified: false, reason: bad }, 400);

        const elapsedMs = Date.now() - sess.issuedAt;
        if (elapsedMs < ticks * GGSim.DT * 1000 * MIN_REALTIME_RATIO) {
          await flag(env, user, 'finished faster than real time', body.sessionId);
          return json({ verified: false, reason: 'game finished faster than real time' }, 400);
        }

        const s = GGSim.replay(sess.seed, body.log, ticks);
        const ok = s.tick === ticks && !s.alive && s.score === body.score && GGSim.digest(s) === body.digest;
        if (!ok) {
          await flag(env, user, 'replay mismatch', body.sessionId);
          return json({ verified: false, reason: 'score did not match replay' }, 400);
        }

        const points = GGSim.points(s);
        const saved = await savePoints(env, user, body.sessionId, s.score, points);
        return json({ verified: true, score: s.score, points, awarded: saved.awarded, total: saved.total, today: saved.today, dailyCap: dailyCap(env) });
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
      if (err && err.status) return json({ error: err.message }, err.status);
      return json({ error: 'server error' }, 500);
    }
  }
};

/*
 * $GNG airdrop waitlist (used by the landing page).
 *   POST /waitlist  body: { contact, tag, country, adult, consent }
 *   -> { ok: true, position, already }  or  { ok: false, reason }
 * Open worldwide. Stores one entry per email or phone number. Personal data: keep a
 * privacy policy live on the landing page and only use it to contact people about
 * the launch (Nigeria Data Protection Act 2023, and GDPR for players in the EU/UK).
 */
// Countries we can't accept sign-ups from. Starts with the countries under full
// international sanctions; your lawyer should confirm this list before launch.
const RESTRICTED = ['KP', 'IR', 'CU', 'SY'];
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function normaliseContact(raw, country) {
  const v = String(raw || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120) return { kind: 'email', value: v.toLowerCase() };
  let digits = v.replace(/[\s().-]/g, '');
  if (/^00\d/.test(digits)) digits = '+' + digits.slice(2);                          // 0044... -> +44...
  if (country === 'NG' && /^0\d{10}$/.test(digits)) digits = '+234' + digits.slice(1); // Nigerian 0803... -> +234803...
  if (country === 'NG' && /^234\d{10}$/.test(digits)) digits = '+' + digits;
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return { kind: 'phone', value: digits };     // international format
  return null;
}
async function waitlist(request, env, json) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, reason: 'Bad request.' }, 400);
  const country = /^[A-Z]{2}$/.test(String(body.country || '')) ? body.country : null;
  if (!country) return json({ ok: false, reason: 'Choose your country.' }, 400);
  if (RESTRICTED.includes(country)) return json({ ok: false, reason: "Sorry, we can't accept sign-ups from this country." }, 403);
  const contact = normaliseContact(body.contact, country);
  if (!contact) return json({ ok: false, reason: 'Enter a valid email, or a phone number with your country code (like +44 7700 900123).' }, 400);
  const tag = String(body.tag || '').trim();
  if (!/^[A-Za-z0-9_]{3,15}$/.test(tag)) return json({ ok: false, reason: 'Gamer tag must be 3 to 15 letters, numbers or underscores.' }, 400);
  if (body.adult !== true) return json({ ok: false, reason: 'You must be 18 or older to join.' }, 400);
  if (body.consent !== true) return json({ ok: false, reason: 'Please agree to be contacted about the launch.' }, 400);

  // light rate limit: 5 sign-ups per IP per 10 minutes
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = `rl:wl:${ip}`;
  const hits = parseInt((await env.SESSIONS.get(rlKey)) || '0', 10);
  if (hits >= 5) return json({ ok: false, reason: 'Too many sign-ups from this network. Try again in a few minutes.' }, 429);
  await env.SESSIONS.put(rlKey, String(hits + 1), { expirationTtl: 600 });

  const key = `wl:${await sha256(contact.value)}`;
  const existing = await env.SESSIONS.get(key);
  if (existing) return json({ ok: true, already: true, position: JSON.parse(existing).position });

  const position = parseInt((await env.SESSIONS.get('wl:count')) || '0', 10) + 1; // approximate under heavy load
  await env.SESSIONS.put('wl:count', String(position));
  await env.SESSIONS.put(key, JSON.stringify({ contact: contact.value, kind: contact.kind, tag, country, position, at: Date.now() }));
  return json({ ok: true, already: false, position });
}

// Public numbers for the landing page: waitlist size, players, top 5. Cached for a minute.
async function stats(env, json) {
  const cached = await env.SESSIONS.get('stats:cache');
  if (cached) return json(JSON.parse(cached));
  const out = { waitlist: parseInt((await env.SESSIONS.get('wl:count')) || '0', 10), players: null, top: [] };
  if (supabaseOn(env)) {
    try {
      const c = await sb(env, 'HEAD', '/rest/v1/profiles?select=id', undefined, { Prefer: 'count=exact' });
      const m = /\/(\d+)$/.exec(c.headers.get('content-range') || '');
      if (m) out.players = parseInt(m[1], 10);
      const lb = await sb(env, 'GET', '/rest/v1/leaderboard?select=tag,total_points&limit=5');
      if (lb.ok) out.top = (await lb.json()).map(r => ({ tag: r.tag, points: r.total_points }));
    } catch (e) {}
  }
  await env.SESSIONS.put('stats:cache', JSON.stringify(out), { expirationTtl: 60 });
  return json(out);
}

// ---------- Sign-in and saved points (Supabase) ----------
// Profiles whose tag matches, ignoring capitals. "_" is escaped so it is not a wildcard.
async function findTag(env, tag) {
  const r = await sb(env, 'GET', `/rest/v1/profiles?tag=ilike.${encodeURIComponent(tag.replace(/_/g, '\\_'))}&select=id,tag`);
  if (!r.ok) throw httpError(500, 'Could not check that gamer tag.');
  return r.json();
}

/*
 * Sign in with gamer tag + password.
 *   POST /login  body: { tag, password }  ->  { ok, access_token, refresh_token, expires_in }
 * The player's email never leaves the server. Repeated wrong guesses are slowed down:
 * 8 per gamer tag and 20 per network, every 15 minutes.
 */
async function login(request, env, json) {
  if (!supabaseOn(env)) return json({ ok: false, reason: 'Sign-in is not set up yet.' }, 400);
  const body = await request.json().catch(() => null);
  const tag = String((body && body.tag) || '').trim(), password = String((body && body.password) || '');
  const wrong = { ok: false, reason: 'Wrong gamer tag or password.' };
  if (!/^[A-Za-z0-9_]{3,15}$/.test(tag) || password.length < 8 || password.length > 72) return json(wrong, 401);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipKey = `rl:login:ip:${ip}`, tagKey = `rl:login:tag:${tag.toLowerCase()}`;
  const [ipHits, tagHits] = (await Promise.all([env.SESSIONS.get(ipKey), env.SESSIONS.get(tagKey)])).map(v => parseInt(v || '0', 10));
  if (ipHits >= 20 || tagHits >= 8) return json({ ok: false, reason: 'Too many tries. Wait 15 minutes, or sign in with your email instead.' }, 429);
  const fail = async () => {
    await Promise.all([env.SESSIONS.put(ipKey, String(ipHits + 1), { expirationTtl: 900 }), env.SESSIONS.put(tagKey, String(tagHits + 1), { expirationTtl: 900 })]);
    return json(wrong, 401);
  };

  const rows = await findTag(env, tag);
  const prof = rows.find(p => p.tag === tag) || (rows.length === 1 ? rows[0] : null);
  if (!prof) return fail();
  const ur = await sb(env, 'GET', `/auth/v1/admin/users/${encodeURIComponent(prof.id)}`);
  if (!ur.ok) return fail();
  const u = await ur.json();
  const email = u && (u.email || (u.user && u.user.email));
  if (!email) return fail();

  const tr = await fetch(env.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: String(env.SUPABASE_ANON_KEY || '').trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!tr.ok) return fail();
  const t = await tr.json();
  if (!t.access_token || !t.refresh_token) return fail();
  await env.SESSIONS.delete(tagKey);
  return json({ ok: true, tag: prof.tag, access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in });
}

const supabaseOn = env => !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_KEY);
const dailyCap = env => parseInt(env.DAILY_POINTS_CAP || '1500', 10);
const httpError = (status, message) => Object.assign(new Error(message), { status });

// New Supabase secret keys (sb_secret_...) go in the apikey header only; old JWT keys also need Authorization.
function serviceHeaders(env, extra) {
  const k = String(env.SUPABASE_SERVICE_KEY || '').replace(/[^A-Za-z0-9_.-]/g, '');
  const h = { apikey: k, 'Content-Type': 'application/json', ...extra };
  if (k.startsWith('eyJ')) h.Authorization = 'Bearer ' + k;
  return h;
}
async function sb(env, method, path, body, extraHeaders = {}) {
  return fetch(env.SUPABASE_URL.replace(/\/+$/, '') + path, {
    method,
    headers: serviceHeaders(env, extraHeaders),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

// Checks the player's login with Supabase and returns their user id.
// Test mode (no Supabase settings): everyone is "guest".
async function requireUser(request, env) {
  if (!supabaseOn(env)) return 'guest';
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw httpError(401, 'Sign in to save points.');
  const r = await fetch(env.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/user', {
    headers: { apikey: String(env.SUPABASE_ANON_KEY || '').trim(), Authorization: 'Bearer ' + token }
  });
  if (!r.ok) throw httpError(401, 'Your sign-in has expired. Sign in again.');
  const u = await r.json();
  if (!u || !u.id) throw httpError(401, 'Sign in again.');
  return u.id;
}

async function getProfile(env, user) {
  const r = await sb(env, 'GET', `/rest/v1/profiles?id=eq.${encodeURIComponent(user)}&select=tag,total_points`);
  if (!r.ok) throw httpError(500, 'Could not load your profile.');
  const rows = await r.json();
  return rows[0] || null;
}

async function pointsToday(env, user) {
  const r = await sb(env, 'POST', '/rest/v1/rpc/points_today', { p_user: user });
  return r.ok ? (await r.json()) || 0 : 0;
}

// Saves verified points through the add_points database function, which
// applies the daily cap and updates the player's total in one step.
async function savePoints(env, user, sessionId, score, points) {
  if (!supabaseOn(env)) {
    if (env.SESSIONS) await env.SESSIONS.put(`p:${sessionId}`, JSON.stringify({ user, score, points, at: Date.now() }));
    return { awarded: points, total: null, today: null };
  }
  const r = await sb(env, 'POST', '/rest/v1/rpc/add_points', { p_user: user, p_session: sessionId, p_score: score, p_points: points, p_daily_cap: dailyCap(env) });
  if (!r.ok) throw httpError(500, 'Could not save your points. Your game was verified; contact support with your session id.');
  const rows = await r.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  return { awarded: row.awarded, total: row.total, today: row.today };
}

async function flag(env, user, reason, sessionId) {
  if (env.SESSIONS) {
    await env.SESSIONS.put(`flag:${sessionId}`, JSON.stringify({ user, reason, at: Date.now() }));
  }
}

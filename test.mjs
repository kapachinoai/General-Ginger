// Run with: node test.mjs
import './sim.js';
import worker from './worker.js';
const G = globalThis.GGSim;
let fails = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fails++; };

// A simple bot that plays with random inputs, the way a phone would.
function play(seed, botSeed) {
  const s = G.create(seed);
  const rec = G.recorder();
  let r = botSeed;
  const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  let want = { axis: 0, py: null, boost: false };
  while (s.alive && s.tick < 60 * 60 * 4) {
    if (s.tick % 20 === 0) {
      const m = rnd();
      want = m < 0.3 ? { axis: rnd() < 0.5 ? 1 : -1, py: null, boost: false }
           : m < 0.7 ? { axis: 0, py: 200 + rnd() * 1000, boost: false }
           : { axis: 0, py: null, boost: false };
    }
    // dodge: steer away from the closest incoming shot
    const near = s.shots.find(sh => Math.abs(sh.x - s.x) < 4);
    if (near) want = { axis: near.y > s.y ? -1 : 1, py: null, boost: false };
    want.boost = rnd() < 0.01;
    const inp = rec.take(s, want);
    s.events.length = 0;
    G.step(s, inp);
  }
  return { s, log: rec.log };
}

const results = [];
for (let i = 0; i < 25; i++) {
  const seed = 'seed-' + i;
  const { s, log } = play(seed, 1000 + i);
  const rp = G.replay(seed, log, s.tick);
  results.push(s);
  if (rp.score !== s.score || rp.tick !== s.tick || G.digest(rp) !== G.digest(s) || rp.alive !== s.alive) {
    check(`replay matches play (game ${i})`, false);
  }
}
check('25 bot games replay to the exact same score', fails === 0);
const secs = results.map(s => (s.tick / 60).toFixed(0));
console.log('      game lengths (s):', secs.join(' '), '| scores:', results.map(s => s.score).join(' '));
check('games are not all identical (seeds matter)', new Set(results.map(s => s.score)).size > 5);
check('pests actually hit the plane (some games end)', results.some(s => !s.alive));

// Boss fight: a plane that can't die and tracks the boss's height should beat it.
{
  const s = G.create('boss-test');
  const seen = new Set();
  while (s.tick < 60 * 60 * 6 && s.bossesBeaten < 2) {
    s.hp = 3; s.events.length = 0;
    const py = s.boss ? s.boss.y * 100 : 600;
    G.step(s, { axis: 0, py, boost: false });
    if (s.boss) seen.add('boss');
  }
  check(`boss fights start and can be won (beaten ${s.bossesBeaten}, level ${s.level}, ${(s.tick / 60).toFixed(0)}s)`, seen.has('boss') && s.bossesBeaten === 2 && s.level === 3);
}
// Replay still matches in games that reach a boss fight
{
  let tried = 0, bossGames = 0, ok = true;
  for (let seedN = 0; seedN < 60 && bossGames < 3; seedN++) {
    tried++;
    const seed = 'boss-replay-' + seedN;
    const s = G.create(seed);
    const rec = G.recorder();
    let fought = false;
    while (s.alive && s.tick < 60 * 60 * 5) {
      // dodge: pick the height with the most room over the next 0.7s, leaning toward the boss
      const goal = s.boss ? s.boss.y : 7;
      let bestY = s.y, bestD = -1e9;
      for (let y = 2; y <= 12; y += 0.5) {
        let minD = 99;
        for (const sh of s.shots) for (let t = 0.1; t <= 0.7; t += 0.15) {
          const sx = sh.x + sh.vx * t, sy = sh.y + sh.vy * t - 0.5 * sh.g * t * t;
          const px = s.x + s.speed * t, py = s.y + Math.max(-8 * t, Math.min(8 * t, y - s.y));
          minD = Math.min(minD, ((sx - px) / 1.4) ** 2 + (sy - py) ** 2);
        }
        const score = Math.min(minD, 6) - Math.abs(y - goal) * 0.08;
        if (score > bestD) { bestD = score; bestY = y; }
      }
      const want = { axis: 0, py: bestY * 100, boost: false };
      const inp = rec.take(s, want); s.events.length = 0;
      G.step(s, inp);
      if (s.boss) fought = true;
    }
    if (!fought) continue;
    bossGames++;
    const rp = G.replay(seed, rec.log, s.tick);
    if (!(rp.score === s.score && G.digest(rp) === G.digest(s) && rp.level === s.level)) ok = false;
    console.log(`      boss game ${seed}: level ${s.level}, bosses beaten ${s.bossesBeaten}, score ${s.score}, ${(s.tick / 60).toFixed(0)}s`);
  }
  check(`replay matches in ${bossGames} games that reached a boss (out of ${tried} tried)`, ok && bossGames > 0);
}

// Points: sigmoid curve over distance, 15% off per hit, capped at 100/min and 300/game
{
  const pts = (x, hits, secs) => G.points({ x, hits, tick: Math.round(secs * 60) });
  check('points: detExp matches Math.exp closely', Math.abs(G.detExp(2.5) / Math.exp(2.5) - 1) < 1e-9 && Math.abs(G.detExp(-4) / Math.exp(-4) - 1) < 1e-9);
  check(`points: halfway point gives half of 300 (${pts(400, 0, 600)})`, pts(400, 0, 600) === 150);
  check(`points: long flight levels off near 300 (${pts(1200, 0, 600)})`, pts(1200, 0, 600) >= 299);
  check(`points: each hit cuts 15% (${pts(1200, 1, 600)}, ${pts(1200, 3, 600)})`, pts(1200, 1, 600) === Math.floor(300 * 0.85 / (1 + Math.exp(-8))) && pts(1200, 3, 600) === Math.floor(300 * 0.85 ** 3 / (1 + Math.exp(-8))));
  check(`points: 100 per minute cap still applies (${pts(1200, 0, 60)})`, pts(1200, 0, 60) === 100);
  check(`points: a short run earns little (${pts(50, 0, 10)})`, pts(50, 0, 10) <= 10);
}

// Tampering
{
  const { s, log } = play('tamper', 7);
  const rp = G.replay('tamper', log, s.tick);
  check('a raised score does not match the replay', rp.score !== s.score + 500);
  const rp2 = G.replay('other-seed', log, s.tick);
  check('the same inputs on a different seed give a different result', rp2.score !== s.score || rp2.tick !== s.tick);
}

// Worker end to end with an in-memory KV
const store = new Map();
const env = { SESSIONS: {
  get: async k => store.get(k) ?? null,
  put: async (k, v) => { store.set(k, v); },
  delete: async k => { store.delete(k); }
} };
const call = async (path, body) => {
  const res = await worker.fetch(new Request('https://w.test' + path, { method: 'POST', body: JSON.stringify(body || {}) }), env);
  return { status: res.status, body: await res.json() };
};
const backdate = (id, ms) => { const k = 's:' + id; const r = JSON.parse(store.get(k)); r.issuedAt -= ms; store.set(k, JSON.stringify(r)); };

{
  const sess = (await call('/session')).body;
  const { s, log } = play(sess.seed, 99);
  backdate(sess.sessionId, s.tick / 60 * 1000 + 1000);
  const res = await call('/submit', { sessionId: sess.sessionId, ticks: s.tick, score: s.score, digest: G.digest(s), log });
  check(`worker verifies an honest game (score ${s.score}, points ${res.body.points})`, res.body.verified === true && res.body.points === G.points(s));
  const again = await call('/submit', { sessionId: sess.sessionId, ticks: s.tick, score: s.score, digest: G.digest(s), log });
  check('worker refuses to reuse a seed', again.body.verified === false);
}
{
  const sess = (await call('/session')).body;
  const { s, log } = play(sess.seed, 5);
  backdate(sess.sessionId, s.tick / 60 * 1000 + 1000);
  const res = await call('/submit', { sessionId: sess.sessionId, ticks: s.tick, score: s.score + 1000, digest: G.digest(s), log });
  check('worker rejects a raised score', res.body.verified === false && res.body.reason === 'score did not match replay');
}
{
  const sess = (await call('/session')).body;
  const { s, log } = play(sess.seed, 6);
  const res = await call('/submit', { sessionId: sess.sessionId, ticks: s.tick, score: s.score, digest: G.digest(s), log });
  check('worker rejects a game sent faster than real time', res.body.verified === false && /real time/.test(res.body.reason));
}
{
  const sess = (await call('/session')).body;
  const res = await call('/submit', { sessionId: sess.sessionId, ticks: 100, score: 0, digest: 'x', log: [[5, 9, 1]] });
  check('worker rejects a malformed log', res.status === 400 && res.body.verified === false);
}

// Waitlist
{
  const wl = async (body, ip = '1.1.1.1') => {
    const res = await worker.fetch(new Request('https://w.test/waitlist', { method: 'POST', headers: { 'CF-Connecting-IP': ip }, body: JSON.stringify(body) }), env);
    return res.json();
  };
  const good = { contact: '0803 123 4567', tag: 'Naija_Ace', country: 'NG', adult: true, consent: true };
  const a = await wl(good);
  const b = await wl({ ...good, contact: '+2348031234567' }, '2.2.2.2');
  const c = await wl({ ...good, contact: 'ada@example.com', tag: 'Ada' }, '3.3.3.3');
  check('waitlist accepts a sign-up and gives a position', a.ok === true && a.position === 1);
  check('waitlist spots the same phone written two ways', b.ok === true && b.already === true && b.position === 1);
  check('waitlist accepts an email as a new person', c.ok === true && c.position === 2);
  check('waitlist refuses under-18s', (await wl({ ...good, contact: 'kid@example.com', adult: false }, '4.4.4.4')).ok === false);
  check('waitlist refuses a bad contact', (await wl({ ...good, contact: 'hello' }, '5.5.5.5')).ok === false);
  const uk = await wl({ ...good, contact: '+44 7700 900123', tag: 'Brit_Pilot', country: 'GB' }, '6.6.6.1');
  const uk2 = await wl({ ...good, contact: '0044 7700 900123', tag: 'Brit_Pilot', country: 'GB' }, '6.6.6.2');
  check('waitlist accepts players from anywhere (UK phone)', uk.ok === true && uk2.already === true);
  check('waitlist accepts a US email', (await wl({ ...good, contact: 'sam@example.us', tag: 'Sam', country: 'US' }, '6.6.6.3')).ok === true);
  check('waitlist asks for a country code on a non-Nigerian local number', (await wl({ ...good, contact: '07700 900123', country: 'GB' }, '6.6.6.4')).ok === false);
  check('waitlist refuses fully sanctioned countries', (await wl({ ...good, contact: 'x@example.com', country: 'KP' }, '6.6.6.5')).ok === false);
  check('waitlist refuses a made-up country', (await wl({ ...good, contact: 'y@example.com', country: 'Nigeria' }, '6.6.6.6')).ok === false);
  for (let i = 0; i < 5; i++) await wl({ ...good, contact: `p${i}@example.com` }, '9.9.9.9');
  const limited = await wl({ ...good, contact: 'p9@example.com' }, '9.9.9.9');
  check('waitlist rate-limits one network', limited.ok === false && /Too many/.test(limited.reason));
}

// Sign-in and saved points, against a stand-in for Supabase
{
  const SB = 'https://demo.supabase.co';
  const users = { 'tok-ada': 'uid-ada', 'tok-bayo': 'uid-bayo' };
  const profiles = {}; const ledger = [];
  const emails = { 'uid-ada': 'ada@example.com', 'uid-bayo': 'bayo@example.com' }, passwords = { 'uid-ada': 'spicyjollof9' };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url); const body = opts.body ? JSON.parse(opts.body) : null;
    const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
    if (u.origin !== SB) return realFetch(url, opts);
    if (u.pathname === '/auth/v1/user') {
      const tok = (opts.headers.Authorization || '').slice(7);
      return users[tok] ? reply({ id: users[tok] }) : reply({ msg: 'bad jwt' }, 401);
    }
    if (u.pathname === '/rest/v1/profiles' && opts.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': '*/' + Object.keys(profiles).length } });
    if (u.pathname === '/rest/v1/leaderboard') return reply(Object.values(profiles).sort((a, b) => b.total - a.total).slice(0, 5).map(p => ({ tag: p.tag, total_points: p.total })));
    if (u.pathname === '/rest/v1/profiles' && opts.method === 'GET' && u.searchParams.get('tag')) {
      const want = u.searchParams.get('tag').replace(/^ilike\./, '').replace(/\\_/g, '_').toLowerCase();
      return reply(Object.entries(profiles).filter(([, p]) => p.tag.toLowerCase() === want).map(([id, p]) => ({ id, tag: p.tag })));
    }
    if (u.pathname.startsWith('/auth/v1/admin/users/')) {
      if (opts.headers.apikey !== 'service') return reply({}, 401);
      const id = decodeURIComponent(u.pathname.split('/').pop());
      return emails[id] ? reply({ id, email: emails[id] }) : reply({}, 404);
    }
    if (u.pathname === '/auth/v1/token') {
      const id = Object.keys(emails).find(k => emails[k] === body.email);
      return id && passwords[id] === body.password ? reply({ access_token: 'at-' + id, refresh_token: 'rt-' + id, expires_in: 3600 }) : reply({ error: 'invalid_grant' }, 400);
    }
    if (u.pathname === '/rest/v1/profiles' && opts.method === 'GET') {
      const id = u.searchParams.get('id').slice(3);
      return reply(profiles[id] ? [{ tag: profiles[id].tag, total_points: profiles[id].total }] : []);
    }
    if (u.pathname === '/rest/v1/profiles' && opts.method === 'POST') {
      if (Object.entries(profiles).some(([id, p]) => p.tag === body.tag && id !== body.id)) return reply({ code: '23505' }, 409);
      profiles[body.id] = { tag: body.tag, total: profiles[body.id]?.total || 0 };
      return reply([body], 201);
    }
    if (u.pathname === '/rest/v1/rpc/points_today') return reply(ledger.filter(r => r.user === body.p_user).reduce((a, r) => a + r.points, 0));
    if (u.pathname === '/rest/v1/rpc/add_points') {
      const today = ledger.filter(r => r.user === body.p_user).reduce((a, r) => a + r.points, 0);
      const award = Math.max(0, Math.min(body.p_points, body.p_daily_cap - today));
      ledger.push({ user: body.p_user, points: award });
      profiles[body.p_user].total += award;
      return reply([{ awarded: award, total: profiles[body.p_user].total, today: today + award }]);
    }
    return reply({ error: 'unexpected ' + u.pathname }, 500);
  };
  const store2 = new Map();
  const env2 = {
    SESSIONS: { get: async k => store2.get(k) ?? null, put: async (k, v) => { store2.set(k, v); }, delete: async k => { store2.delete(k); } },
    SUPABASE_URL: SB, SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'service', DAILY_POINTS_CAP: '150'
  };
  const call2 = async (path, body, token) => {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const res = await worker.fetch(new Request('https://w.test' + path, { method: 'POST', headers, body: JSON.stringify(body || {}) }), env2);
    return { status: res.status, body: await res.json() };
  };
  const backdate2 = (id, ms) => { const k = 's:' + id; const r = JSON.parse(store2.get(k)); r.issuedAt -= ms; store2.set(k, JSON.stringify(r)); };

  check('sign-in: no login is refused', (await call2('/session')).status === 401);
  check('sign-in: a bad login is refused', (await call2('/session', {}, 'tok-fake')).status === 401);
  check('sign-in: must pick a gamer tag before playing', (await call2('/session', {}, 'tok-ada')).status === 409);
  check('sign-in: gamer tag saved', (await call2('/profile', { tag: 'Ada_Flies' }, 'tok-ada')).body.ok === true);
  check('sign-in: taken gamer tag refused', (await call2('/profile', { tag: 'Ada_Flies' }, 'tok-bayo')).status === 409);
  check('sign-in: same tag with different capitals refused', (await call2('/profile', { tag: 'ada_flies' }, 'tok-bayo')).status === 409);
  check('sign-in: "_" is not a wildcard (AdaXFlies is free)', (await call2('/profile', { tag: 'AdaXFlies' }, 'tok-bayo')).body.ok === true);
  const login = (tag, password, ip = '1.1.1.1') => worker.fetch(new Request('https://w.test/login', { method: 'POST', headers: { 'CF-Connecting-IP': ip }, body: JSON.stringify({ tag, password }) }), env2).then(async r => ({ status: r.status, body: await r.json() }));
  const good = await login('Ada_Flies', 'spicyjollof9');
  check('login: gamer tag + password signs in', good.status === 200 && good.body.access_token === 'at-uid-ada' && good.body.refresh_token === 'rt-uid-ada');
  check('login: capitals in the tag do not matter', (await login('ADA_FLIES', 'spicyjollof9')).status === 200);
  check('login: the email is never sent back', !JSON.stringify(good.body).includes('@'));
  const bad1 = await login('Ada_Flies', 'wrongpass1'), bad2 = await login('Nobody_Here', 'spicyjollof9');
  check('login: wrong password and unknown tag get the same answer', bad1.status === 401 && bad2.status === 401 && bad1.body.reason === bad2.body.reason);
  check('login: player with no password set cannot log in', (await login('AdaXFlies', 'anything123')).status === 401);
  for (let i = 0; i < 8; i++) await login('Ada_Flies', 'guess' + i + 'xxxx', '2.2.2.' + i);
  check('login: too many wrong guesses on one tag are blocked', (await login('Ada_Flies', 'spicyjollof9', '3.3.3.3')).status === 429);
  {
    const st = (await call2('/stats')).body;
    check('stats: public numbers and top players, no emails', st.players === 2 && st.top.length >= 1 && st.top[0].tag && !JSON.stringify(st).includes('@'));
  }
  const me0 = (await call2('/me', {}, 'tok-ada')).body;
  check('sign-in: /me shows tag and totals', me0.signedIn && me0.tag === 'Ada_Flies' && me0.total === 0 && me0.dailyCap === 150);

  let totalAwarded = 0;
  for (let g = 0; g < 3; g++) {
    const sess = (await call2('/session', {}, 'tok-ada')).body;
    const { s, log } = play(sess.seed, 300 + g);
    backdate2(sess.sessionId, s.tick / 60 * 1000 + 1000);
    const r = (await call2('/submit', { sessionId: sess.sessionId, ticks: s.tick, score: s.score, digest: G.digest(s), log }, 'tok-ada')).body;
    if (r.verified) totalAwarded += r.awarded;
  }
  const me1 = (await call2('/me', {}, 'tok-ada')).body;
  check(`saved points: totals add up and stop at the daily cap (awarded ${totalAwarded}, total ${me1.total}, today ${me1.today}/150)`, me1.total === totalAwarded && me1.total <= 150);
  const sessB = (await call2('/session', {}, 'tok-ada')).body;
  const { s: sB, log: logB } = play(sessB.seed, 999);
  backdate2(sessB.sessionId, sB.tick / 60 * 1000 + 1000);
  const stolen = (await call2('/submit', { sessionId: sessB.sessionId, ticks: sB.tick, score: sB.score, digest: G.digest(sB), log: logB }, 'tok-bayo')).body;
  check("saved points: one player can't submit another player's game", stolen.verified === false);
  globalThis.fetch = realFetch;
}

console.log(fails ?`\n${fails} check(s) failed` : '\nAll checks passed');
process.exit(fails ? 1 : 0);

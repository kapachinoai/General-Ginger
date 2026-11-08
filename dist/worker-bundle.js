// General Ginger Worker: one file, ready to paste into the Cloudflare editor.
// Built by build-site.mjs from sim.js + worker.js. Do not edit here.
/*
 * General Ginger Flight — deterministic game simulation.
 *
 * This file holds ALL game rules. The phone runs it to play, and the
 * Cloudflare Worker runs the exact same file to replay a session and check
 * the score. Rules for keeping it replayable:
 *   - fixed step (60 per second), never real time
 *   - randomness only from the seeded generator (rng), never Math.random
 *   - no Math.sin / cos / tan / pow / exp / log (results can differ between
 *     engines); + - * / and Math.sqrt are safe
 *   - rendering code may READ the state but never change it
 *
 * Version 2: levels, the Ginger King boss fight, the spice cannon,
 * and ginger-root hearts.
 */
const GGSim = (() => {
  const VERSION = 3;
  const DT = 1 / 60;
  const MAX_TICKS = 60 * 60 * 30; // 30 minutes
  const FLOOR = 1.6, CEIL = 13;
  const MAX_HP = 4;

  // Points rules (architecture spec): a sigmoid curve over distance flown,
  //   P(x, h) = Pmax * (1 - gamma)^h / (1 + e^(-k (x - x0)))
  // cut by 15% for every hit taken, and still capped at 100 points per
  // minute (blueprint) so short games can't max out.
  const PPM_CAP = 100, SESSION_CAP = 300;
  const P_MAX = 300, CURVE_K = 0.01, CURVE_X0 = 400, HIT_PENALTY = 0.15;

  // Level and boss tuning
  const FIRST_BOSS_X = 300, BOSS_GAP_X = 600;
  const BOSS_OFFSET = 15;        // how far ahead of the plane the King's airship hovers
  const CANNON_RATE = 0.16;      // seconds between cannon shots
  const CANNON_POWERUP = 8;      // seconds of cannon from a pick-up

  // Pick-up kinds
  const ITEM_JAR = 0, ITEM_PEPPER = 1, ITEM_HEART = 2, ITEM_CANNON = 3;
  // Projectile kinds
  const SHOT_BOMB = 0, SHOT_SHEARS = 1, SHOT_NET = 2, SHOT_ROYAL = 3;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function hashStr(str) { // FNV-1a, 32 bit
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function rng(s) { // mulberry32
    s.r = (s.r + 0x6D2B79F5) | 0;
    let t = Math.imul(s.r ^ (s.r >>> 15), 1 | s.r);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function ev(s, e) { if (s.events) s.events.push(e); }

  function create(seed) {
    return {
      v: VERSION, tick: 0, r: hashStr(String(seed)) | 0,
      x: 0, y: 5, vy: 0, speed: 7,
      hp: MAX_HP, boost: 0, boostCd: 0, slow: 0, shield: 0, inv: 0,
      cannon: 0, fireCd: 0,
      level: 1, levelStartX: 0,
      alive: true, score: 0, acc: 0, jars: 0, bossesBeaten: 0, hits: 0,
      nextId: 1, nextSpawnX: 30, nextBossX: FIRST_BOSS_X,
      boss: null,
      units: [], shots: [], items: [], bullets: [],
      events: [] // render-only; set to null on the server
    };
  }

  // Difficulty: rises inside a level and jumps with each new level.
  function difficulty(s) {
    const inLevel = Math.min(1, (s.x - s.levelStartX) / 700);
    return Math.min(1.2, 0.25 * (s.level - 1) + 0.4 * inLevel);
  }

  function hurt(s, k) {
    if (s.shield > 0) { ev(s, { t: 'block', k }); return; }
    if (s.inv > 0) return;
    s.hp -= 1; s.hits++; s.inv = 1.8;
    ev(s, { t: 'hit', k });
    if (s.hp <= 0) { s.alive = false; ev(s, { t: 'crash' }); }
  }

  function startBoss(s) {
    const hp = 18 + 8 * (s.level - 1);
    s.boss = {
      id: s.nextId++, hp, maxHp: hp,
      off: BOSS_OFFSET + 18,   // flies in from off-screen
      y: 8, dir: 1,
      cd: 2.2, pattern: 0, age: 0
    };
    ev(s, { t: 'bossIn', level: s.level });
  }

  function bossX(s) { return s.x + s.boss.off; }

  // inp = { axis: -1|0|1 (down/up), py: target height in hundredths or null, boost: bool }
  function step(s, inp) {
    if (!s.alive) return;
    const d = difficulty(s);
    const fighting = !!s.boss;

    // --- Player ---
    if (inp.boost && s.boostCd <= 0) { s.boost = 1; s.boostCd = 0.6; ev(s, { t: 'boost' }); }
    s.boostCd = Math.max(0, s.boostCd - DT);

    const slowF = s.slow > 0 ? 0.6 : 1;
    s.speed = (7 + 2.4 * d) * slowF * (1 + s.boost * 0.9);
    s.x += s.speed * DT;

    const maxV = 8 * (s.slow > 0 ? 0.55 : 1);
    let target = 0;
    if (inp.axis) target = inp.axis * maxV;
    else if (inp.py !== null && inp.py !== undefined) target = clamp((inp.py / 100 - s.y) * 5, -maxV, maxV);
    s.vy += (target - s.vy) * Math.min(1, DT * 10);
    s.y = clamp(s.y + s.vy * DT, FLOOR, CEIL);

    s.boost = Math.max(0, s.boost - DT * 1.1);
    s.slow = Math.max(0, s.slow - DT);
    s.shield = Math.max(0, s.shield - DT);
    s.inv = Math.max(0, s.inv - DT);
    s.cannon = Math.max(0, s.cannon - DT);

    s.acc += s.speed * DT * 10 * (1 + 0.25 * (s.level - 1));
    const whole = Math.floor(s.acc);
    s.score += whole; s.acc -= whole;

    // --- Spice cannon: always on in a boss fight, or from a pick-up ---
    s.fireCd = Math.max(0, s.fireCd - DT);
    if ((fighting || s.cannon > 0) && s.fireCd <= 0) {
      s.bullets.push({ id: s.nextId++, x: s.x + 1.8, y: s.y + 0.05, vx: s.speed + 24, age: 0 });
      s.fireCd = CANNON_RATE;
    }

    // --- Boss fight trigger ---
    if (!fighting && s.x >= s.nextBossX) startBoss(s);

    // --- Spawning the King's pest army on the ground (quieter during a boss fight) ---
    while (s.nextSpawnX < s.x + 45) {
      const gap = Math.max(9, 18 - 4 * d + rng(s) * 9);
      if (s.boss) { s.nextSpawnX += gap * 1.8; continue; }
      const r = rng(s);
      const k = r < 0.45 ? 0 : r < 0.8 ? 1 : 2; // 0 trebuchet crew, 1 white grub, 2 nematode
      s.units.push({ id: s.nextId++, k, x: s.nextSpawnX, cd: 1.2 + rng(s) * 1.5, fired: -999, up: 0 });
      if (rng(s) < 0.7) {
        const q = rng(s);
        const ik = q < 0.6 ? ITEM_JAR : q < 0.75 ? ITEM_PEPPER : q < 0.88 ? ITEM_CANNON : ITEM_HEART;
        s.items.push({ id: s.nextId++, k: ik, x: s.nextSpawnX + 4, y: 3 + rng(s) * 8 });
      }
      s.nextSpawnX += gap;
    }

    // --- Ground units fire ---
    for (let i = s.units.length - 1; i >= 0; i--) {
      const u = s.units[i];
      const dx = u.x - s.x;
      if (dx < -15) { s.units.splice(i, 1); continue; }
      u.cd -= DT;
      if (u.k === 1 && dx < 20) u.up = Math.min(1, u.up + DT * 3);
      if (u.cd > 0 || dx < -3 || dx > 26) continue;

      if (u.k === 0 && dx > 3) { // trebuchet lobs a rot bomb at where the plane will be
        const T = Math.max(0.9, 1.3 - 0.15 * (s.level - 1)) + rng(s) * 0.5, g = 12, x0 = u.x, y0 = 2.6;
        const tx = s.x + s.speed * T, ty = s.y + (rng(s) * 2 - 1);
        s.shots.push({ id: s.nextId++, k: SHOT_BOMB, x: x0, y: y0, vx: (tx - x0) / T, vy: (ty - y0 + 0.5 * g * T * T) / T, g, r: 0.55, age: 0 });
        u.cd = 4 - 1.2 * d + rng(s) * 1; u.fired = s.tick;
        ev(s, { t: 'fire', id: u.id });
      } else if (u.k === 1 && u.up >= 1) { // white grub throws shears (two from level 2)
        const x0 = u.x, y0 = 0.8;
        const ax = s.x + s.speed * 0.5 - x0, ay = s.y - y0;
        const len = Math.sqrt(ax * ax + ay * ay) || 1, sp = 12;
        s.shots.push({ id: s.nextId++, k: SHOT_SHEARS, x: x0, y: y0, vx: ax / len * sp, vy: ay / len * sp, g: 2, r: 0.45, age: 0 });
        if (s.level >= 2) s.shots.push({ id: s.nextId++, k: SHOT_SHEARS, x: x0, y: y0, vx: ax / len * sp, vy: ay / len * sp + 2.5, g: 2, r: 0.45, age: 0 });
        u.cd = Math.max(1.8, 3 - 0.6 * d) + rng(s) * 0.8; u.fired = s.tick;
        ev(s, { t: 'fire', id: u.id });
      } else if (u.k === 2 && dx > 1) { // nematode spits a sticky net (two from level 3)
        const x0 = u.x, y0 = 0.6;
        const ax = s.x + s.speed - x0, ay = s.y - y0;
        const len = Math.sqrt(ax * ax + ay * ay) || 1, sp = 8;
        s.shots.push({ id: s.nextId++, k: SHOT_NET, x: x0, y: y0, vx: ax / len * sp, vy: ay / len * sp, g: 0, r: 0.85, age: 0 });
        if (s.level >= 3) s.shots.push({ id: s.nextId++, k: SHOT_NET, x: x0, y: y0, vx: ax / len * sp, vy: ay / len * sp + 2, g: 0, r: 0.85, age: 0 });
        u.cd = Math.max(2.6, 4.2 - d) + rng(s) * 1; u.fired = s.tick;
        ev(s, { t: 'fire', id: u.id });
      }
    }

    // --- The Ginger King's airship ---
    if (s.boss) {
      const b = s.boss;
      b.age += DT;
      b.off += (BOSS_OFFSET - b.off) * Math.min(1, DT * 1.5);
      // patrol up and down (triangle wave; faster at higher levels)
      b.y += b.dir * (2.2 + 0.6 * (s.level - 1)) * DT;
      if (b.y > 11) { b.y = 11; b.dir = -1; }
      if (b.y < 3.5) { b.y = 3.5; b.dir = 1; }
      b.cd -= DT;
      if (b.cd <= 0 && b.off < BOSS_OFFSET + 3) {
        const bx = bossX(s), by = b.y - 0.4;
        const pat = b.pattern % 3;
        if (pat === 0) { // three aimed royal spice bombs
          for (let k = 0; k < 3; k++) {
            const ax = s.x - bx, ay = s.y - by + (k - 1) * 1.2;
            const len = Math.sqrt(ax * ax + ay * ay) || 1, sp = 9 + s.level;
            s.shots.push({ id: s.nextId++, k: SHOT_ROYAL, x: bx, y: by, vx: s.speed + ax / len * sp, vy: ay / len * sp, g: 0, r: 0.5, age: 0 });
          }
        } else if (pat === 1) { // fan of five
          for (let k = 0; k < 5; k++) {
            s.shots.push({ id: s.nextId++, k: SHOT_ROYAL, x: bx, y: by, vx: s.speed - 8, vy: (k - 2) * 2.2, g: 0, r: 0.5, age: 0 });
          }
        } else { // jar rain: drops ahead of the plane
          for (let k = 0; k < 4; k++) {
            s.shots.push({ id: s.nextId++, k: SHOT_ROYAL, x: s.x + 3 + k * 2.5 + rng(s) * 1.5, y: 15, vx: s.speed * 0.6, vy: -2, g: 6, r: 0.5, age: 0 });
          }
        }
        b.pattern++;
        b.cd = Math.max(0.9, 2.1 - 0.25 * (s.level - 1)) + rng(s) * 0.5;
        ev(s, { t: 'bossFire', pat });
      }
    }

    // --- Cannon shots ---
    for (let i = s.bullets.length - 1; i >= 0; i--) {
      const bl = s.bullets[i];
      bl.x += bl.vx * DT; bl.age += DT;
      if (bl.age > 1.2) { s.bullets.splice(i, 1); continue; }
      let used = false;
      if (s.boss && s.boss.off < BOSS_OFFSET + 6) {
        const dx = bl.x - bossX(s), dy = bl.y - s.boss.y;
        if (dx > -1.8 && dx < 1.8 && dy > -1.7 && dy < 1.9) {
          used = true;
          s.boss.hp -= 1; s.score += 20;
          ev(s, { t: 'bossHit', x: bl.x, y: bl.y });
          if (s.boss.hp <= 0) {
            const lvl = s.level;
            s.score += 1500 * lvl; s.bossesBeaten++;
            s.hp = Math.min(MAX_HP, s.hp + 1);
            ev(s, { t: 'bossDown', x: bossX(s), y: s.boss.y, level: lvl });
            s.boss = null;
            s.shots = s.shots.filter(sh => sh.k !== SHOT_ROYAL);
            s.level++; s.levelStartX = s.x;
            s.nextBossX = s.x + BOSS_GAP_X;
            s.nextSpawnX = Math.max(s.nextSpawnX, s.x + 20);
            ev(s, { t: 'level', level: s.level });
          }
        }
      }
      if (!used) {
        for (let j = s.shots.length - 1; j >= 0; j--) {
          const sh = s.shots[j];
          const dx = sh.x - bl.x, dy = sh.y - bl.y, rr = sh.r + 0.25;
          if (dx * dx + dy * dy < rr * rr) {
            s.shots.splice(j, 1); used = true; s.score += 50;
            ev(s, { t: 'shotDown', x: sh.x, y: sh.y, k: sh.k });
            break;
          }
        }
      }
      if (used) s.bullets.splice(i, 1);
    }

    // --- Projectiles ---
    for (let i = s.shots.length - 1; i >= 0; i--) {
      const sh = s.shots[i];
      sh.vy -= sh.g * DT;
      sh.x += sh.vx * DT; sh.y += sh.vy * DT; sh.age += DT;
      if (sh.y < 0 || sh.y > 20 || sh.age > 6 || sh.x < s.x - 20) { s.shots.splice(i, 1); continue; }
      const ex = (sh.x - s.x) / 1.4, ey = sh.y - s.y, rr = sh.r + 0.6;
      if (ex * ex + ey * ey < rr * rr) {
        s.shots.splice(i, 1);
        if (sh.k === SHOT_NET) { s.slow = 2.5; ev(s, { t: 'net' }); }
        else hurt(s, sh.k);
        if (!s.alive) break;
      }
    }

    // --- Pick-ups ---
    for (let i = s.items.length - 1; i >= 0; i--) {
      const it = s.items[i];
      if (it.x < s.x - 15) { s.items.splice(i, 1); continue; }
      const dx = it.x - s.x, dy = it.y - s.y;
      if (dx * dx + dy * dy < 1.69) {
        s.items.splice(i, 1);
        if (it.k === ITEM_JAR) { s.score += 250; s.jars++; ev(s, { t: 'jar', x: it.x, y: it.y }); }
        else if (it.k === ITEM_PEPPER) { s.shield = 6; ev(s, { t: 'pepper', x: it.x, y: it.y }); }
        else if (it.k === ITEM_HEART) {
          if (s.hp < MAX_HP) s.hp++; else s.score += 300;
          ev(s, { t: 'heart', x: it.x, y: it.y });
        } else { s.cannon = CANNON_POWERUP; ev(s, { t: 'cannon', x: it.x, y: it.y }); }
      }
    }

    s.tick++;
    if (s.tick >= MAX_TICKS) s.alive = false;
  }

  // e^z using only + - * /, so the phone and the server always agree.
  function detExp(z) {
    const r = z / 64;
    let term = 1, sum = 1;
    for (let n = 1; n <= 14; n++) { term = term * r / n; sum += term; }
    for (let i = 0; i < 6; i++) sum *= sum;
    return sum;
  }

  // Points the session is worth. Takes the finished game state (x, hits, tick).
  function points(s) {
    const minutes = s.tick * DT / 60;
    let factor = 1;
    for (let i = 0; i < s.hits; i++) factor *= (1 - HIT_PENALTY);
    const curve = P_MAX * factor / (1 + detExp(-CURVE_K * (s.x - CURVE_X0)));
    return Math.max(0, Math.min(Math.floor(curve), Math.floor(PPM_CAP * minutes), SESSION_CAP));
  }

  function digest(s) {
    return hashStr(`${VERSION}|${s.tick}|${s.score}|${s.hp}|${s.jars}|${s.level}|${s.bossesBeaten}`).toString(16);
  }

  // Input log entries: [tick, code, value]
  //   code 0 = steer axis (-1, 0, 1)
  //   code 1 = pointer target height in hundredths, or -1 when released
  //   code 2 = boost pressed (value 1)
  function recorder() {
    const last = { axis: 0, py: null };
    const log = [];
    return {
      log,
      take(s, want) {
        const inp = { axis: want.axis | 0, py: want.py === null ? null : Math.round(want.py), boost: !!want.boost };
        if (inp.axis !== last.axis) { log.push([s.tick, 0, inp.axis]); last.axis = inp.axis; }
        if (inp.py !== last.py) { log.push([s.tick, 1, inp.py === null ? -1 : inp.py]); last.py = inp.py; }
        if (inp.boost) log.push([s.tick, 2, 1]);
        return inp;
      }
    };
  }

  function validateLog(log, ticks) {
    if (!Array.isArray(log) || log.length > 60000) return 'log must be an array of at most 60000 entries';
    if (!Number.isInteger(ticks) || ticks < 1 || ticks > MAX_TICKS) return 'bad tick count';
    let prev = 0;
    for (const e of log) {
      if (!Array.isArray(e) || e.length !== 3) return 'bad entry';
      const [tk, code, val] = e;
      if (!Number.isInteger(tk) || tk < prev || tk >= ticks) return 'ticks out of order or range';
      prev = tk;
      if (code === 0) { if (val !== -1 && val !== 0 && val !== 1) return 'bad axis'; }
      else if (code === 1) { if (!Number.isInteger(val) || val < -1 || val > 2000) return 'bad pointer'; }
      else if (code === 2) { if (val !== 1) return 'bad boost'; }
      else return 'bad code';
    }
    return null;
  }

  // Replays a whole session from its seed and input log.
  function replay(seed, log, ticks) {
    const s = create(seed);
    s.events = null;
    const inp = { axis: 0, py: null, boost: false };
    let j = 0;
    while (s.alive && s.tick < ticks) {
      inp.boost = false;
      while (j < log.length && log[j][0] === s.tick) {
        const [, code, val] = log[j];
        if (code === 0) inp.axis = val;
        else if (code === 1) inp.py = val === -1 ? null : val;
        else if (code === 2) inp.boost = true;
        j++;
      }
      step(s, inp);
    }
    return s;
  }

  return {
    VERSION, DT, MAX_TICKS, MAX_HP, FLOOR, CEIL, PPM_CAP, SESSION_CAP, P_MAX, HIT_PENALTY, detExp,
    ITEM_JAR, ITEM_PEPPER, ITEM_HEART, ITEM_CANNON, SHOT_BOMB, SHOT_SHEARS, SHOT_NET, SHOT_ROYAL,
    BOSS_OFFSET, create, step, points, digest, recorder, validateLog, replay, hashStr, bossX
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GGSim;
if (typeof globalThis !== 'undefined') globalThis.GGSim = GGSim;

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
 *   POST /shop/checkout, /shop/verify, /shop/owned, /shop/webhook -> skin shop (Paystack), see below
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

    if (path === '/shop/webhook') return shopWebhook(request, env, json);
    if (path === '/waitlist') return waitlist(request, env, json);
    if (path === '/login') return login(request, env, json);
    if (path === '/stats') return stats(env, json);

    try {
      const user = await requireUser(request, env);

      if (path === '/shop/owned') return json({ owned: await ownedItems(env, user), shop: shopOn(env) });
      if (path === '/shop/checkout') return shopCheckout(request, env, json, user);
      if (path === '/shop/verify') return shopVerify(request, env, json, user);

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
/* ================= Skin shop (Paystack) =================
 * Prices live here, on the server, so a player can't change them in the browser.
 * Purchases are kept in KV: "owned:<user id>" = list of items, "pay:<reference>" = one payment.
 * Secrets (set in Cloudflare, never in code): PAYSTACK_SECRET_KEY.
 * Optional settings: PAYSTACK_USD = "1" if the Paystack account can charge US dollars,
 * SHOP_RETURN_URL = where Paystack sends the player back (default: the game page).
 */
const SHOP = {
  'plane:jet': { ngn: 1000, usd: 0.99 },
  'plane:danfo': { ngn: 1500, usd: 1.49 },
  'paint:neon': { ngn: 500, usd: 0.49 },
  'paint:gold': { ngn: 700, usd: 0.79 },
  'trail:rainbow': { ngn: 500, usd: 0.49 },
  'pilot:agbada': { ngn: 700, usd: 0.79 },
  'pilot:crown': { ngn: 1000, usd: 0.99 }
};
const shopOn = env => !!String(env.PAYSTACK_SECRET_KEY || '').trim();
const paystack = (env, method, path, body) => fetch('https://api.paystack.co' + path, {
  method,
  headers: { Authorization: 'Bearer ' + String(env.PAYSTACK_SECRET_KEY || '').trim(), 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined
});
async function ownedItems(env, user) {
  try { return JSON.parse((await env.SESSIONS.get('owned:' + user)) || '[]'); } catch (e) { return []; }
}
// Gives the item once a payment is confirmed. Safe to call twice for the same payment.
async function grantPayment(env, tx) {
  const ref = String(tx.reference || ''), md = tx.metadata || {};
  const item = String(md.item || ''), user = String(md.user || ''), price = SHOP[item];
  if (!ref || !user || !price || tx.status !== 'success') return false;
  const cur = String(tx.currency || '').toUpperCase();
  const want = cur === 'USD' ? Math.round(price.usd * 100) : cur === 'NGN' ? price.ngn * 100 : -1;
  if (Number(tx.amount) < want || want < 0) return false; // paid less than the price: don't unlock
  const rec = JSON.parse((await env.SESSIONS.get('pay:' + ref)) || 'null');
  if (rec && rec.user && rec.user !== user) return false;
  const owned = await ownedItems(env, user);
  if (!owned.includes(item)) { owned.push(item); await env.SESSIONS.put('owned:' + user, JSON.stringify(owned)); }
  await env.SESSIONS.put('pay:' + ref, JSON.stringify({ user, item, amount: tx.amount, currency: cur, status: 'paid', at: new Date().toISOString() }));
  return true;
}
async function shopCheckout(request, env, json, user) {
  if (!shopOn(env)) return json({ ok: false, reason: 'The shop opens soon.' }, 503);
  if (user === 'guest') return json({ ok: false, reason: 'Sign in to buy skins.' }, 401);
  const body = await request.json().catch(() => ({}));
  const item = String(body.item || ''), price = SHOP[item];
  if (!price) return json({ ok: false, reason: 'Unknown item.' }, 400);
  if ((await ownedItems(env, user)).includes(item)) return json({ ok: false, reason: 'You already own this.' }, 409);
  const u = await fetch(env.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/user', {
    headers: { apikey: String(env.SUPABASE_ANON_KEY || '').trim(), Authorization: request.headers.get('Authorization') || '' }
  }).then(r => r.json()).catch(() => ({}));
  const email = u && u.email ? u.email : (user + '@players.general-ginger.app'); // phone sign-ins have no email
  const usd = env.PAYSTACK_USD === '1' && body.region !== 'ng';
  const reference = 'gg_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const r = await paystack(env, 'POST', '/transaction/initialize', {
    email, reference,
    amount: usd ? Math.round(price.usd * 100) : price.ngn * 100,
    currency: usd ? 'USD' : 'NGN',
    callback_url: env.SHOP_RETURN_URL || 'https://general-ginger.pages.dev/play/',
    metadata: { user, item, cancel_action: env.SHOP_RETURN_URL || 'https://general-ginger.pages.dev/play/' }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status || !j.data) return json({ ok: false, reason: 'Could not start the payment. Try again.' }, 502);
  await env.SESSIONS.put('pay:' + reference, JSON.stringify({ user, item, status: 'pending', at: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 30 });
  return json({ ok: true, url: j.data.authorization_url, reference });
}
async function shopVerify(request, env, json, user) {
  if (!shopOn(env)) return json({ ok: false, reason: 'The shop opens soon.' }, 503);
  const body = await request.json().catch(() => ({}));
  const ref = String(body.reference || '');
  if (!/^gg_[a-f0-9]{20}$/.test(ref)) return json({ ok: false, reason: 'Unknown payment.' }, 400);
  const r = await paystack(env, 'GET', '/transaction/verify/' + encodeURIComponent(ref));
  const j = await r.json().catch(() => ({}));
  const tx = j && j.data;
  if (!tx || !tx.metadata || tx.metadata.user !== user) return json({ ok: false, reason: 'Payment not found.' }, 404);
  const ok = await grantPayment(env, tx);
  return json({ ok, item: tx.metadata.item, owned: await ownedItems(env, user), reason: ok ? undefined : 'Payment not completed.' });
}
// Paystack calls this after each payment. Checked with the secret key so nobody can fake it.
async function shopWebhook(request, env, json) {
  if (!shopOn(env)) return json({ ok: false }, 503);
  const raw = await request.text();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(env.PAYSTACK_SECRET_KEY).trim()), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (sig !== String(request.headers.get('x-paystack-signature') || '').toLowerCase()) return json({ ok: false }, 401);
  let ev = {}; try { ev = JSON.parse(raw); } catch (e) {}
  if (ev.event === 'charge.success' && ev.data) await grantPayment(env, ev.data);
  return json({ ok: true });
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

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

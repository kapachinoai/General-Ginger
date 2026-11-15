// Builds the portal edition of General Ginger for CrazyGames, Poki and GameDistribution.
// Usage: node portal/build.mjs [GD_GAME_ID]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const SRC = fs.readFileSync(path.join(root, 'general-ginger-flight.html'), 'utf8');
const ADS = fs.readFileSync(path.join(here, 'ads.js'), 'utf8');
const COMMON = '/home/claude/portal-src/common';
const GD_ID = process.argv[2] || 'GD_GAME_ID_HERE';

function rep(s, from, to) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`expected 1 match, got ${n}: ${String(from).slice(0, 80)}`);
  return s.replace(from, () => to);
}

const SDK = {
  crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
  poki: '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>',
  gamedistribution: `<script>window.GD_OPTIONS = { gameId: ${JSON.stringify(GD_ID)} };</script>`,
  mock: '',
  web: '' // itch.io, Newgrounds: no ads, no SDK
};
// GD's loader goes after ads.js so our onEvent handler is in place first.
const GD_LOADER = `<script>(function(d,s,id){var js,f=d.getElementsByTagName(s)[0];if(d.getElementById(id))return;js=d.createElement(s);js.id=id;js.src='https://html5.api.gamedistribution.com/main.min.js';f.parentNode.insertBefore(js,f);}(document,'script','gamedistribution-jssdk'));</script>`;

// Paid skins: on portals they unlock with one rewarded ad, or by reaching this best score.
const ALT = { 'plane:jet': 20000, 'plane:danfo': 30000, 'paint:neon': 8000, 'paint:gold': 12000, 'trail:rainbow': 8000, 'pilot:agbada': 12000, 'pilot:crown': 35000, 'gun:rpg': 12000, 'gun:laser': 25000 };

const NEW_STR = {
  en: { revive: '📺 Watch an ad: keep flying', hgAd: '📺 Watch an ad · or best {n}', adNone: 'No ad available right now. Try again soon.' },
  fr: { revive: '📺 Regarde une pub : continue', hgAd: '📺 Regarde une pub · ou record {n}', adNone: 'Pas de pub pour le moment. Réessaie bientôt.' },
  es: { revive: '📺 Mira un anuncio: sigue volando', hgAd: '📺 Mira un anuncio · o récord {n}', adNone: 'No hay anuncio ahora. Inténtalo pronto.' },
  pt: { revive: '📺 Veja um anúncio: continue voando', hgAd: '📺 Veja um anúncio · ou recorde {n}', adNone: 'Nenhum anúncio agora. Tente de novo em breve.' },
  ar: { revive: '📺 شاهد إعلانًا: واصل الطيران', hgAd: '📺 شاهد إعلانًا · أو نتيجة {n}', adNone: 'لا يوجد إعلان الآن. حاول قريبًا.' }
};

function build(portal) {
  let s = SRC;
  // Fonts and three.js from local files; no outside requests except the portal's own SDK.
  s = rep(s, `  <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Lilita+One&family=Oswald:wght@500;700&display=swap" rel="stylesheet" />
  <style>`, `  <style>
    @font-face { font-family: 'Black Ops One'; src: url('fonts/blackopsone.woff') format('woff'); font-display: swap; }
    @font-face { font-family: 'Lilita One'; src: url('fonts/lilita.woff') format('woff'); font-display: swap; }
    @font-face { font-family: 'Oswald'; src: url('fonts/oswald.woff') format('woff'); font-weight: 200 700; font-display: swap; }
    body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-touch-callout: none; }
    #share-btn, #tg-btn, #pts { display: none !important; }
    #revive-btn { pointer-events: auto; margin-top: 12px; padding: 10px 22px; border-radius: 4px; border: 1.5px solid #ffb547; background: rgba(194,65,12,0.85); text-transform: uppercase; letter-spacing: 0.06em; color: #fff; font: inherit; font-weight: 800; font-size: 1rem; cursor: pointer; }
    #revive-btn[hidden] { display: none; }`);
  s = rep(s, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
    `<script>window.GG_PORTAL = ${JSON.stringify(portal === 'web' ? 'none' : portal)};</script>\n  ${SDK[portal]}\n  <script>\n${ADS}\n  </script>\n  ${portal === 'gamedistribution' ? GD_LOADER : ''}\n  <script src="three.min.js"></script>`);
  s = rep(s, '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n', '');
  s = rep(s, `  // const GG_API = 'https://gng-flight-verify.yourname.workers.dev';\n`, '');
  // No outgoing links on portals.
  s = rep(s, '<a id="tg-btn" href="https://t.me/Thegingerarmy" target="_blank" rel="noopener" hidden data-t="joinTG">Join the Ginger Army on Telegram</a>', '<span id="tg-btn" hidden></span>');
  s = rep(s, `      const url = 'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://generalgingergame.com/play/') + '&via=GINGERKINGX';
      window.open(url, '_blank', 'noopener');`, '      void text;');
  // Revive button on the game-over screen.
  s = rep(s, '<button id="hangar-btn" type="button" data-t="hangar">', '<button id="revive-btn" type="button" hidden data-t="revive">📺 Watch an ad: keep flying</button>\n    <button id="hangar-btn" type="button" data-t="hangar">');
  // Music ships with the game.
  s = rep(s, 'if (musicAsked || !ac || !GG_API) return;', 'if (musicAsked || !ac) return;');
  s = rep(s, "fetch(GG_API + '/music')", "fetch('music.mp3')");
  // Extra strings.
  s = rep(s, '    const LANG = pickLang();', `    for (const l in ${JSON.stringify(NEW_STR)}) Object.assign(STR[l] || (STR[l] = {}), ${JSON.stringify(NEW_STR)}[l]);\n    const LANG = pickLang();`);
  // Practice-mode wording does not apply on portals.
  s = rep(s, "$('status').textContent = session ? '' : (authOn && !canSave() ? t('stNoSign') : GG_API ? t('stOffline') : t('stPractice'));", "$('status').textContent = '';");
  s = rep(s, ": authOn && !canSave() ? t('signToSave', { pts }) : t('practiceRes', { pts });", ": '';");
  s = rep(s, "session ? '' : (authOn && !canSave() ? t('stSignToSave') : GG_API ? t('stOffline2') : t('stPractice'))", "''");
  // Paid skins: rewarded ad or a score goal.
  s = rep(s, "    const isOpen = (kind, it) => it.unlock === 'free' ||", `    const PALT = ${JSON.stringify(ALT)};\n    const isOpen = (kind, it) => it.unlock === 'free' || (PALT[kind + ':' + it.id] && loadBest() >= PALT[kind + ':' + it.id]) ||`);
  s = rep(s, ": t(shopLive ? 'hgBuy' : 'hgSoon', { n: priceOf(it.unlock) });", ": t('hgAd', { n: fmt(PALT[hgKind + ':' + it.id]) });");
  s = rep(s, 'if (!open && it.unlock.ngn) { buySkin(hgKind, it); return; }', 'if (!open && it.unlock.ngn) { adUnlock(hgKind, it); return; }');
  s = rep(s, '    let buying = false, shopLive = false;', `    let buying = false, shopLive = false;
    async function adUnlock(kind, it) {
      if (Ads.busy()) return;
      const ok = await Ads.rewarded();
      if (!ok) { toast(t('adNone'), 2); return; }
      const key = kind + ':' + it.id;
      if (!owned.includes(key)) owned.push(key);
      try { localStorage.setItem(OWN_KEY, JSON.stringify(owned)); } catch (e) {}
      loadout[kind] = it.id; applyLoadout(); P.root.visible = true;
      toast(t('hgUnlocked'), 3); renderHangar();
    }`);
  // Ads between flights, and one "watch an ad to keep flying" per flight.
  s = rep(s, '    async function startGame() {', `    let revUsed = false, revOffered = false;
    async function startGame() {
      if (Ads.busy() || (state !== 'menu' && state !== 'over') || !$('hangar').hidden) return;
      $('revive-btn').hidden = true;
      const offered = revOffered; revOffered = false;
      if (state === 'over' && !offered) await Ads.midgame(); // one ad break per crash: either this or the revive offer
      revUsed = false;
      return startGame0();
    }
    function revive() {
      revUsed = true; $('revive-btn').hidden = true;
      sim.alive = true; sim.hp = 2; sim.inv = 3; sim.vy = 0; sim.y = Math.min(8, Math.max(3, sim.y));
      sim.shots = []; sim.bullets = [];
      P.root.visible = true; P.root.rotation.set(0, 0, 0); P.root.userData.cy = undefined;
      pointerActive = false; boostQueued = false;
      overlay.classList.add('hidden'); hud.classList.add('on'); goBtn.textContent = t('takeOff');
      if (sim.boss) $('bossbar').hidden = false;
      countT = 3; state = 'countdown';
    }
    $('revive-btn').addEventListener('click', async () => {
      if (state !== 'over' || revUsed || Ads.busy()) return;
      const ok = await Ads.rewarded();
      if (ok && state === 'over') revive(); else if (!ok) toast(t('adNone'), 2);
    });
    async function startGame0() {`);
  s = rep(s, "      lastRun = { score: sim.score, level: sim.level }; $('share-btn').hidden = false; $('tg-btn').hidden = false;",
    "      lastRun = { score: sim.score, level: sim.level };\n      revOffered = Ads.can() && !revUsed && sim.score >= (window.GG_REVIVE_MIN ?? 1500); $('revive-btn').hidden = !revOffered;");
  // Tell the portal when the player is actually flying, and when loading is done.
  s = rep(s, '      updatePause(dt);\n', '      updatePause(dt);\n      Ads.track(state === \'playing\');\n');
  s = rep(s, '    requestAnimationFrame(n => { last = n; requestAnimationFrame(frame); });',
    `    requestAnimationFrame(n => { last = n; requestAnimationFrame(frame); });
    Ads.hooks({ mute: () => { if (ac && ac.state === 'running') ac.suspend(); }, unmute: () => { if (ac && ac.state === 'suspended') ac.resume(); } });
    Ads.loaded();`);
  if (portal === 'web') {
    // No ads here: paid skins unlock by best score only.
    s = rep(s, ": t('hgAd', { n: fmt(PALT[hgKind + ':' + it.id]) });", ": t('hgBest', { n: fmt(PALT[hgKind + ':' + it.id]) });");
    s = rep(s, 'if (!open && it.unlock.ngn) { adUnlock(hgKind, it); return; }', 'if (!open && it.unlock.ngn) return;');
  }
  // Anything left that points outside?
  const left = (s.match(/https?:\/\/[^\s"'<>)]+/g) || []).filter(u => !/sdk\.crazygames\.com|game-cdn\.poki\.com|html5\.api\.gamedistribution\.com|www\.w3\.org/.test(u));
  if (left.length) console.warn(portal, 'outside URLs left:', left);

  const out = path.join(here, 'dist', portal);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), s);
  for (const f of ['three.min.js', 'music.mp3']) fs.copyFileSync(path.join(COMMON, f), path.join(out, f));
  for (const f of fs.readdirSync(path.join(COMMON, 'fonts'))) fs.copyFileSync(path.join(COMMON, 'fonts', f), path.join(out, 'fonts', f));
  console.log('built', portal);
}

for (const p of ['crazygames', 'poki', 'gamedistribution', 'mock', 'web']) build(p);

// Portal ad adapter. window.GG_PORTAL is set at build time:
// 'crazygames' | 'poki' | 'gamedistribution' | 'mock' (local testing) | 'none'
window.Ads = (() => {
  const P = window.GG_PORTAL || 'none';
  let playing = false, busy = false, gdReward = false, gdDone = null;
  const hooks = { mute() {}, unmute() {} };
  const mute = () => { try { hooks.mute(); } catch (e) {} };
  const unmute = () => { try { hooks.unmute(); } catch (e) {} };
  const cg = () => window.CrazyGames && window.CrazyGames.SDK;
  const poki = () => window.PokiSDK;

  // GameDistribution talks back through events.
  if (P === 'gamedistribution') {
    window.GD_OPTIONS = window.GD_OPTIONS || {};
    window.GD_OPTIONS.onEvent = ev => {
      if (ev.name === 'SDK_GAME_PAUSE') mute();
      else if (ev.name === 'SDK_GAME_START') { unmute(); if (gdDone) gdDone(); }
      else if (ev.name === 'SDK_REWARDED_WATCH_COMPLETE') gdReward = true;
      else if (ev.name === 'SDK_READY') gdPreload();
    };
  }

  function gdPreload() { try { const g = window.gdsdk; if (g && typeof g.preloadAd === 'function') { const p = g.preloadAd('rewarded'); if (p && p.catch) p.catch(() => {}); } } catch (e) {} }

  const ready = (async () => {
    try {
      if (P === 'crazygames' && cg()) { await cg().init(); cg().game.loadingStart(); }
      else if (P === 'poki' && poki()) await poki().init();
    } catch (e) {}
  })();

  function loaded() {
    ready.then(() => {
      try {
        if (P === 'crazygames' && cg()) cg().game.loadingStop();
        else if (P === 'poki' && poki()) poki().gameLoadingFinished();
      } catch (e) {}
    });
  }

  // Called every frame with "is the player flying right now".
  function track(on) {
    if (on === playing) return;
    playing = on;
    try {
      if (P === 'crazygames' && cg()) on ? cg().game.gameplayStart() : cg().game.gameplayStop();
      else if (P === 'poki' && poki()) on ? poki().gameplayStart() : poki().gameplayStop();
    } catch (e) {}
  }

  function mockAd(rewarded) {
    return new Promise(res => {
      const d = document.createElement('div');
      d.id = 'mock-ad';
      d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:700 28px sans-serif';
      d.textContent = rewarded ? 'TEST REWARDED AD' : 'TEST AD';
      document.body.appendChild(d); mute();
      setTimeout(() => { d.remove(); unmute(); res(true); }, 1200);
    });
  }

  function show(type) { // type: 'midgame' | 'rewarded'. Resolves true if the reward was earned / ad finished.
    const rewarded = type === 'rewarded';
    return new Promise(res => {
      let finished = false;
      const fin = v => { if (finished) return; finished = true; gdDone = null; res(v); };
      try {
        if (P === 'mock') return mockAd(rewarded).then(fin);
        if (P === 'crazygames' && cg()) {
          let started = false;
          cg().ad.requestAd(rewarded ? 'rewarded' : 'midgame', {
            adStarted: () => { started = true; mute(); },
            adFinished: () => { unmute(); fin(true); },
            adError: () => { if (started) unmute(); fin(false); }
          });
          return;
        }
        if (P === 'poki' && poki()) {
          if (rewarded) poki().rewardedBreak({ size: 'medium', onStart: mute }).then(ok => { unmute(); fin(!!ok); }).catch(() => { unmute(); fin(false); });
          else poki().commercialBreak(mute).then(() => { unmute(); fin(true); }).catch(() => { unmute(); fin(false); });
          return;
        }
        const g = window.gdsdk;
        if (P === 'gamedistribution' && g && typeof g.showAd === 'function') {
          gdReward = false;
          const done = () => setTimeout(() => { fin(rewarded ? gdReward : true); if (rewarded) gdPreload(); }, 300);
          gdDone = done;
          const p = rewarded ? g.showAd('rewarded') : g.showAd();
          if (p && typeof p.then === 'function') p.then(done, () => { unmute(); fin(false); });
          return;
        }
      } catch (e) {}
      fin(false);
    });
  }

  async function run(type) {
    if (busy) return false;
    busy = true;
    try { await Promise.race([ready, new Promise(r => setTimeout(r, 1500))]); return await show(type); }
    finally { busy = false; }
  }

  return {
    portal: P,
    hooks: h => Object.assign(hooks, h),
    loaded, track,
    busy: () => busy,
    can: () => P !== 'none',
    midgame: () => run('midgame'),
    rewarded: () => run('rewarded')
  };
})();

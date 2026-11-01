    /* ================= Pause ================= */
    let countT = 0;
    const pauseBtn = $('fx-pause'), countEl = $('count');
    function pauseGame() {
      if (state !== 'playing' && state !== 'countdown') return;
      state = 'paused'; countEl.hidden = true;
      pointerActive = false; boostQueued = false; for (const k in keys) keys[k] = false;
      $('pause-info').textContent = `Score ${sim.score} · Level ${sim.level} · ${Math.round(sim.x)} m`;
      $('pause').hidden = false;
      buzz(20);
    }
    function resumeGame() {
      if (state !== 'paused') return;
      $('pause').hidden = true; audioStart();
      countT = 3; state = 'countdown';
    }
    function quitGame() {
      if (state !== 'paused') return;
      $('pause').hidden = true; session = null; state = 'over';
      $('ov-title').innerHTML = 'Flight cancelled';
      $('ov-text').textContent = `You quit at level ${sim.level} with ${sim.score}. Ready to fly again?`;
      $('result').textContent = 'Points from a quit flight are not saved.';
      $('bossbar').hidden = true; goBtn.textContent = 'Fly Again';
      overlay.classList.remove('hidden'); hud.classList.remove('on');
    }
    pauseBtn.addEventListener('click', pauseGame);
    $('resume-btn').addEventListener('click', resumeGame);
    $('quit-btn').addEventListener('click', quitGame);
    // Pause by itself when the player leaves: app switch, phone call, screen lock, another window
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
    window.addEventListener('blur', pauseGame);
    function updatePause(dt) {
      const show = state === 'playing' || state === 'countdown';
      if (pauseBtn.hidden === show) pauseBtn.hidden = !show;
      if (state !== 'countdown') return;
      countT -= dt;
      if (countT <= 0) { state = 'playing'; acc = 0; countEl.hidden = true; toast('Go!', 0.6); return; }
      const n = String(Math.ceil(countT));
      if (countEl.textContent !== n) { countEl.textContent = n; countEl.hidden = false; tone(660, 0.12, 'square', 0.08); buzz(15); }
    }


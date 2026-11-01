    /* ================= 4D effects: sound, vibration, camera, sky (phone only, never changes the score) ================= */
    const pref = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
    const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    const FX = { sound: pref('ggSound', '1') === '1', buzz: pref('ggBuzz', '1') === '1' };
    function buzz(p) { if (FX.buzz && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

    // --- Sound: a tiny synthesiser, no audio files to download ---
    let ac = null, eng = null, noiseBuf = null;
    function audioStart() {
      if (!FX.sound) return;
      try {
        if (!ac) {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
          const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
          o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 70; o2.frequency.value = 35;
          f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0;
          o1.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination); o1.start(); o2.start();
          eng = { o1, o2, f, g };
        }
        if (ac.state === 'suspended') ac.resume();
      } catch (e) { ac = null; }
    }
    function tone(freq, dur, type = 'square', vol = 0.12, slideTo = 0, delay = 0) {
      if (!ac || !FX.sound) return;
      const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, vol = 0.4, from = 1200, to = 80, type = 'lowpass') {
      if (!ac || !FX.sound) return;
      const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = type;
      f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + dur + 0.05);
    }
    const chime = notes => notes.forEach((n, i) => tone(n, 0.16, 'triangle', 0.12, 0, i * 0.07));

    // --- Wind streaks rushing past, between the plane and your eyes ---
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
    const streakGeo = new THREE.BoxGeometry(1, 0.035, 0.035);
    const streaks = [];
    for (let i = 0; i < 36; i++) { const m = new THREE.Mesh(streakGeo, streakMat); m.visible = false; m.userData.z = rand(2, 11); scene.add(m); streaks.push(m); }

    // --- Shockwave rings ---
    const rings = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      m.visible = false; m.userData = { life: 0, max: 1, grow: 6 }; scene.add(m); rings.push(m);
    }
    let ringIdx = 0;
    function ring(x, y, color, size = 6, life = 0.5) {
      const m = rings[ringIdx]; ringIdx = (ringIdx + 1) % rings.length;
      m.position.set(x, y, 0.3); m.material.color.setHex(color); m.visible = true;
      m.userData.life = m.userData.max = life; m.userData.grow = size; m.scale.setScalar(0.3);
    }
    // Debris that flies out of the screen at you
    function popOut(x, y, colors, n) {
      for (let i = 0; i < n; i++) emit(x, y, 0.5, rand(-4, 4), rand(-1, 5), rand(7, 15), colors[i % colors.length], rand(0.6, 1.1), rand(0.12, 0.3), 5);
    }

    // --- Stars for night levels ---
    const starGeo = new THREE.BufferGeometry(), starPos = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) { starPos[i * 3] = rand(-90, 90); starPos[i * 3 + 1] = rand(14, 60); starPos[i * 3 + 2] = -85; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(stars);

    // --- Sky moods: each level looks different, boss fights bring a storm ---
    const SKIES = [
      { sky: 0x8fd3ff, hemi: 0.85, sun: 0.75, sunC: 0xfff1d6, night: 0 },   // level 1: Lagos day
      { sky: 0xffb46e, hemi: 0.75, sun: 0.8, sunC: 0xffc38a, night: 0 },    // level 2: golden sunset
      { sky: 0x7a6bd6, hemi: 0.6, sun: 0.55, sunC: 0xd9c2ff, night: 0.4 }, // level 3: dusk
      { sky: 0x1d2752, hemi: 0.5, sun: 0.45, sunC: 0x9fb4ff, night: 1 }    // level 4+: starry night
    ];
    const STORM = { sky: 0x4a3b5c, hemi: 0.55, sun: 0.4, sunC: 0xd6c9ff, night: 0.3 };
    const hemiLight = scene.children.find(o => o.isHemisphereLight);
    const skyNow = new THREE.Color(0x8fd3ff), skyWant = new THREE.Color(), sunWant = new THREE.Color(), white = new THREE.Color(0xffffff);
    let nightNow = 0, lightning = 0, hitStop = 0, roll = 0, fovNow = FOV, camLift = 0, camPull = 0;

    function fx4d(e) {
      if (e.t === 'hit') { buzz([60, 40, 60]); noise(0.35, 0.5, 900, 60); tone(140, 0.3, 'sawtooth', 0.12, 50); hitStop = 0.07; ring(sim.x, sim.y, 0xffffff, 3.5, 0.3); }
      else if (e.t === 'net') { buzz(90); tone(300, 0.35, 'sine', 0.12, 120); }
      else if (e.t === 'block') { buzz(35); tone(520, 0.12, 'square', 0.1, 760); ring(sim.x, sim.y, 0xff7a1a, 3, 0.3); }
      else if (e.t === 'jar') { buzz(15); chime([880, 1320]); ring(e.x, e.y, 0xfde047, 2.5, 0.35); }
      else if (e.t === 'pepper' || e.t === 'heart' || e.t === 'cannon') { buzz([20, 30, 20]); chime([660, 880, 1100]); ring(e.x, e.y, e.t === 'heart' ? 0xff4d6d : e.t === 'pepper' ? 0xd62828 : 0xffb020, 3, 0.4); }
      else if (e.t === 'shotDown') { tone(900, 0.06, 'square', 0.05, 400); }
      else if (e.t === 'boost') { buzz(25); noise(0.45, 0.25, 400, 2400, 'bandpass'); }
      else if (e.t === 'bossIn') { buzz([100, 60, 100, 60, 220]); tone(110, 1.3, 'sawtooth', 0.14, 70); noise(1.2, 0.3, 300, 60); lightning = 0.25; }
      else if (e.t === 'bossFire') { buzz(18); noise(0.18, 0.18, 600, 100); if (Math.random() < 0.25) lightning = 0.18; }
      else if (e.t === 'bossHit') { tone(260 + Math.random() * 80, 0.05, 'square', 0.05); }
      else if (e.t === 'bossDown') { buzz([80, 40, 80, 40, 450]); noise(1.4, 0.7, 1500, 40); chime([523, 659, 784, 1047]); ring(e.x, e.y + 1, 0xfde047, 14, 0.9); ring(e.x, e.y + 1, 0xff7a1a, 9, 0.7); popOut(e.x, e.y + 1, [0xd9822b, 0xc1121f, 0xf2c230], 26); hitStop = 0.15; }
      else if (e.t === 'level') { setTimeout(() => chime([523, 784, 1047, 1568]), 1600); }
      else if (e.t === 'crash') { buzz([200, 80, 320]); noise(1.0, 0.7, 1200, 40); ring(sim.x, sim.y, 0xff7a1a, 7, 0.6); popOut(sim.x, sim.y, [0xf59e0b, 0xfde047, 0x1f8f3d], 18); }
    }

    function update4D(dt, camX) {
      const flying = sim && (state === 'playing' || state === 'crashed');
      // Engine hum follows your speed
      if (eng && ac) {
        const on = FX.sound && sim && state === 'playing';
        const sp = sim ? sim.speed : 7, b = sim ? sim.boost : 0;
        eng.g.gain.setTargetAtTime(on ? 0.045 + b * 0.03 : 0, ac.currentTime, 0.15);
        eng.o1.frequency.setTargetAtTime(55 + sp * 3.2 + b * 45, ac.currentTime, 0.1);
        eng.o2.frequency.setTargetAtTime(28 + sp * 1.6, ac.currentTime, 0.1);
        eng.f.frequency.setTargetAtTime(300 + b * 900, ac.currentTime, 0.1);
      }
      // Sky mood
      const mood = sim && sim.boss ? STORM : SKIES[Math.min(SKIES.length - 1, (sim ? sim.level : 1) - 1)];
      skyWant.setHex(mood.sky);
      const k = Math.min(1, dt * 0.8);
      skyNow.lerp(skyWant, k);
      nightNow = lerp(nightNow, mood.night, k);
      if (sim && sim.boss && Math.random() < dt * 0.12) { lightning = 0.2; setTimeout(() => noise(1.1, 0.35, 200, 40), 250); }
      lightning = Math.max(0, lightning - dt);
      const flashK = lightning > 0 && Math.floor(lightning * 30) % 2 === 0 ? 0.7 : 0;
      scene.background.copy(skyNow).lerp(white, flashK);
      scene.fog.color.copy(scene.background);
      if (hemiLight) hemiLight.intensity = lerp(hemiLight.intensity, mood.hemi, k) + flashK * 0.6;
      sun.intensity = lerp(sun.intensity, mood.sun, k); sunWant.setHex(mood.sunC); sun.color.lerp(sunWant, k);
      stars.material.opacity = nightNow * 0.9;
      stars.position.x = camX * 0.9;

      // Wind streaks
      const sp = sim ? sim.speed : 0, b = sim ? sim.boost : 0;
      const show = sim && state === 'playing';
      const want = show ? Math.min(streaks.length, Math.round(6 + sp * 1.2 + b * 18)) : 0;
      streakMat.opacity = 0.25 + b * 0.35;
      streaks.forEach((m, i) => {
        if (i >= want) { m.visible = false; return; }
        const z = m.userData.z, near = (camDist - z) / camDist, w = halfW * near + 4;
        if (!m.visible || m.position.x < camX - w - 3) {
          m.visible = true;
          m.position.set(camX + w + rand(0, 14), rand(0.5, halfH * 2 - 1) , z);
        }
        m.position.x -= (sp * 1.6 + 6 + b * 30) * dt;
        m.scale.x = 0.8 + sp * 0.12 + b * 3;
      });

      // Shockwave rings
      for (const m of rings) {
        if (!m.visible) continue;
        const u = m.userData; u.life -= dt;
        if (u.life <= 0) { m.visible = false; continue; }
        const t = 1 - u.life / u.max;
        m.scale.setScalar(0.3 + t * u.grow); m.material.opacity = 0.8 * (1 - t);
      }
      return flying;
    }

    function placeCamera(dt, camX) {
      const b = sim && state === 'playing' ? sim.boost : 0;
      const vy = sim && state === 'playing' ? sim.vy : 0;
      // tilt as you climb and dive, pull back for a boss fight, widen on boost
      roll = lerp(roll, -vy * 0.006, Math.min(1, dt * 4));
      camPull = lerp(camPull, sim && sim.boss ? 1 : 0, Math.min(1, dt * 1.5));
      camLift = lerp(camLift, sim && state === 'playing' ? (sim.y - 7) * 0.08 : 0, Math.min(1, dt * 2));
      const fovWant = FOV + b * 7;
      if (Math.abs(fovWant - fovNow) > 0.01) { fovNow = lerp(fovNow, fovWant, Math.min(1, dt * 6)); camera.fov = fovNow; camera.updateProjectionMatrix(); }
      const camY = halfH - 1.2 + camLift;
      const sx = rand(-1, 1) * shake * 0.4, sy = rand(-1, 1) * shake * 0.4;
      camera.position.set(camX - 2.5 - b * 1.2 - camPull * 1.5 + sx, camY + 1.5 + camPull * 0.6 + sy, camDist * (1 + camPull * 0.08));
      camera.lookAt(camX - camPull * 0.5, camY, 0);
      camera.rotateZ(roll + Math.sin(time * 0.7) * 0.004);
    }

    // Sound and vibration switches
    function renderFxButtons() {
      $('fx-sound').textContent = FX.sound ? '🔊' : '🔇';
      $('fx-buzz').textContent = FX.buzz ? '📳' : '📴';
      $('fx-sound').setAttribute('aria-label', FX.sound ? 'Sound on' : 'Sound off');
      $('fx-buzz').setAttribute('aria-label', FX.buzz ? 'Vibration on' : 'Vibration off');
    }
    $('fx-sound').addEventListener('click', () => { FX.sound = !FX.sound; setPref('ggSound', FX.sound ? '1' : '0'); if (FX.sound) audioStart(); renderFxButtons(); });
    $('fx-buzz').addEventListener('click', () => { FX.buzz = !FX.buzz; setPref('ggBuzz', FX.buzz ? '1' : '0'); if (FX.buzz) buzz(40); renderFxButtons(); });
    if (!navigator.vibrate) $('fx-buzz').hidden = true; // iPhones do not allow web vibration
    renderFxButtons();


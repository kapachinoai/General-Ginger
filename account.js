    function renderAccount() {
      const el = $('account');
      if (!authOn) { el.hidden = true; return; }
      el.hidden = false; el.textContent = '';
      const btn = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'link-btn'; b.textContent = label; b.addEventListener('click', fn); return b; };
      if (!account || !account.signedIn) {
        el.append('Playing as a guest. ', btn('Sign in', () => openSignin('login')), ' · ', btn('New player? Sign up', () => openSignin('email')));
      } else if (!account.tag) {
        el.append('Signed in. ', btn('Choose your gamer tag', () => openSignin('tag')));
      } else {
        const b = document.createElement('b'); b.textContent = account.tag;
        el.append(b, ` · ${Number(account.total || 0).toLocaleString()} pts · today ${account.today || 0}/${account.dailyCap || 0} `,
          btn('Set password', () => openSignin('setpw')), ' · ',
          btn('Sign out', async () => { try { await sbClient.auth.signOut(); } catch (e) {} account = null; renderAccount(); toast('Signed out', 1.5); }));
      }
    }
    // Steps: login (tag + password) · email (send link) · code · tag (new player: tag + password) · setpw (new password)
    let siStep = 'login', siEmail = '';
    const WANT_PW = 'ggWantPw'; // remembered across the email link so we can ask for a password afterwards
    function openSignin(step) {
      siStep = step; $('si-msg').textContent = '';
      const input = $('si-input'), pass = $('si-pass'), alt = $('si-alt');
      input.value = ''; pass.value = '';
      input.hidden = false; pass.hidden = true; alt.hidden = true;
      const set = (title, text, go) => { $('si-title').textContent = title; $('si-text').textContent = text; $('si-go').textContent = go; };
      if (step === 'login') {
        set('Sign in', 'Use your gamer tag and password.', 'Sign in');
        input.type = 'text'; input.placeholder = 'Gamer tag'; input.autocomplete = 'username'; input.inputMode = 'text';
        pass.hidden = false; pass.placeholder = 'Password'; pass.autocomplete = 'current-password';
        alt.hidden = false; alt.textContent = 'New player or forgot your password? Use your email';
        alt.onclick = () => openSignin('email');
      } else if (step === 'email') {
        set('Sign up or reset password', "Enter your email and we'll send you a sign-in link. You only need it once: after that you sign in with your gamer tag and password.", 'Send link');
        input.type = 'email'; input.placeholder = 'you@email.com'; input.autocomplete = 'email'; input.inputMode = 'email';
        alt.hidden = false; alt.textContent = 'Already have a password? Sign in with your gamer tag';
        alt.onclick = () => openSignin('login');
      } else if (step === 'code') {
        set('Check your email', `We sent a sign-in email to ${siEmail}. Open it on this device and tap the link, or type the 6-digit code if the email shows one. Check spam too.`, 'Sign in');
        input.type = 'text'; input.placeholder = '123456'; input.autocomplete = 'one-time-code'; input.inputMode = 'numeric';
      } else if (step === 'tag') {
        set('Create your player', 'Pick your gamer tag (3 to 15 letters, numbers or underscores) and a password with at least 8 characters.', 'Save');
        input.type = 'text'; input.placeholder = 'Naija_Ace'; input.autocomplete = 'username'; input.inputMode = 'text';
        pass.hidden = false; pass.placeholder = 'New password'; pass.autocomplete = 'new-password';
      } else { // setpw
        input.hidden = true;
        set('Set your password', `Choose a password with at least 8 characters. Next time, sign in with ${account && account.tag ? account.tag : 'your gamer tag'} and this password.`, 'Save password');
        pass.hidden = false; pass.placeholder = 'New password'; pass.autocomplete = 'new-password';
      }
      $('si-cancel').hidden = step === 'tag'; // a signed-in player must pick a tag before flying
      $('signin').hidden = false;
      setTimeout(() => (input.hidden ? pass : input).focus(), 50);
    }
    const closeSignin = () => { $('signin').hidden = true; };
    $('si-cancel').addEventListener('click', closeSignin);
    const pwProblem = p => p.length < 8 ? 'Use at least 8 characters for your password.' : p.length > 72 ? 'That password is too long.' : '';
    async function savePassword(p) {
      const { error } = await sbClient.auth.updateUser({ password: p });
      if (error && !/different from the old/i.test(error.message || '')) return error.message || 'Could not save your password. Try again.';
      try { localStorage.removeItem(WANT_PW); } catch (e) {}
      return '';
    }
    $('si-form').addEventListener('submit', async e => {
      e.preventDefault();
      const v = $('si-input').value.trim(), pw = $('si-pass').value, go = $('si-go'), say = t => { $('si-msg').textContent = t; };
      go.disabled = true;
      try {
        if (siStep === 'login') {
          if (!/^[A-Za-z0-9_]{3,15}$/.test(v) || !pw) return say('Enter your gamer tag and password.');
          const r = await api('/login', { tag: v, password: pw });
          if (!r.ok || !r.body.ok) return say(r.body.reason || (r.status === 0 ? 'No connection. Try again.' : 'Wrong gamer tag or password.'));
          const { error } = await sbClient.auth.setSession({ access_token: r.body.access_token, refresh_token: r.body.refresh_token });
          if (error) return say('Could not sign you in. Try again.');
          await refreshAccount(); closeSignin();
          toast(`Welcome back, ${r.body.tag}!`, 2);
        } else if (siStep === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return say('Enter a valid email address.');
          const { error } = await sbClient.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
          if (error) return say(error.message || 'Could not send the email. Try again.');
          try { localStorage.setItem(WANT_PW, '1'); } catch (e) {}
          siEmail = v; openSignin('code');
        } else if (siStep === 'code') {
          if (!/^\d{6}$/.test(v)) return say('Tap the link in the email, or enter the 6-digit code if it has one.');
          const { error } = await sbClient.auth.verifyOtp({ email: siEmail, token: v, type: 'email' });
          if (error) return say('That code is wrong or has expired. Check it, or press Cancel and send a new one.');
          await refreshAccount();
          openSignin(needsTag() ? 'tag' : 'setpw');
        } else if (siStep === 'tag') {
          if (!/^[A-Za-z0-9_]{3,15}$/.test(v)) return say('Gamer tag: use 3 to 15 letters, numbers or underscores.');
          const bad = pwProblem(pw); if (bad) return say(bad);
          const r = await api('/profile', { tag: v });
          if (!r.ok || !r.body.ok) return say(r.body.reason || 'Could not save your gamer tag. Try again.');
          const pwErr = await savePassword(pw);
          await refreshAccount();
          if (pwErr) { openSignin('setpw'); return say(pwErr); }
          closeSignin();
          toast(`Welcome, ${v}! Tap Take Off to fly`, 2.5);
        } else {
          const bad = pwProblem(pw); if (bad) return say(bad);
          const pwErr = await savePassword(pw); if (pwErr) return say(pwErr);
          closeSignin(); toast('Password saved', 2);
        }
      } finally { go.disabled = false; }
    });
    if (authOn) {
      // Returning from the email link: supabase-js reads the login from the address and signs in.
      sbClient.auth.onAuthStateChange(async event => {
        await refreshAccount();
        if (event === 'SIGNED_IN') {
          if (location.hash.includes('access_token')) history.replaceState(null, '', location.pathname);
          let wantPw = false; try { wantPw = localStorage.getItem(WANT_PW) === '1'; } catch (e) {}
          const idle = state === 'menu' || state === 'over'; // mid-flight: asked when the run ends
          if (needsTag()) { if (idle) openSignin('tag'); }
          else if (wantPw && siStep !== 'setpw' && siStep !== 'login') { if (idle) openSignin('setpw'); }
          else if (!$('signin').hidden && siStep !== 'tag' && siStep !== 'setpw') closeSignin();
        }
      });
      refreshAccount();
    }


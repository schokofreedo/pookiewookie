/* Pookiewookie: game flow (title → globe → dive → hub → level), saving, input, pause menu, fullscreen, settings, overlays, main loop. */
(function () {
  const G = window.PW, $ = s => document.querySelector(s), A = () => G.audio, S = G.S, P = G.P, E = G.eng, input = G.input, VW = G.VW, VH = G.VH, T = G.T;
  const HASH = location.hash.replace('&mobile', ''), MOBILE = location.hash.includes('mobile');
  const canvas = $('#c'); G.draw.init(canvas);
  const N = G.levelCount();
  let cardT = 0, mapSel = 0, resetArmed = false, pausedFrom = 'play', assist = false;
  try { assist = localStorage.getItem('pookie-assist') === '1'; } catch (e) {}
  let save = {unlocked: 0, stars: {}, best: {}, done: {}};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem('pookie-save') || '{}') || {}); } catch (e) {}
  const persist = () => { try { localStorage.setItem('pookie-save', JSON.stringify(save)); } catch (e) {} };
  const key = (wi, li) => wi + '-' + li;
  const OVERLAYS = ['title', 'map', 'card', 'clear', 'over', 'win', 'pause'];
  const GLOBE_MUSIC = {bpm: 84, pattern: 2, transpose: 2, lead: 'bell', bass: 'sine', perc: 0};
  const globeOk = G.globe && G.globe.init($('#globe'), $('#globeUI'));
  /* touch devices get the on-screen pad, landscape prompt and fullscreen on start */
  const isTouch = MOBILE || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches) || matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouch) { document.body.classList.add('touch'); input.run = true; }   /* on touch Wookie always runs; B only shoots */
  const resetInput = () => { for (const k in input) input[k] = false; input.run = isTouch; };
  function goFullscreen() {
    if (document.fullscreenElement) return;
    try { const el = document.documentElement, p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, {navigationUI: 'hide'}); if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} fit(); }).catch(() => {}); } catch (e) {}
  }
  /* start screen → publisher intro → title. The first tap also unlocks audio and (on phones) fullscreen. */
  function startBrand() {
    if (S.mode !== 'boot') return; if (!HASH.startsWith('#brand')) A().init(); if (isTouch) goFullscreen();   /* (#brand = headless screenshot run without audio) */
    S.mode = 'brand'; hideAll(); G.brand.start(() => showTitle());
  }

  /* ---------------- flow hooks used by the engine ---------------- */
  G.flow = {
    speak(text, o) {
      A().say(text, o);
      const b = $('#bubble'); b.textContent = text; b.classList.remove('on', 'sad'); void b.offsetWidth; b.classList.add('on'); if (o && o.sad) b.classList.add('sad');
      clearTimeout(G.flow.tm); G.flow.tm = setTimeout(() => b.classList.remove('on'), 2600);
    },
    banner(title, t, sub) { const b = $('#banner'); b.innerHTML = `<div>${title}</div>${sub ? `<small>${sub}</small>` : ''}`; b.classList.add('on'); clearTimeout(G.flow.bt); G.flow.bt = setTimeout(() => b.classList.remove('on'), t * 1000); },
    afterDeath() {
      S.lives--; $('#bubble').classList.remove('on');
      if (S.lives <= 0) { gameOver(); return; }
      E.load(S.wi, S.li, true); S.mode = 'play'; A().startMusic(); if (assist) G.gad.give('bubble', true);
    },
    levelClear() {
      S.mode = 'clear'; const bonus = Math.ceil(S.time) * 10; S.score += bonus; A().sfx.clear(); A().fast = false; A().slow = false;
      const idx = S.wi * 4 + S.li, k = key(S.wi, S.li);
      save.unlocked = Math.max(save.unlocked, idx + 1); save.done[k] = true;
      const prev = save.stars[k] || [false, false, false]; save.stars[k] = prev.map((b, i) => b || S.stars[i]);
      save.best[k] = Math.max(save.best[k] || 0, S.score); persist();
      const L = G.L;
      if (L.world.boss.final && L.rescued) { win(); return; }
      $('#clear').hidden = false; $('#clear-title').textContent = (L.tower ? 'Turm geschafft' : L.sub + ' geschafft');
      $('#clear-stars').textContent = S.stars.map(b => b ? '★' : '☆').join(' ');
      $('#clear-stats').innerHTML = `<div class="row"><dt>Zeitbonus</dt><dd>${bonus}</dd></div><div class="row"><dt>Punkte</dt><dd>${S.score.toLocaleString('de-DE')}</dd></div><div class="row"><dt>Herzen</dt><dd>${S.hearts}</dd></div><div class="row"><dt>Leben</dt><dd>${S.lives}</dd></div>`;
      $('#clear-next').hidden = idx + 1 >= N; $('#clear-next').textContent = S.li === 3 ? 'Nächste Welt' : 'Nächstes Level';
      mapSel = Math.min(N - 1, idx + 1);
      G.flow.speak('Yay! I did it!', {happy: true});
    },
  };

  /* ---------------- level, hub, globe flow ---------------- */
  function startLevel(idx) {
    S.wi = Math.floor(idx / 4); S.li = idx % 4; mapSel = idx;
    E.load(S.wi, S.li, false); S.mode = 'card'; cardT = 0; if (assist) G.gad.give('bubble', true);
    const W = G.WORLDS[S.wi];
    $('#card').hidden = false; $('#card-world').textContent = 'Welt ' + (S.wi + 1) + ' · ' + W.name; $('#card-title').textContent = (S.li + 1) + '. ' + W.levels[S.li]; $('#card-lives').textContent = 'Wookie × ' + S.lives;
    $('#card').style.background = `linear-gradient(${W.sky[0]}, ${W.sky[1]})`;
    hideAll(['card']); A().stopMusic(); $('#btnPause').textContent = 'Pause';
  }
  function beginPlay() { $('#card').hidden = true; S.mode = 'play'; A().startMusic(); S.voiceT = 1.2; }
  function gameOver() { S.mode = 'over'; S.lives = 4; $('#over').hidden = false; $('#over-score').textContent = S.score.toLocaleString('de-DE') + ' Punkte'; A().stopMusic(); }
  function win() { S.mode = 'win'; const total = Object.values(save.stars).reduce((a, s) => a + s.filter(Boolean).length, 0); $('#win').hidden = false; $('#win-score').textContent = S.score.toLocaleString('de-DE') + ' Punkte · ' + total + ' von ' + (N * 3) + ' Sternkeksen'; A().stopMusic(); A().sfx.rescue(); }
  function hideAll(except) { for (const id of OVERLAYS) $('#' + id).hidden = !(except || []).includes(id); if (globeOk && !(except || []).includes('globe')) G.globe.hide(); }
  function showTitle() { S.mode = 'title'; hideAll(['title']); A().stopMusic(); A().fast = false; A().slow = false; }
  function worldProgress(wi) { let done = 0, stars = 0; for (let li = 0; li < 4; li++) { const k = key(wi, li); if (save.done[k]) done++; stars += (save.stars[k] || []).filter(Boolean).length; } return {done, stars}; }
  function showGlobe(wi) {
    if (!globeOk) { showMap(); return; }
    S.mode = 'globe'; hideAll(['globe']); G.globe.show(wi !== undefined ? wi : S.wi);
    const totalStars = Object.values(save.stars).reduce((a, s) => a + s.filter(Boolean).length, 0);
    $('#gprog').textContent = `${Object.keys(save.done).length} von ${N} Leveln geschafft · ${totalStars} von ${N * 3} Sternkeksen`;
    A().stopMusic(); A().fast = false; A().slow = false; A().setWorld(GLOBE_MUSIC); A().setBoss(false); A().startMusic();
  }
  function showHub(wi, fromSky) { hideAll(); A().stopMusic(); G.hub.enter(wi, fromSky); $('#btnPause').textContent = 'Globus'; }
  if (globeOk) { G.globe.progress = worldProgress; G.globe.onPick = wi => { S.mode = 'dive'; A().stopMusic(); G.dive.start(wi, () => showHub(wi, true)); }; }
  G.hub.onStart = idx => { A().sfx.select(); G.flow.speak("Let's go!", {happy: true}); startLevel(idx); };
  G.hub.starsFor = idx => save.stars[key(Math.floor(idx / 4), idx % 4)] || [false, false, false];
  G.hub.doneFor = idx => !!save.done[key(Math.floor(idx / 4), idx % 4)];

  /* fallback world map without WebGL */
  function showMap() { S.mode = 'map'; hideAll(['map']); A().stopMusic(); renderMap(); }
  function renderMap() {
    const box = $('#worlds'); box.innerHTML = '';
    const totalStars = Object.values(save.stars).reduce((a, s) => a + s.filter(Boolean).length, 0);
    $('#map-progress').textContent = `${Object.keys(save.done).length} von ${N} Leveln geschafft · ${totalStars} von ${N * 3} Sternkeksen`;
    G.WORLDS.forEach((W, wi) => {
      const sec = document.createElement('section'); sec.className = 'world'; sec.style.background = `linear-gradient(135deg, ${W.sky[0]}, ${W.sky[1]} 60%, ${W.sky[2]})`;
      sec.innerHTML = `<h3><span>Welt ${wi + 1}</span>${W.name}</h3><div class="nodes"></div>`;
      const nodes = sec.querySelector('.nodes');
      W.levels.forEach((name, li) => {
        const idx = wi * 4 + li, k = key(wi, li), st = save.stars[k] || [false, false, false];
        const b = document.createElement('button'); b.type = 'button'; b.className = 'node' + (idx === mapSel ? ' sel' : '') + (save.done[k] ? ' done' : '') + (li === 3 ? ' tower' : '');
        b.innerHTML = `<b>${li === 3 ? '♜' : li + 1}</b><span>${name}</span><i>${st.map(x => x ? '★' : '☆').join('')}</i>`;
        b.addEventListener('click', () => { A().sfx.select(); startLevel(idx); });
        b.addEventListener('mouseenter', () => { mapSel = idx; markSel(); });
        nodes.append(b);
      });
      box.append(sec);
    });
    markSel();
  }
  function markSel() { document.querySelectorAll('#worlds .node').forEach((b, i) => b.classList.toggle('sel', i === mapSel)); }
  function mapMove(d) { let n = mapSel + d; if (n < 0) n = 0; if (n >= N) n = N - 1; mapSel = n; markSel(); A().sfx.select(); }

  /* ---------------- pause and fullscreen ---------------- */
  function pauseGame() {
    if (S.mode !== 'play' && S.mode !== 'card') return;
    pausedFrom = S.mode; S.mode = 'pause'; A().stopMusic(); A().sfx.pause(); resetInput();
    $('#pause-level').textContent = 'Welt ' + (S.wi + 1) + '-' + (S.li + 1) + ' · ' + G.WORLDS[S.wi].levels[S.li];
    $('#pause').hidden = false; $('#btnResume').focus(); $('#btnPause').textContent = 'Weiter';
  }
  function resumeGame() { if (S.mode !== 'pause') return; $('#pause').hidden = true; S.mode = pausedFrom; $('#btnPause').textContent = 'Pause'; if (S.mode === 'play') A().startMusic(); }
  function restartLevel() { $('#pause').hidden = true; S.lives = Math.max(S.lives, 1); startLevel(S.wi * 4 + S.li); }
  function toggleFull() {
    try {
      if (document.fullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      else { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {}); }
    } catch (e) {}
  }
  const updateFullBtns = () => { const on = !!document.fullscreenElement; document.querySelectorAll('.btnFull').forEach(b => b.textContent = on ? 'Vollbild aus' : 'Vollbild'); };
  document.addEventListener('fullscreenchange', () => { updateFullBtns(); setTimeout(fit, 50); setTimeout(fit, 400); });

  /* ---------------- settings ---------------- */
  $('#chkVoice').checked = A().voiceCfg.on !== false;
  $('#chkVoice').addEventListener('change', e => { A().voiceCfg.on = e.target.checked; A().saveVoiceCfg(); updateVoiceBtns(); });
  try { S.bearStyle = localStorage.getItem('pookie-style') || 'cool'; } catch (e) { S.bearStyle = 'cool'; }
  $('#selStyle').value = S.bearStyle;
  $('#selStyle').addEventListener('change', e => { S.bearStyle = e.target.value; try { localStorage.setItem('pookie-style', S.bearStyle); } catch (err) {} });
  $('#chkAssist').checked = assist;
  $('#chkAssist').addEventListener('change', e => { assist = e.target.checked; try { localStorage.setItem('pookie-assist', assist ? '1' : '0'); } catch (err) {} });
  const updateVoiceBtns = () => { document.querySelectorAll('.btnVoiceToggle').forEach(b => b.textContent = A().voiceCfg.on ? 'Stimme aus' : 'Stimme an'); };
  document.querySelectorAll('.btnVoiceToggle').forEach(b => b.addEventListener('click', () => { A().voiceCfg.on = !A().voiceCfg.on; A().saveVoiceCfg(); $('#chkVoice').checked = A().voiceCfg.on; updateVoiceBtns(); }));
  updateVoiceBtns();

  /* ---------------- step ---------------- */
  function step() {
    S.frames++;
    if (S.mode === 'card') { cardT += 1 / 60; if (cardT > 2) beginPlay(); return; }
    if (S.mode === 'brand') { G.brand.update(); return; }
    if (S.mode === 'dive') { G.dive.update(); return; }
    if (S.mode === 'hub') { E.updatePlayer(); E.updateParts(); E.updateCamera(); G.hub.update(); input.jumpEdge = false; input.runEdge = false; input.jumpKeyEdge = false; input.downEdge = false; return; }
    if (S.mode !== 'play') return;
    if (G.goalSeq) E.updateGoal(); else E.updatePlayer();
    G.entsMod.update(); E.updateParts();
    if (!P.dead && !G.goalSeq) {
      S.timeAcc += 1 / 60; if (S.timeAcc >= 1) { S.timeAcc -= 1; S.time--; if (S.time === 60) { A().sfx.time(); E.toast('Schnell!'); } if (S.time <= 0) { S.time = 0; E.die('time'); } }
      S.voiceT -= 1 / 60; if (S.voiceT <= 0) { S.voiceT = 16 + Math.random() * 12; const lines = G.L.world.lines; G.flow.speak(S.frames < 400 ? 'I need to find my Pookie!' : lines[Math.floor(Math.random() * lines.length)]); }
      if (G.L.world.wind && S.frames % 300 === 0) A().sfx.wind();
    }
    E.updateCamera();
    input.jumpEdge = false; input.runEdge = false; input.jumpKeyEdge = false; input.downEdge = false;
  }

  /* ---------------- input ---------------- */
  const KEYMAP = {ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', Space: 'jumpkey', KeyK: 'jumpkey', KeyZ: 'jumpkey', ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run', ControlLeft: 'run', ArrowDown: 'down', KeyS: 'down'};
  function press(name, down) {
    if (name === 'jumpkey') { if (down && !input.jump) { input.jumpEdge = true; input.jumpKeyEdge = true; } input.jump = down; return; }
    if (name === 'up') { if (down && !input.up) input.jumpEdge = true; input.up = down; if (!P.climbing) input.jump = down || input.jump; if (!down && !input.jumpHeldByKey) input.jump = false; return; }
    if (name === 'run' && isTouch) { if (down) input.runEdge = true; return; }
    if (down && !input[name] && name === 'run') input.runEdge = true;
    if (down && !input[name] && name === 'down') input.downEdge = true;
    input[name] = down;
  }
  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
    const n = KEYMAP[e.code]; if (n && (S.mode === 'play' || S.mode === 'card' || S.mode === 'hub')) { press(n, true); e.preventDefault(); }
    if (e.repeat) return;
    if (S.mode === 'boot') { startBrand(); return; }
    if (S.mode === 'brand') { G.brand.skip(); return; }
    if (e.code === 'KeyF') { toggleFull(); return; }
    if (S.mode === 'globe') { if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowUp') G.globe.move(-1); else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowDown') G.globe.move(1); else if (e.code === 'Enter' || e.code === 'Space') { A().init(); G.globe.pick(); } else if (e.code === 'Escape') showTitle(); e.preventDefault(); return; }
    if (S.mode === 'dive') { if (e.code === 'Enter' || e.code === 'Space') G.dive.t = Math.max(G.dive.t, 2.15); return; }
    if (S.mode === 'hub') { if (e.code === 'Escape') showGlobe(S.wi); return; }
    if (S.mode === 'map') { if (e.code === 'ArrowLeft' || e.code === 'KeyA') mapMove(-1); else if (e.code === 'ArrowRight' || e.code === 'KeyD') mapMove(1); else if (e.code === 'ArrowUp' || e.code === 'KeyW') mapMove(-4); else if (e.code === 'ArrowDown' || e.code === 'KeyS') mapMove(4); else if (e.code === 'Enter' || e.code === 'Space') { A().sfx.select(); startLevel(mapSel); } else if (e.code === 'Escape') showTitle(); return; }
    if (S.mode === 'pause') { if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter') resumeGame(); return; }
    if ((e.code === 'Escape' || e.code === 'KeyP') && (S.mode === 'play' || S.mode === 'card') && !P.dead && !G.goalSeq) { pauseGame(); return; }
    if (e.code === 'Enter' || e.code === 'Space') advance();
  });
  document.addEventListener('keyup', e => { const n = KEYMAP[e.code]; if (n) press(n, false); });
  window.addEventListener('blur', resetInput);
  document.querySelectorAll('#touch button').forEach(b => { const n = b.dataset.k; const on = e => { e.preventDefault(); A().init(); press(n, true); if (S.mode === 'card' && cardT > 0.4 && n === 'jumpkey') beginPlay(); }; const off = () => press(n, false); b.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, off)); b.addEventListener('contextmenu', e => e.preventDefault()); });
  /* taps on the stage: skip the dive, start after the level card */
  $('#stage').addEventListener('pointerdown', () => { if (S.mode === 'boot') startBrand(); else if (S.mode === 'brand') G.brand.skip(); else if (S.mode === 'dive') G.dive.t = Math.max(G.dive.t, 2.15); else if (S.mode === 'card' && cardT > 0.4) beginPlay(); });
  function advance() {
    if (S.mode === 'title') { A().init(); hideAll(); showGlobe(); if (isTouch) goFullscreen(); }
    else if (S.mode === 'card' && cardT > 0.4) beginPlay();
    else if (S.mode === 'clear') { $('#clear').hidden = true; const idx = S.wi * 4 + S.li + 1; if (S.li === 3) showGlobe(Math.min(G.WORLDS.length - 1, S.wi + 1)); else if (idx < N) startLevel(idx); else showGlobe(); }
    else if (S.mode === 'over' || S.mode === 'win') { $('#over').hidden = true; $('#win').hidden = true; showGlobe(); }
  }
  $('#btnStart').addEventListener('click', advance);
  $('#clear-next').addEventListener('click', advance);
  $('#clear-map').addEventListener('click', () => { $('#clear').hidden = true; showHub(S.wi, false); });
  $('#btnOver').addEventListener('click', advance);
  $('#btnWin').addEventListener('click', advance);
  $('#btnMapBack').addEventListener('click', showTitle);
  $('#btnGlobeBack').addEventListener('click', showTitle);
  $('#btnReset').addEventListener('click', () => { if (!resetArmed) { resetArmed = true; $('#btnReset').textContent = 'Wirklich löschen?'; setTimeout(() => { resetArmed = false; $('#btnReset').textContent = 'Spielstand löschen'; }, 3000); return; } save = {unlocked: 0, stars: {}, best: {}, done: {}}; persist(); mapSel = 0; resetArmed = false; $('#btnReset').textContent = 'Spielstand löschen'; if (globeOk) G.globe.refreshMarkers(); showGlobe(0); });
  $('#btnMute').addEventListener('click', () => { A().init(); A().muted = !A().muted; $('#btnMute').textContent = A().muted ? 'Ton an' : 'Ton aus'; if (A().muted) A().stopMusic(); else if (S.mode === 'play' || S.mode === 'hub' || S.mode === 'globe') A().startMusic(); });
  $('#btnVoice').addEventListener('click', () => { A().init(); G.flow.speak('Hello! I am Wookie.', {happy: true}); });
  $('#btnPause').addEventListener('click', () => { if (S.mode === 'pause') resumeGame(); else if (S.mode === 'hub') showGlobe(S.wi); else pauseGame(); });
  $('#btnResume').addEventListener('click', resumeGame);
  $('#btnRestart').addEventListener('click', restartLevel);
  $('#btnPauseMap').addEventListener('click', () => { $('#pause').hidden = true; showHub(S.wi, false); });
  $('#btnPauseGlobe').addEventListener('click', () => { $('#pause').hidden = true; showGlobe(S.wi); });
  $('#btnPauseTitle').addEventListener('click', () => { $('#pause').hidden = true; showTitle(); });
  document.querySelectorAll('.btnFull').forEach(b => b.addEventListener('click', toggleFull));

  /* ---------------- loop and sizing ---------------- */
  /* size the stage to the VISIBLE viewport (phones: browser bars come and go), keep 16:9, centre it */
  function fit() {
    const hd = !!G.draw.resize, vv = window.visualViewport;
    const availW = Math.floor(vv ? vv.width : innerWidth), availH = Math.floor(vv ? vv.height : innerHeight);
    let s = Math.min(availW / VW, availH / VH); if (!hd) s = Math.max(1, Math.floor(s * 4) / 4);
    const w = Math.round(VW * s), h = Math.round(VH * s);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    document.body.style.height = availH + 'px'; document.body.style.width = availW + 'px';
    if (hd) G.draw.resize(w, h);
    if (globeOk) G.globe.resize(w, h);
    document.body.classList.toggle('sidebars', availW - w >= 130);   /* phones in landscape: room for the corner buttons beside the canvas */
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', () => { setTimeout(fit, 100); setTimeout(fit, 600); });
  if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', () => window.scrollTo(0, 0)); }
  fit();
  let last = 0, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; acc += dt;
    let n = 0; while (acc >= 1 / 60 && n++ < 4) { step(); acc -= 1 / 60; }
    if (isTouch) { document.body.classList.toggle('playing', S.mode === 'play' || S.mode === 'card' || S.mode === 'hub' || S.mode === 'dive'); document.body.classList.toggle('onglobe', S.mode === 'globe'); }
    if (S.mode === 'globe' && globeOk) G.globe.frame(); else G.draw.frame();
  }
  function boot() {
    S.mode = 'boot'; hideAll();   /* start screen on the canvas; the first tap starts the publisher intro */
    const brandM = /^#brand(?:=([\d.]+))?$/.exec(HASH);
    if (brandM) { S.mode = 'boot'; startBrand(); const n = Math.round((+brandM[1] || 0) * 60); for (let i = 0; i < n; i++) step(); }   /* headless: step the intro synchronously to a time point */
    if (HASH === '#title') showTitle();
    const simM = /^#sim(\d+)([tex]*)$/.exec(HASH), testM = /^#(test|end|room)(\d+)(?:g=(\w+))?(?:x=(\d+))?$/.exec(HASH);
    if (testM || simM) {
      const idx = Math.max(0, Math.min(N - 1, +(testM ? testM[2] : simM[1]) - 1));
      S.wi = Math.floor(idx / 4); S.li = idx % 4; hideAll(); S.lives = 4; E.load(S.wi, S.li, false); S.mode = 'play';
      if (testM && testM[1] === 'end') { P.x = (G.L.towerX || G.L.goalX) - 120; S.cam = Math.max(0, P.x - VW * 0.4); }
      if (testM && testM[4]) { P.x = +testM[4] * T; S.cam = Math.max(0, Math.min(G.L.mainW * T - VW, P.x - VW * 0.4)); }
      if (testM && testM[1] === 'room' && G.L.bonus) E.enterRoom(1);
      if (testM && testM[3] && G.gad) G.gad.give(testM[3]);
      if (simM && simM[2].includes('e')) { P.x = (G.L.arenaX || (G.L.goalX - 200)) + 4; S.cam = Math.max(0, P.x - VW * 0.4); }
      const caps = G.L.cols.filter(c => c[9] === 'g').length, cannons = G.ents.filter(e => e.kind === 'cannon').length;
      console.log('POOKIE_BOOT level=' + G.L.name + ' (' + G.L.sub + ') w=' + G.L.w + ' mainW=' + G.L.mainW + ' ents=' + G.ents.length + ' start=' + P.x + ',' + P.y + ' arena=' + (G.L.arenaX || '-') + ' door=' + (G.L.doorX || '-') + ' capsules=' + caps + ' cannons=' + cannons + ' bonus=' + (G.L.bonus ? G.L.bonus.pipeCol + '>' + G.L.bonus.roomCol : '-'));
    }
    if (simM) runSim();
    const dumpM = /^#dump(\d+)(?::(\d+)-(\d+))?$/.exec(HASH);
    if (dumpM) { const idx = Math.max(0, Math.min(N - 1, +dumpM[1] - 1)); const src = G.buildLevel(Math.floor(idx / 4), idx % 4); const a = dumpM[2] ? +dumpM[2] : 0, b = dumpM[3] ? Math.min(src.cols.length, +dumpM[3]) : src.cols.length; for (let y = 0; y < 15; y++) { let s = ''; for (let x = a; x < b; x++) s += src.cols[x][y]; console.log('ROW' + String(y).padStart(2, '0') + ' ' + s); } console.log('DUMP ' + src.name + ' cols=' + src.cols.length + ' from=' + a); }
    if (HASH === '#flow') flowTest();
    if (HASH === '#map') { save.stars['0-0'] = [true, true, false]; save.done['0-0'] = true; save.done['0-1'] = true; mapSel = 2; showMap(); }
    const globeM = /^#globe(\d+)?$/.exec(HASH);
    if (globeM) { save.stars['0-0'] = [true, true, false]; save.done['0-0'] = true; save.done['0-1'] = true; save.done['0-2'] = true; save.done['0-3'] = true; hideAll(); showGlobe(globeM[1] ? +globeM[1] - 1 : 0); console.log('GLOBE_BOOT ok=' + globeOk); }
    const diveM = /^#dive(\d+)$/.exec(HASH), hubM = /^#hub(\d+)(land)?$/.exec(HASH);
    if (diveM) { const wi = Math.max(0, Math.min(5, +diveM[1] - 1)); hideAll(); S.mode = 'dive'; G.dive.start(wi, () => showHub(wi, true)); }
    if (hubM) { const wi = Math.max(0, Math.min(5, +hubM[1] - 1)); save.done['0-0'] = true; save.stars['0-0'] = [true, false, true]; hideAll(); showHub(wi, !!hubM[2]); if (!hubM[2]) { P.x = 10 * T + 2; S.cam = 0; } console.log('HUB_BOOT w=' + G.L.w + ' hub=' + G.L.hub + ' mode=' + S.mode); }
    if (HASH === '#pause') { S.wi = 0; S.li = 1; hideAll(); E.load(0, 1, false); S.mode = 'play'; pauseGame(); }
    if (HASH === '#voicetest') { A().init(); A().voiceCfg.on = true; const files = Object.values(G.VOICE_FILES || {}); Promise.all(files.map(f => A().loadVoice(f))).then(bufs => { const ok = bufs.filter(Boolean).length; console.log('VOICE_TEST decoded=' + ok + '/' + files.length + ' dur=' + bufs.filter(Boolean).reduce((a, b) => a + b.duration, 0).toFixed(1) + 's'); }); }
    (document.fonts ? document.fonts.load('bold 10px "Fredoka"').catch(() => {}) : Promise.resolve()).then(() => requestAnimationFrame(frame));
  }
  /* scripted mechanics checks for headless tests (#flow): bonus room, ground pound, cannon, capsule roulette and every gadget */
  function flowTest() {
    const log = (name, ok, info) => console.log('FLOW ' + (ok ? 'PASS' : 'FAIL') + ' ' + name + (info ? ' (' + info + ')' : ''));
    const run = n => { for (let i = 0; i < n; i++) step(); };
    const clearIn = () => { for (const k in input) input[k] = false; };
    const place = (x, y) => { P.x = x; P.y = y; P.vx = 0; P.vy = 0; P.dead = false; P.inv = 0; clearIn(); };
    const load = idx => { S.wi = Math.floor(idx / 4); S.li = idx % 4; S.lives = 9; E.load(S.wi, S.li, false); S.mode = 'play'; hideAll(); clearIn(); };
    const findTile = (ch, row) => { for (let cx = 0; cx < G.L.mainW; cx++) if (G.L.cols[cx][row] === ch) return cx; return -1; };
    try {
      load(1); const b = G.L.bonus; place(b.pipeCol * T + 2, b.pipeTop * T - 14); run(3); input.down = true; run(3);
      log('room-enter', S.room === 1 && P.x > b.roomCol * T, 'room=' + S.room + ' x=' + P.x.toFixed(0) + ' cam=' + S.cam.toFixed(0));
      clearIn(); run(45); let ex = -1; for (let cx = b.roomCol; cx < G.L.w; cx++) if (G.L.cols[cx][11] === 'P') { ex = cx; break; }
      place(ex * T + 2, 11 * T - 14); run(3); input.down = true; run(3);
      log('room-exit', S.room === 0 && Math.abs(P.x - (b.pipeCol * T + 2)) < 2 && !P.dead, 'room=' + S.room + ' x=' + P.x.toFixed(0) + ' exitCol=' + ex);
      load(0); const qx = findTile('?', 9); place(qx * T + 2, 5 * T); run(2); input.downEdge = true; run(1); const pounded = P.pound; run(70);
      log('ground-pound', pounded && G.L.cols[qx][9] === 'X' && S.hearts === 1 && P.onGround, 'pound=' + pounded + ' tile=' + G.L.cols[qx][9] + ' hearts=' + S.hearts);
      load(0); const gx = findTile('g', 9); place(gx * T + 2, 13 * T - 14); run(2); input.jumpEdge = true; input.jump = true; run(12); clearIn(); run(110);
      const gad = G.ents.find(e => e.kind === 'gadget'); let got = null;
      run(70); input.right = true; for (let k = 0; k < 150 && !P.gadget; k++) step(); got = P.gadget;
      log('capsule', !!gad && !!got, 'tile=' + G.L.cols[gx][9] + ' gadgetEnt=' + (gad ? gad.id : '-') + ' got=' + got);
      load(4); const can = G.ents.find(e => e.kind === 'cannon'); place(can.x - 60, 13 * T - 14); run(2); input.right = true; input.run = true; let maxX = 0, launched = false, landed = false; for (let i = 0; i < 240; i++) { step(); maxX = Math.max(maxX, P.x); if (P.launch > 0) launched = true; if (launched && P.launch <= 0 && P.onGround) { landed = true; break; } }
      log('cannon', launched && landed && !P.dead && maxX > can.x + 140, 'launched=' + launched + ' landed=' + landed + ' maxX=' + maxX.toFixed(0) + ' cannonX=' + can.x.toFixed(0) + ' dead=' + P.dead);
      load(1); let en = G.ents.find(e => e.kind === 'walker' && e.alive); G.gad.give('star', true); place(en.x - 30, en.y); input.right = true; run(40);
      log('star', !en.alive && !P.dead && P.gadget === 'star', 'enemyAlive=' + en.alive + ' dead=' + P.dead);
      load(1); G.gad.give('bubble', true); place(100, 13 * T - 14); run(2); E.hurt('test'); log('bubble', !P.dead && P.gadget === null && P.inv > 0, 'dead=' + P.dead + ' gadget=' + P.gadget);
      load(1); G.gad.give('boots', true); place(100, 13 * T - 14); run(2); E.hurt('test'); log('gadget-shield', !P.dead && P.gadget === null, 'dead=' + P.dead + ' gadget=' + P.gadget);
      load(1); place(100, 13 * T - 14); run(2); input.jumpEdge = true; input.jump = true; run(30); const h1 = 13 * T - 14 - P.y;
      place(100, 13 * T - 14); G.gad.give('boots', true); run(2); input.jumpEdge = true; input.jump = true; run(30); const h2 = 13 * T - 14 - P.y;
      log('boots', h2 > h1 * 1.15, 'normal=' + h1.toFixed(0) + ' boots=' + h2.toFixed(0));
      load(1); E.enterRoom(1); clearIn(); G.gad.give('claws', true); place((b.roomCol + 1) * T + 1, 6 * T); run(1); input.left = true; run(6); const slid = P.wallSlide, vyS = P.vy; input.jumpEdge = true; run(1); const vxJ = P.vx;
      log('claws', slid && vyS <= 1.0 && vxJ > 2, 'slide=' + slid + ' vy=' + vyS.toFixed(1) + ' vxAfterJump=' + vxJ.toFixed(1));
      load(1); G.gad.give('jet', true); place(100, 8 * T); run(1); input.jump = true; run(12); log('jetpack', P.vy < 0 && P.fuel < 420 && P.jetting, 'vy=' + P.vy.toFixed(1) + ' fuel=' + P.fuel);
      load(1); en = G.ents.find(e => e.kind === 'walker' && e.alive); G.gad.give('sling', true); place(en.x - 50, en.y); run(2); P.facing = 1; input.runEdge = true; run(1); const shot = G.ents.some(e => e.kind === 'honeyshot'); run(40);
      log('sling', shot && !en.alive, 'shot=' + shot + ' enemyAlive=' + en.alive);
      load(1); en = G.ents.find(e => e.kind === 'walker' && e.alive); place(en.x - 120, 13 * T - 14); const x0 = en.x; run(30); const dNormal = Math.abs(en.x - x0); G.gad.give('honey', true); const x1 = en.x; run(30); const dSlow = Math.abs(en.x - x1);
      log('honey-time', dSlow < dNormal * 0.6 && S.honey > 0, 'normal=' + dNormal.toFixed(1) + ' slow=' + dSlow.toFixed(1));
      load(0); const hx = findTile('o', 9) >= 0 ? findTile('o', 9) : findTile('o', 10); G.gad.give('magnet', true); place(hx * T - 20, 13 * T - 14); run(90); log('magnet', S.hearts >= 1, 'hearts=' + S.hearts);
      load(1); place(100, 13 * T - 14); G.ents.push({kind: 'walker', look: 'drop', x: 100, y: 8 * T, w: 14, h: 14, vx: 0, speed: 0, alive: true, anim: 0, stompable: true, points: 100}); G.ents.push({kind: 'walker', look: 'drop', x: 100, y: 11 * T, w: 14, h: 14, vx: 0, speed: 0, alive: true, anim: 0, stompable: true, points: 100}); place(101, 4 * T); run(60);
      log('combo', P.combo >= 2 || S.score >= 300, 'combo=' + P.combo + ' score=' + S.score);
      load(1); pauseGame(); const paused = S.mode === 'pause' && !$('#pause').hidden; resumeGame(); log('pause', paused && S.mode === 'play', 'mode=' + S.mode);
      /* double jump with somersault */
      load(1); place(100, 13 * T - 14); run(2); input.jumpEdge = true; run(12); const vyBefore = P.vy; input.jumpEdge = true; run(1); const dj = P.jumps === 2 && P.vy < vyBefore && P.flip > 0; run(40); input.jumpEdge = true; run(1);
      log('double-jump', dj && P.jumps === 2, 'jumps=' + P.jumps + ' flip=' + P.flip.toFixed(2) + ' vyBefore=' + vyBefore.toFixed(1));
      /* hub: land from the sky, walk to sign 2, start it */
      hideAll(); showHub(2, true); clearIn(); let landedHub = false; for (let i = 0; i < 120; i++) { step(); if (!P.skydive && P.onGround) { landedHub = true; break; } }
      const sx = G.hub.signCols[1] * T + 2; P.x = sx; run(3); const nearOk = G.hub.near === 1; let started = null; G.hub.onStart = idx => { started = idx; }; input.up = true; run(2);
      log('hub', landedHub && nearOk && started === 9, 'landed=' + landedHub + ' near=' + G.hub.near + ' started=' + started + ' mode=' + S.mode);
      G.hub.onStart = idx => { A().sfx.select(); startLevel(idx); };
      /* dive runs to its end */
      hideAll(); S.mode = 'dive'; let hubEntered = false; G.dive.start(1, () => { hubEntered = true; showHub(1, true); }); for (let i = 0; i < 200 && !hubEntered; i++) step();
      log('dive', hubEntered && S.mode === 'hub' && P.skydive, 'entered=' + hubEntered + ' mode=' + S.mode + ' t=' + G.dive.t.toFixed(1));
      log('globe', !!globeOk, 'ok=' + globeOk);
    } catch (e) { console.log('FLOW ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
    console.log('FLOW DONE');
  }
  /* look-ahead runner for headless tests: holds right, waits for hazards, hops on enemies, stomps bosses */
  function runSim() {
    S.lives = 40; input.right = true; input.run = true; let deaths = 0, t = 0, jumpHold = 0, maxX = 0, waitT = 0, launches = 0, gadgets = []; const tileAt = E.tileAt, solidAt = E.solidAt;
    for (let i = 0; i < 60 * 300; i++) {
      t += 1 / 60; const wasDead = P.dead;
      const fx = Math.floor((P.x + P.w + 6) / T), fy = Math.floor((P.y + P.h) / T);
      let need = false, wait = false;
      const boss = G.ents.find(e => e.kind === 'boss' && e.active);
      if (boss && HASH.includes('x') && boss.t < 0.5 && !runSim.cheated) { runSim.cheated = true; runSim.cheatT = t; G.entsMod.bossHit(boss, 99); console.log('SIM_CHEAT boss defeated at t=' + t.toFixed(1)); }
      if (runSim.cheated && !S.gateOpen && t > runSim.cheatT + 1.5) { E.openGate(); console.log('SIM_GATE opened at t=' + t.toFixed(1)); }
      if (P.launch > 0 && !runSim.launched) { runSim.launched = true; launches++; } if (P.launch <= 0) runSim.launched = false;
      if (P.gadget && gadgets[gadgets.length - 1] !== P.gadget) gadgets.push(P.gadget);
      if (P.onGround && !P.cannon) {
        const gapAhead = (!solidAt(fx, fy) && (!solidAt(fx + 1, fy) || !solidAt(fx, fy + 1))) || tileAt(fx, fy) === '~' || tileAt(fx + 1, fy) === '~';
        const wallAhead = solidAt(fx, fy - 1) || solidAt(fx, fy - 2);
        const enemy = G.ents.find(e => e.alive && ['walker', 'flyer', 'spiky', 'thrower', 'jumper'].includes(e.kind) && e.x + e.w > P.x && e.x - P.x < 70 && Math.abs(e.y - P.y) < 30);
        let enemyAhead = false;
        if (enemy) { if (!enemy.stompable || enemy.kind === 'flyer') enemyAhead = enemy.x - (P.x + P.w) < 34; else if (enemy.x - (P.x + P.w) > 12) wait = true; else enemyAhead = true; }
        const hz = G.ents.find(e => e.kind === 'pipeHazard' && e.x + 20 > P.x && e.x - P.x < 70);
        if (hz && hz.up > 0.05 && hz.x - P.x > 10) wait = true;
        const plats = G.ents.filter(e => (e.kind === 'platformH' || e.kind === 'platformV') && e.x + e.w > P.x && e.x - P.x < 200);
        const onPlat = plats.find(e => P.x + P.w > e.x + 2 && P.x < e.x + e.w - 2 && Math.abs(P.y + P.h - e.y) < 3);
        if (onPlat) { if (onPlat.kind === 'platformH' ? !(onPlat.dir > 0 && onPlat.x > onPlat.ox + onPlat.range * 0.7) : !(onPlat.y < onPlat.oy - onPlat.range * 0.7)) wait = true; }
        else if (gapAhead && plats.length && !plats.some(e => e.x - (P.x + P.w) < 36 && e.x - (P.x + P.w) > -30 && Math.abs(e.y - (P.y + P.h)) < 40)) wait = true;
        const dr = G.ents.find(e => e.kind === 'dropper' && e.state !== 'wait' && Math.abs(e.x - P.x) < 40); if (dr) wait = true;
        const cannon = G.ents.find(e => e.kind === 'cannon' && e.x + e.w > P.x && e.x - P.x < 40); if (cannon) { wait = false; need = false; }
        if (boss) { wait = false; const bx = boss.x + boss.w / 2 - (P.x + P.w / 2); if (Math.abs(bx) < 26 && boss.inv <= 0) need = true; else if (Math.abs(bx) > 60) input.right = bx > 0; else need = true; input.left = !input.right; }
        if (wait) { waitT++; if (waitT > 300) { wait = false; waitT = 0; } } else waitT = 0;
        need = need || (!wait && !cannon && (gapAhead || wallAhead || enemyAhead || (hz && hz.x - P.x <= 10)));
      }
      if (!boss) { input.right = !wait; input.left = false; if (wait) P.vx = 0; }
      if (P.onGround && jumpHold > 0 && jumpHold < 15) jumpHold = 0;
      if (need && jumpHold <= 0 && P.onGround) { input.jumpEdge = true; input.jumpKeyEdge = true; jumpHold = 18; }
      input.jump = jumpHold > 0; if (jumpHold > 0) jumpHold--;
      if (tileAt(Math.floor((P.x + 6) / T), Math.floor((P.y + 4) / T)) === 'v' && !P.climbing) { input.up = true; } else input.up = P.climbing;
      if (!runSim.trace) runSim.trace = [];
      runSim.trace.push(`f${i} x${P.x.toFixed(0)} y${P.y.toFixed(0)} g${P.onGround ? 1 : 0} vx${P.vx.toFixed(1)} vy${P.vy.toFixed(1)} need${need ? 1 : 0} wait${wait ? 1 : 0} hold${jumpHold} fx${fx} t${tileAt(fx, fy)}${tileAt(fx + 1, fy)}`); if (runSim.trace.length > 24) runSim.trace.shift();
      try { step(); } catch (e) { console.error('SIM_ERROR t=' + t.toFixed(1) + ' ' + e.message + ' ' + (e.stack || '').split('\n')[1]); break; }
      maxX = Math.max(maxX, P.x);
      if (P.dead && !wasDead) { deaths++; if (deaths <= 5) console.log('SIM_DEATH #' + deaths + ' ' + JSON.stringify(S.lastDeath)); if (deaths === 1 && HASH.endsWith('t')) console.log('SIM_TRACE ' + runSim.trace.join(' | ')); }
      if (S.mode === 'clear' || S.mode === 'over' || S.mode === 'win') break;
      if (S.mode === 'card') beginPlay();
    }
    const bz = G.ents.find(e => e.kind === 'boss'), pcx = Math.floor((P.x + 6) / T);
    console.log('SIM_DONE level=' + G.L.name + ' t=' + t.toFixed(0) + ' mode=' + S.mode + ' maxX=' + maxX.toFixed(0) + '/' + (G.L.mainW * T) + ' deaths=' + deaths + ' score=' + S.score + ' stars=' + S.stars.filter(Boolean).length + ' launches=' + launches + ' gadgets=' + gadgets.join(',') + ' gate=' + S.gateOpen + ' bossActive=' + S.bossActive + ' boss=' + (bz ? bz.hp + '/' + bz.maxHp + ' act=' + bz.active + ' alive=' + bz.alive + ' x=' + bz.x.toFixed(0) : 'none') + ' pcol=' + pcx + ' tiles=' + [5, 8, 11, 12, 13].map(r => tileAt(pcx, r)).join('') + ' arenaX=' + G.L.arenaX);
  }
  boot();
})();

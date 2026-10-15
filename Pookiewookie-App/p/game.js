/* The Starway Home: game flow (title → globe → dive → hub → level), saving, input, pause menu, fullscreen, settings, overlays, main loop. */
(function () {
  const G = window.PW, $ = s => document.querySelector(s), A = () => G.audio, S = G.S, P = G.P, E = G.eng, input = G.input, VH = G.VH, T = G.T;
  const HASH = location.hash.replace('&mobile', '').replace(/&hero=\w+/, '').replace(/&lang=\w+/, ''), MOBILE = location.hash.includes('mobile'), HERO_Q = (/&hero=(\w+)/.exec(location.hash) || [])[1];
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de), LOC = G.lang === 'en' ? 'en-US' : 'de-DE';
  const canvas = $('#c'); G.draw.init(canvas);
  const N = G.levelCount();
  let cardT = 0, mapSel = 0, resetArmed = false, pausedFrom = 'play', assist = false, curCustom = null;   /* curCustom: the daily level being played (reloaded after a death or restart) */
  try { assist = localStorage.getItem('pookie-assist') === '1'; } catch (e) {}
  let save = {unlocked: 0, stars: {}, best: {}, done: {}, coins: {}, letters: {}, ach: {}, daily: {}, streak: 0, dailyLast: '', costume: '', gad: 0, money: 0, owned: {}, solved: {}, hero: 'wookie', storySeen: 0, event: {}};
  try { save = Object.assign(save, JSON.parse(localStorage.getItem('pookie-save') || '{}') || {}); } catch (e) {}
  for (const k of ['stars', 'best', 'done', 'coins', 'letters', 'ach', 'daily']) if (!save[k] || typeof save[k] !== 'object') save[k] = {};
  const persist = () => { try { localStorage.setItem('pookie-save', JSON.stringify(save)); } catch (e) {} };
  /* Taler wallet and shop ownership live in the save */
  if (!save.owned || typeof save.owned !== 'object') save.owned = {}; if (!save.event || typeof save.event !== 'object') save.event = {}; if (!save.solved || typeof save.solved !== 'object') save.solved = {};
  S.money = Math.max(0, +save.money || 0); G.eco.owned = save.owned;
  if (save.coins && Object.keys(save.coins).length && !save.coinsPaid) { S.money += Object.keys(save.coins).length * 200; save.coinsPaid = true; }   /* old chocolate-coin unlocks become Taler */
  let moneyTimer = 0;
  const key = (wi, li) => (G.WORLDS[wi] ? G.WORLDS[wi].key : wi) + '-' + li;
  /* saves before version 2 used world indexes in the old order */
  if ((save.version || 1) < 2) {
    const OLD = ['wiese', 'insel', 'dschungel', 'schnee', 'lava', 'himmel', 'weltraum'];
    const mig = o => { const r = {}; for (const k in (o || {})) { const m = /^(\d+)-(\d+)$/.exec(k); r[m && OLD[+m[1]] ? OLD[+m[1]] + '-' + m[2] : k] = o[k]; } return r; };
    save.stars = mig(save.stars); save.best = mig(save.best); save.done = mig(save.done);
    const migW = o => { const r = {}; for (const k in (o || {})) r[OLD[+k] || k] = o[k]; return r; };
    save.letters = migW(save.letters); save.coins = migW(save.coins); save.version = 2;
  }
  const OVERLAYS = ['title', 'map', 'card', 'clear', 'over', 'win', 'pause', 'letter', 'keks', 'shop', 'settings'];
  const MENU_MUSIC = {bpm: 100, pattern: 1, transpose: 0, lead: 'bell', bass: 'sine', perc: 1};
  const GLOBE_MUSIC = {bpm: 84, pattern: 2, transpose: 2, lead: 'bell', bass: 'sine', perc: 0};
  const globeOk = G.globe && G.globe.init($('#globe'), $('#globeUI'));
  /* touch devices get the on-screen pad, landscape prompt and fullscreen on start */
  const isTouch = MOBILE || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches) || matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouch) { document.body.classList.add('touch'); input.run = true; input.touchMode = true; }   /* on touch Toffo always runs; B only shoots; A also climbs */
  const resetInput = () => { for (const k in input) input[k] = false; input.run = isTouch; input.touchMode = isTouch; };
  function goFullscreen() {
    if (document.fullscreenElement) return;
    try { const el = document.documentElement, p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, {navigationUI: 'hide'}); if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} fit(); }).catch(() => {}); } catch (e) {}
  }
  /* start screen → publisher intro → title. The first tap also unlocks audio and (on phones) fullscreen. */
  function startBrand() {
    if (S.mode !== 'boot') return; if (!HASH.startsWith('#brand')) A().init(); if (isTouch) goFullscreen();   /* (#brand = headless screenshot run without audio) */
    S.mode = 'brand'; hideAll(); G.brand.start(() => { if (!save.storySeen && G.story) playStory(showTitle); else showTitle(); });
  }

  /* ---------------- flow hooks used by the engine ---------------- */
  G.flow = {
    speak(text, o) {
      A().say(text, o);
      const line = G.VOICE_LINES && G.VOICE_LINES[text], b = $('#bubble'); b.textContent = (G.lang !== 'en' && line && line.de) ? line.de : text; b.classList.remove('on', 'sad'); void b.offsetWidth; b.classList.add('on'); if (o && o.sad) b.classList.add('sad');
      clearTimeout(G.flow.tm); G.flow.tm = setTimeout(() => b.classList.remove('on'), 2600);
    },
    banner(title, t, sub) { const b = $('#banner'); b.innerHTML = `<div>${title}</div>${sub ? `<small>${sub}</small>` : ''}`; b.classList.add('on'); clearTimeout(G.flow.bt); G.flow.bt = setTimeout(() => b.classList.remove('on'), t * 1000); },
    afterDeath() {
      S.lives--; $('#bubble').classList.remove('on');
      if (S.lives <= 0) { gameOver(); return; }
      E.load(S.wi, S.li, true, curCustom || undefined); S.mode = 'play'; A().startMusic(); if (assist) G.gad.give('bubble', true);
    },
    levelClear() {
      S.mode = 'clear'; const bonus = Math.ceil(S.time) * 10; S.score += bonus; A().sfx.clear(); A().fast = false; A().slow = false;
      const idx = S.wi * 4 + S.li, k = key(S.wi, S.li), L = G.L;
      if (L.daily) {
        /* the daily level: best time of the day, streak, no world progress */
        const used = Math.max(0, L.par - S.time), prevBest = save.daily[L.daily];
        if (prevBest === undefined || used < prevBest) save.daily[L.daily] = used;
        if (save.dailyLast !== L.daily) { const y = new Date(Date.now() - 864e5); const yk = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0'); save.streak = save.dailyLast === yk ? (save.streak || 0) + 1 : 1; save.dailyLast = L.daily; }
        G.eco.add(100, 0, 0, true); persist(); achieve('daily');
        $('#clear').hidden = false; $('#clear-title').textContent = tr('Tageslevel geschafft', 'Daily Level complete'); $('#clear-stars').textContent = S.stars.map(b => b ? '★' : '☆').join(' ');
        $('#clear-stats').innerHTML = `<div class="row"><dt>${tr('Zeit', 'Time')}</dt><dd>${used}s</dd></div><div class="row"><dt>${tr('Tagesbestzeit', 'Best today')}</dt><dd>${save.daily[L.daily]}s</dd></div><div class="row"><dt>${tr('Serie', 'Streak')}</dt><dd>${save.streak} ${save.streak === 1 ? tr('Tag', 'day') : tr('Tage', 'days')}</dd></div><div class="row"><dt>${tr('Punkte', 'Points')}</dt><dd>${S.score.toLocaleString(LOC)}</dd></div>`;
        $('#clear-next').hidden = true; $('#clear-map').textContent = tr('Zum Globus', 'To the globe'); G.flow.speak('Yay! I did it!', {happy: true}); return;
      }
      if (L.event) {
        /* Halloween event: three levels; the first clear of each pays more, all three unlock Hollo */
        const dn = eventDone(), first = !dn[S.li]; dn[S.li] = true; const pay = first ? 150 : 40; G.eco.add(pay, 0, 0, true);
        const all = !!(dn[0] && dn[1] && dn[2]); let unlocked = false;
        if (all && !heroOwned('hollo')) { save.owned.h_hollo = true; G.eco.owned = save.owned; unlocked = true; achieve('halloween'); achieve('hero'); }
        persist();
        $('#clear').hidden = false; $('#clear-title').textContent = tr(L.sub + ' geschafft', L.sub + ' complete'); $('#clear-stars').textContent = S.stars.map(b => b ? '★' : '☆').join(' ');
        $('#clear-stats').innerHTML = `<div class="row"><dt>${tr('Punkte', 'Points')}</dt><dd>${S.score.toLocaleString(LOC)}</dd></div><div class="row"><dt>${tr('Taler', 'Coins')}</dt><dd>+${pay}</dd></div><div class="row"><dt>${tr('Gruselnacht', 'Spooky Night')}</dt><dd>${[0, 1, 2].filter(i => dn[i]).length} / 3</dd></div><div class="row"><dt>Hollo</dt><dd>${heroOwned('hollo') ? '🎃 ✓' : '🔒'}</dd></div>`;
        if (unlocked) G.flow.banner(tr('Hollo freigeschaltet!', 'Hollo unlocked!'), 3.2, tr('Der Kürbisgeist ist jetzt einer deiner Helden.', 'The pumpkin ghost is now one of your heroes.'));
        $('#clear-next').hidden = false; $('#clear-next').textContent = all ? tr('Zum Menü', 'To the menu') : tr('Nächstes Gruselnacht-Level', 'Next Spooky Night level'); $('#clear-map').textContent = tr('Zum Menü', 'To the menu');
        G.flow.speak('Happy Halloween!', {happy: true}); return;
      }
      $('#clear-map').textContent = tr('Zurück zur Welt', 'Back to the world');
      const pay = 50 + Math.floor(Math.max(0, S.time) / 10) + (L.tower ? 100 : 0); G.eco.add(pay, 0, 0, true);
      save.unlocked = Math.max(save.unlocked, idx + 1); save.done[k] = true;
      const prev = save.stars[k] || [false, false, false]; save.stars[k] = prev.map((b, i) => b || S.stars[i]);
      save.best[k] = Math.max(save.best[k] || 0, S.score); persist();
      achieve('first'); if (S.stars.every(Boolean)) achieve('stars3'); if (worldProgress(S.wi).done >= 4) achieve('world'); if (!S.hits) achieve('nohit');
      if (L.world.boss.final && L.rescued) { const fi = G.WORLDS.findIndex(w => w.key === 'finale'); if (fi >= 0) { $('#clear').hidden = true; G.flow.banner(tr('Frei!', 'Free!'), 2.6, tr('Doch das Raumschiff gerät in ein Schwarzes Loch ...', 'But the spaceship is drawn into a black hole ...')); setTimeout(() => startLevel(fi * 4), 2600); S.mode = 'clear'; return; } win(); return; }
      $('#clear').hidden = false; $('#clear-title').textContent = (L.rocket ? tr('Flug geschafft', 'Flight complete') : (L.tower ? tr('Turm geschafft', 'Tower complete') : tr(L.sub + ' geschafft', L.sub + ' complete')));
      $('#clear-stars').textContent = S.stars.map(b => b ? '★' : '☆').join(' ');
      $('#clear-stats').innerHTML = `<div class="row"><dt>${tr('Zeitbonus', 'Time bonus')}</dt><dd>${bonus}</dd></div><div class="row"><dt>${tr('Punkte', 'Points')}</dt><dd>${S.score.toLocaleString(LOC)}</dd></div><div class="row"><dt>${tr('Taler für das Level', 'Coins for this level')}</dt><dd>+${pay}</dd></div><div class="row"><dt>${tr('Taler gesamt', 'Coins in total')}</dt><dd>${S.money.toLocaleString(LOC)}</dd></div>`;
      $('#clear-next').hidden = idx + 1 >= N; $('#clear-next').textContent = S.li === 3 ? tr('Nächste Welt', 'Next world') : tr('Nächstes Level', 'Next level');
      mapSel = Math.min(N - 1, idx + 1);
      G.flow.speak('Yay! I did it!', {happy: true});
    },
    coin(wi) { save.coins[wi] = true; G.eco.add(200, 0, 0, true); persist(); achieve('coin'); },
    moneyChanged() { save.money = S.money; clearTimeout(moneyTimer); moneyTimer = setTimeout(persist, 400); const sm = $('#shop-money'); if (sm) sm.textContent = S.money.toLocaleString(LOC); },
    bought(id) { save.owned = G.eco.owned; save.money = S.money; const it = G.SHOP.outfits.find(o => o.id === id); if (it) save.costume = it.outfit; if (id.startsWith('h_')) { setHero(id.slice(2)); achieve('hero'); } persist(); refreshCostumes(); renderShop(); renderMenu(); achieve('shop'); },
    achieve(id) { achieve(id); },
  };
  /* ---------------- Keksdose (achievements), coins and costumes ---------------- */
  const ACH = {hero: tr('Einen neuen Helden freigeschaltet', 'Unlocked a new hero'), shop: tr('Etwas im Shop gekauft', 'Bought something in the shop'), allpuzzles: tr('Alle 20 Rätsel gelöst', 'Solved all 20 puzzles'), first: tr('Erstes Level geschafft', 'Finished your first level'), stars3: tr('Alle drei Sternkekse in einem Level', 'All three star cookies in one level'), world: tr('Eine ganze Welt geschafft', 'Finished a whole world'), combo5: tr('Fünffach-Combo', 'Five-hit combo'), nohit: tr('Ein Level ohne einen Treffer', 'A level without getting hit'), gadgets10: tr('Zehn Gadgets gezogen', 'Collected ten gadgets'), puzzle: tr('Eine Rätselkammer gelöst', 'Solved a puzzle gate'), bonus: tr('Einen Bonusraum entdeckt', 'Found a bonus room'), pirate: tr("Käpt'n Bitterbart besiegt", 'Defeated Captain Bitterbeard'), rescue: tr('Mallo gerettet', 'Rescued Mallo'), daily: tr('Ein Tageslevel geschafft', 'Finished a Daily Level'), halloween: tr('Die Gruselnacht überstanden', 'Survived the Spooky Night')};
  function achieve(id) { if (!ACH[id] || save.ach[id]) return; save.ach[id] = true; persist(); A().sfx.gadget(); E.toast(tr('Keksdose: ', 'Cookie Jar: ') + ACH[id]); if (globeOk) G.globe.refreshMarkers(); }
  function renderKeks() { const n = Object.keys(ACH).filter(id => save.ach[id]).length; $('#keks-list').innerHTML = Object.entries(ACH).map(([id, t]) => `<li class="${save.ach[id] ? 'done' : ''}"><b>${save.ach[id] ? '🍪' : '○'}</b>${t}</li>`).join(''); $('#keks-count').textContent = tr(n + ' von ' + Object.keys(ACH).length + ' Keksen', n + ' of ' + Object.keys(ACH).length + ' cookies'); }
  /* outfits are bought in the shop; the settings list shows the owned ones */
  function refreshCostumes() {
    const sel = $('#selCostume'), owned = G.SHOP.outfits.filter(o => G.eco.has(o.id));
    sel.innerHTML = '<option value="">' + tr('Welt-Outfit (passt sich an)', 'World outfit (changes per world)') + '</option>' + owned.map(o => `<option value="${o.outfit}">${o.name}</option>`).join('');
    if (!owned.some(o => o.outfit === save.costume)) save.costume = ''; sel.value = save.costume || ''; applyCostume();
    $('#coinCount').textContent = tr(owned.length + ' von ' + G.SHOP.outfits.length + ' Outfits gekauft · Outfits und Look gelten für Toffo, neue Outfits gibt es im Shop.', owned.length + ' of ' + G.SHOP.outfits.length + ' outfits bought · outfits and look are for Toffo, new outfits are in the shop.');
  }
  function renderShop(tab) {
    tab = tab || renderShop.tab || 'rocket'; renderShop.tab = tab;
    document.querySelectorAll('#shop .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('#shop-money').textContent = S.money.toLocaleString(LOC);
    if (tab === 'heroes') {
      save.heroesSeen = 1; persist(); if ($('#mShopBadge')) $('#mShopBadge').hidden = true;
      $('#shop-list').innerHTML = heroList().map(h => { const own = heroOwned(h.id), active = (save.hero || 'wookie') === h.id;
        const btn = own ? (active ? '<span class="owned">' + tr('✓ aktiv', '✓ active') + '</span>' : '<button class="btn" data-act="hero" data-id="' + h.id + '">' + tr('Auswählen', 'Choose') + '</button>') : '<button class="btn' + (S.money >= h.price ? '' : ' poor') + '" data-act="buyhero" data-id="' + h.id + '">' + h.price.toLocaleString(LOC) + tr(' Taler', ' coins') + '</button>';
        return '<li class="' + (own ? 'own' : '') + '" data-id="' + h.id + '"><canvas class="hico" width="76" height="76" data-hero="' + h.id + '"></canvas><div><b>' + h.name + ' · ' + h.species + '</b><small>' + h.perk + '</small></div>' + btn + '</li>'; }).join('');
      paintPortraits($('#shop-list')); return;
    }
    const items = tab === 'rocket' ? G.SHOP.rocket : G.SHOP.outfits;
    $('#shop-list').innerHTML = items.map(it => { const own = G.eco.has(it.id), wearing = tab === 'outfits' && own && save.costume === it.outfit, locked = it.needs && !G.eco.has(it.needs), afford = S.money >= it.price;
      const btn = own ? (tab === 'outfits' ? (wearing ? '<button class="btn ghost" data-act="off" data-id="' + it.id + '">' + tr('Ausziehen', 'Take off') + '</button>' : '<button class="btn" data-act="wear" data-id="' + it.id + '">' + tr('Anziehen', 'Wear') + '</button>') : '<span class="owned">' + tr('✓ gekauft', '✓ owned') + '</span>') : (locked ? '<span class="lock">' + tr('erst ', 'first ') + (G.SHOP.rocket.find(r => r.id === it.needs) || {}).name + '</span>' : '<button class="btn' + (afford ? '' : ' poor') + '" data-act="buy" data-id="' + it.id + '">' + it.price.toLocaleString(LOC) + tr(' Taler', ' coins') + '</button>');
      return '<li class="' + (own ? 'own' : '') + '"><i class="ico ico-' + (it.outfit || it.id) + '"></i><div><b>' + it.name + '</b><small>' + (it.desc || '') + '</small></div>' + btn + '</li>'; }).join('');
  }
  function shopAction(act, id) {
    if (act === 'hero') { setHero(id); A().sfx.select(); renderShop(); renderMenu(); return; }
    if (act === 'buyhero') { const h = heroList().find(x => x.id === id); if (!h) return; if (!G.eco.buy({id: 'h_' + id, price: h.price})) { A().sfx.wrong(); const li = document.querySelector('#shop-list li[data-id="' + id + '"]'); if (li) { li.classList.remove('nope'); void li.offsetWidth; li.classList.add('nope'); } return; } renderShop(); return; }
    const it = G.SHOP.rocket.concat(G.SHOP.outfits).find(x => x.id === id); if (!it) return;
    if (act === 'buy') { if (!G.eco.buy(it)) { A().sfx.wrong(); const li = document.querySelector('#shop-list [data-id="' + id + '"]'); if (li) { li.classList.remove('nope'); void li.offsetWidth; li.classList.add('nope'); } return; } A().sfx.gadget(); }
    else if (act === 'wear') { save.costume = it.outfit; persist(); refreshCostumes(); A().sfx.select(); }
    else if (act === 'off') { save.costume = ''; persist(); refreshCostumes(); A().sfx.select(); }
    renderShop();
  }
  function openShop(tab) { A().init(); renderShop(tab); $('#shop').hidden = false; }
  G.flow.openShop = openShop;
  function applyCostume() { const c = save.costume || ''; S.costume = c === 'gold' ? 'gold' : ''; S.outfitOverride = (c && c !== 'gold') ? c : null; if (S.outfitOverride) S.outfit = S.outfitOverride; else if (G.L) S.outfit = G.L.world.key; }
  /* ---------------- heroes: Toffo plus buyable friends (fox, dino, robot) with small perks ---------------- */
  const heroList = () => (G.heroes && G.heroes.list && G.heroes.list.length) ? G.heroes.list : [{id: 'wookie', name: 'Toffo', species: tr('Bär', 'Bear'), price: 0, perk: tr('Allrounder', 'All-rounder')}];
  const heroOwned = id => id === 'wookie' || !!(save.owned && save.owned['h_' + id]);
  function setHero(id) { if (!heroOwned(id) || !heroList().some(h => h.id === id)) id = 'wookie'; save.hero = id; S.hero = id === 'wookie' ? null : id; persist(); }
  setHero(save.hero || 'wookie');
  if (HERO_Q) S.hero = HERO_Q === 'wookie' ? null : HERO_Q;   /* tests: play as another hero */
  let menuIdx = Math.max(0, heroList().findIndex(h => h.id === save.hero));
  function paintPortraits(root) {
    (root || document).querySelectorAll('canvas[data-hero]').forEach(cv => { const c = cv.getContext('2d'), id = cv.dataset.hero, k = cv.width / 38; c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 38, 38);
      try { if (id !== 'wookie' && G.heroes && G.heroes.portrait) G.heroes.portrait(c, 19, 20, 34, id, 0.4); else G.draw.drawBearAt(c, 19, 47, {scale: 2.05, facing: 1, pose: 'idle', t: 0.4, hero: id, outfit: 'wiese'}); } catch (e) {} });
  }
  /* the dashboard: hero on show, progress, Taler, daily level, achievements */
  function renderMenu() {
    if (!$('#mHeroName')) return;
    const list = heroList(); menuIdx = ((menuIdx % list.length) + list.length) % list.length;
    const h = list[menuIdx], own = heroOwned(h.id), active = (save.hero || 'wookie') === h.id;
    if (G.menu) G.menu.setHero(h.id, !own);
    $('#mHeroName').textContent = h.name; $('#mHeroPerk').textContent = h.species + ' · ' + h.perk;
    const b = $('#mHeroBtn'); b.className = 'm-hbtn' + (active ? ' on' : (own ? ' pick' : (S.money >= h.price ? '' : ' poor')));
    b.textContent = active ? tr('✓ Dein Held', '✓ Your hero') : (own ? tr('Mit ' + h.name + ' spielen', 'Play as ' + h.name) : '🔒 ' + tr('Freischalten · ', 'Unlock · ') + h.price.toLocaleString(LOC) + tr(' Taler', ' coins'));
    $('#mMoneyN').textContent = S.money.toLocaleString(LOC);
    const totalStars = Object.values(save.stars).reduce((a, st) => a + st.filter(Boolean).length, 0), done = Object.keys(save.done).length;
    $('#mStars').textContent = totalStars + ' / ' + N * 3;
    let next = 0; while (next < N && save.done[key(Math.floor(next / 4), next % 4)]) next++;
    if (next >= N) $('#mNextLvl').textContent = tr('Alles geschafft! Jetzt alle Sternkekse sammeln', 'All done! Now collect every star cookie');
    else { const W = G.WORLDS[Math.floor(next / 4)]; $('#mNextLvl').textContent = (done ? tr('Weiter: ', 'Continue: ') : tr('Los geht’s: ', 'Let’s go: ')) + tr('Welt ', 'World ') + (Math.floor(next / 4) + 1) + ' · ' + W.name + ' · ' + W.levels[next % 4]; }
    $('#mBar').style.width = Math.round(done / N * 100) + '%';
    $('#mKeks').textContent = Object.keys(ACH).filter(id => save.ach[id]).length + tr(' von ', ' of ') + Object.keys(ACH).length + tr(' Keksen', ' cookies');
    $('#mKeksBar').style.width = Math.round(Object.keys(ACH).filter(id => save.ach[id]).length / Object.keys(ACH).length * 100) + '%';
    { const box = $('#mFaces'), ids = list.filter(x => x.id !== 'wookie').map(x => x.id).join(','); if (box.dataset.ids !== ids) { box.dataset.ids = ids; box.innerHTML = list.filter(x => x.id !== 'wookie').map(x => '<canvas width="76" height="76" data-hero="' + x.id + '"></canvas>').join(''); paintPortraits(box); } }
    $('#mShopBadge').hidden = !!save.heroesSeen || list.length < 2;
    { const on = eventActive(), bar = $('#mEvent'); if (G.menu) G.menu.halloween = on; if (bar) { bar.hidden = !on; if (on) { const dn = eventDone(), n = [0, 1, 2].filter(i => dn[i]).length, d = eventDaysLeft(); $('#mEventS').textContent = heroOwned('hollo') ? tr(`Hollo gehört dir! ${n}/3 Level · noch ${d} Tage`, `Hollo is yours! ${n}/3 levels · ${d} days left`) : tr(`${n}/3 Level · schaff alle und Hollo gehört dir · noch ${d} Tage`, `${n}/3 levels · beat all three to unlock Hollo · ${d} days left`); $('#mEventBar').style.width = Math.round(n / 3 * 100) + '%'; } } }
    if (h.event && !own && eventActive()) { b.className = 'm-hbtn pick'; b.textContent = '🎃 ' + tr('Gratis im Halloween-Event', 'Free in the Halloween event'); }
    if ($('#mLang')) $('#mLang').textContent = G.lang === 'en' ? 'EN' : 'DE';
    $('#mMute').textContent = A().muted ? tr('Ton an', 'Sound on') : tr('Ton aus', 'Sound off');
    refreshDaily();
  }
  function menuHeroStep(d) { menuIdx += d; A().sfx.select(); renderMenu(); }
  function menuHeroAction() {
    const h = heroList()[menuIdx]; if (!h) return;
    if (h.event && !heroOwned(h.id) && eventActive()) { A().sfx.select(); startEvent(); return; }
    if (heroOwned(h.id)) { if (save.hero !== h.id) { setHero(h.id); A().sfx.gadget(); if (G.menu) G.menu.poke(); } renderMenu(); return; }
    if (!G.eco.buy({id: 'h_' + h.id, price: h.price})) { A().sfx.wrong(); const b = $('#mHeroBtn'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); b.textContent = tr('Noch ' + (h.price - S.money).toLocaleString(LOC) + ' Taler sammeln', (h.price - S.money).toLocaleString(LOC) + ' more coins needed'); setTimeout(renderMenu, 1500); return; }
    G.flow.speak('Yay! I did it!', {happy: true}); if (G.menu) G.menu.poke(); renderMenu();
  }
  /* the story intro (first start, and from the menu) */
  function playStory(done) {
    if (!G.story) { done(); return; }
    save.storySeen = 1; persist(); hideAll(); A().stopMusic(); S.mode = 'story';
    G.story.start(() => { if (S.mode === 'story') done(); });
  }
  function letterFor(wkey) {
    const st = G.LETTER_STORY[wkey]; if (!st) return null;
    const pz = Object.values(G.PZ.defs).filter(d => d.world === wkey).sort((a, b) => a.slot - b.slot);
    const tips = pz.map((d, i) => (i === 0 ? tr('Erstes Tor, „', 'First gate, “') : tr('Zweites Tor, „', 'Second gate, “')) + d.title + tr('“: ', '”: ') + d.letter).join('\n\n');
    return {title: st.title, text: st.text + (tips ? '\n\n' + tips : '') + tr('\n\nDeine Mallo', '\n\nLove, Mallo') + '\n\nP.S. ' + st.ps};
  }
  const allLetters = () => G.WORLDS.map(W => letterFor(W.key)).filter(Boolean);
  function showLetter(wi) { const W = G.WORLDS[wi], L = W && letterFor(W.key); if (!L) return; $('#letter-title').textContent = L.title; $('#letter-text').textContent = L.text; $('#letter').hidden = false; save.letters[W.key] = true; persist(); if (G.hub) G.hub.letterRead = true; G.flow.speak('A letter from Mallo!', {happy: true}); }

  /* ---------------- puzzles: the overlay pauses whatever runs underneath ---------------- */
  let pzFrom = null;
  G.flow.isSolved = id => !!save.solved[id];
  G.flow.openPuzzle = (id, onSolved) => {
    if (G.PZ.isOpen()) return; const def = G.PZ.defs[id]; if (!def) { onSolved && onSolved(); return; }
    pzFrom = S.mode; S.mode = 'pzpause'; resetInput(); G.flow.speak('A puzzle! Let me think...');
    const wIdx = G.WORLDS.findIndex(w => w.key === def.world);
    G.PZ.open(id, {label: tr('Rätsel ', 'Puzzle ') + (def.slot + 1) + tr(' von 2 · ', ' of 2 · ') + (G.WORLDS[wIdx] ? G.WORLDS[wIdx].name : ''), isTouch,
      pay: n => { if ((S.money || 0) < n) return false; G.eco.add(-n, 0, 0, true); return true; }, letters: allLetters,
      onSolved: () => { save.solved[id] = true; G.eco.add(250, 0, 0, true); persist(); achieve('puzzle'); if (Object.keys(save.solved).length >= 20) achieve('allpuzzles'); S.mode = pzFrom === 'pause' ? 'play' : pzFrom; pzFrom = null; G.flow.speak('I solved it!', {happy: true}); E.toast && G.L && E.toast(tr('+250 Taler', '+250 coins')); onSolved && onSolved(); },
      onClose: () => { S.mode = pzFrom === 'pause' ? 'play' : pzFrom; pzFrom = null; }});
  };
  /* ---------------- level, hub, globe flow ---------------- */
  function startLevel(idx, custom) {
    S.wi = Math.floor(idx / 4); S.li = idx % 4; mapSel = idx; S.hits = 0; curCustom = custom || null;
    const W = G.WORLDS[S.wi];
    /* worlds whose levels are self-contained modes (submarine, finale) */
    if (W.modes && !custom) { startMode(W.modes[S.li], idx); return; }
    /* space: the first level is the rocket flight, Mars and Saturn begin with a short flight from the previous planet */
    if (W.rocket && !custom && (S.li === 0 || S.li >= 2) && !G.rocket.skipFlight) { startFlight(idx); return; }
    G.rocket.skipFlight = false;
    E.load(S.wi, S.li, false, custom); S.mode = 'card'; cardT = 0; if (assist) G.gad.give('bubble', true); applyCostume();
    $('#card').hidden = false; $('#card-world').textContent = custom && custom.daily ? tr('Tageslevel · ', 'Daily Level · ') + custom.daily : (custom && custom.event ? custom.worldDef.name + ' · ' + tr('Halloween-Event', 'Halloween event') : tr('Welt ', 'World ') + (S.wi + 1) + ' · ' + W.name); $('#card-title').textContent = custom && (custom.daily || custom.event) ? custom.sub : (S.li + 1) + '. ' + W.levels[S.li]; $('#card-lives').textContent = ((heroList().find(h => h.id === (save.hero || 'wookie')) || {}).name || 'Toffo') + ' × ' + S.lives;
    { const sky = (custom && custom.worldDef ? custom.worldDef : W).sky; $('#card').style.background = `linear-gradient(${sky[0]}, ${sky[1]})`; }
    hideAll(['card']); A().stopMusic(); $('#btnPause').textContent = tr('Pause', 'Pause');
  }
  function startMode(name, idx) {
    const wi = Math.floor(idx / 4), li = idx % 4, W = G.WORLDS[wi], m = G.modes && G.modes[name];
    S.wi = wi; S.li = li; mapSel = idx; S.hits = 0; S.stars = [false, false, false];
    if (!m) { console.warn('mode missing: ' + name); G.flow.banner(tr('Bald verfügbar', 'Coming soon'), 2, tr('Dieses Level wird gerade gebaut.', 'This level is being built.')); showHub(wi, false); return; }
    hideAll(); A().stopMusic(); A().setWorld(W.music); A().setBoss(false); A().startMusic();
    S.mode = 'mode'; S.modeName = name; S.modeIdx = idx; $('#btnPause').textContent = tr('Pause', 'Pause'); S.outfit = S.outfitOverride || W.key;
    try {
      m.start({wi, li, world: W, name: W.levels[li], isTouch, autoplay: false,
        done: (result, info) => setTimeout(() => modeDone(name, idx, result, info || {}), 0),
        openPuzzle: (id, cb) => G.flow.openPuzzle(id, cb), isSolved: id => !!save.solved[id],
        money: n => G.eco.add(n, 0, 0, true), speak: (t, o) => G.flow.speak(t, o), banner: (t, d, sub) => G.flow.banner(t, d, sub),
        sfx: (nm, arg) => { try { if (A().sfx[nm]) A().sfx[nm](arg); } catch (e) {} },
        loadout: G.eco.loadout(), drawBear: (c, x, y, o) => G.draw.drawBearAt(c, x, y, o)});
    } catch (e) { console.error('MODE_START_ERROR ' + name + ' ' + e.message); showHub(wi, false); }
  }
  function modeDone(name, idx, result, info) {
    if (S.mode !== 'mode') return;
    const wi = Math.floor(idx / 4), li = idx % 4, W = G.WORLDS[wi];
    if (result === 'dead') { S.lives--; if (S.lives <= 0) { gameOver(); return; } startMode(name, idx); return; }
    if (result === 'quit') { showHub(wi, false); return; }
    /* finale: the ranch flows straight into the ending film, the film ends the game */
    if ((name === 'sub' && li === 3) || name === 'cinema') info.stars = [true, true, true];   /* the Kraken arena and the film have no star cookies to pick up */
    const k = key(wi, li); save.done[k] = true; const prev = save.stars[k] || [false, false, false]; save.stars[k] = prev.map((b, i) => b || !!(info.stars && info.stars[i]));
    S.score += info.score || 0; G.eco.add(60 + (li === 3 ? 100 : 0), 0, 0, true); persist(); achieve('first');
    if (W.key === 'finale' && name === 'ranch') { startMode('cinema', idx + 1); return; }
    if (W.key === 'finale' && name === 'cinema') { win(); return; }
    S.mode = 'clear'; A().stopMusic(); A().sfx.clear(); G.flow.speak('Yay! I did it!', {happy: true});
    $('#clear').hidden = false; $('#clear-title').textContent = tr(W.levels[li] + ' geschafft', W.levels[li] + ' complete');
    $('#clear-stars').textContent = (info.stars || [false, false, false]).map(b => b ? '★' : '☆').join(' ');
    $('#clear-stats').innerHTML = `<div class="row"><dt>${tr('Punkte', 'Points')}</dt><dd>${S.score.toLocaleString(LOC)}</dd></div><div class="row"><dt>${tr('Taler gesamt', 'Coins in total')}</dt><dd>${S.money.toLocaleString(LOC)}</dd></div><div class="row"><dt>${tr('Leben', 'Lives')}</dt><dd>${S.lives}</dd></div>`;
    $('#clear-next').hidden = idx + 1 >= N; $('#clear-next').textContent = li === 3 ? tr('Nächste Welt', 'Next world') : tr('Nächstes Level', 'Next level');
    mapSel = Math.min(N - 1, idx + 1);
  }
  function startFlight(idx) {
    S.wi = Math.floor(idx / 4); S.li = idx % 4; mapSel = idx;
    const li = idx % 4, full = li === 0, from = ['erde', 'erde', 'mond', 'mars'][li], target = ['mond', 'mond', 'mars', 'saturn'][li];
    E.load(S.wi, li, false); hideAll(); A().stopMusic(); A().setWorld(G.WORLDS[S.wi].music); A().startMusic(); $('#btnPause').textContent = tr('Pause', 'Pause');
    S.mode = 'dive'; G.dive.rocketMode = true; G.dive.launching = false;
    G.rocket.start({full, from, target, title: full ? 'Raketenflug' : 'Weiterflug', done: res => {
      G.dive.rocketMode = false;
      if (res === 'dead') { S.lives--; if (S.lives <= 0) { gameOver(); return; } startFlight(idx); return; }
      S.score += G.rocket.score;
      if (full) { const sh = G.rocket.ship || {hp: 1, maxHp: 1}; S.stars = [true, sh.hp >= Math.ceil(sh.maxHp / 2), sh.hp >= sh.maxHp]; S.time = Math.max(0, S.time - Math.round(G.rocket.t)); G.flow.levelClear(); }   /* stars: landed, half the hull left, no scratch */
      else { G.rocket.skipFlight = true; startLevel(idx); }
    }});
  }
  /* ---------------- seasonal event: Halloween "Spooky Night" (three levels; finishing all three unlocks Hollo) ---------------- */
  const EVW = G.EVENT && G.EVENT_WORLDS ? G.EVENT_WORLDS[G.EVENT.key] : null;
  function eventActive() { if (!EVW || !G.buildEventLevel) return false; if (/^#event/.test(HASH)) return true; const d = G.dailyKey(); return d >= G.EVENT.from && d <= G.EVENT.to; }
  function eventDone() { const e = save.event[G.EVENT.key] = save.event[G.EVENT.key] || {done: {}}; e.done = e.done || {}; return e.done; }
  const eventDaysLeft = () => Math.max(0, Math.ceil((new Date(G.EVENT.to + 'T23:59:59') - new Date()) / 864e5));
  function startEvent(li) {
    const dn = eventDone(); if (li === undefined) { li = [0, 1, 2].find(i => !dn[i]); if (li === undefined) li = (save.event.last + 1 || 0) % 3; }
    save.event.last = li; persist();
    const lv = G.buildEventLevel(EVW, EVW.diff, li, 7000 + li * 131); lv.name = EVW.name + ' ' + (li + 1); lv.sub = EVW.levels[li];
    A().init(); hideAll(); startLevel(EVW.diff * 4 + li, lv);
  }
  function startDaily() { const lv = G.buildDaily(); hideAll(); startLevel(lv.world * 4 + lv.index, lv); }
  function refreshDaily() { const k = G.dailyKey(), best = save.daily[k]; $('#btnDaily').textContent = tr('Tageslevel ', 'Daily Level ') + (best !== undefined ? '✓ ' + best + 's' : '(' + k.slice(5) + ')') + (save.streak > 1 ? tr(' · Serie ', ' · streak ') + save.streak : ''); if ($('#mDailyS')) $('#mDailyS').textContent = (best !== undefined ? tr('Heute ✓ ', 'Today ✓ ') + best + tr(' s · neu in ', ' s · new in ') + (() => { const n = new Date(), m = 1440 - n.getHours() * 60 - n.getMinutes(); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; })() : tr('Neues Level wartet!', 'A new level awaits!')) + (save.streak > 1 ? ' · 🔥 ' + save.streak + tr(' Tage', ' days') : ''); }
  function beginPlay() { $('#card').hidden = true; S.mode = 'play'; A().startMusic(); S.voiceT = 1.2; }
  function gameOver() { S.mode = 'over'; S.lives = 4; $('#over').hidden = false; $('#over-score').textContent = S.score.toLocaleString(LOC) + tr(' Punkte', ' points'); A().stopMusic(); }
  function win() { S.mode = 'win'; achieve('rescue'); const total = Object.values(save.stars).reduce((a, s) => a + s.filter(Boolean).length, 0); $('#win').hidden = false; $('#win-score').textContent = S.score.toLocaleString(LOC) + tr(' Punkte · ', ' points · ') + total + tr(' von ', ' of ') + (N * 3) + tr(' Sternkeksen', ' star cookies'); A().stopMusic(); A().sfx.rescue(); }
  function hideAll(except) { for (const id of OVERLAYS) $('#' + id).hidden = !(except || []).includes(id); if (globeOk && !(except || []).includes('globe')) G.globe.hide(); }
  function showTitle() { S.mode = 'title'; hideAll(['title']); A().stopMusic(); A().fast = false; A().slow = false; A().setWorld(MENU_MUSIC); A().setBoss(false); if (S.frames > 0 || HASH !== '#title') A().startMusic(); menuIdx = Math.max(0, heroList().findIndex(h => h.id === (save.hero || 'wookie'))); renderMenu(); }
  function worldProgress(wi) { let done = 0, stars = 0; for (let li = 0; li < 4; li++) { const k = key(wi, li); if (save.done[k]) done++; stars += (save.stars[k] || []).filter(Boolean).length; } return {done, stars}; }
  function showGlobe(wi) {
    if (!globeOk) { showMap(); return; }
    S.mode = 'globe'; hideAll(['globe']); G.globe.show(wi !== undefined ? wi : S.wi);
    const totalStars = Object.values(save.stars).reduce((a, s) => a + s.filter(Boolean).length, 0);
    $('#gprog').textContent = tr(`${Object.keys(save.done).length} von ${N} Leveln geschafft · ${totalStars} von ${N * 3} Sternkeksen · ${Object.keys(save.solved).length} von 20 Rätseln · ${S.money.toLocaleString(LOC)} Taler`, `${Object.keys(save.done).length} of ${N} levels done · ${totalStars} of ${N * 3} star cookies · ${Object.keys(save.solved).length} of 20 puzzles · ${S.money.toLocaleString(LOC)} coins`);
    refreshDaily();
    A().stopMusic(); A().fast = false; A().slow = false; A().setWorld(GLOBE_MUSIC); A().setBoss(false); A().startMusic();
  }
  function showHub(wi, fromSky) {
    hideAll(); A().stopMusic(); G.hub.letterRead = !!save.letters[G.WORLDS[wi].key]; G.hub.enter(wi, fromSky); applyCostume(); $('#btnPause').textContent = tr('Globus', 'Globe');
    if (!save.letters[G.WORLDS[wi].key]) setTimeout(() => { if (S.mode === 'hub' && S.wi === wi && $('#letter').hidden) showLetter(wi); }, fromSky ? 2600 : 700);
  }
  if (globeOk) { G.globe.progress = worldProgress; G.globe.onPick = wi => { S.mode = 'dive'; A().stopMusic(); G.dive.start(wi, () => showHub(wi, true)); }; }
  G.hub.onStart = idx => { A().sfx.select(); G.flow.speak("Let's go!", {happy: true}); startLevel(idx); };
  G.hub.onLetter = wi => showLetter(wi);
  G.hub.starsFor = idx => save.stars[key(Math.floor(idx / 4), idx % 4)] || [false, false, false];
  G.hub.doneFor = idx => !!save.done[key(Math.floor(idx / 4), idx % 4)];

  /* fallback world map without WebGL */
  function showMap() { S.mode = 'map'; hideAll(['map']); A().stopMusic(); renderMap(); }
  function renderMap() {
    const box = $('#worlds'); box.innerHTML = '';
    const totalStars = Object.values(save.stars).reduce((a, s) => a + s.filter(Boolean).length, 0);
    $('#map-progress').textContent = tr(`${Object.keys(save.done).length} von ${N} Leveln geschafft · ${totalStars} von ${N * 3} Sternkeksen`, `${Object.keys(save.done).length} of ${N} levels done · ${totalStars} of ${N * 3} star cookies`);
    G.WORLDS.forEach((W, wi) => {
      const sec = document.createElement('section'); sec.className = 'world'; sec.style.background = `linear-gradient(135deg, ${W.sky[0]}, ${W.sky[1]} 60%, ${W.sky[2]})`;
      sec.innerHTML = `<h3><span>${tr('Welt', 'World')} ${wi + 1}</span>${W.name}</h3><div class="nodes"></div>`;
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
    if (S.mode !== 'play' && S.mode !== 'card' && S.mode !== 'mode' && !(S.mode === 'dive' && G.dive.rocketMode)) return;
    pausedFrom = S.mode; S.mode = 'pause'; A().stopMusic(); A().sfx.pause(); resetInput(); const dp = $('#dpad'); if (dp) dp.classList.remove('l', 'r');
    $('#pause-level').textContent = G.L && (G.L.daily || G.L.event) && pausedFrom !== 'mode' ? (G.L.event ? G.L.world.name + ' · ' + G.L.sub : tr('Tageslevel', 'Daily Level')) : tr('Welt ', 'World ') + (S.wi + 1) + '-' + (S.li + 1) + ' · ' + G.WORLDS[S.wi].levels[S.li];
    $('#pause').hidden = false; $('#btnResume').focus(); $('#btnPause').textContent = tr('Weiter', 'Resume');
  }
  function resumeGame() { if (S.mode !== 'pause') return; $('#pause').hidden = true; S.mode = pausedFrom; $('#btnPause').textContent = tr('Pause', 'Pause'); if (S.mode === 'play' || S.mode === 'dive' || (S.mode === 'mode' && S.modeName !== 'cinema')) A().startMusic(); }
  function restartLevel() { $('#pause').hidden = true; S.lives = Math.max(S.lives, 1); startLevel(S.wi * 4 + S.li, curCustom || undefined); }
  function toggleFull() {
    try {
      if (document.fullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      else { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {}); }
    } catch (e) {}
  }
  const updateFullBtns = () => { const on = !!document.fullscreenElement; document.querySelectorAll('.btnFull').forEach(b => b.textContent = on ? tr('Vollbild aus', 'Exit fullscreen') : tr('Vollbild', 'Fullscreen')); };
  document.addEventListener('fullscreenchange', () => { updateFullBtns(); setTimeout(fit, 50); setTimeout(fit, 400); });

  /* ---------------- settings ---------------- */
  $('#chkVoice').checked = A().voiceCfg.on !== false;
  $('#chkVoice').addEventListener('change', e => { A().voiceCfg.on = e.target.checked; A().saveVoiceCfg(); updateVoiceBtns(); });
  try { S.bearStyle = localStorage.getItem('pookie-style') || 'cool'; } catch (e) { S.bearStyle = 'cool'; }
  $('#selStyle').value = S.bearStyle;
  $('#selStyle').addEventListener('change', e => { S.bearStyle = e.target.value; try { localStorage.setItem('pookie-style', S.bearStyle); } catch (err) {} });
  $('#chkAssist').checked = assist;
  $('#chkAssist').addEventListener('change', e => { assist = e.target.checked; try { localStorage.setItem('pookie-assist', assist ? '1' : '0'); } catch (err) {} });
  const updateVoiceBtns = () => { document.querySelectorAll('.btnVoiceToggle').forEach(b => b.textContent = A().voiceCfg.on ? tr('Stimme aus', 'Voice off') : tr('Stimme an', 'Voice on')); };
  document.querySelectorAll('.btnVoiceToggle').forEach(b => b.addEventListener('click', () => { A().voiceCfg.on = !A().voiceCfg.on; A().saveVoiceCfg(); $('#chkVoice').checked = A().voiceCfg.on; updateVoiceBtns(); }));
  updateVoiceBtns();

  /* ---------------- step ---------------- */
  function step() {
    S.frames++;
    if (S.mode === 'card') { cardT += 1 / 60; input.jumpEdge = false; input.runEdge = false; input.jumpKeyEdge = false; input.downEdge = false; if (cardT > 2) beginPlay(); return; }
    if (S.mode === 'brand') { G.brand.update(); return; }
    if (S.mode === 'story') { if (G.story) G.story.update(); return; }
    if (S.mode === 'mode') { const m = G.modes && G.modes[S.modeName]; if (m) { try { m.update(); } catch (e) { console.error('MODE_UPDATE_ERROR ' + e.message); } } input.jumpEdge = false; input.runEdge = false; input.jumpKeyEdge = false; input.downEdge = false; return; }
    if (S.mode === 'dive') { G.dive.update(); input.jumpEdge = false; input.runEdge = false; input.jumpKeyEdge = false; input.downEdge = false; return; }
    if (S.mode === 'hub' || S.mode === 'play') { if (P.combo >= 5) achieve('combo5'); if (S.room === 1) achieve('bonus'); }
    if (S.mode === 'hub') { E.updatePlayer(); E.updateParts(); E.updateCamera(); G.hub.update(); input.jumpEdge = false; input.runEdge = false; input.jumpKeyEdge = false; input.downEdge = false; return; }
    if (S.mode !== 'play') return;
    if (G.goalSeq) E.updateGoal(); else E.updatePlayer();
    G.entsMod.update(); E.updateParts();
    if (!P.dead && !G.goalSeq) {
      S.timeAcc += 1 / 60; if (S.timeAcc >= 1) { S.timeAcc -= 1; S.time--; if (S.time === 60) { A().sfx.time(); E.toast(tr('Schnell!', 'Hurry!')); } if (S.time <= 0) { S.time = 0; E.die('time'); } }
      S.voiceT -= 1 / 60; if (S.voiceT <= 0) { S.voiceT = 16 + Math.random() * 12; const lines = G.L.world.lines; G.flow.speak(S.frames < 400 ? 'I need to find my Mallo!' : lines[Math.floor(Math.random() * lines.length)]); }
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
    if (S.mode === 'title' && e.target && e.target.tagName === 'BUTTON' && (e.code === 'Enter' || e.code === 'Space')) return;
    if (G.PZ && G.PZ.isOpen && G.PZ.isOpen()) return;   /* an open puzzle owns the keyboard (e.g. typing F into the wormhole console) */   /* the focused menu button handles it */
    const n = KEYMAP[e.code]; if (n && (S.mode === 'play' || S.mode === 'card' || S.mode === 'hub' || S.mode === 'mode' || (S.mode === 'dive' && G.dive.rocketMode))) { press(n, true); e.preventDefault(); }
    if (!$('#letter').hidden && (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space')) { $('#letter').hidden = true; return; }
    if (!$('#keks').hidden && (e.code === 'Enter' || e.code === 'Escape')) { $('#keks').hidden = true; return; }
    if (!$('#shop').hidden) { if (e.code === 'Escape') { $('#shop').hidden = true; if (S.mode === 'title') renderMenu(); } return; }   /* keys must not reach the globe, menu or pause menu behind the shop */
    if (!$('#settings').hidden) { if (e.code === 'Escape') { $('#settings').hidden = true; renderMenu(); } return; }
    if (e.repeat) return;
    if (S.mode === 'boot') { startBrand(); return; }
    if (S.mode === 'brand') { G.brand.skip(); return; }
    if (S.mode === 'story') { G.story.skip(); return; }
    if (S.mode === 'title' && $('#shop').hidden && $('#settings').hidden && $('#keks').hidden) { if (e.code === 'ArrowLeft' || e.code === 'KeyA') { menuHeroStep(-1); return; } if (e.code === 'ArrowRight' || e.code === 'KeyD') { menuHeroStep(1); return; } }

    if (e.code === 'KeyF') { toggleFull(); return; }
    if (S.mode === 'globe') { if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowUp') G.globe.move(-1); else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowDown') G.globe.move(1); else if (e.code === 'Enter' || e.code === 'Space') { A().init(); G.globe.pick(); } else if (e.code === 'Escape') showTitle(); e.preventDefault(); return; }
    if (S.mode === 'dive') { if (G.dive.rocketMode) { if (e.code === 'Escape' || e.code === 'KeyP') pauseGame(); return; } if (G.dive.launching) { if (e.code === 'Enter' || e.code === 'Space') G.rocket.lt = Math.max(G.rocket.lt, 3.0); return; } if (e.code === 'Enter' || e.code === 'Space') G.dive.t = Math.max(G.dive.t, 2.15); return; }
    if (S.mode === 'hub') { if (e.code === 'Escape') showGlobe(S.wi); return; }
    if (S.mode === 'map') { if (e.code === 'ArrowLeft' || e.code === 'KeyA') mapMove(-1); else if (e.code === 'ArrowRight' || e.code === 'KeyD') mapMove(1); else if (e.code === 'ArrowUp' || e.code === 'KeyW') mapMove(-4); else if (e.code === 'ArrowDown' || e.code === 'KeyS') mapMove(4); else if (e.code === 'Enter' || e.code === 'Space') { A().sfx.select(); startLevel(mapSel); } else if (e.code === 'Escape') showTitle(); return; }
    if (S.mode === 'pause') { if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter') resumeGame(); return; }
    if ((e.code === 'Escape' || e.code === 'KeyP') && (S.mode === 'mode' || ((S.mode === 'play' || S.mode === 'card') && !P.dead && !G.goalSeq))) { pauseGame(); return; }
    if (e.code === 'Enter' || e.code === 'Space') advance();
  });
  document.addEventListener('keyup', e => { const n = KEYMAP[e.code]; if (n) press(n, false); });
  window.addEventListener('blur', resetInput);
  /* app sent to the background (phone call, home button): pause the level and silence the audio until it comes back */
  document.addEventListener('visibilitychange', () => {
    const ac = A().ctx;
    if (document.hidden) { resetInput(); if ((S.mode === 'play' && !P.dead && !G.goalSeq) || S.mode === 'mode' || (S.mode === 'dive' && G.dive.rocketMode)) pauseGame(); A().stopMusic(); try { if (ac && ac.state === 'running') ac.suspend(); } catch (e) {} }
    else { try { if (ac && ac.state === 'suspended') ac.resume(); } catch (e) {} if (!A().muted && (S.mode === 'hub' || S.mode === 'globe' || S.mode === 'title' || (S.mode === 'pzpause' && pzFrom !== 'mode'))) A().startMusic(); }
  });
  /* game controllers (Bluetooth pads on phones, tablets, PCs): stick/d-pad, A = jump, B/X = shoot, Start = pause */
  let padPrev = {};
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null; let gp = null; if (pads) for (const q of pads) if (q && q.connected) { gp = q; break; } if (!gp) return;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const st = {left: b(14) || ax < -0.45, right: b(15) || ax > 0.45, up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, jumpkey: b(0), run: b(1) || b(2), start: b(9)};
    const edge = k => st[k] && !padPrev[k];
    const ingame = S.mode === 'play' || S.mode === 'card' || S.mode === 'hub' || S.mode === 'mode' || (S.mode === 'dive' && G.dive.rocketMode);
    if (ingame) for (const k of ['left', 'right', 'up', 'down', 'jumpkey', 'run']) if (st[k] !== !!padPrev[k]) press(k, st[k]);
    if (edge('start')) { if (S.mode === 'pause') resumeGame(); else if (ingame && S.mode !== 'card') pauseGame(); else advance(); }
    else if (S.mode === 'card' && edge('jumpkey') && cardT > 0.4) beginPlay();
    else if (S.mode === 'globe') { if (edge('left')) G.globe.move(-1); if (edge('right')) G.globe.move(1); if (edge('jumpkey')) { A().init(); G.globe.pick(); } }
    else if (S.mode === 'title' && $('#shop').hidden && $('#settings').hidden && $('#keks').hidden) { if (edge('left')) menuHeroStep(-1); if (edge('right')) menuHeroStep(1); if (edge('jumpkey')) advance(); }
    else if (!ingame && edge('jumpkey')) { if (S.mode === 'boot') startBrand(); else if (S.mode === 'brand') G.brand.skip(); else if (S.mode === 'story') G.story.skip(); else if (S.mode === 'pause') resumeGame(); else advance(); }
    padPrev = st;
  }
  document.querySelectorAll('#touch button').forEach(b => { const n = b.dataset.k; const on = e => { e.preventDefault(); A().init(); press(n, true); if (S.mode === 'card' && cardT > 0.4 && n === 'jumpkey') beginPlay(); }; const off = () => press(n, false); b.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, off)); b.addEventListener('contextmenu', e => e.preventDefault()); });
  /* the run pad: direction follows the thumb's position; sliding across switches sides without lifting */
  { const pad = $('#dpad'); let padId = null;
    const setDir = x => { const r = pad.getBoundingClientRect(), rel = x - (r.left + r.width / 2), dz = 7, l = rel < -dz, rt = rel > dz; if (l !== input.left) press('left', l); if (rt !== input.right) press('right', rt); pad.classList.toggle('l', l); pad.classList.toggle('r', rt); };
    const release = e => { if (padId === null || (e && e.pointerId !== padId)) return; padId = null; press('left', false); press('right', false); pad.classList.remove('l', 'r'); };
    pad.addEventListener('pointerdown', e => { e.preventDefault(); A().init(); if (padId !== null) return; padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (err) {} setDir(e.clientX); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === padId) setDir(e.clientX); });
    pad.addEventListener('pointerup', release); pad.addEventListener('pointercancel', release); pad.addEventListener('lostpointercapture', release); pad.addEventListener('contextmenu', e => e.preventDefault()); }
  /* taps on the stage: skip the dive, start after the level card */
  $('#stage').addEventListener('pointerdown', () => { if (S.mode === 'boot') startBrand(); else if (S.mode === 'brand') G.brand.skip(); else if (S.mode === 'story') G.story.skip(); else if (S.mode === 'dive') { if (G.dive.launching) G.rocket.lt = Math.max(G.rocket.lt || 0, 3.0); else if (!G.dive.rocketMode) G.dive.t = Math.max(G.dive.t, 2.15); } else if (S.mode === 'card' && cardT > 0.4) beginPlay(); });
  $('#card').addEventListener('pointerdown', () => { if (S.mode === 'card' && cardT > 0.4) beginPlay(); });
  /* touch browsers only grant fullscreen on pointerup/touchend: try again there, and on the first title button */
  if (isTouch) ['pointerup', 'touchend'].forEach(ev => document.addEventListener(ev, () => { try { const ac = A().ctx; if (ac && ac.state !== 'running') ac.resume(); } catch (e) {} if (!document.fullscreenElement && S.mode !== 'boot') goFullscreen(); }, {passive: true}));   /* iOS unlocks audio on touchend */
  function advance() {
    if (S.mode === 'title') { if (!$('#shop').hidden || !$('#settings').hidden || !$('#keks').hidden) return; A().init(); A().sfx.select(); hideAll(); showGlobe(); if (isTouch) goFullscreen(); }
    else if (S.mode === 'card' && cardT > 0.4) beginPlay();
    else if (S.mode === 'clear' && !$('#clear').hidden) { $('#clear').hidden = true; const idx = S.wi * 4 + S.li + 1; if (G.L && G.L.event) { const dn = eventDone(); if (dn[0] && dn[1] && dn[2]) showTitle(); else startEvent(); } else if (G.L && G.L.daily) showGlobe(); else if (S.li === 3) showGlobe(Math.min(G.WORLDS.length - 1, S.wi + 1)); else if (idx < N) startLevel(idx); else showGlobe(); }
    else if (S.mode === 'over' || S.mode === 'win') { $('#over').hidden = true; $('#win').hidden = true; if (G.L && G.L.event) showTitle(); else showGlobe(); }
  }
  $('#btnStart').addEventListener('click', advance);
  $('#clear-next').addEventListener('click', advance);
  $('#clear-map').addEventListener('click', () => { $('#clear').hidden = true; if (G.L && G.L.event) showTitle(); else if (G.L && G.L.daily) showGlobe(); else showHub(S.wi, false); });
  $('#btnOver').addEventListener('click', advance);
  $('#btnWin').addEventListener('click', advance);
  $('#btnMapBack').addEventListener('click', showTitle);
  $('#btnGlobeBack').addEventListener('click', showTitle);
  $('#btnReset').addEventListener('click', () => { if (!resetArmed) { resetArmed = true; $('#btnReset').textContent = tr('Wirklich löschen?', 'Really delete?'); setTimeout(() => { resetArmed = false; $('#btnReset').textContent = tr('Spielstand löschen', 'Delete progress'); }, 3000); return; } save = {unlocked: 0, stars: {}, best: {}, done: {}, coins: {}, letters: {}, ach: {}, daily: {}, streak: 0, dailyLast: '', costume: '', gad: 0, money: 0, owned: {}, solved: {}, hero: 'wookie', storySeen: 1, version: 2, coinsPaid: true, event: {}}; S.money = 0; G.eco.owned = save.owned; setHero('wookie'); refreshCostumes(); persist(); mapSel = 0; $('#settings').hidden = true; resetArmed = false; $('#btnReset').textContent = tr('Spielstand löschen', 'Delete progress'); if (globeOk) G.globe.refreshMarkers(); showTitle(); });
  const setMuted = m => { A().init(); A().muted = m; try { localStorage.setItem('pookie-muted', m ? '1' : '0'); } catch (e) {} ['#btnMute', '#btnPauseMute', '#mMute'].forEach(id => { if ($(id)) $(id).textContent = m ? tr('Ton an', 'Sound on') : tr('Ton aus', 'Sound off'); }); $('#chkSound').checked = !m; if (m) A().stopMusic(); else if (S.mode === 'play' || S.mode === 'hub' || S.mode === 'globe' || S.mode === 'title' || S.mode === 'mode') A().startMusic(); };
  try { if (localStorage.getItem('pookie-muted') === '1') { A().muted = true; ['#btnMute', '#btnPauseMute', '#mMute'].forEach(id => { if ($(id)) $(id).textContent = tr('Ton an', 'Sound on'); }); $('#chkSound').checked = false; } } catch (e) {}
  $('#btnMute').addEventListener('click', () => setMuted(!A().muted));
  $('#mMute').addEventListener('click', () => setMuted(!A().muted));
  $('#chkSound').addEventListener('change', e => setMuted(!e.target.checked));
  $('#btnVoice').addEventListener('click', () => { A().init(); G.flow.speak('Hello! I am Toffo.', {happy: true}); });
  $('#btnPause').addEventListener('click', () => { if (S.mode === 'pause') resumeGame(); else if (S.mode === 'hub') showGlobe(S.wi); else pauseGame(); });
  $('#btnResume').addEventListener('click', resumeGame);
  $('#btnRestart').addEventListener('click', restartLevel);
  $('#btnPauseMap').addEventListener('click', () => { $('#pause').hidden = true; if (pausedFrom !== 'mode' && G.L && G.L.event) showTitle(); else if (pausedFrom !== 'mode' && G.L && G.L.daily) showGlobe(); else showHub(S.wi, false); });
  $('#btnPauseGlobe').addEventListener('click', () => { $('#pause').hidden = true; showGlobe(S.wi); });
  $('#btnPauseTitle').addEventListener('click', () => { $('#pause').hidden = true; showTitle(); });
  $('#btnPauseMute').addEventListener('click', () => setMuted(!A().muted));
  $('#btnDaily').addEventListener('click', () => { A().init(); A().sfx.select(); startDaily(); });
  $('#btnKeks').addEventListener('click', () => { A().init(); A().sfx.select(); renderKeks(); $('#keks').hidden = false; });
  $('#mDaily').addEventListener('click', () => { A().init(); A().sfx.select(); startDaily(); });
  $('#mEvent').addEventListener('click', () => { A().init(); A().sfx.select(); startEvent(); });
  $('#mLang').addEventListener('click', () => G.setLang(G.lang === 'en' ? 'de' : 'en'));
  $('#selLang').value = G.lang; $('#selLang').addEventListener('change', e => G.setLang(e.target.value));
  $('#mShop').addEventListener('click', () => { A().sfx.select(); openShop(save.heroesSeen ? undefined : 'heroes'); });
  $('#mMoney').addEventListener('click', () => { A().sfx.select(); openShop('heroes'); });
  $('#mStory').addEventListener('click', () => { A().init(); A().sfx.select(); playStory(showTitle); });
  $('#mSettings').addEventListener('click', () => { A().init(); A().sfx.select(); refreshCostumes(); $('#settings').hidden = false; });
  $('#btnSettingsClose').addEventListener('click', () => { $('#settings').hidden = true; renderMenu(); });
  $('#mPrev').addEventListener('click', () => menuHeroStep(-1));
  $('#mNext').addEventListener('click', () => menuHeroStep(1));
  $('#mHeroBtn').addEventListener('click', () => { A().init(); menuHeroAction(); });
  $('#mHeroTap').addEventListener('click', () => { A().init(); if (G.menu && !$('#mHeroTap').swiped) G.menu.poke(); });
  /* swipe over the hero to flip through the heroes */
  { let sx = null; $('#mHeroTap').addEventListener('pointerdown', e => { sx = e.clientX; $('#mHeroTap').swiped = false; }); $('#mHeroTap').addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 40) { $('#mHeroTap').swiped = true; menuHeroStep(e.clientX < sx ? 1 : -1); } sx = null; }); }
  $('#btnKeksClose').addEventListener('click', () => { $('#keks').hidden = true; });
  $('#btnLetterClose').addEventListener('click', () => { $('#letter').hidden = true; });
  $('#selCostume').addEventListener('change', e => { save.costume = e.target.value; persist(); applyCostume(); });
  $('#shop-list').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b) shopAction(b.dataset.act, b.dataset.id); });
  document.querySelectorAll('#shop .tab').forEach(b => b.addEventListener('click', () => { A().sfx.select(); renderShop(b.dataset.tab); }));
  $('#btnShopClose').addEventListener('click', () => { $('#shop').hidden = true; if (S.mode === 'title') renderMenu(); });
  document.querySelectorAll('.btnShop').forEach(b => b.addEventListener('click', () => openShop()));
  refreshCostumes();
  if (/github\.io$/.test(location.hostname)) $('#lnkPrivacy').hidden = false;   /* the privacy page ships with the app build */
  /* Android: short vibrations on hits, stomps and boss blows (iPhones have no vibration API, the row hides there) */
  { let haptic = true; try { haptic = localStorage.getItem('pookie-haptic') !== '0'; } catch (e) {}
    const can = !!navigator.vibrate; $('#rowHaptic').hidden = !can; $('#chkHaptic').checked = haptic;
    $('#chkHaptic').addEventListener('change', e => { haptic = e.target.checked; try { localStorage.setItem('pookie-haptic', haptic ? '1' : '0'); } catch (err) {} if (haptic && can) navigator.vibrate(30); });
    const buzz = ms => { if (haptic && can && document.hasFocus()) try { navigator.vibrate(ms); } catch (e) {} };
    for (const [n, ms] of [['stomp', 12], ['die', [40, 40, 70]], ['hurt', 40], ['bossHit', 30], ['pound', 22], ['bubblePop', 25], ['bossDown', [30, 40, 30, 40, 90]], ['cannon', 30], ['rocketHit', 35]]) { const f = A().sfx[n]; if (f) A().sfx[n] = function () { buzz(ms); return f.apply(this, arguments); }; } }
  /* Toffo's voice on the action, Mario-style: short real vocalizations on jumps, hits, wins and pickups (with a cooldown so it never chatters) */
  { const V = (cat, o) => () => { try { A().vox(cat, o); } catch (e) {} };
    const hooks = {jump: V('jump', {p: 0.3, gain: 0.8}), doubleJump: V('jump', {p: 0.75}), wallJump: V('jump', {p: 0.6}), bigJump: V('whoo', {p: 0.5}), hurt: V('hurt', {force: true}), die: V('doh', {force: true}),
      clear: V('cheer', {force: true, delay: 0.25}), gadget: V('wow', {p: 0.8}), powerup: V('aha', {p: 0.7}), starStart: V('wahoo', {force: true}), cannon: V('whoo', {force: true}), oneUp: V('laugh', {}),
      bossDown: V('wahoo', {force: true, delay: 0.3}), puzzleSolved: V('aha', {force: true}), wrong: V('huh', {p: 0.8}), lose: V('sad', {force: true}), rescue: V('wahoo', {force: true}), landing: V('phew', {p: 0.6})};
    for (const [n, f] of Object.entries(hooks)) { const orig = A().sfx[n]; if (orig) A().sfx[n] = function () { f(); return orig.apply(this, arguments); }; } }
  /* installed app (standalone) or iPhone: no fullscreen API needed, hide those buttons */
  if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone || !(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) document.querySelectorAll('.btnFull').forEach(b => b.hidden = true);
  /* gadget counter for the Keksdose */
  { const give0 = G.gad.give.bind(G.gad); G.gad.give = (id, quiet) => { give0(id, quiet); if (!quiet) { save.gad = (save.gad || 0) + 1; persist(); if (save.gad >= 10) achieve('gadgets10'); } }; }
  /* chocolate pen: drawing on the stage (mouse or a second finger) lays down chocolate platforms */
  { let drawing = false; const toWorld = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * G.VW + S.cam, (e.clientY - r.top) / r.height * VH - G.OFFY]; };
    $('#stage').addEventListener('pointerdown', e => { if (S.mode === 'play' && P.gadget === 'choco') { drawing = true; const [x, y] = toWorld(e); G.gad.draw(x, y, 'start'); } });
    $('#stage').addEventListener('pointermove', e => { if (drawing && S.mode === 'play' && P.gadget === 'choco') { const [x, y] = toWorld(e); G.gad.draw(x, y, 'move'); } });
    const stop = () => { if (drawing) { drawing = false; G.gad.draw(0, 0, 'end'); } }; $('#stage').addEventListener('pointerup', stop); $('#stage').addEventListener('pointercancel', stop); $('#stage').addEventListener('pointerleave', stop); }
  document.querySelectorAll('.btnFull').forEach(b => b.addEventListener('click', toggleFull));

  /* ---------------- loop and sizing ---------------- */
  /* size the stage to the VISIBLE viewport (phones: browser bars come and go), keep 16:9, centre it */
  function fit() {
    const hd = !!G.draw.resize, vv = window.visualViewport;
    const availW = Math.floor(vv ? vv.width : innerWidth), availH = Math.floor(vv ? vv.height : innerHeight);
    /* the logical width follows the screen: 480 on 16:9, wider on phones, so no black bars */
    if (hd) G.VW = Math.max(480, Math.min(640, Math.round(VH * availW / Math.max(1, availH))));
    let s = Math.min(availW / G.VW, availH / VH); if (!hd) s = Math.max(1, Math.floor(s * 4) / 4);
    const w = Math.round(G.VW * s), h = Math.round(VH * s);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    document.body.style.height = availH + 'px'; document.body.style.width = availW + 'px';
    if (hd) G.draw.resize(w, h);
    if (globeOk) G.globe.resize(w, h);
    { const tl = $('#title'), u = h / VH; tl.style.setProperty('--u', u + 'px'); if (G.menu) { const lay = G.menu.layout(); tl.style.setProperty('--heroW', ((G.VW - lay.side - 3 * lay.pad) * u) + 'px'); tl.style.setProperty('--heroTapL', ((lay.heroX - 45) * u) + 'px'); } }
    document.body.classList.toggle('sidebars', availW - w >= 130);   /* phones in landscape: room for the corner buttons beside the canvas */
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', () => { setTimeout(fit, 100); setTimeout(fit, 600); });
  if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', () => window.scrollTo(0, 0)); }
  fit();
  let last = 0, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; acc += dt;
    pollPad();
    let n = 0; while (acc >= 1 / 60 && n++ < 4) { step(); acc -= 1 / 60; }
    if (isTouch) { document.body.classList.toggle('playing', S.mode === 'play' || S.mode === 'card' || S.mode === 'hub' || S.mode === 'dive' || S.mode === 'mode'); document.body.classList.toggle('onglobe', S.mode === 'globe'); }
    document.body.classList.toggle('inmenu', S.mode === 'title' || S.mode === 'story' || S.mode === 'boot' || S.mode === 'brand');
    if (S.mode === 'globe' && globeOk) G.globe.frame();
    else if (S.mode === 'boot' || S.mode === 'brand' || S.mode === 'story' || S.mode === 'title' || S.mode === 'dive' || S.mode === 'mode' || (S.mode === 'pause' && (pausedFrom === 'dive' || pausedFrom === 'mode')) || (S.mode === 'pzpause' && (pzFrom === 'mode' || pzFrom === 'dive'))) {
      const c = G.draw.ctx || canvas.getContext('2d'), kk = G.draw.k || (canvas.height / VH); c.setTransform(kk, 0, 0, kk, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      if (S.mode === 'boot' || S.mode === 'brand') G.brand.frame(c, kk);
      else if (S.mode === 'story') { if (G.story) G.story.frame(c); }
      else if (S.mode === 'title') { if (G.menu) G.menu.frame(c); else { c.fillStyle = '#2b1d33'; c.fillRect(0, 0, G.VW, VH); } }
      else if (S.mode === 'mode' || (S.mode === 'pause' && pausedFrom === 'mode') || (S.mode === 'pzpause' && pzFrom === 'mode')) { const m = G.modes && G.modes[S.modeName]; if (m) m.frame(c); }
      else G.dive.frame(c, kk);
    }
    else G.draw.frame();
  }
  function boot() {
    S.mode = 'boot'; hideAll();   /* start screen on the canvas; the first tap starts the publisher intro */
    const brandM = /^#brand(?:=([\d.]+))?$/.exec(HASH);
    if (brandM) { S.mode = 'boot'; startBrand(); const n = Math.round((+brandM[1] || 0) * 60); for (let i = 0; i < n; i++) step(); }   /* headless: step the intro synchronously to a time point */
    if (HASH === '#title') showTitle();
    const storyM = /^#story(?:=([\d.]+))?$/.exec(HASH);
    if (storyM) { playStory(showTitle); const n = Math.round((+storyM[1] || 0) * 60); for (let i = 0; i < n; i++) step(); console.log('STORY_BOOT t=' + (G.story ? G.story.t.toFixed(1) : 'none') + ' mode=' + S.mode); }
    const menuM = /^#menu(\w*)$/.exec(HASH);
    if (menuM) { document.body.classList.add('noanim'); if (menuM[1]) { S.money = 2000; save.done['wiese-0'] = true; save.done['wiese-1'] = true; save.stars['wiese-0'] = [true, true, false]; const i2 = heroList().findIndex(h => h.id === menuM[1]); if (i2 >= 0) menuIdx = i2; } showTitle(); if (menuM[1]) { menuIdx = Math.max(0, heroList().findIndex(h => h.id === menuM[1])); renderMenu(); } if (G.menu) G.menu.dropT = -1; console.log('MENU_BOOT heroes=' + heroList().map(h => h.id).join(',')); }
    const stM = /^#station(\d+)(open)?$/.exec(HASH);
    if (stM) { const idx = +stM[1] - 1; S.wi = Math.floor(idx / 4); S.li = idx % 4; hideAll(); S.lives = 4; E.load(S.wi, S.li, false); S.mode = 'play'; const pz = G.L.pz; if (pz) { P.x = (pz.stationCol - 1) * T; P.y = 13 * T - P.h; S.cam = Math.max(0, Math.min(G.L.mainW * T - G.VW, P.x - G.VW * 0.45)); for (let i = 0; i < 4; i++) step(); if (stM[2]) G.flow.openPuzzle(pz.id, () => console.log('STATION_SOLVED ' + pz.id)); } console.log('STATION_BOOT ' + G.L.name + ' pz=' + (pz ? pz.id + ' col=' + pz.stationCol + ' gate=' + pz.gateCol : 'none')); }
    const bossM = /^#boss(\d+)(fight)?$/.exec(HASH);
    if (bossM) { const idx = +bossM[1] - 1; S.wi = Math.floor(idx / 4); S.li = idx % 4; hideAll(); S.lives = 4; E.load(S.wi, S.li, false); S.mode = 'play'; const L2 = G.L; if (L2.arenaX) { P.x = L2.arenaX + 8; P.y = (L2.arenaRow + 1) * T - P.h - 2; P.inv = 99; S.cam = Math.max(0, L2.arenaX - 40); for (let i = 0; i < (bossM[2] ? 260 : 6); i++) { step(); P.inv = 99; } } const bz = G.ents.find(e => e.kind === 'boss'); console.log('BOSS_BOOT ' + L2.name + ' arena=' + (bz ? bz.arena : '-') + ' weapon=' + (bz ? bz.weapon : '-') + ' active=' + (bz ? bz.active : '-') + ' hazards=' + G.ents.filter(e => e.kind === 'beam' || e.kind === 'warn' || (e.kind === 'shot' && e.boss)).length + ' blaster=' + P.blaster + ' camY=' + (S.camY || 0).toFixed(0)); }
    if (HASH === '#wfdump') { const wi = G.WORLDS.findIndex(w => w.key === 'schoko'); const src = G.buildLevel(wi, G.WORLDS[wi].waterfall); const wf = src.waterfall; const a = Math.floor(wf.x0 / 16) - 2, b = Math.floor(wf.x1 / 16) + 12; for (let y = 10; y < src.cols[0].length; y++) { let r = ''; for (let x = a; x < b; x++) r += src.cols[x][y] || '?'; console.log('WF' + String(y).padStart(2, '0') + ' ' + r); } console.log('WFINFO x0=' + wf.x0 / 16 + ' x1=' + wf.x1 / 16 + ' from=' + a); }
    const wfM = /^#wf(\d+)$/.exec(HASH);
    if (wfM) { const wi = G.WORLDS.findIndex(w => w.key === 'schoko'), li = G.WORLDS[wi].waterfall; S.wi = wi; S.li = li; hideAll(); S.lives = 4; E.load(wi, li, false); S.mode = 'play'; const wf = G.L.waterfall; const ch = G.ents.find(e => e.kind === 'chute'); P.x = ch.x - 40; P.y = 13 * T - P.h; P.inv = 99999; S.cam = Math.max(0, P.x - 200); const n = +wfM[1]; for (let i = 0; i < n; i++) { for (const k in input) input[k] = false; if (P.x < wf.x0 + 6 * T) input.right = true; step(); } console.log('WF_BOOT frames=' + n + ' x=' + P.x.toFixed(0) + ' y=' + P.y.toFixed(0) + ' chute=' + P.chute + ' camY=' + S.camY.toFixed(0)); }
    const playM = /^#play(\d+)(?:t=([\d.]+))?$/.exec(HASH);
    if (playM) { hideAll(); S.lives = 4; startLevel(+playM[1] - 1); if (S.mode === 'card') beginPlay(); const n = Math.round((+playM[2] || 0) * 60); for (let i = 0; i < n; i++) step(); console.log('PLAY_BOOT idx=' + playM[1] + ' mode=' + S.mode + ' modeName=' + (S.modeName || '-') + ' world=' + G.WORLDS[S.wi].key + ' li=' + S.li); }
    if (HASH === '#pzall') {
      /* every registered puzzle in the real page: open, auto-solve, wait for the solve, next */
      const ids = Object.keys(G.PZ.defs).sort(); let i = 0, ok = 0; const per = {};
      G.WORLDS.forEach(W => { per[W.key] = Object.values(G.PZ.defs).filter(d => d.world === W.key).map(d => d.slot).sort().join(''); });
      console.log('PZALL worlds ' + JSON.stringify(per));
      const next = () => { if (i >= ids.length) { console.log('PZALL DONE ' + ok + '/' + ids.length); return; } const id = ids[i++]; const t0 = Date.now(); let done = false;
        G.PZ.open(id, {pay: () => true, letters: allLetters, onSolved: () => { done = true; ok++; console.log('PZALL ok ' + id); setTimeout(next, 50); }});
        setTimeout(() => { const c = G.PZ.current; if (c && c.handle && c.handle.autoSolve) c.handle.autoSolve(); else console.log('PZALL noAutoSolve ' + id); }, 300);
        setTimeout(() => { if (!done) { console.log('PZALL TIMEOUT ' + id); G.PZ.close(); next(); } }, 9000); };
      hideAll(); S.mode = 'title'; next();
    }
    if (HASH === '#journey') {
      /* the finale chain through the real flow: Saturn rescue -> black hole -> city -> ranch -> film -> win (each mode finished via debugWin) */
      const fi = G.WORLDS.findIndex(w => w.key === 'finale'); hideAll(); S.lives = 4; let steps = 0;
      const tick = () => {
        steps++; if (steps > 40) { console.log('JOURNEY TIMEOUT mode=' + S.mode); return; }
        if (S.mode === 'win') { console.log('JOURNEY WIN after ' + steps + ' steps'); return; }
        if (S.mode === 'clear') { console.log('JOURNEY clear ' + G.WORLDS[S.wi].levels[S.li]); advance(); setTimeout(tick, 300); return; }
        if (S.mode === 'mode') { const m = G.modes[S.modeName]; console.log('JOURNEY in ' + S.modeName); for (let i = 0; i < 20; i++) step(); if (m && m.debugWin) m.debugWin(); else console.log('JOURNEY no debugWin ' + S.modeName); for (let i = 0; i < 20; i++) step(); setTimeout(tick, 300); return; }
        setTimeout(tick, 300);
      };
      startLevel(fi * 4); setTimeout(tick, 200);
    }
    if (HASH === '#worlds') console.log('WORLDS ' + G.WORLDS.map((w, i) => i + ':' + w.key + (w.modes ? '(' + w.modes.join('/') + ')' : '')).join(' ') + ' N=' + N + ' puzzles=' + Object.keys(G.PZ.defs).length + ' modes=' + Object.keys(G.modes || {}).join(','));
    if (HASH === '#settings') { showTitle(); document.body.classList.add('noanim'); refreshCostumes(); $('#settings').hidden = false; }
    if (HASH === '#shopheroes') { S.money = 1234; save.owned.h_flitz = true; showTitle(); document.body.classList.add('noanim'); openShop('heroes'); }
    const evM = /^#event(\d)?$/.exec(HASH); if (evM) { if (evM[1]) { S.lives = 4; startEvent(+evM[1] - 1); if (S.mode === 'card') beginPlay(); console.log('EVENT_BOOT ' + G.L.name + ' world=' + G.L.world.key + ' w=' + G.L.w); } else { document.body.classList.add('noanim'); showTitle(); console.log('EVENT_MENU active=' + eventActive()); } }
    const shopM = /^#shop(outfits)?$/.exec(HASH); if (shopM) { S.money = 1234; G.eco.owned.shield = true; G.eco.owned.o_insel = true; hideAll(); showGlobe(0); refreshCostumes(); openShop(shopM[1] ? 'outfits' : 'rocket'); }
    const rocketM = /^#rocket(?:=([\d.]+))?(i)?$/.exec(HASH);
    if (rocketM) { S.lives = 4; startFlight(24); const n = Math.round((+rocketM[1] || 0) * 60); for (let i = 0; i < n; i++) { if (rocketM[2] && G.rocket.ship) G.rocket.ship.inv = 9; step(); } console.log('ROCKET_BOOT t=' + G.rocket.t.toFixed(1) + ' phase=' + G.rocket.phase + ' enemies=' + G.rocket.enemies.length + ' hp=' + G.rocket.ship.hp); }
    const launchM = /^#launch(?:=([\d.]+))?$/.exec(HASH);
    if (launchM) { S.mode = 'dive'; G.dive.start(6, () => showHub(6, true)); const n = Math.round((+launchM[1] || 0) * 60); for (let i = 0; i < n; i++) step(); }
    if (HASH === '#daily') { startDaily(); console.log('DAILY_BOOT ' + G.L.sub + ' w=' + G.L.w); }
    if (HASH === '#letter') { showHub(0, false); showLetter(0); }
    if (HASH === '#keks') { save.ach.first = true; save.ach.coin = true; hideAll(); showGlobe(0); renderKeks(); $('#keks').hidden = false; }
    const puzzleM = /^#puzzle(\d+)(solve)?$/.exec(HASH);
    if (puzzleM) { const idx = +puzzleM[1] - 1; S.wi = Math.floor(idx / 4); S.li = idx % 4; hideAll(); S.lives = 4; E.load(S.wi, S.li, false); S.mode = 'play'; if (G.L.puzzle) { E.enterRoom(2); if (puzzleM[2]) { for (const b of G.L.puzzle.order) E.ringBell(G.L.puzzle.bells[b]); } } console.log('PUZZLE_BOOT puzzle=' + (G.L.puzzle ? G.L.puzzle.kind + ' order=' + G.L.puzzle.order.join('') + ' bells=' + G.L.puzzle.bells.join(',') + ' solved=' + G.L.puzzle.solved : 'none')); }
    const simM = /^#sim(\d+)([tex]*)$/.exec(HASH), testM = /^#(test|end|room)(\d+)(?:g=(\w+))?(?:x=(\d+))?(?:y=(\d+))?$/.exec(HASH);
    if (testM || simM) {
      const idx = Math.max(0, Math.min(N - 1, +(testM ? testM[2] : simM[1]) - 1));
      S.wi = Math.floor(idx / 4); S.li = idx % 4; hideAll(); S.lives = 4; E.load(S.wi, S.li, false); S.mode = 'play';
      if (testM && testM[1] === 'end') { P.x = (G.L.towerX || G.L.goalX) - 120; S.cam = Math.max(0, P.x - G.VW * 0.4); }
      if (testM && testM[4]) { P.x = +testM[4] * T; S.cam = Math.max(0, Math.min(G.L.mainW * T - G.VW, P.x - G.VW * 0.4)); }
      if (testM && testM[5]) { P.y = +testM[5] * T - P.h; S.camY = Math.max(0, Math.min(G.L.h * T - 240, P.y + P.h / 2 - 132)); }
      if (testM && testM[1] === 'room' && G.L.bonus) E.enterRoom(1);
      if (testM && testM[3] && G.gad) G.gad.give(testM[3]);
      if (simM && simM[2].includes('e')) { P.x = (G.L.arenaX || (G.L.goalX - 200)) + 4; if (G.L.arenaX) P.y = (G.L.arenaRow + 1) * T - P.h - 1; S.cam = Math.max(0, P.x - G.VW * 0.4); }
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
    if (diveM) { const wi = Math.max(0, Math.min(G.WORLDS.length - 1, +diveM[1] - 1)); hideAll(); S.mode = 'dive'; G.dive.start(wi, () => showHub(wi, true)); }
    if (hubM) { const wi = Math.max(0, Math.min(G.WORLDS.length - 1, +hubM[1] - 1)); save.done['0-0'] = true; save.stars['0-0'] = [true, false, true]; hideAll(); showHub(wi, !!hubM[2]); if (!hubM[2]) { P.x = 10 * T + 2; S.cam = 0; } console.log('HUB_BOOT w=' + G.L.w + ' hub=' + G.L.hub + ' mode=' + S.mode); }
    if (HASH === '#pause') { S.wi = 0; S.li = 1; hideAll(); E.load(0, 1, false); S.mode = 'play'; pauseGame(); }
    if (HASH === '#voicetest') { A().init(); A().voiceCfg.on = true; const files = Object.values(G.VOICE_FILES || {}); Promise.all(files.map(f => A().loadVoice(f))).then(bufs => { const ok = bufs.filter(Boolean).length; console.log('VOICE_TEST decoded=' + ok + '/' + files.length + ' dur=' + bufs.filter(Boolean).reduce((a, b) => a + b.duration, 0).toFixed(1) + 's'); }); }
    (document.fonts ? document.fonts.load('bold 10px "Fredoka"').catch(() => {}) : Promise.resolve()).then(() => requestAnimationFrame(frame));
  }
  /* techno disco reachability model (#flow): standing spots reachable from the pad (jump + double jump: up to 6 rows, 6 columns;
     a bass speaker reaches everything above it), every heart within 4 columns and 6 rows above a reachable spot */
  function discoCheck(cols, b) {
    const at = (x, y) => (x < 0 || x > 29 || y < 0 || y > 14) ? '#' : cols[b.roomCol + x][y], sol = (x, y) => '#yqb?gX'.includes(at(x, y)), key = s => s[0] * 16 + s[1];
    const stands = []; for (let x = 1; x <= 28; x++) for (let y = 1; y <= 12; y++) if (!sol(x, y) && sol(x, y + 1)) stands.push([x, y, at(x, y + 1) === 'b']);
    const seen = new Set(), q = stands.filter(s => s[1] === 12 && at(s[0], 13) === 'q'); q.forEach(s => seen.add(key(s)));
    while (q.length) { const s = q.pop(); for (const t of stands) { if (seen.has(key(t))) continue; const dx = Math.abs(t[0] - s[0]), rise = s[1] - t[1]; if (s[2] ? dx <= 5 : (rise <= 6 && dx <= (rise >= 0 ? 6 : 8))) { seen.add(key(t)); q.push(t); } } }
    const reach = stands.filter(s => seen.has(key(s))), miss = []; let hearts = 0;
    for (let x = 1; x <= 28; x++) for (let y = 1; y <= 12; y++) if (at(x, y) === 'o') { hearts++; if (!reach.some(s => Math.abs(s[0] - x) <= 4 && (s[2] || s[1] - y <= 6))) miss.push(x + ',' + y); }
    return {hearts, miss, clawsOk: !sol(1, 6) && !sol(1, 7)};
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
      load(1); let b = G.L.bonus; place(b.pipeCol * T + 10, b.pipeTop * T - 14); run(3); input.down = true; run(3);
      log('room-enter', S.room === 1 && P.x > b.roomCol * T && G.L.cols[b.pipeCol][13] === 'q', 'room=' + S.room + ' x=' + P.x.toFixed(0) + ' cam=' + S.cam.toFixed(0) + ' pad=' + b.pipeCol);
      const bpmIn = A().cfg.bpm; run(60); const stayed = S.room === 1;   /* holding down on the arrival pad must not beam straight back */
      clearIn(); run(45); let ex = -1; for (let cx = b.roomCol; cx < G.L.w; cx++) if (G.L.cols[cx][13] === 'q') { ex = cx; break; }
      place(ex * T + 10, 13 * T - 14); run(3); input.down = true; run(3);
      log('room-exit', S.room === 0 && Math.abs(P.x - (b.pipeCol * T + 10)) < 2 && !P.dead && stayed, 'room=' + S.room + ' x=' + P.x.toFixed(0) + ' exitCol=' + ex + ' stayedWhileHeld=' + stayed);
      log('disco-music', bpmIn === 128 && A().cfg.bpm === G.L.world.music.bpm && A().cfg.pattern === G.L.world.music.pattern, 'in=' + bpmIn + ' out=' + A().cfg.bpm + '/' + G.L.world.music.bpm);
      { const sig = () => { const bb = G.L.bonus; let s = ''; for (let x = 0; x < 30; x++) s += G.L.cols[bb.roomCol + x].join(''); return s; }; const s1 = sig(); load(1); const s2 = sig(); load(1); const s3 = sig(); log('disco-variety', s1 !== s2 || s2 !== s3, 'three loads, ' + new Set([s1, s2, s3]).size + ' different layouts'); }
      { const N = 400, sets = {}, bad = []; let lo = 999, hi = 0, sum = 0;
        for (let i = 0; i < N; i++) { const cols = []; for (let x = 0; x < 42; x++) cols.push(Array(15).fill('#')); const bb = G.discoRoom(cols, {roomCol: 6}), r = discoCheck(cols, bb); lo = Math.min(lo, r.hearts); hi = Math.max(hi, r.hearts); sum += r.hearts; bb.sets.forEach(k => { sets[k] = (sets[k] || 0) + 1; }); if (r.miss.length || !r.clawsOk || r.hearts < 30) bad.push(bb.sets.join('+') + ' pad' + bb.padCol + ' hearts=' + r.hearts + ' miss=' + r.miss.slice(0, 4).join(' ') + (r.clawsOk ? '' : ' claws')); }
        log('disco-reach', !bad.length, 'rooms=' + N + ' hearts min/avg/max=' + lo + '/' + (sum / N).toFixed(0) + '/' + hi + ' sets=' + JSON.stringify(sets) + (bad.length ? ' bad=' + bad.length + ': ' + bad.slice(0, 3).join(' | ') : '')); }
      load(1); b = G.L.bonus;
      load(0); const qx = findTile('?', 9); place(qx * T + 2, 5 * T); run(2); input.downEdge = true; run(1); const pounded = P.pound; run(70);
      log('ground-pound', pounded && G.L.cols[qx][9] === 'X' && S.hearts === 1 && P.onGround, 'pound=' + pounded + ' tile=' + G.L.cols[qx][9] + ' hearts=' + S.hearts);
      load(0); const gx = findTile('g', 9); place(gx * T + 2, 13 * T - 14); run(2); input.jumpEdge = true; input.jump = true; run(12); clearIn(); run(110);
      const gad = G.ents.find(e => e.kind === 'gadget'); let got = null;
      run(70); input.right = true; for (let k = 0; k < 150 && !P.gadget; k++) step(); got = P.gadget;
      log('capsule', !!gad && !!got, 'tile=' + G.L.cols[gx][9] + ' gadgetEnt=' + (gad ? gad.id : '-') + ' got=' + got);
      let canLv = 4; for (let li = 4; li < 20; li++) { load(li); if (G.ents.some(e => e.kind === 'cannon')) { canLv = li; break; } }
      load(canLv); const can = G.ents.find(e => e.kind === 'cannon'); place(can.x - 60, 13 * T - 14); run(2); input.right = true; input.run = true; let maxX = 0, launched = false, landed = false; for (let i = 0; i < 240; i++) { step(); maxX = Math.max(maxX, P.x); if (P.launch > 0) launched = true; if (launched && P.launch <= 0 && P.onGround) { landed = true; break; } }
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
      /* vertical sections: climb every chimney of several levels with a ledge-hopping controller (real physics, real input) */
      const climbLevels = (HASH.match(/climb=([\d,]+)/) || [0, ''])[1].split(',').filter(Boolean).map(x => +x - 1); if (!climbLevels.length) G.WORLDS.forEach((W, wi) => { if (!W.modes && !W.rocket) for (let li = 1; li <= 2; li++) climbLevels.push(wi * 4 + li); });
      for (const li of climbLevels) { const r = climbAll(li); log('climb-' + (li + 1), r.ok, r.info); }
      { const r = wallJumpTest(); log('walljump', r.ok, r.info); }
      { const r = waterfallTest(); log('waterfall', r.ok, r.info); }
      G.WORLDS.forEach((W, wi) => { if (W.boss && W.boss.arena === 'sky') { let r = skyTest(wi, true); log('sky-jet-' + W.key, r.ok, r.info); r = skyTest(wi, false); log('sky-clouds-' + W.key, r.ok, r.info); } if (W.boss && W.boss.arena === 'cave') { const r = caveArenaTest(wi); log('cave-arena-' + W.key, r.ok, r.info); } });
    } catch (e) { console.log('FLOW ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
    console.log('FLOW DONE');
  }
  /* ledge-hopping controller for the climb tests: from the current position reach the landing range [x0, x1] at height yTop */
  function hopTo(tg, maxFrames) {
    const clear = () => { for (const k in input) input[k] = false; input.run = isTouch; input.touchMode = isTouch; };
    let f = 0, jumped = false, dbl = false;
    while (f++ < maxFrames) {
      clear();
      const feet = P.y + P.h, cx = P.x + P.w / 2, onTarget = tg.done ? tg.done() : (P.onGround && Math.abs(feet - tg.yTop) < 2 && P.x + P.w > tg.x0 + 2 && P.x < tg.x1 - 2);
      if (tg.launch === undefined) tg.launch = cx;
      if (onTarget) return true;
      const above = feet <= tg.yTop - 2;
      /* below the target: line up beside it (tg.launch), jump, double jump near the apex; above it: steer onto it */
      const goal = above ? (tg.x0 + tg.x1) / 2 : tg.launch;
      if (Math.abs(goal - cx) > 3) { if (goal > cx) input.right = true; else input.left = true; }
      if (P.onGround && !above && Math.abs(goal - cx) <= 6 && !jumped) { input.jumpEdge = true; input.jumpKeyEdge = true; input.jump = true; jumped = true; }
      if (!P.onGround && !above && !dbl && P.vy > -1.0 && P.jumps === 1) { input.jumpEdge = true; input.jumpKeyEdge = true; dbl = true; }
      if (P.onGround && jumped && f > 4) { jumped = false; dbl = false; }
      step();
      if (P.dead) return false;
    }
    return false;
  }
  function climbAll(li) {
    S.wi = Math.floor(li / 4); S.li = li % 4; S.lives = 9; E.load(S.wi, S.li, false); S.mode = 'play'; hideAll();
    const L = G.L, cols = L.cols, T2 = T, info = [];
    let ok = true, found = 0;
    /* cave chimneys: deep columns whose rows 13..26 are open and that sit right before ground at row 13 */
    for (let x = 1; x < L.w - 5; x++) {
      if (cols[x].length > 30 && cols[x][27] !== '#') continue;   /* the waterfall's mushroom chimney has its own test */
      if (!(L.deep && L.deep[x] && L.deep[x + 3] && !(L.deep[x + 4]) && cols[x + 4][13] !== '-' && cols[x][13] === '-' && cols[x][20] !== '#' && cols[x - 1][5] === '#')) continue;
      found++;
      /* ledges inside the 4 columns, from the bottom up, then the surface on the right */
      const ledges = []; for (let y = 26; y > 13; y--) { const a = cols[x][y] === '=', b = cols[x + 2][y] === '='; if (a) ledges.push({x0: x * T2, x1: (x + 2) * T2, yTop: y * T2, launch: (x + 3) * T2}); if (b) ledges.push({x0: (x + 2) * T2, x1: (x + 4) * T2, yTop: y * T2, launch: (x + 1) * T2}); }
      ledges.push({x0: (x + 4) * T2, x1: (x + 7) * T2, yTop: 13 * T2, done: () => P.onGround && P.y + P.h <= 13 * T2 + 1 && P.x >= (x + 4) * T2 - 4});
      P.x = (x + 2) * T2 + 2; P.y = 27 * T2 - P.h; P.vx = P.vy = 0; P.inv = 99; for (let i = 0; i < 3; i++) step();
      for (let i = 0; i < ledges.length; i++) { if (!hopTo(ledges[i], 360)) { ok = false; info.push('cave@' + x + ' stuck at step ' + i + ' y=' + P.y.toFixed(0)); break; } }
      if (ok) info.push('cave@' + x + ' ' + ledges.length + ' hops');
    }
    /* surface chimneys: a 1-wide pillar, a 3-wide shaft, a plateau of the same height */
    for (let x = 1; x < L.w - 6; x++) {
      const pil = cols[x], top = pil.indexOf('#'); if (top < 2 || top > 9) continue;
      if (!(cols[x - 1][top] === '-' && cols[x + 1][top] !== '#' && cols[x + 2][top] !== '#' && cols[x + 3][top] !== '#' && cols[x + 4][top] === '#' && cols[x + 5][top] === '#' && cols[x + 1][13] === '#')) continue;
      found++;
      const ledges = []; for (let y = 12; y > top; y--) { if (cols[x + 3][y] === '=') ledges.push({x0: (x + 3) * T2, x1: (x + 4) * T2, yTop: y * T2, launch: (x + 1.5) * T2}); if (cols[x + 1][y] === '=') ledges.push({x0: (x + 1) * T2, x1: (x + 2) * T2, yTop: y * T2, launch: (x + 3) * T2}); }
      ledges.push({x0: (x + 4) * T2, x1: (x + 8) * T2, yTop: top * T2, done: () => P.onGround && P.y + P.h <= top * T2 + 1 && P.x >= (x + 4) * T2 - 4});
      P.x = (x + 2) * T2 + 2; P.y = 13 * T2 - P.h; P.vx = P.vy = 0; P.inv = 99; for (let i = 0; i < 3; i++) step();
      let k = true; for (let i = 0; i < ledges.length; i++) { if (!hopTo(ledges[i], 360)) { k = false; ok = false; info.push('kamin@' + x + ' stuck at step ' + i + ' y=' + P.y.toFixed(0)); break; } }
      if (k) info.push('kamin@' + x + ' ' + ledges.length + ' hops');
    }
    if (!found) { ok = false; info.push('no vertical section found'); }
    return {ok, info: G.L.name + ': ' + info.join('; ')};
  }
  /* the chocolate waterfall: parachute down (steering off the ledges), land beside the pool, bounce up the mushrooms */
  function waterfallTest() {
    const wi = G.WORLDS.findIndex(w => w.key === 'schoko'); if (wi < 0) return {ok: false, info: 'no schoko world'};
    const li = G.WORLDS[wi].waterfall; S.wi = wi; S.li = li; E.load(wi, li, false); S.mode = 'play'; hideAll();
    const wf = G.L.waterfall; if (!wf) return {ok: false, info: 'no waterfall'};
    const chute = G.ents.find(e => e.kind === 'chute'); P.x = chute.x - 30; P.y = 13 * T - P.h; P.inv = 99999; P.vx = P.vy = 0;
    const clear = () => { for (const k in input) input[k] = false; };
    let f = 0, phase = 'walk', fallT = 0, maxY = 0, landed = null, lastB = 999; const trail = [];
    const midX = (wf.x0 + wf.x1) / 2;
    while (f++ < 60 * 90) {
      clear();
      if (phase === 'walk') { input.right = true; if (P.x > wf.x0 + 4) phase = 'fall'; }
      else if (phase === 'fall') {
        fallT++; maxY = Math.max(maxY, P.y);
        /* stay over a landing pad near the bottom, otherwise drift away from the wall we are on */
        if (P.y > wf.bottom - 70) { if (P.x + 6 < wf.x0 + 3.5 * T) input.left = true; else if (P.x + 6 > wf.x1 - 3.5 * T) input.right = true; else input.right = true; }
        else if (P.onGround) { if (P.x + 6 < midX) input.right = true; else input.left = true; }
        if (P.onGround && P.y + P.h >= wf.bottom - 2) { phase = 'tunnel'; landed = {x: P.x, t: fallT}; }
      }
      else if (phase === 'tunnel') {
        input.right = true;
        /* in the mushroom chimney: steer toward the next mushroom above while rising */
        const cx0 = Math.floor(wf.x1 / T) + 5; if (P.x >= cx0 * T - 8) phase = 'bounce';
      }
      else if (phase === 'bounce') {
        const cx0 = Math.floor(wf.x1 / T) + 5, row = Math.floor((P.y + P.h) / T);
        if (P.bounceT > 0.45) lastB = Math.round((P.y + P.h) / T);
        let target = null; for (let y = Math.min(lastB - 1, G.L.h - 1); y > 0 && !target; y--) for (let k = 0; k < 4; k++) if (G.L.cols[cx0 + k][y] === 'b') { target = {x: (cx0 + k) * T + 8, y, k}; break; }
        /* rise beside the next ledge (not under it), drift onto it once above */
        let tx = target ? target.x : (cx0 + 6) * T; if (target && P.y + P.h > target.y * T - 2) tx = (cx0 + (target.k <= 1 ? 2.5 : 0.8)) * T;
        /* standing on the floor next to the first mushroom: hop onto it */
        if (P.onGround && target && target.y >= row - 2) { tx = target.x; input.jumpEdge = true; input.jumpKeyEdge = true; input.jump = true; }
        if (P.vy < -2 && !target) input.right = true; else if (Math.abs(tx - (P.x + 6)) > 2) { if (tx > P.x + 6) input.right = true; else input.left = true; }
        if (P.onGround && P.y + P.h <= 13 * T + 1 && P.x > (cx0 + 4) * T) return {ok: true, info: 'parachute fall ' + (landed.t / 60).toFixed(1) + 's, landed x=' + landed.x.toFixed(0) + ', bounced up to the surface after ' + (f / 60).toFixed(1) + 's'};
      }
      if (phase === 'bounce' && f % 12 === 0) trail.push(Math.round(P.x / T * 10) / 10 + ',' + Math.round((P.y + P.h) / T * 10) / 10 + (P.onGround ? 'g' : '') + (P.wallSlide ? 'w' : '')); if (trail.length > 40) trail.shift();
      step(); if (P.dead) return {ok: false, info: 'died in phase ' + phase + ' at x=' + P.x.toFixed(0) + ' y=' + P.y.toFixed(0) + ' why=' + JSON.stringify(S.lastDeath)};
    }
    return {ok: false, info: 'timeout in phase ' + phase + ' x=' + P.x.toFixed(0) + ' y=' + P.y.toFixed(0) + ' trail ' + trail.join(' ')};
  }
  /* sky arenas: reach the floating island with the jetpack, and without it over the cloud steps */
  function skyTest(wi, useJet) {
    S.wi = wi; S.li = 3; E.load(wi, 3, false); S.mode = 'play'; hideAll(); const L2 = G.L, top = L2.arenaRow + 1;
    const jet = G.ents.find(e => e.kind === 'gadget' && e.id === 'jet'); if (!jet) return {ok: false, info: 'no jetpack'};
    const boss = G.ents.find(e => e.kind === 'boss'); if (boss) boss.alive = false;
    const onIsland = () => P.onGround && Math.abs(P.y + P.h - top * T) < 2 && P.x >= L2.arenaX - T;
    if (!useJet) jet.alive = false;
    P.x = jet.x - 40; P.y = 13 * T - P.h; P.vx = P.vy = 0; P.inv = 99999;
    if (useJet) {
      let f = 0; while (f++ < 900) { for (const k in input) input[k] = false; const over = P.x + P.w / 2 > L2.arenaX + T, high = P.y + P.h < top * T - 24; input.right = !over || P.x < L2.arenaX + 3 * T; if (P.gadget === 'jet' && !(over && high) && !(high && P.vy < -1)) input.jump = true; if (P.gadget === 'jet' && P.onGround && !onIsland()) { input.jumpEdge = true; input.jumpKeyEdge = true; } step(); if (P.dead) return {ok: false, info: 'died'}; if (onIsland()) return {ok: true, info: 'flew to the island in ' + (f / 60).toFixed(1) + 's, fuel left ' + P.fuel}; }
      return {ok: false, info: 'jet: x=' + P.x.toFixed(0) + ' y=' + P.y.toFixed(0) + ' gadget=' + P.gadget};
    }
    /* cloud steps: every '=' block above the abyss before the island, in order */
    const steps = []; const ax = Math.floor(L2.arenaX / T); for (let x = Math.floor(jet.x / T) + 1; x < ax; x++) for (let y = 4; y < 13; y++) if (L2.cols[x][y] === '=' && (steps.length === 0 || steps[steps.length - 1].row !== y || steps[steps.length - 1].x1 !== x)) { const last = steps[steps.length - 1]; if (last && last.row === y && last.x1 === x) last.x1 = x + 1; else steps.push({row: y, x0: x, x1: x + 1}); }
    let edge = (() => { let x = Math.floor(jet.x / T); while (L2.cols[x + 1][13] === '#') x++; return (x + 1) * T - 8; })();
    const targets = steps.map(st => { const t = {x0: st.x0 * T, x1: st.x1 * T, yTop: st.row * T, launch: edge}; edge = st.x1 * T - 7; return t; }); targets.push({x0: L2.arenaX - T, x1: L2.arenaX + 6 * T, yTop: top * T, launch: edge});
    for (let i = 0; i < targets.length; i++) { if (!hopTo(targets[i], 400)) return {ok: false, info: 'clouds: stuck at step ' + i + '/' + targets.length + ' x=' + P.x.toFixed(0) + ' y=' + P.y.toFixed(0)}; }
    return {ok: true, info: 'reached the island over ' + steps.length + ' cloud steps'};
  }
  /* cave arenas: after the boss, climb the chimney behind the gate back to the tower */
  function caveArenaTest(wi) {
    S.wi = wi; S.li = 3; E.load(wi, 3, false); S.mode = 'play'; hideAll(); const L2 = G.L, cols = L2.cols;
    const boss = G.ents.find(e => e.kind === 'boss'); if (boss) boss.alive = false; E.openGate(); S.camLock = null;
    const gx = Math.floor(L2.arenaEnd / T); const x = gx + 1;   /* chimney columns x..x+3 */
    const ledges = []; for (let y = 26; y > 13; y--) { if (cols[x][y] === '=') ledges.push({x0: x * T, x1: (x + 2) * T, yTop: y * T, launch: (x + 3) * T}); if (cols[x + 2][y] === '=') ledges.push({x0: (x + 2) * T, x1: (x + 4) * T, yTop: y * T, launch: (x + 1) * T}); }
    ledges.push({x0: (x + 4) * T, x1: (x + 7) * T, yTop: 13 * T, done: () => P.onGround && P.y + P.h <= 13 * T + 1 && P.x >= (x + 4) * T - 4});
    P.x = (gx - 3) * T; P.y = 27 * T - P.h; P.vx = P.vy = 0; P.inv = 99999; for (let i = 0; i < 3; i++) step();
    /* walk through the open gate into the chimney */
    let f = 0; while (f++ < 200 && P.x < (x + 1) * T) { for (const k in input) input[k] = false; input.right = true; step(); }
    for (let i = 0; i < ledges.length; i++) { if (!hopTo(ledges[i], 400)) return {ok: false, info: 'stuck at ledge ' + i + '/' + ledges.length + ' x=' + P.x.toFixed(0) + ' y=' + P.y.toFixed(0)}; }
    for (f = 0; f < 600 && !G.goalSeq; f++) { for (const k in input) input[k] = false; input.right = true; step(); }
    return {ok: !!G.goalSeq, info: G.goalSeq ? 'climbed out and reached the tower door' : 'did not reach the door x=' + P.x.toFixed(0)};
  }
  /* pure wall jumps up a cave chimney (ignoring the ledges): press into a wall while falling, jump off, switch sides */
  function wallJumpTest() {
    for (let li = 4; li < 24; li++) {
      S.wi = Math.floor(li / 4); S.li = li % 4; E.load(S.wi, S.li, false); S.mode = 'play';
      const L = G.L, cols = L.cols; let x0 = -1;
      for (let x = 1; x < L.w - 5; x++) if (L.deep && L.deep[x] && L.deep[x + 3] && !L.deep[x + 4] && cols[x + 4][13] !== '-' && cols[x][13] === '-' && cols[x - 1][5] === '#') { x0 = x; break; }
      if (x0 < 0) continue;
      for (let y = 14; y < 27; y++) for (let k = 0; k < 4; k++) if (cols[x0 + k][y] === '=') cols[x0 + k][y] = '-';   /* remove the ledges */
      P.x = (x0 + 2) * T + 2; P.y = 27 * T - P.h; P.inv = 99; P.vx = P.vy = 0; for (let i = 0; i < 3; i++) step();
      let dir = 1, best = P.y, f = 0;
      while (f++ < 900) {
        for (const k in input) input[k] = false;
        if (dir > 0) input.right = true; else input.left = true;
        if (P.onGround && f % 20 === 1) { input.jumpEdge = true; input.jump = true; }
        if (P.wallSlide) { input.jumpEdge = true; input.jumpKeyEdge = true; input.jump = true; dir = -dir; }
        step(); best = Math.min(best, P.y);
        if (P.onGround && P.y + P.h <= 13 * T + 1 && P.x > (x0 + 3) * T) return {ok: true, info: L.name + ' chimney x=' + x0 + ' climbed by wall jumps in ' + f + ' frames'};
      }
      return {ok: false, info: L.name + ' best y=' + best.toFixed(0) + ' (surface feet at ' + 13 * T + ')'};
    }
    return {ok: false, info: 'no cave chimney found'};
  }
  /* look-ahead runner for headless tests: holds right, waits for hazards, hops on enemies, stomps bosses */
  function runSim() {
    S.lives = 40; input.right = true; input.run = true; let deaths = 0, t = 0, jumpHold = 0, maxX = 0, waitT = 0, launches = 0, gadgets = []; const tileAt = E.tileAt, solidAt = E.solidAt;
    for (let i = 0; i < 60 * 300; i++) {
      t += 1 / 60; const wasDead = P.dead;
      const fx = Math.floor((P.x + P.w + 6) / T), fy = Math.floor((P.y + P.h) / T);
      let need = false, wait = false;
      const boss = G.ents.find(e => e.kind === 'boss' && e.active);
      if (boss && HASH.includes('x') && !runSim.cheated) { runSim.cheated = true; runSim.cheatT = t; G.entsMod.bossHit(boss, 99); console.log('SIM_CHEAT boss defeated at t=' + t.toFixed(1)); }
      if (runSim.cheated && !S.gateOpen && t > runSim.cheatT + 1.5) { E.openGate(); console.log('SIM_GATE opened at t=' + t.toFixed(1)); }
      if (G.L.pz && !G.L.pz.solved && P.x > (G.L.pz.stationCol - 1) * T && P.x < G.L.pz.gateCol * T) { E.openPzGate(); console.log('SIM_PUZZLE gate opened ' + G.L.pz.id); }
      for (const vc of (G.L.vchunks || [])) if (!vc.done && (!vc.afterBoss || S.gateOpen) && P.x + P.w >= vc.x0 - 6 && P.x < vc.x0 + 40) { vc.done = true; P.x = vc.exitX; P.y = vc.exitY; P.vx = 0; P.vy = 0; console.log('SIM_SKIP vertical section to x=' + vc.exitX); }
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
      /* falling against a ledge just ahead (a wall down to the ground, its top at the feet): double-jump onto it instead of landing in front of it */
      if (!P.onGround && P.vy > 0.5 && (P.jumps || 0) <= 1 && !P.pound && !P.cannon && P.launch <= 0 && !boss && !P.wallSlide && P.wallCoyote <= 0 && solidAt(fx, Math.floor((P.y + P.h - 2) / T)) && !solidAt(fx, Math.floor((P.y + P.h - 2) / T) - 1) && !solidAt(fx, Math.floor((P.y - 18) / T))) { let floorBelow = false; for (let r = Math.floor((P.y + P.h) / T); r <= 13 && !floorBelow; r++) floorBelow = solidAt(Math.floor((P.x + 6) / T), r); let wall = true; for (let r = Math.floor((P.y + P.h - 2) / T); r <= 13 && wall; r++) wall = solidAt(fx, r); if (floorBelow && wall) { input.jumpEdge = true; input.jumpKeyEdge = true; jumpHold = 18; } }
      /* a human would double-jump when falling into a gap: the bot does too */
      if (!P.onGround && P.vy > 1.2 && P.jumps === 1 && !P.pound && !P.cannon) { const bx = Math.floor((P.x + 6) / T), by = Math.floor((P.y + P.h + 10) / T); const platBelow = G.ents.some(e => (e.kind === 'platformH' || e.kind === 'platformV') && P.x + P.w > e.x && P.x < e.x + e.w && e.y > P.y + P.h && e.y - (P.y + P.h) < 48); let pit = true; for (let r = Math.floor((P.y + P.h) / T); r <= 14; r++) { const tt = tileAt(bx, r), tt2 = tileAt(bx + (P.vx > 0 ? 1 : -1), r); if (solidAt(bx, r) || tt === '~' || solidAt(bx + (P.vx > 0 ? 1 : -1), r)) { pit = tt === '~' && tt2 === '~'; break; } } if (pit && !platBelow) { input.jumpEdge = true; input.jumpKeyEdge = true; } }
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

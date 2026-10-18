/* The Starway Home: Sternenlauf (Star Run), the endless mode. Toffo runs by himself along a track that is stitched together from
   chunks while he runs; the worlds change at star gates, the pace climbs, no two runs are alike. One hand: tap = jump, tap again in
   the air = somersault, swipe down = ground pound. Metres, a streak multiplier, records, revives and three daily missions bring
   players back. Runs on the normal engine (p/engine.js) as a 'play' level that keeps growing; game.js calls the hooks below. */
(function () {
  const G = window.PW = window.PW || {}, T = 16, H = 15, VH = 270, TAU = Math.PI * 2;
  const S = G.S, P = G.P, E = G.eng, input = G.input, A = () => G.audio, $ = s => document.querySelector(s);
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de), fmt = n => (G.fmt ? G.fmt(Math.round(n)) : String(Math.round(n)));
  const ORDER = ['wiese', 'insel', 'dschungel', 'schoko', 'schnee', 'lava', 'himmel', 'weltraum'];   /* the worlds in running order (the moon stands in for space) */
  const BIOME = 300, REVIVE_COST = 150, MAX_REVIVES = 2, WARP_T = 0.9, MULT_STEP = 150;
  /* the daily missions: three are drawn per day; 'run' = reach it in one run, 'day' = adds up over the day */
  const POOL = [
    {id: 'dist', kind: 'run', metric: 'dist', tiers: [300, 500, 800], text: n => tr(`Laufe ${n} m in einem Lauf`, `Run ${n} m in one run`)},
    {id: 'coins', kind: 'day', metric: 'coins', tiers: [80, 150, 250], text: n => tr(`Sammle ${n} Herzen`, `Collect ${n} hearts`)},
    {id: 'kills', kind: 'day', metric: 'kills', tiers: [8, 15, 25], text: n => tr(`Besiege ${n} Gegner`, `Defeat ${n} enemies`)},
    {id: 'worlds', kind: 'run', metric: 'worlds', tiers: [2, 3, 4], text: n => tr(`Erreiche Welt ${n} in einem Lauf`, `Reach world ${n} in one run`)},
    {id: 'gadgets', kind: 'day', metric: 'gadgets', tiers: [2, 3, 5], text: n => tr(`Schnapp dir ${n} Power-ups`, `Grab ${n} power-ups`)},
    {id: 'nohit', kind: 'run', metric: 'nohit', tiers: [150, 250, 400], text: n => tr(`Laufe ${n} m ohne Treffer`, `Run ${n} m without getting hit`)},
    {id: 'pounds', kind: 'day', metric: 'pounds', tiers: [3, 6, 10], text: n => tr(`Zerstampfe ${n} Gegner`, `Ground-pound ${n} enemies`)},
    {id: 'jumps', kind: 'day', metric: 'jumps', tiers: [80, 150, 250], text: n => tr(`Springe ${n} Mal`, `Jump ${n} times`)},
    {id: 'stars', kind: 'day', metric: 'stars', tiers: [1, 2, 3], text: n => tr(`Finde ${n} Sternkekse`, `Find ${n} star cookies`)},
  ];
  const DEF = id => POOL.find(p => p.id === id) || POOL[0];
  const METRICS = ['dist', 'coins', 'kills', 'worlds', 'gadgets', 'nohit', 'pounds', 'jumps', 'stars'];
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function txt(c, t, x, y, px, col, align, ol, lw) { c.font = 'bold ' + px + 'px "Fredoka", sans-serif'; c.textBaseline = 'middle'; c.textAlign = align || 'left'; c.lineJoin = 'round'; if (ol) { c.lineWidth = lw || 3; c.strokeStyle = ol; c.strokeText(t, x, y); } c.fillStyle = col; c.fillText(t, x, y); }
  function heart(c, x, y, s, col) { c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.0, x, y - s * 0.35); c.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.3, y - s * 0.1, x, y + s * 0.9); c.closePath(); c.fillStyle = col; c.fill(); }
  const hexA = (h, a) => { const n = parseInt(h.slice(1, 7), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const empty = () => Array(H).fill('-');
  function worldFor(i) {
    const key = ORDER[i % ORDER.length], W0 = G.WORLDS.find(w => w.key === key) || G.WORLDS[0];
    if (key === 'weltraum' && W0.skins) { const W = Object.assign({}, W0, W0.skins[1]); W.name = W0.name + ' · ' + tr('Mond', 'Moon'); return W; }   /* low gravity on the moon: huge hops */
    return W0;
  }

  /* ---------- the track generator: chunks of 15-row columns, world features and difficulty decide what is drawn ---------- */
  let gen = null;
  function makeGen(seed) {
    let s = (seed >>> 0) || 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return {r, col: 0, biome: 0, bcol: 0, W: worldFor(0), sinceCap: 0, sinceStar: 0, last: ''};
  }
  /* Jumps have a fixed arc (about 6 tiles long at the start, 8 at full pace), so the track follows two rules: gaps stay short
     (2 to 4 tiles) and every landing zone is wide (8 tiles or more). Islands are wide, bridges crumble behind Toffo, walls are low. */
  const INTRO = 140;   /* the first metres are gentle: no enemies, small gaps */
  const diff = () => Math.min(2.2, Math.max(0, gen.col - INTRO) / 450 + Math.floor(gen.biome / ORDER.length) * 0.5);
  function chunk(kind, W, d, n0) {
    const r = gen.r, cols = [], push = c => cols.push(c), intro = gen.col < INTRO;
    const g = () => { const c = empty(); c[13] = W.ice && r() < 0.3 ? 'i' : '#'; c[14] = '#'; return c; };
    const dens = intro ? 0 : 0.1 + d * 0.1, gapW = intro ? 2 : Math.min(d > 1.2 ? 5 : 4, 2 + Math.floor(d * 1.3));
    const enemy = () => { const x = r(); return x < 0.55 ? 'E' : (x < 0.8 ? 'G' : (d > 0.35 ? 'M' : 'E')); };
    const ground = (n, o = {}) => { const from = o.from === undefined ? 2 : o.from; for (let i = 0; i < n; i++) { const c = g(); if (o.deco && i % 4 === 1 && r() < 0.45) c[12] = ['p', 'h', 'f', 'd'][Math.floor(r() * 4)]; if (o.enemies && i >= from && i < n - 2 && r() < o.enemies) c[12] = enemy(); if (o.hearts && i > 0 && i < n - 1) { const y = 9 + Math.round(Math.abs(i - (n - 1) / 2) * 0.5); if (c[y] === '-') c[y] = 'o'; } push(c); } };
    const gap = n => { for (let i = 0; i < n; i++) { const c = empty(); c[(i === 0 || i === n - 1) ? 9 : 8] = 'o'; push(c); } };
    const island = (n, liquid) => { for (let i = 0; i < n; i++) { const c = empty(); c[10] = '='; if (i % 2 === 1) c[8] = 'o'; if (liquid) { c[13] = '~'; c[14] = '~'; } push(c); } };
    const water = n => { for (let i = 0; i < n; i++) { const c = empty(); c[13] = '~'; c[14] = '~'; if (W.ents.J && i === 1 && n >= 3 && r() < 0.3 + d * 0.15) c[12] = 'J'; else if (i === 0 || i === n - 1) c[9] = 'o'; push(c); } };
    switch (kind) {
      case 'pad': ground(Math.max(1, n0 || 1), {hearts: true}); break;
      case 'flat': ground(6 + Math.floor(r() * 5), {deco: true, enemies: dens, hearts: r() < 0.7}); break;
      case 'gap': ground(3, {hearts: true}); gap(gapW); ground(8, {enemies: dens, from: 7}); if (d > 0.5 && r() < 0.5) { gap(Math.max(2, gapW - 1)); ground(8, {from: 7}); } break;
      case 'island': ground(2, {hearts: true}); gap(2 + (d > 1 ? 1 : 0)); island(8 + Math.floor(r() * 3), false); gap(2 + (d > 1 ? 1 : 0)); ground(8, {hearts: true, from: 7}); break;
      case 'pipe': { const hz = !intro && r() < 0.15 + d * 0.2, h = 1 + Math.floor(r() * 3); ground(3, {hearts: true}); for (let k = 0; k < 2; k++) { const c = g(); for (let y = 13 - h; y < 13; y++) c[y] = y === 13 - h ? 'n' : '|'; if (hz && k === 0 && W.ents.S) c[12 - h] = 'S'; push(c); } ground(6); break; }
      case 'boxes': ground(3, {deco: true}); for (const ch of ['?=?', '?!?', '=?=?=', '?-?-?', '?!?=?'][Math.floor(r() * 5)]) { const c = g(); if (ch !== '-') c[9] = ch; push(c); } ground(4, {enemies: dens, from: 1}); break;
      case 'liquid': ground(2, {hearts: true}); if (d > 0.6 && r() < 0.5) { water(2); island(8 + Math.floor(r() * 3), true); water(2 + (d > 1.2 ? 1 : 0)); } else water(Math.min(4, 2 + Math.floor(d * 1.2))); ground(8, {enemies: dens, from: 7}); break;
      case 'bridge': { const n = 6 + Math.floor(d * 3); ground(2); for (let i = 0; i < n; i++) { const c = empty(); c[13] = 'c'; c[14] = '~'; if (i % 2 === 1) c[10] = 'o'; push(c); } ground(6, {from: 3}); break; }
      case 'plateau': { const h = 2 + (d > 0.9 && r() < 0.4 ? 1 : 0), n = 5 + Math.floor(r() * 4); ground(2, {hearts: true}); for (let i = 0; i < n; i++) { const c = empty(); for (let y = 13 - h; y <= 14; y++) c[y] = (y === 13 - h && W.ice && r() < 0.4) ? 'i' : '#'; if (i % 2 === 1) c[11 - h] = 'o'; if (i === Math.floor(n / 2) && n > 5 && !intro && r() < 0.7) c[12 - h] = enemy(); push(c); } ground(4); break; }
      case 'bouncy': { ground(2); const b = g(); b[12] = 'b'; push(b); const arc = {1: 9, 2: 6, 3: 4, 4: 2, 5: 1, 6: 2, 7: 4, 8: 6, 9: 9}; for (let i = 1; i <= 13; i++) { const c = g(); if (arc[i]) { if (i === 5 && gen.sinceStar > 300 && r() < 0.5) { c[1] = '*'; gen.sinceStar = -1000; } else c[arc[i]] = 'o'; } push(c); } break; }
      case 'icy': { const n = 6 + Math.floor(r() * 4); ground(1); for (let i = 0; i < n; i++) { const c = empty(); c[13] = 'i'; c[14] = '#'; if (i > 1 && i < n - 2 && r() < dens) c[12] = enemy(); if (i % 3 === 1) c[9] = 'o'; push(c); } ground(1); break; }
      case 'gauntlet': ground(2, {deco: true}); for (let i = 0; i < 7; i++) { const c = g(); if (i === 1 || i === 3 || i === 5) c[12] = 'E'; if (i === 6 && d > 0.6) c[12] = 'M'; push(c); } ground(3, {hearts: true}); break;
      case 'heartsky': ground(2); for (let i = 0; i < 7; i++) { const c = g(); c[[12, 10, 8, 6, 6, 8, 10][i]] = 'o'; push(c); } ground(3, {enemies: dens, from: 1}); break;
      case 'thrower': ground(2); for (let i = 0; i < 3; i++) { const c = empty(); for (let y = 11; y <= 14; y++) c[y] = '#'; if (i === 1) c[10] = 'T'; push(c); } ground(5, {hearts: true}); break;
      case 'capsule': ground(2, {deco: true}); { const c = g(); c[9] = 'g'; push(c); } ground(2, {hearts: true}); gen.sinceCap = -1000; break;
      case 'star': ground(2); { const a = g(); a[10] = '='; push(a); const b = g(); b[8] = '='; push(b); const c = g(); c[5] = '*'; push(c); } ground(2); gen.sinceStar = -1000; break;
      default: ground(6, {hearts: true});
    }
    return cols;
  }
  function pickKind(W, d) {
    if (gen.col < INTRO) { const k = [['flat', 3], ['gap', 2], ['boxes', 2], ['heartsky', 2], ['bouncy', 1], ['plateau', 1]]; let tot = 0; for (const [n, v] of k) if (n !== gen.last) tot += v; let x = gen.r() * tot; for (const [n, v] of k) { if (n === gen.last) continue; x -= v; if (x <= 0) return n; } return 'flat'; }
    const w = [['flat', 3], ['gap', 4], ['island', 2], ['pipe', 2], ['boxes', 2], ['liquid', W.ents.J ? 2.5 : 2], ['plateau', 2], ['bouncy', W.bouncy ? 2.5 : 1.2], ['gauntlet', 1.5], ['heartsky', 1.5],
      ['bridge', (W.crumble || d > 0.7) ? 2 : 0], ['icy', W.ice ? 2.5 : 0], ['thrower', (W.ents.T && d > 0.4) ? 1.2 : 0], ['capsule', gen.sinceCap > 170 ? 8 : 0], ['star', gen.sinceStar > 420 ? 4 : 0]];
    let tot = 0; for (const [k, v] of w) if (k !== gen.last) tot += v;
    let x = gen.r() * tot; for (const [k, v] of w) { if (k === gen.last) continue; x -= v; if (x <= 0) return k; }
    return 'flat';
  }
  /* columns go live: entity letters become entities of the world they were drawn for, the level grows */
  function append(cols) {
    const L = G.L, dE = Math.min(23, Math.floor(gen.col / 100));
    for (const c of cols) {
      const cx = L.cols.length;
      for (let cy = 0; cy < H; cy++) { const ch = c[cy]; if ('EGMSTJ'.includes(ch)) { const e = G.entsMod.make(ch, cx, cy, gen.W, dE); if (e) G.ents.push(e); c[cy] = '-'; } }
      L.cols.push(c);
    }
    L.w = L.cols.length; gen.col += cols.length; gen.bcol += cols.length; gen.sinceCap += cols.length; gen.sinceStar += cols.length;
  }
  function generateTo(target) {
    if (!G.L || !gen) return;
    while (gen.col < target) {
      const left = BIOME - gen.bcol;
      if (left <= 34) {
        /* the star gate ends the world: a calm run-up with hearts, the gate, a quiet start in the next world */
        const pre = []; for (let i = 0; i < left - 1; i++) { const c = empty(); c[13] = '#'; c[14] = '#'; if (i > 3 && i % 3 === 0) c[9] = 'o'; pre.push(c); }
        const gc = empty(); gc[13] = '#'; gc[14] = '#'; pre.push(gc); append(pre);
        const gateCol = gen.col - 1;
        gen.biome++; gen.bcol = 0; gen.W = worldFor(gen.biome); gen.last = 'flat';
        G.ents.push({kind: 'rungate', x: gateCol * T, y: 9 * T, w: 16, h: 64, alive: true, anim: 0, W: gen.W, idx: gen.biome});
        const post = []; for (let i = 0; i < 14; i++) { const c = empty(); c[13] = '#'; c[14] = '#'; if (i > 2 && i < 12 && i % 2 === 0) c[10] = 'o'; post.push(c); }
        append(post); continue;
      }
      const d = diff(), kind = pickKind(gen.W, d); let cols = chunk(kind, gen.W, d);
      if (cols.length > left - 34) cols = chunk('pad', gen.W, d, left - 34);   /* keep room for the gate */
      gen.last = kind; append(cols);
    }
  }
  function startCols() {
    const cols = []; for (let i = 0; i < 26; i++) { const c = empty(); c[13] = '#'; c[14] = '#'; if (i === 3) c[12] = 'R'; if (i >= 10 && i < 24 && i % 2 === 0) c[10 - (i >= 14 && i < 20 ? 1 : 0)] = 'o'; if (i === 7 || i === 21) c[12] = 'f'; cols.push(c); }
    return cols;
  }

  /* ---------- the run ---------- */
  const run = G.run = {
    active: false, speedMul: 1, warp: null, dist: 0, mult: 1, h: null, m: {}, acc: {},
    attach(h) {
      this.h = h;
      /* the engine's death flow would reload the level; a run ends on the run-over card instead */
      const ad0 = G.flow.afterDeath; G.flow.afterDeath = function () { if (run.active) { run.gameOver(); return; } return ad0.apply(this, arguments); };
    },
    sv() { const sv = this.h.save(); if (!sv.run || typeof sv.run !== 'object') sv.run = {best: 0, bestScore: 0, runs: 0, total: 0, m: null}; return sv.run; },
    persist() { if (this.h) this.h.persist(); },
    missions() {
      const sv = this.sv(), key = G.dailyKey();
      if (!sv.m || sv.m.date !== key || !sv.m.picks) {
        let h = 11; for (const ch of (key + 'run')) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
        let x = h; const r = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
        const all = POOL.map((_, i) => i); for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
        sv.m = {date: key, picks: all.slice(0, 3).map((i, k) => ({id: POOL[i].id, tier: [0, 1, 1, 2][(h >>> (k * 3 + 2)) % 4]})), prog: [0, 0, 0], done: [false, false, false], bonus: false};
        this.persist();
      }
      return sv.m;
    },
    missionVal(def, prog) { const cur = this.m[def.metric] || 0; return def.kind === 'run' ? Math.max(prog, cur) : prog + cur - (this.acc[def.metric] || 0); },
    checkMissions() {
      if (!this.active) return; const m = this.missions(); let newly = false;
      m.picks.forEach((pk, i) => { if (m.done[i]) return; const def = DEF(pk.id); if (this.missionVal(def, m.prog[i]) >= def.tiers[pk.tier]) { m.done[i] = true; newly = true; G.eco.add(100, P.x, P.y - 26); E.toast(tr('Mission geschafft!', 'Mission complete!')); A().sfx.gadget(); } });
      if (newly) { if (m.done.every(Boolean) && !m.bonus) { m.bonus = true; G.eco.add(200, 0, 0, true); G.flow.banner(tr('Alle Missionen geschafft!', 'All missions done!'), 3, tr('+200 Taler Tagesbonus', '+200 coins daily bonus')); } this.persist(); this.renderMenu(); }
    },
    /* what this run has earned so far goes into the day's totals (deltas, so revives never pay twice) */
    account() {
      const m = this.missions(), sv = this.sv();
      m.picks.forEach((pk, i) => { const def = DEF(pk.id), cur = this.m[def.metric] || 0; if (def.kind === 'run') m.prog[i] = Math.max(m.prog[i], cur); else m.prog[i] += cur - (this.acc[def.metric] || 0); });
      for (const k of METRICS) this.acc[k] = this.m[k] || 0;
      const bonus = Math.floor((this.dist - (this.paidDist || 0)) / 10); if (bonus > 0) G.eco.add(bonus, 0, 0, true); this.paidDist = this.dist; this.lastBonus = bonus;
      this.newRecord = (this.best0 || 0) > 0 && this.dist > this.best0; if (this.newRecord && !this.recordPaid) { this.recordPaid = true; G.eco.add(50, 0, 0, true); } sv.best = Math.max(sv.best || 0, this.dist);
      sv.bestScore = Math.max(sv.bestScore || 0, S.score); sv.total = (sv.total || 0) + (this.dist - (this.countedDist || 0)); this.countedDist = this.dist;
      if (!this.counted) { this.counted = true; sv.runs = (sv.runs || 0) + 1; }
      if (this.dist >= 500) this.h.achieve('run500'); if (this.m.worlds >= 3) this.h.achieve('run3');
      this.persist();
    },
    start(seed) {
      const h = this.h; if (!h) return;
      if (this.active) this.end(true);
      A().init(); h.hideAll(); A().stopMusic(); h.resetInput(); $('#runover').hidden = true;
      this.saved = {lives: S.lives, score: S.score, hearts: S.hearts, stars: S.stars.slice(), wi: S.wi, li: S.li};
      gen = makeGen(seed || ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0));
      const W0 = worldFor(0);
      const lv = {cols: startCols(), name: tr('Sternenlauf', 'Star Run'), sub: '', par: 99999, tower: false, bonus: null, puzzle: null, deep: null, vchunks: [], pz: null, waterfall: null, worldDef: W0};
      S.wi = 0; S.li = 0; S.hits = 0;
      E.load(0, 0, false, lv);
      const L = G.L; L.mainW = 1e9; L.run = true; L.starXs = [];
      this.active = true; document.body.classList.add('runmode');
      Object.assign(this, {dist: 0, lastDist: 0, mult: 1, hitAt: 0, hits: 0, revives: 0, biome: 0, warp: null, startX: P.x, recordShown: false, recordPaid: false, best0: this.sv().best || 0, t: 0, paidDist: 0, countedDist: 0, counted: false, newRecord: false, lastBonus: 0, speedMul: 1, acc: {}, m: {dist: 0, coins: 0, kills: 0, worlds: 1, gadgets: 0, nohit: 0, pounds: 0, jumps: 0, stars: 0}});
      S.lives = 0; S.score = 0; S.hearts = 0; S.moneyRun = 0; S.stars = [false, false, false]; S.time = 99999;
      h.applyCostume(); this.pick0 = G.gad.pick; G.gad.pick = () => { const pool = ['star', 'jet', 'boots', 'magnet', 'bubble', 'honey']; return pool[Math.floor(Math.random() * pool.length)]; };
      gen.col = L.w; gen.bcol = L.w; generateTo(L.w + 70);
      S.mode = 'play'; A().startMusic(); $('#btnPause').textContent = tr('Pause', 'Pause');
      G.flow.banner(tr('Sternenlauf', 'Star Run'), 3, input.touchMode ? tr('Tippen = springen · in der Luft nochmal = Salto · nach unten wischen = Stampfer', 'Tap = jump · tap again in the air = somersault · swipe down = ground pound') : tr('Leertaste = springen · in der Luft nochmal = Salto · ↓ = Stampfer', 'Space = jump · again in the air = somersault · ↓ = ground pound'));
      G.flow.speak("Let's go!", {happy: true});
    },
    end(silent) {
      if (!this.active) return; this.active = false; this.warp = null; document.body.classList.remove('runmode');
      if (this.pick0) { G.gad.pick = this.pick0; this.pick0 = null; }
      const sv = this.saved; if (sv) { S.lives = sv.lives > 0 ? sv.lives : 4; S.score = sv.score; S.hearts = sv.hearts; S.stars = sv.stars; S.wi = sv.wi; S.li = sv.li; }
      $('#runover').hidden = true; if (G.L) G.L.run = false;
      if (!silent) this.renderMenu();
    },
    /* game.js step(): true = the run owns this frame (warp, run over) */
    step() {
      if (!this.active) return false;
      if (S.mode === 'runwarp') { this.warpStep(); return true; }
      if (S.mode === 'runover') return true;
      return false;
    },
    preStep() { input.right = true; input.left = false; input.run = true; },
    postStep() {
      if (!this.active || S.mode !== 'play') return;
      const L = G.L; this.t += 1 / 60;
      this.dist = Math.max(this.dist, Math.floor((P.x - this.startX) / T)); this.m.dist = this.dist;
      this.speedMul = Math.min(1.35, 1 + this.dist / 2500);
      if (S.hits !== this.hits) { this.hits = S.hits; if (this.mult > 1) E.toast(tr('Serie weg!', 'Streak lost!')); this.mult = 1; this.hitAt = this.dist; }
      const noHit = this.dist - this.hitAt; this.m.nohit = Math.max(this.m.nohit, noHit);
      const mult = 1 + Math.min(4, Math.floor(noHit / MULT_STEP)); if (mult > this.mult) { this.mult = mult; E.toast('×' + mult + ' ' + tr('Serie!', 'streak!')); A().sfx.combo(mult + 2); }
      if (this.dist > this.lastDist) { S.score += (this.dist - this.lastDist) * 10 * this.mult; this.lastDist = this.dist; }
      if (this.best0 > 0 && this.dist > this.best0 && !this.recordShown) { this.recordShown = true; G.flow.banner(tr('Neuer Rekord!', 'New record!'), 2.4, tr('Weiter so, Toffo!', 'Keep going, Toffo!')); A().sfx.star(); }
      generateTo(Math.floor((S.cam + G.VW) / T) + 60);
      /* the star gate: Toffo runs in, the warp carries him to the next world */
      for (const e of G.ents) if (e.kind === 'rungate' && e.alive && !P.dead && P.x + P.w / 2 >= e.x + 8) { this.startWarp(e); break; }
      /* what is far behind is gone */
      for (let i = G.ents.length - 1; i >= 0; i--) { const e = G.ents[i]; if (e.x + (e.w || 16) < S.cam - 200 && e.kind !== 'boss') G.ents.splice(i, 1); }
      if (S.frames % 20 === 0) this.checkMissions();
      if (P.dead && P.deathT > 1.25) this.gameOver();
    },
    startWarp(gate) {
      gate.alive = false; gate.dieT = 10; this.warp = {t: 0, W: gate.W, idx: gate.idx, done: false};
      S.mode = 'runwarp'; P.vx = 0; P.vy = 0; input.jump = false; A().sfx.gadget(); E.teleSound(true); E.teleFx(P.x + P.w / 2, P.y + P.h); S.shake = 4;
    },
    warpStep() {
      const w = this.warp; if (!w) { S.mode = 'play'; return; } w.t += 1 / 60;
      if (!w.done && w.t >= WARP_T * 0.46) {
        w.done = true; const W = w.W, L = G.L; L.world = W; L.grav = W.grav || 1; this.biome = w.idx; this.m.worlds = w.idx + 1;
        if (!S.outfitOverride) S.outfit = W.key; S.wi = Math.max(0, G.WORLDS.indexOf(G.WORLDS.find(x => x.key === W.key)));
        A().setWorld(W.music); if (A().playing) { A().stopMusic(); A().startMusic(); }
        P.x += 20; P.inv = Math.max(P.inv, 1.2); S.cam = Math.max(0, P.x - G.VW * 0.42); S.flash = 0.6;
        for (let i = 0; i < 18; i++) G.parts.push({kind: 'spark', x: P.x + 6 + (Math.random() - 0.5) * 30, y: P.y + 7 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, t: 0.8, float: true, col: ['#5ff6ff', '#ffd84a', '#fff'][i % 3]});
        G.flow.banner(tr('Welt ', 'World ') + (w.idx + 1) + ' · ' + W.name, 2.6, W.key === 'weltraum' ? tr('Wenig Schwerkraft: Riesensprünge!', 'Low gravity: giant jumps!') : '');
        S.score += 500; E.toast('+500');
      }
      if (w.t >= WARP_T) { this.warp = null; S.mode = 'play'; E.teleSound(false); }
    },
    gameOver() {
      if (S.mode === 'runover') return;
      this.account(); S.mode = 'runover'; A().stopMusic(); this.renderOver(); $('#runover').hidden = false; this.renderMenu();
    },
    canRevive() { return this.revives < MAX_REVIVES && (S.lives > 0 || (S.money || 0) >= REVIVE_COST); },
    revive() {
      if (!this.active || S.mode !== 'runover' || !this.canRevive()) return false;
      if (S.lives > 0) S.lives--; else G.eco.add(-REVIVE_COST, 0, 0, true);
      this.revives++; $('#runover').hidden = true;
      const L = G.L; let cx = Math.max(0, Math.floor(P.x / T)); generateTo(cx + 60);
      const safe = c => c < L.w - 4 && [0, 1, 2, 3].every(k => L.cols[c + k][13] === '#' && L.cols[c + k][12] === '-' && L.cols[c + k][11] === '-' && L.cols[c + k][10] === '-');
      while (cx < L.w - 5 && !safe(cx)) cx++;
      P.x = cx * T + 2; P.y = 13 * T - P.h; P.vx = 0; P.vy = 0; P.dead = false; P.deathT = 0; P.inv = 3; P.big = false; P.h = 14; P.pound = false; P.climbing = false; P.jumps = 0;
      for (const e of G.ents) if (['walker', 'flyer', 'spiky', 'thrower', 'jumper', 'shot', 'pipeHazard'].includes(e.kind) && Math.abs(e.x - P.x) < 240) { e.alive = false; e.dieT = 10; }
      S.cam = Math.max(0, P.x - G.VW * 0.42); this.mult = 1; this.hitAt = this.dist; this.hits = S.hits;
      for (let i = 0; i < 16; i++) G.parts.push({kind: 'heart', x: P.x + (Math.random() - 0.5) * 30, y: P.y + 4, vx: (Math.random() - 0.5) * 1.5, vy: -1.5 - Math.random() * 2, t: 1.2});
      S.mode = 'play'; A().sfx.oneUp(); A().startMusic(); G.flow.banner(tr('Weiter geht’s!', 'Keep running!'), 1.6, ''); G.flow.speak("Let's go!", {happy: true});
      return true;
    },
    again() { this.end(true); this.start(); },
    toMenu() { this.end(); this.h.showTitle(); },
    renderOver() {
      const sv = this.sv(), L = G.L, best = sv.best || 0;
      $('#ro-title').textContent = this.newRecord ? tr('Neuer Rekord!', 'New record!') : tr('Lauf vorbei!', 'Run over!');
      $('#ro-dist').innerHTML = fmt(this.dist) + '<small>m</small>';
      $('#ro-sub').textContent = tr('Welt ', 'World ') + (this.biome + 1) + ' · ' + L.world.name + ' · ' + tr('Rekord ', 'Record ') + fmt(best) + ' m';
      const row = (k, v) => `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`;
      $('#ro-stats').innerHTML = row(tr('Punkte', 'Points'), fmt(S.score)) + row(tr('Herzen', 'Hearts'), fmt(this.m.coins)) + row(tr('Gegner', 'Enemies'), fmt(this.m.kills)) + row(tr('Taler-Bonus', 'Coin bonus'), '+' + fmt(this.lastBonus + (this.newRecord ? 50 : 0)));
      const m = this.missions();
      $('#ro-missions').innerHTML = m.picks.map((pk, i) => { const def = DEF(pk.id), target = def.tiers[pk.tier], val = Math.min(target, this.missionVal(def, m.prog[i])); return `<li class="${m.done[i] ? 'done' : ''}"><b>${m.done[i] ? '✓' : '○'}</b><span>${def.text(target)}</span><em>${fmt(val)} / ${fmt(target)}</em><span class="mbar"><i style="width:${Math.round(val / target * 100)}%"></i></span></li>`; }).join('');
      const rv = $('#ro-revive'); rv.hidden = !this.canRevive();
      rv.textContent = S.lives > 0 ? tr('Weiterlaufen (Extra-Leben)', 'Keep running (extra life)') : tr('Weiterlaufen · ' + REVIVE_COST + ' Taler', 'Keep running · ' + REVIVE_COST + ' coins');
      $('#ro-again').className = 'btn' + (rv.hidden ? '' : ' ghost');
    },
    renderMenu() {
      const el = $('#mRunS'); if (!el || !this.h) return; const sv = this.sv(), m = this.missions(), done = m.done.filter(Boolean).length;
      el.textContent = sv.best ? tr(`Rekord ${fmt(sv.best)} m · Missionen heute ${done}/3`, `Record ${fmt(sv.best)} m · missions today ${done}/3`) : tr('Endlos laufen · jeden Tag 3 Missionen', 'Run forever · 3 missions every day');
      const bar = $('#mRunBar'); if (bar) bar.style.width = Math.round(done / 3 * 100) + '%';
    },
    /* ---------- drawing: the HUD, the warp tunnel, the star gate ---------- */
    hud(ctx, fr) {
      const VW = G.VW || 480, ox = VW - 480, best = this.best0 || 0, L = G.L;
      rr(ctx, 6, 5, 150, 30, 9); ctx.fillStyle = 'rgba(74,34,58,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
      txt(ctx, fmt(this.dist) + ' m', 14, 16.5, 15, '#fff', 'left', '#7a3b57', 3);
      txt(ctx, best ? (this.dist > best ? tr('Neuer Rekord!', 'New record!') : tr('Rekord ', 'Record ') + fmt(best) + ' m') : tr('Erster Lauf!', 'First run!'), 14, 29, 7, '#ffe9a8', 'left', '#7a3b57', 2);
      if (S.lives > 0) { heart(ctx, 136, 16.5, 4.5, '#9be7a5'); txt(ctx, '+' + S.lives, 143, 16.5, 9, '#9be7a5', 'left', '#7a3b57', 2); }
      /* the streak multiplier in the middle (under the pause button on phones), with the road to the next step */
      const mx = VW / 2, by = input.touchMode ? 30 : 5; rr(ctx, mx - 27, by, 54, 22, 11); ctx.fillStyle = this.mult >= 5 ? 'rgba(255,180,40,.7)' : 'rgba(74,34,58,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke();
      txt(ctx, '×' + this.mult, mx, by + 11, 13, this.mult >= 5 ? '#fff6c0' : '#fff', 'center', '#7a3b57', 3);
      const prog = this.mult >= 5 ? 1 : ((this.dist - this.hitAt) % MULT_STEP) / MULT_STEP; rr(ctx, mx - 22, by + 24, 44, 4, 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); if (prog > 0.02) { rr(ctx, mx - 22, by + 24, 44 * prog, 4, 2); ctx.fillStyle = '#5ff6ff'; ctx.fill(); }
      /* right: points, hearts of this run, the world */
      rr(ctx, 324 + ox, 5, 150, 30, 9); ctx.fillStyle = 'rgba(74,34,58,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
      txt(ctx, fmt(S.score), 466 + ox, 16.5, 13, '#ffe9a8', 'right', '#7a3b57', 3);
      heart(ctx, 336 + ox, 16.5, 4.6, '#ff6f9c'); txt(ctx, fmt(this.m.coins), 344 + ox, 16.5, 10, '#fff', 'left', '#7a3b57', 2.5);
      txt(ctx, tr('Welt ', 'World ') + (this.biome + 1) + ' · ' + (L && L.world ? L.world.name : ''), 466 + ox, 29, 7, '#fff', 'right', '#7a3b57', 2);
      /* gadget slot under the right panel */
      const h = G.gad ? G.gad.hud() : null;
      if (h && G.fx && G.fx.icon) {
        const x = 386 + ox, y = 40; rr(ctx, x, y, 88, 30, 9); ctx.fillStyle = 'rgba(74,34,58,.72)'; ctx.fill(); ctx.strokeStyle = h.col; ctx.lineWidth = 1.5; ctx.stroke();
        rr(ctx, x + 4, y + 4, 22, 22, 6); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); G.fx.icon(ctx, h.id, x + 15, y + 15, 7, fr);
        ctx.font = 'bold 8px "Fredoka", sans-serif'; let nw = ctx.measureText(h.name).width; txt(ctx, h.name, x + 31, y + 10, nw > 50 ? 8 * 50 / nw : 8, '#fff', 'left');
        if (h.frac !== null) { rr(ctx, x + 31, y + 18, 50, 6, 3); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); if (h.frac > 0) { rr(ctx, x + 31, y + 18, Math.max(6, 50 * Math.max(0, Math.min(1, h.frac))), 6, 3); ctx.fillStyle = h.frac < 0.25 && (fr >> 3) % 2 ? '#ff6f9c' : h.col; ctx.fill(); } }
      }
      if (P.combo > 1 && !P.onGround) txt(ctx, 'Combo ×' + P.combo, VW / 2, 60, 11, P.combo >= 8 ? '#ffd84a' : '#fff', 'center', '#7a3b57', 3);
    },
    overlay(ctx, fr) {
      const w = this.warp; if (!w) return; const VW = G.VW || 480, k = w.t / WARP_T, sky = w.W.sky;
      const a = k < 0.3 ? k / 0.3 : (k < 0.62 ? 1 : Math.max(0, 1 - (k - 0.62) / 0.38));
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(VW / 2, VH / 2, 10, VW / 2, VH / 2, VW * 0.7); g.addColorStop(0, sky[2]); g.addColorStop(0.5, sky[1]); g.addColorStop(1, sky[0]); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      for (let i = 0; i < 56; i++) { const an = i / 56 * TAU + Math.sin(i * 7.3) * 0.2, sp = (w.t * 2.6 + i * 0.37) % 1, r0 = 14 + sp * 320, r1 = r0 + 24 + sp * 70; ctx.globalAlpha = a * (0.15 + 0.65 * sp); ctx.lineWidth = 0.8 + sp * 2.4; ctx.beginPath(); ctx.moveTo(VW / 2 + Math.cos(an) * r0, VH / 2 + Math.sin(an) * r0); ctx.lineTo(VW / 2 + Math.cos(an) * r1, VH / 2 + Math.sin(an) * r1); ctx.stroke(); }
      const fl = Math.max(0, 1 - Math.abs(k - 0.46) / 0.12); if (fl > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fl; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH); }
      ctx.restore();
    },
    gate(ctx, e, fr) {
      const cx = e.x + 8, cy = 13 * T - 34, sky = e.W.sky, t = fr / 60;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, 13 * T - 1, 26, 5, 0, 0, TAU); ctx.fillStyle = hexA(sky[1], 0.45); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(cx, cy, 4, cx, cy, 52); gl.addColorStop(0, hexA(sky[2], 0.55)); gl.addColorStop(1, hexA(sky[1], 0)); ctx.fillStyle = gl; ctx.fillRect(cx - 52, cy - 52, 104, 104);
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.ellipse(cx, cy, 20, 30, 0, 0, TAU); const ig = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30); ig.addColorStop(0, sky[2]); ig.addColorStop(0.6, sky[1]); ig.addColorStop(1, sky[0]); ctx.fillStyle = ig; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 20, 30, 0, 0, TAU); ctx.clip();
      for (let i = 0; i < 5; i++) { const a0 = t * (1.6 + i * 0.3) + i * 1.3, rx = 18 - i * 3, ry = 27 - i * 4.5; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a0 + 3.6); ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.55)' : hexA(sky[2], 0.8); ctx.lineWidth = 2.2 - i * 0.3; ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(cx, cy, 21, 31, 0, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy, 23.5, 33.5, 0, 0, TAU); ctx.strokeStyle = hexA(sky[2], 0.9); ctx.lineWidth = 1.2; ctx.stroke();
      for (let i = 0; i < 7; i++) { const a = t * 2 + i * TAU / 7, px = cx + Math.cos(a) * 28, py = cy + Math.sin(a) * 38; ctx.beginPath(); for (let k = 0; k < 8; k++) { const an = -Math.PI / 2 + k * Math.PI / 4, rad = k % 2 ? 0.9 : 2.2; ctx.lineTo(px + Math.cos(an) * rad, py + Math.sin(an) * rad); } ctx.closePath(); ctx.fillStyle = i % 2 ? '#fff' : '#ffd84a'; ctx.fill(); }
      /* the sign: where the gate leads */
      const label = tr('Welt ', 'World ') + (e.idx + 1) + ' · ' + e.W.name; ctx.font = 'bold 7px "Fredoka", sans-serif'; const lw = ctx.measureText(label).width + 12;
      rr(ctx, cx - lw / 2, cy - 54 + Math.sin(t * 3) * 1.5, lw, 13, 6); ctx.fillStyle = 'rgba(74,34,58,.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.stroke();
      txt(ctx, label, cx, cy - 47.5 + Math.sin(t * 3) * 1.5, 7, '#ffe9a8', 'center');
      ctx.restore();
    },
    /* ---------- a bot for headless tests: holds the pace, hops gaps, walls and enemies, revives, logs the result ---------- */
    bot(frames) {
      const step = G.dbg.step, tileAt = E.tileAt, solidAt = E.solidAt; let deaths = 0, maxD = 0, hold = 0, t = 0, warps = 0, lastMode = '';
      for (let i = 0; i < frames; i++) {
        t += 1 / 60;
        if (S.mode === 'runover') { deaths++; if (deaths <= 4) console.log('RUN_DEATH #' + deaths + ' ' + JSON.stringify(S.lastDeath) + ' dist=' + this.dist + ' world=' + G.L.world.key); if (!this.revive()) break; }
        if (S.mode === 'runwarp' && lastMode !== 'runwarp') warps++; lastMode = S.mode;
        if (S.mode === 'play' && !P.dead) {
          input.jumpEdge = false; input.jumpKeyEdge = false; input.downEdge = false; input.down = false;
          const fx = Math.floor((P.x + P.w + 8) / T), fy = Math.floor((P.y + P.h) / T); let need = false;
          if (P.onGround) {
            const gapAhead = (!solidAt(fx, fy) && (!solidAt(fx + 1, fy) || !solidAt(fx, fy + 1))) || tileAt(fx, fy) === '~' || tileAt(fx + 1, fy) === '~';
            const wallAhead = solidAt(fx, fy - 1) || solidAt(fx, fy - 2);
            const enemy = G.ents.find(e => e.alive && ['walker', 'flyer', 'spiky', 'thrower', 'jumper'].includes(e.kind) && e.x + e.w > P.x && e.x - P.x < 60 && Math.abs(e.y - P.y) < 30);
            const hz = G.ents.find(e => e.kind === 'pipeHazard' && e.up > 0.05 && e.x + 20 > P.x && e.x - P.x < 50);
            need = gapAhead || wallAhead || !!enemy || !!hz;
          }
          if (need && hold <= 0 && P.onGround) { input.jumpEdge = true; input.jumpKeyEdge = true; hold = 16; }
          if (!P.onGround && P.vy > 1.0 && P.jumps === 1 && !P.pound) { const bx = Math.floor((P.x + 6) / T); let pit = true; for (let r = Math.floor((P.y + P.h) / T); r <= 14; r++) { if (solidAt(bx, r)) { pit = false; break; } if (tileAt(bx, r) === '~') break; } if (pit) { input.jumpEdge = true; input.jumpKeyEdge = true; } }
          if (!P.onGround && P.vy > 0.5 && (P.jumps || 0) <= 1 && !P.pound && solidAt(fx, Math.floor((P.y + P.h - 2) / T)) && !solidAt(fx, Math.floor((P.y - 18) / T))) { input.jumpEdge = true; input.jumpKeyEdge = true; }
          input.jump = hold > 0; if (hold > 0) hold--;
        }
        try { step(); } catch (e) { console.error('RUN_ERROR t=' + t.toFixed(1) + ' ' + e.message + ' ' + (e.stack || '').split('\n')[1]); break; }
        maxD = Math.max(maxD, this.dist);
      }
      console.log('RUN_DONE t=' + t.toFixed(0) + ' dist=' + this.dist + ' max=' + maxD + ' world=' + (this.biome + 1) + ':' + G.L.world.key + ' warps=' + warps + ' deaths=' + deaths + ' revives=' + this.revives + ' score=' + S.score + ' coins=' + this.m.coins + ' kills=' + this.m.kills + ' jumps=' + this.m.jumps + ' gadgets=' + this.m.gadgets + ' stars=' + this.m.stars + ' mult=' + this.mult + ' ents=' + G.ents.length + ' cols=' + G.L.w + ' mode=' + S.mode + ' speed=' + this.speedMul.toFixed(2) + ' money=' + S.money);
    },
    boot(hash) {
      const dm = /^#rundump=(\d+)(?:,(\d+)-(\d+))?$/.exec(hash);
      if (dm) { this.start(+dm[1]); generateTo(+(dm[3] || 200)); const a = +(dm[2] || 0), b = Math.min(G.L.w, +(dm[3] || 200)); for (let y = 3; y < H; y++) { let s = ''; for (let x = a; x < b; x++) s += G.L.cols[x][y]; console.log('ROW' + String(y).padStart(2, '0') + ' ' + s); } console.log('RUNDUMP cols=' + G.L.w + ' ents=' + G.ents.map(e => e.kind + '@' + Math.round(e.x / T)).join(' ')); return; }
      const m = /^#run(?:=([\d.]+))?(?:,s=(\d+))?(over)?$/.exec(hash); if (!m) return;
      S.lives = 3; this.start(m[2] ? +m[2] : 7); S.lives = 3;
      if (m[3]) { for (let i = 0; i < 120; i++) G.dbg.step(); E.die('test'); for (let i = 0; i < 200 && S.mode !== 'runover'; i++) G.dbg.step(); console.log('RUNOVER_BOOT mode=' + S.mode + ' dist=' + this.dist); return; }
      const n = Math.round((+m[1] || 0) * 60);
      if (n) this.bot(n); else { for (let i = 0; i < 90; i++) G.dbg.step(); }
      console.log('RUN_BOOT mode=' + S.mode + ' dist=' + this.dist + ' cols=' + G.L.w + ' ents=' + G.ents.length + ' world=' + G.L.world.key);
    },
  };

  /* ---------- hooks into the engine and the drawing ---------- */
  { const kill0 = E.kill; E.kill = function (e, byBump, pts) { const was = e.alive; kill0.call(E, e, byBump, pts); if (run.active && was && !e.alive && e.kind !== 'shot' && e.kind !== 'bean' && e.kind !== 'honeyshot') { run.m.kills++; if (P.pound) run.m.pounds++; } }; }
  { const star0 = E.collectStar; E.collectStar = function (cx, cy) { star0.call(E, cx, cy); if (run.active) run.m.stars++; }; }
  { const heart0 = E.collectHeart; E.collectHeart = function (cx, cy, fromBox) { heart0.call(E, cx, cy, fromBox); if (run.active) run.m.coins++; }; }
  { const give0 = G.gad.give; G.gad.give = function (id, quiet) { give0.call(G.gad, id, quiet); if (run.active && !quiet) run.m.gadgets++; }; }
  const sfx = A().sfx; for (const n of ['jump', 'doubleJump', 'bigJump']) { const f = sfx[n]; sfx[n] = function () { if (run.active) run.m.jumps++; return f.apply(this, arguments); }; }
  { const fxEnt = G.fx.ent; G.fx.ent = (ctx, e, fr) => { if (e.kind === 'rungate') { try { run.gate(ctx, e, fr); } catch (err) {} return true; } return fxEnt(ctx, e, fr); }; }
  { const ov0 = G.fx.overlay; G.fx.overlay = (ctx, fr) => { if (ov0) ov0(ctx, fr); if (run.active) { try { run.overlay(ctx, fr); } catch (err) {} } }; }
  { const hud0 = G.fx.hud; G.fx.hud = (ctx, fr) => { if (run.active && G.L && G.L.run) { try { run.hud(ctx, fr); } catch (err) {} return; } if (hud0) hud0(ctx, fr); }; }
  /* one-hand touch: a tap anywhere jumps (held = glide, jetpack, Hollo's float), a swipe down is the ground pound */
  { let id = null, sy = 0, pounded = false;
    const st = $('#stage'); if (st) {
      st.addEventListener('pointerdown', e => { if (!run.active || S.mode !== 'play' || !input.touchMode) return; if (id !== null) return; id = e.pointerId; sy = e.clientY; pounded = false; input.jumpEdge = true; input.jumpKeyEdge = true; input.jump = true; });
      st.addEventListener('pointermove', e => { if (e.pointerId !== id || pounded) return; if (e.clientY - sy > 34) { pounded = true; input.jump = false; input.downEdge = true; input.down = true; } });
      const up = e => { if (e.pointerId !== id) return; id = null; input.jump = false; input.down = false; };
      st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    }
    document.addEventListener('keydown', e => { if (S.mode !== 'runover' || e.repeat) return; if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); run.again(); } else if (e.code === 'Escape') { e.stopImmediatePropagation(); run.toMenu(); } });
  }
  { const on = (id, f) => { const el = $(id); if (el) el.addEventListener('click', f); };
    on('#ro-revive', () => { A().init(); A().sfx.select(); run.revive(); });
    on('#ro-again', () => { A().init(); A().sfx.select(); run.again(); });
    on('#ro-menu', () => { A().sfx.select(); run.toMenu(); }); }
})();

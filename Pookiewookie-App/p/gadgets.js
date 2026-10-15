/* The Starway Home: gadgets. Toffo draws one from a gadget capsule ('g' block): the roulette spins and lands on one of eight gadgets.
   Timed gadgets (Sternenstaub, Honigzeit) run out; the others stay until Toffo gets hit, which costs the gadget instead of a life.
   This module owns the gadget state, the magnet, the jetpack thrust and the stomp combo; the engine calls into it. */
(function () {
  const G = window.PW = window.PW || {}, T = 16;
  const A = () => G.audio, S = () => G.S, P = () => G.P, E = () => G.eng;
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const DEFS = G.GADGETS = {
    star:   {name: tr('Sternenstaub', 'Stardust'),   hint: tr('Unverwundbar! Renn einfach durch alle Gegner.', 'Invincible! Just run right through all enemies.'),   col: '#ffd84a', timed: 10, line: 'Star power! Nothing can stop me!'},
    jet:    {name: tr('Honig-Jetpack', 'Honey Jetpack'),  hint: tr('In der Luft Springen halten = fliegen. Tank im Blick behalten!', 'Hold jump in the air = fly. Keep an eye on the tank!'), col: '#ff9a2a', fuel: 420, line: 'A jetpack! Wheee!'},
    boots:  {name: tr('Hüpfschuhe', 'Bouncy Boots'),     hint: tr('Du springst jetzt viel höher.', 'You jump much higher now.'),                     col: '#ff6f9c', line: 'Bouncy boots! Boing, boing!'},
    claws:  {name: tr('Kletterkrallen', 'Climbing Claws'), hint: tr('An Wände hängen und mit Springen abstoßen.', 'Cling to walls and jump to push off.'),        col: '#9be7a5', line: 'I can climb walls now!'},
    sling:  {name: tr('Honigschleuder', 'Honey Blaster'), hint: tr('Shift oder X = Honig schießen.', 'Shift or X = shoot honey.'),                    col: '#f5c242', line: 'Honey blaster! Splat, splat!'},
    magnet: {name: tr('Herzmagnet', 'Heart Magnet'),     hint: tr('Alle Herzen in der Nähe fliegen zu dir.', 'All nearby hearts fly to you.'),           col: '#e0457b', line: 'All the hearts come to me!'},
    bubble: {name: tr('Schutzblase', 'Bubble Shield'),    hint: tr('Fängt einen Treffer ab.', 'Blocks one hit.'),                           col: '#8fd3ff', line: 'A bubble! I feel so safe.'},
    honey:  {name: tr('Honigzeit', 'Honey Time'),      hint: tr('Alle Gegner werden ganz langsam.', 'All enemies get super slow.'),                  col: '#e3a92a', timed: 12, line: 'Everything is sooo slow!'},
    choco:  {name: tr('Schokomalstift', 'Chocolate Pen'), hint: tr('Zieh mit Finger oder Maus eine Linie: Sie wird zur Schokoplattform (schmilzt nach kurzer Zeit).', 'Draw a line with your finger or mouse: it turns into a chocolate platform (melts after a short while).'), col: '#5a2e14', line: 'A chocolate pen! I can draw!'},
  };
  const IDS = G.GADGET_IDS = Object.keys(DEFS);
  const s_frames = () => S().frames;
  const COMBO = [100, 200, 400, 800, 1000, 2000, 4000, 8000];

  const gad = G.gad = {
    DEFS, IDS,
    pick() { return IDS[Math.floor(Math.random() * IDS.length)]; },
    has(id) { return P().gadget === id; },
    def() { return P().gadget ? DEFS[P().gadget] : null; },
    give(id, quiet) {
      const p = P(), s = S(), d = DEFS[id]; if (!d) return;
      if (p.gadget) gad.clear(true);
      p.gadget = id; p.gadT = d.timed || 0; p.fuel = d.fuel || 0; p.jetting = false; p.wallSlide = false;
      if (quiet) { if (id === 'star') A().fast = true; if (id === 'honey') { s.honey = d.timed; A().slow = true; } return; }
      if (id === 'star') { A().fast = true; A().sfx.starStart(); }
      else if (id === 'honey') { s.honey = d.timed; A().slow = true; A().sfx.honeyTime(); }
      else if (id === 'bubble') A().sfx.bubbleOn();
      else A().sfx.gadget();
      s.score += 500; E().toast(d.name + '!');
      G.flow.banner(d.name, 2.4, d.hint); G.flow.speak(d.line, {happy: true}); s.voiceT = Math.max(s.voiceT, 8);
      for (let i = 0; i < 16; i++) G.parts.push({kind: 'spark', x: p.x + 6, y: p.y + p.h / 2, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3, t: 0.7 + Math.random() * 0.4, col: d.col});
    },
    clear(silent) {
      const p = P(), s = S(), id = p.gadget; if (!id) return;
      p.gadget = null; p.gadT = 0; p.fuel = 0; p.jetting = false; p.wallSlide = false;
      if (id === 'star') { A().fast = false; if (!silent) A().sfx.starEnd(); }
      if (id === 'honey') { s.honey = 0; A().slow = false; }
      if (!silent) E().toast(tr(DEFS[id].name + ' vorbei', DEFS[id].name + ' wore off'));
    },
    /* a hit while holding a persistent gadget costs the gadget, not a life */
    absorbHit() {
      const p = P(), id = p.gadget; if (!id || id === 'star' || id === 'honey') return false;
      if (id === 'bubble') { A().sfx.bubblePop(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; G.parts.push({kind: 'spark', x: p.x + 6 + Math.cos(a) * 12, y: p.y + p.h / 2 + Math.sin(a) * 12, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5 - 0.5, t: 0.5, col: '#bfefff'}); } }
      else { A().sfx.lose(); for (let i = 0; i < 8; i++) G.parts.push({kind: 'spark', x: p.x + 6, y: p.y + 4, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, t: 0.6, col: DEFS[id].col}); }
      E().toast(id === 'bubble' ? tr('Blase geplatzt!', 'Bubble popped!') : tr(DEFS[id].name + ' verloren', DEFS[id].name + ' lost'));
      gad.clear(true); p.inv = 1.6; S().shake = 3;
      return true;
    },
    jumpMul() { return P().gadget === 'boots' ? 1.25 : 1; },
    /* jetpack: hold jump in the air to climb while fuel lasts */
    jet(input) {
      const p = P(), s = S();
      if (p.gadget !== 'jet' || p.onGround || !input.jump || p.pound || p.climbing || p.fuel <= 0 || p.launch > 0) { p.jetting = false; return false; }
      p.jetting = true; p.fuel--; p.vy -= 0.62; if (p.vy < -2.4) p.vy = -2.4;
      if (s.frames % 5 === 0) A().sfx.jet();
      G.parts.push({kind: 'flame', x: p.x + 6 - p.facing * 5 + (Math.random() - 0.5) * 3, y: p.y + p.h - 2, vx: -p.facing * 0.6 + (Math.random() - 0.5) * 0.6, vy: 1.4 + Math.random(), t: 0.25 + Math.random() * 0.15, float: true});
      if (p.fuel <= 0) { A().sfx.jetEmpty(); E().toast(tr('Tank leer!', 'Tank empty!')); gad.clear(true); }
      return true;
    },
    update() {
      const p = P(), s = S();
      if (s.honey > 0) { s.honey -= 1 / 60; if (s.honey <= 0) { s.honey = 0; A().slow = false; if (p.gadget === 'honey') gad.clear(true); E().toast(tr('Honigzeit vorbei', 'Honey Time wore off')); } }
      if (!p.gadget) return;
      const id = p.gadget;
      if (id === 'star') { p.gadT -= 1 / 60; if (s.frames % 3 === 0) G.parts.push({kind: 'spark', x: p.x + Math.random() * 12, y: p.y + Math.random() * p.h, vx: (Math.random() - 0.5), vy: -0.5 - Math.random(), t: 0.5, col: ['#ffd84a', '#ff9eb0', '#8fd3ff', '#9be7a5'][s.frames % 4]}); if (p.gadT <= 0) gad.clear(); }
      else if (id === 'honey') p.gadT = s.honey;
      else if (id === 'magnet' && s.frames % 4 === 0) {
        const cx0 = Math.floor((p.x + 6) / T), cy0 = Math.floor((p.y + p.h / 2) / T), eng = E();
        for (let cx = cx0 - 5; cx <= cx0 + 5; cx++) for (let cy = Math.max(0, cy0 - 4); cy <= Math.min(14, cy0 + 4); cy++) if (eng.tileAt(cx, cy) === 'o') { eng.setTile(cx, cy, '-'); G.ents.push({kind: 'heartfly', x: cx * T + 4, y: cy * T + 4, w: 8, h: 8, vx: 0, vy: 0, alive: true, t: 0}); A().sfx.magnetPull(); }
      }
    },
    /* stomp combo: consecutive stomps without landing score more and finally an extra Toffo */
    comboPoints(e) {
      const p = P(), s = S(); p.combo = (p.combo || 0) + 1; const n = p.combo;
      if (n >= 9) { s.lives++; A().sfx.oneUp(); E().toast(tr('Extra-Toffo!', 'Extra Toffo!'), e.x, e.y - 14); return 0; }
      if (n > 1) A().sfx.combo(n);
      return COMBO[Math.min(n - 1, COMBO.length - 1)];
    },
    /* chocolate pen: drag on the screen to lay down short chocolate segments that act as platforms and melt after a while */
    INK: 160, ink: 160, last: null,
    draw(wx, wy, phase) {
      const p = P(); if (p.gadget !== 'choco' || S().mode !== 'play') return false;
      if (phase === 'start') { this.last = {x: wx, y: wy}; return true; }
      if (phase === 'end') { this.last = null; return true; }
      if (!this.last) { this.last = {x: wx, y: wy}; return true; }
      const dx = wx - this.last.x, dy = wy - this.last.y, dist = Math.hypot(dx, dy);
      if (dist < 7) return true;
      const n = Math.min(6, Math.floor(dist / 7));
      for (let i = 1; i <= n; i++) {
        if (this.ink < 7) { this.last = {x: wx, y: wy}; return true; }
        const x = this.last.x + dx * i / n, y = this.last.y + dy * i / n;
        if (Math.abs(x - (p.x + 6)) < 10 && Math.abs(y - (p.y + p.h / 2)) < 14) continue;   /* not through Toffo himself */
        const cx = Math.floor(x / 16), cy = Math.floor(y / 16); if (E().solidAt(cx, cy)) continue;
        G.ents.push({kind: 'choco', x: x - 4, y: y - 2, w: 8, h: 5, alive: true, t: 7 + Math.random(), anim: Math.random() * 6});
        this.ink -= 7; if (s_frames() % 3 === 0) A().sfx.choco();
      }
      const live = G.ents.filter(e => e.kind === 'choco' && e.alive); if (live.length > 70) { live[0].alive = false; live[0].dieT = 10; }
      this.last = {x: wx, y: wy}; return true;
    },
    hud() {
      const p = P(), s = S(); if (!p.gadget) return null; const d = DEFS[p.gadget];
      if (p.gadget === 'choco' && this.ink < this.INK) this.ink = Math.min(this.INK, this.ink + 0.12);
      const frac = p.gadget === 'star' ? p.gadT / d.timed : (p.gadget === 'honey' ? s.honey / d.timed : (p.gadget === 'jet' ? p.fuel / d.fuel : (p.gadget === 'choco' ? this.ink / this.INK : null)));
      return {id: p.gadget, name: d.name, col: d.col, frac};
    },
  };
})();

/* The Starway Home puzzle: "Die Türme des Vulkans" (Lava, slot 1).
   Towers of Hanoi with 5 glowing lava discs on 3 obsidian pillars: move the whole tower from the left to the right pillar.
   A bigger disc may never lie on a smaller one (illegal drops hiss and bounce back). At most 40 moves (31 is optimal). */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, ND = 5, LIMIT = 40, OL = '#2a1508';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function txt(c, s, x, y, px, col, align, w, ol) {
    c.font = (w || 700) + ' ' + px + 'px "Fredoka", sans-serif'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (ol) { c.lineJoin = 'round'; c.lineWidth = px * 0.28; c.strokeStyle = ol; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function tone(f, d, o) { try { G.audio.tone(f, d, o); } catch (e) {} }
  function noise(d, o) { try { G.audio.noise(d, o); } catch (e) {} }
  /* disc colours from the hottest (smallest) to the coolest (largest) */
  const DCOL = [['#fffbd0', '#ffe14a', '#ff9a1a'], ['#ffe98a', '#ffb02a', '#e8601a'], ['#ffc46a', '#ff7a1a', '#c83a10'], ['#ff9a5a', '#e8501a', '#9a2a0a'], ['#ff7a4a', '#c8301a', '#6a1a0a']];
  function solveSeq(n, a, b, cc, out) { if (!n) return out; solveSeq(n - 1, a, cc, b, out); out.push([a, b]); solveSeq(n - 1, cc, b, a, out); return out; }

  G.PZ = G.PZ || {register() {}};
  G.PZ.register({
    id: 'lava-hanoi', world: 'lava', slot: 1,
    title: tr('Die Türme des Vulkans', 'The Volcano Towers'),
    intro: tr('Bring alle fünf Lavascheiben von links nach rechts. Tippe eine Säule zum Heben, dann eine zum Ablegen – nie groß auf klein! Höchstens 40 Züge.', 'Move all five lava discs from left to right. Tap a pillar to lift, then one to drop – never big on small! 40 moves at most.'),
    letter: tr('Bei einer ungeraden Zahl von Scheiben wandert die kleinste immer im Kreis: links, rechts, Mitte, links … Sie ist bei jedem zweiten Zug dran, und dazwischen gibt es immer nur einen erlaubten Zug ohne sie.', 'With an odd number of discs, the smallest one always goes round in a circle: left, right, middle, left … It moves every other turn, and in between there is only ever one allowed move without it.'),
    hint: tr('Denk in kleineren Türmen: Um 5 Scheiben nach rechts zu bringen, müssen zuerst die oberen 4 in die Mitte, dann wandert die größte nach rechts, dann kommen die 4 wieder obendrauf. Für 4 Scheiben gilt dasselbe mit 3 – und so weiter. Der allererste Zug: die kleinste Scheibe direkt nach rechts.', 'Think in smaller towers: to move 5 discs to the right, the top 4 first go to the middle, then the biggest one moves right, then the 4 go back on top. For 4 discs it is the same with 3 – and so on. The very first move: the smallest disc straight to the right.'),
    station(c, x, y, t, solved) {
      c.save(); c.translate(x, y); c.lineJoin = 'round';
      /* stone gate */
      c.beginPath(); c.moveTo(-16, 0); c.lineTo(-16, -26); c.quadraticCurveTo(-16, -40, 0, -40); c.quadraticCurveTo(16, -40, 16, -26); c.lineTo(16, 0); c.closePath();
      c.fillStyle = '#4a3a44'; c.fill(); c.strokeStyle = '#1a1018'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(-12, 0); c.lineTo(-12, -24); c.quadraticCurveTo(-12, -35, 0, -35); c.quadraticCurveTo(12, -35, 12, -24); c.lineTo(12, 0); c.closePath();
      const gl = 0.5 + 0.5 * Math.sin(t * 3); c.fillStyle = 'rgb(' + Math.round(60 + gl * 40) + ',20,20)'; c.fill();
      /* three pillars with discs */
      for (let i = 0; i < 3; i++) { const px = -7 + i * 7; c.fillStyle = '#1a1420'; c.fillRect(px - 1, -20, 2, 18); }
      c.fillStyle = '#6a5a64'; c.fillRect(-11, -3, 22, 3);
      const col = solved ? 2 : 0;
      for (let k = 0; k < 3; k++) { const w = 6 - k * 1.5; rr(c, -7 + col * 7 - w / 2, -5 - k * 2.6, w, 2.4, 1); c.fillStyle = DCOL[k + 1][1]; c.fill(); }
      /* rune keystone */
      c.beginPath(); c.arc(0, -36, 3, 0, TAU); c.fillStyle = solved ? '#9be7a5' : '#ff7a1a'; c.fill();
      c.restore();
    },
    mount(root, api) {
      const rnd = api.rng || Math.random;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;cursor:pointer';
      root.appendChild(cv);
      const c = cv.getContext('2d');
      const DH = 300, DW = 760;
      let W = 0, H = 0, sc = 1, LW = 0, LH = 0, dpr = 1, L = {};
      const st = {peg: [[], [], []], held: null, heldFrom: -1, moves: 0, busy: false, done: false, discs: [], parts: [], drag: null, ptr: null, hot: -1, flash: 0, shake: 0, embers: [], quick: false, glowWin: 0};
      const timers = []; const later = (fn, ms) => { const id = setTimeout(() => { fn(); draw(); }, ms); timers.push(id); return id; };
      const now = () => performance.now() / 1000;

      function layout() {
        W = root.clientWidth || 880; H = root.clientHeight || 400; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        sc = Math.min(H / DH, W / DW); LW = W / sc; LH = H / sc;
        const top = (LH - DH) / 2, cx = LW / 2, sp = 220;
        L = {top, cx, px: [cx - sp, cx, cx + sp], baseY: top + 246, pillarH: 160, dh: 25, hoverY: top + 52, colW: sp};
        L.btn = {x: 14, y: top + 76, w: 126, h: 42};   /* >= 36 px on a phone (scale ~0.85) */
        if (st.discs.length) for (const d of st.discs) { const p = slotPos(d.peg, d.idx); if (d !== st.held) { d.x = p.x; d.y = p.y; d.way = []; } else if (!(st.drag && st.drag.moved)) { d.x = L.px[st.heldFrom]; d.y = L.hoverY; d.way = []; } }
      }
      const dw = k => 62 + k * 30;
      function slotPos(peg, idx) { return {x: L.px[peg], y: L.baseY - L.dh * (idx + 0.5)}; }

      function reset() {
        st.peg = [[4, 3, 2, 1, 0], [], []]; st.held = null; st.heldFrom = -1; st.moves = 0; st.busy = false; st.drag = null;
        st.discs = [];
        for (let k = 0; k < ND; k++) { const idx = 4 - k, p = slotPos(0, idx); st.discs[k] = {k, peg: 0, idx, x: p.x, y: p.y, way: [], wob: 0}; }
      }

      /* ---------------- moves ---------------- */
      function lift(p) {
        if (st.held || st.busy || st.done) return false;
        const pg = st.peg[p]; if (!pg.length) { tone(180, 0.06, {type: 'triangle', gain: 0.05}); return false; }
        const k = pg[pg.length - 1], d = st.discs[k];
        st.held = d; st.heldFrom = p; d.way = [{x: L.px[p], y: L.hoverY}];
        tone(330 + (4 - k) * 70, 0.12, {type: 'sine', gain: 0.1, slide: 1.4});
        return true;
      }
      function drop(p) {
        const d = st.held; if (!d) return;
        const from = st.heldFrom;
        if (p === from) {   /* put back */
          st.held = null; d.way = [slotPos(from, st.peg[from].length - 1)]; tone(260, 0.06, {type: 'triangle', gain: 0.06}); return;
        }
        const pg = st.peg[p], topK = pg.length ? pg[pg.length - 1] : 99;
        if (topK < d.k) {   /* illegal: hiss + bounce back */
          st.held = null;
          noise(0.45, {type: 'highpass', freq: 2500, freqTo: 5000, gain: 0.3}); tone(110, 0.2, {type: 'sawtooth', gain: 0.05});
          const over = {x: L.px[p], y: L.baseY - L.dh * (pg.length + 1.4)};
          d.way = [{x: L.px[p], y: L.hoverY}, over, {x: L.px[p], y: L.hoverY - 16, bounce: true}, {x: L.px[from], y: L.hoverY}, slotPos(from, st.peg[from].length - 1)];
          for (let i = 0; i < 10; i++) st.parts.push({kind: 'steam', x: L.px[p] + (rnd() - 0.5) * 40, y: over.y, vx: (rnd() - 0.5) * 1.2, vy: -1 - rnd() * 1.5, r: 6 + rnd() * 8, life: 0.9 + rnd() * 0.4});
          api.msg(tr('Zisch! Eine größere Scheibe darf nie auf einer kleineren liegen.', 'Hiss! A bigger disc may never sit on a smaller one.'), 'bad');
          return;
        }
        /* legal move */
        st.peg[from].pop(); pg.push(d.k); d.peg = p; d.idx = pg.length - 1; st.held = null; st.moves++;
        const target = slotPos(p, d.idx);
        d.way = st.quick ? [target] : [{x: L.px[p], y: L.hoverY}, target]; d.land = true;
        api.msg('', 'info');
        if (st.peg[2].length === ND) { win(); return; }
        if (st.moves >= LIMIT) {
          st.busy = true;
          later(() => {
            api.wrong(tr('40 Züge sind um – der Vulkan grollt und baut die Türme neu auf!', 'All 40 moves are used up – the volcano rumbles and rebuilds the towers!'));
            st.shake = 1; noise(0.8, {type: 'lowpass', freq: 300, freqTo: 60, gain: 0.5});
            later(() => { reset(); for (const dd of st.discs) { dd.y -= 120 + dd.k * 20; dd.way = [slotPos(dd.peg, dd.idx)]; } }, 700);
          }, 350);
        }
      }
      function win() {
        st.done = true; st.busy = true; st.glowWin = now();
        later(() => {
          st.flash = 1; st.shake = 0.6;
          try { api.sfx('boom'); } catch (e) {}
          [0, 4, 7, 12, 16].forEach((n, i) => tone(392 * Math.pow(2, n / 12), 0.3, {type: 'triangle', gain: 0.12, delay: i * 0.09}));
          for (let i = 0; i < 70; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, v = 3 + rnd() * 7; st.parts.push({kind: 'lava', x: L.px[2] + (rnd() - 0.5) * 30, y: L.baseY - L.dh * ND, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + rnd() * 4, life: 1.2 + rnd() * 0.8}); }
          for (let i = 0; i < 24; i++) st.parts.push({kind: 'spark', x: L.cx + (rnd() - 0.5) * LW * 0.8, y: L.top + 30 + rnd() * 200, vx: 0, vy: -0.6, r: 12 + rnd() * 10, life: 0.8 + rnd() * 0.8});
          api.msg(tr('Der Vulkan jubelt! Alle Scheiben stehen rechts' + (st.moves === 31 ? ' – perfekt in 31 Zügen!' : ' (' + st.moves + ' Züge).'), 'The volcano cheers! All discs are on the right' + (st.moves === 31 ? ' – perfect in 31 moves!' : ' (' + st.moves + ' moves).')), 'good');
          later(() => api.solved(), 1100);
        }, st.quick ? 150 : 350);
      }

      /* ---------------- rendering ---------------- */
      function drawDisc(d, t) {
        const w = dw(d.k), h = L.dh - 3, x = d.x - w / 2, y = d.y - h / 2;
        const held = d === st.held || d.way.length > 0;
        const pulse = st.done ? 0.5 + 0.5 * Math.sin((t - st.glowWin) * 10 - d.k) : 0;
        const [c0, c1, c2] = DCOL[d.k];
        c.save();
        c.shadowColor = 'rgba(255,120,30,' + (0.5 + (held ? 0.35 : 0) + pulse * 0.4) + ')'; c.shadowBlur = held ? 22 : 12 + pulse * 18;
        rr(c, x, y, w, h, h / 2); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c0); g.addColorStop(0.45, c1); g.addColorStop(1, c2);
        c.fillStyle = g; c.fill(); c.shadowBlur = 0;
        c.strokeStyle = '#3a0a04'; c.lineWidth = 2.5; c.stroke();
        /* crust cracks */
        c.save(); rr(c, x, y, w, h, h / 2); c.clip();
        for (let i = 0; i < 2 + d.k; i++) {
          const side = i % 2 ? 1 : -1, cx0 = d.x + side * (17 + ((i * 23 + d.k * 11) % Math.max(1, w / 2 - 34))), cy0 = y + h * (0.45 + ((i * 7) % 3) * 0.12), r0 = 2.2 + ((i + d.k) % 3) * 1.1;
          c.beginPath(); c.ellipse(cx0, cy0, r0 * 1.6, r0, 0, 0, TAU); c.fillStyle = 'rgba(90,20,5,.35)'; c.fill();
          c.beginPath(); c.ellipse(cx0 - 0.6, cy0 - 0.6, r0 * 0.7, r0 * 0.45, 0, 0, TAU); c.fillStyle = 'rgba(255,240,160,' + (0.35 + 0.3 * Math.sin(t * 3 + i + d.k)) + ')'; c.fill();
        }
        c.fillStyle = 'rgba(255,255,255,.45)'; rr(c, x + h / 2, y + 3, w - h, 4, 2); c.fill();
        c.restore();
        txt(c, String(d.k + 1), d.x, d.y + 1, 13, 'rgba(90,20,5,.75)', 'center', 700);
        c.restore();
      }
      function render() {
        const t = now();
        c.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
        const sh = st.shake > 0 ? st.shake * 6 : 0;
        if (sh) c.translate((rnd() - 0.5) * sh, (rnd() - 0.5) * sh);
        c.clearRect(-20, -20, LW + 40, LH + 40);
        /* cave */
        let g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#1e0e1a'); g.addColorStop(0.6, '#3a1418'); g.addColorStop(1, '#7a2a10'); c.fillStyle = g; c.fillRect(-20, -20, LW + 40, LH + 40);
        /* distant volcano silhouette */
        c.fillStyle = '#2a1018'; c.beginPath(); c.moveTo(LW * 0.25, L.baseY); c.lineTo(LW * 0.44, L.top + 30); c.lineTo(LW * 0.56, L.top + 30); c.lineTo(LW * 0.75, L.baseY); c.closePath(); c.fill();
        const vg = 0.5 + 0.5 * Math.sin(t * 1.3); c.fillStyle = 'rgba(255,90,20,' + (0.25 + vg * 0.25) + ')'; c.beginPath(); c.ellipse(LW / 2, L.top + 30, LW * 0.06, 8, 0, 0, TAU); c.fill();
        const cg = c.createRadialGradient(LW / 2, L.top + 30, 4, LW / 2, L.top + 30, 90); cg.addColorStop(0, 'rgba(255,140,40,' + (0.35 + vg * 0.2) + ')'); cg.addColorStop(1, 'rgba(255,90,20,0)');
        c.fillStyle = cg; c.fillRect(LW / 2 - 90, L.top - 60, 180, 180);
        for (let i = 0; i < 3; i++) { const ph = (t * 0.25 + i / 3) % 1; c.globalAlpha = 0.35 * (1 - ph); c.fillStyle = '#5a3a4a'; c.beginPath(); c.arc(LW / 2 + Math.sin(ph * 4 + i) * 10, L.top + 20 - ph * 50, 10 + ph * 22, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
        /* stalactites */
        c.fillStyle = '#140a12';
        for (let i = 0; i < 18; i++) { const x = (i * 73) % LW, h = 14 + (i * 17) % 30; c.beginPath(); c.moveTo(x - 12, -2); c.lineTo(x, h); c.lineTo(x + 12, -2); c.closePath(); c.fill(); }
        /* embers */
        for (const e of st.embers) { c.globalAlpha = clamp(e.life, 0, 1) * 0.9; c.fillStyle = e.col; c.beginPath(); c.arc(e.x, e.y, e.r, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
        /* lava floor */
        const ly = L.baseY + 22;
        const lg = c.createLinearGradient(0, ly, 0, LH); lg.addColorStop(0, '#ffb02a'); lg.addColorStop(0.3, '#ff5a1a'); lg.addColorStop(1, '#8a1a08');
        c.fillStyle = lg; c.beginPath(); c.moveTo(-20, LH + 20); c.lineTo(-20, ly);
        for (let x = -20; x <= LW + 20; x += 20) c.lineTo(x, ly + Math.sin(x * 0.05 + t * 2) * 3);
        c.lineTo(LW + 20, LH + 20); c.closePath(); c.fill();
        for (let i = 0; i < 7; i++) { const ph = (t * 0.7 + i * 0.37) % 1, bx = (i * 151 + 40) % LW; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(bx, ly + 12 - ph * 6, 3 + ph * 6, 0, TAU); c.strokeStyle = '#ffe14a'; c.lineWidth = 2; c.stroke(); }
        c.globalAlpha = 1;
        /* stone base */
        rr(c, L.px[0] - 130, L.baseY - 2, L.px[2] - L.px[0] + 260, 22, 8); c.fillStyle = '#3a2a32'; c.fill(); c.strokeStyle = '#140a12'; c.lineWidth = 3; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(L.px[0] - 122, L.baseY + 1, L.px[2] - L.px[0] + 244, 3);
        /* pillars */
        for (let p = 0; p < 3; p++) {
          const x = L.px[p], top = L.baseY - L.pillarH;
          if (st.hot === p || (st.held && !st.drag)) { c.fillStyle = st.hot === p ? 'rgba(255,200,90,.16)' : 'rgba(255,200,90,.05)'; rr(c, x - L.colW / 2 + 10, L.top + 8, L.colW - 20, L.baseY - L.top + 10, 18); c.fill(); }
          const pg = c.createLinearGradient(x - 8, 0, x + 8, 0); pg.addColorStop(0, '#0e0812'); pg.addColorStop(0.35, '#4a3a5a'); pg.addColorStop(0.5, '#2a1e34'); pg.addColorStop(1, '#0a0610');
          rr(c, x - 8, top, 16, L.pillarH, 7); c.fillStyle = pg; c.fill(); c.strokeStyle = '#05030a'; c.lineWidth = 2.5; c.stroke();
          c.strokeStyle = 'rgba(255,100,30,' + (0.4 + 0.3 * Math.sin(t * 2 + p)) + ')'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(x - 2, top + 20); c.lineTo(x + 2, top + 50); c.lineTo(x - 1, top + 80); c.lineTo(x + 3, top + 120); c.stroke();
          c.beginPath(); c.arc(x, top, 9, 0, TAU); c.fillStyle = '#4a3a5a'; c.fill(); c.strokeStyle = '#05030a'; c.lineWidth = 2; c.stroke();
          txt(c, ['START', tr('MITTE', 'MIDDLE'), tr('ZIEL', 'GOAL')][p], x, L.baseY + 10, 12, p === 2 ? '#9be7a5' : '#ffcf9a', 'center', 700);
        }
        /* discs: resting first, moving/held on top */
        const order = st.discs.slice().sort((a, b) => (a.way.length || a === st.held ? 1 : 0) - (b.way.length || b === st.held ? 1 : 0));
        for (const d of order) drawDisc(d, t);
        /* particles */
        for (const p of st.parts) {
          c.globalAlpha = clamp(p.life, 0, 1);
          if (p.kind === 'steam') { c.fillStyle = 'rgba(230,230,240,.55)'; c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - p.life * 0.6), 0, TAU); c.fill(); }
          else if (p.kind === 'lava') { c.fillStyle = p.life > 0.6 ? '#ffe14a' : '#ff6a1a'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
          else if (p.kind === 'spark') txt(c, '✦', p.x, p.y, p.r, '#ffd84a');
          else if (p.kind === 'dust') { c.fillStyle = 'rgba(255,200,120,.8)'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
          c.globalAlpha = 1;
        }
        /* HUD: move counter */
        const left = LIMIT - st.moves, warn = left <= 5;
        rr(c, LW - 168, L.top + 8, 154, 58, 14); c.fillStyle = 'rgba(20,8,14,.7)'; c.fill(); c.strokeStyle = warn ? '#ff6f6f' : 'rgba(255,160,80,.6)'; c.lineWidth = 2; c.stroke();
        txt(c, tr('Züge', 'Moves'), LW - 91, L.top + 22, 12, '#ffcf9a', 'center', 600);
        txt(c, st.moves + ' / ' + LIMIT, LW - 91, L.top + 46, 24, warn ? '#ff8f8f' : '#fff4e0', 'center', 700);
        rr(c, 14, L.top + 8, 150, 58, 14); c.fillStyle = 'rgba(20,8,14,.7)'; c.fill(); c.strokeStyle = 'rgba(255,160,80,.6)'; c.stroke();
        txt(c, tr('Bestwert', 'Best'), 89, L.top + 22, 12, '#ffcf9a', 'center', 600);
        txt(c, tr('31 Züge', '31 moves'), 89, L.top + 46, 20, '#ffe14a', 'center', 700);
        const b = L.btn; rr(c, b.x, b.y, b.w, b.h, b.h / 2); c.fillStyle = st.busy ? 'rgba(255,111,156,.4)' : '#ff6f9c'; c.fill(); c.strokeStyle = '#7a3b57'; c.lineWidth = 3; c.stroke();
        txt(c, tr('Neu aufbauen', 'Start over'), b.x + b.w / 2, b.y + b.h / 2 + 1, 14, '#fff', 'center', 700);
        if (st.flash > 0) { c.fillStyle = 'rgba(255,200,90,' + st.flash * 0.5 + ')'; c.fillRect(-20, -20, LW + 40, LH + 40); }
      }

      /* ---------------- simulation ---------------- */
      let raf = 0, last = 0, alive = true;
      function step() {
        const t = now(), dt = clamp(t - (last || t), 0, 0.05); last = t;
        for (const d of st.discs) {
          if (d === st.held && st.drag && st.drag.moved && st.ptr) { d.x += (st.ptr.x - d.x) * Math.min(1, dt * 25); d.y += (st.ptr.y - d.y) * Math.min(1, dt * 25); continue; }
          const w = d.way[0]; if (!w) continue;
          const dx = w.x - d.x, dy = w.y - d.y, dist = Math.hypot(dx, dy), v = (st.quick ? 3000 : 900 + dist * 6) * dt;
          if (dist <= v) {
            d.x = w.x; d.y = w.y; d.way.shift();
            if (w.bounce) tone(150, 0.08, {type: 'square', gain: 0.05});
            if (!d.way.length && d.land) {
              d.land = false; tone(200 + (4 - d.k) * 40, 0.08, {type: 'triangle', gain: 0.12});
              for (let i = 0; i < 6; i++) st.parts.push({kind: 'dust', x: d.x + (rnd() - 0.5) * dw(d.k), y: d.y + 8, vx: (rnd() - 0.5) * 2, vy: -rnd() * 1.5, r: 1.5 + rnd() * 2, life: 0.5});
            }
          } else { d.x += dx / dist * v; d.y += dy / dist * v; }
        }
        if (rnd() < dt * 8) st.embers.push({x: rnd() * LW, y: LH + 5, vx: (rnd() - 0.5) * 0.4, vy: -0.6 - rnd() * 0.8, r: 1 + rnd() * 2, life: 3 + rnd() * 2, col: rnd() < 0.5 ? '#ffb02a' : '#ff6a1a'});
        for (const e of st.embers) { e.life -= dt * 0.5; e.x += e.vx + Math.sin(t * 2 + e.y * 0.05) * 0.2; e.y += e.vy * dt * 60; }
        st.embers = st.embers.filter(e => e.life > 0 && e.y > -10);
        for (const p of st.parts) { p.life -= dt; p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; if (p.kind === 'lava') p.vy += 0.25 * dt * 60; }
        st.parts = st.parts.filter(p => p.life > 0);
        if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 1.6);
        if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2);
      }
      function frame() { raf = 0; if (!alive) return; step(); render(); raf = requestAnimationFrame(frame); }
      const tick = setInterval(() => { if (alive) { step(); render(); } }, 40);
      function draw() { if (!alive) return; step(); render(); }

      /* ---------------- input: tap-tap or drag ---------------- */
      function pt(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc}; }
      function pegAt(p) { let best = -1, bd = 1e9; for (let i = 0; i < 3; i++) { const d = Math.abs(p.x - L.px[i]); if (d < bd) { bd = d; best = i; } } return bd < L.colW / 2 + 20 && p.y > L.top - 10 && p.y < L.baseY + 40 ? best : -1; }
      function onDown(e) {
        e.preventDefault(); const p = pt(e); st.ptr = p;
        const b = L.btn; if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { if (!st.busy && !st.done) { try { api.sfx('select'); } catch (er) {} reset(); api.msg(tr('Die Türme stehen wieder links.', 'The tower is back on the left.'), 'info'); draw(); } return; }
        if (st.busy || st.done) return;
        const pg = pegAt(p); if (pg < 0) return;
        try { cv.setPointerCapture(e.pointerId); } catch (er) {}
        if (st.held) { drop(pg); draw(); return; }
        if (lift(pg)) st.drag = {from: pg, sx: p.x, sy: p.y, moved: false};
        draw();
      }
      function onMove(e) {
        const p = pt(e); st.ptr = p;
        const pg = pegAt(p); if (pg !== st.hot) { st.hot = pg; }
        if (st.drag && !st.drag.moved && Math.hypot(p.x - st.drag.sx, p.y - st.drag.sy) > 12) { st.drag.moved = true; if (st.held) st.held.way = []; }
      }
      function onUp(e) {
        const p = pt(e);
        if (st.drag && st.drag.moved && st.held) { const pg = pegAt(p); drop(pg < 0 ? st.drag.from : pg); }
        st.drag = null; draw();
      }
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
      cv.addEventListener('pointerleave', () => { st.hot = -1; });
      const onKey = e => { const k = {Digit1: 0, Digit2: 1, Digit3: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2}[e.code]; if (k === undefined || e.repeat || st.busy || st.done) return; if (st.held) drop(k); else lift(k); draw(); };
      window.addEventListener('keydown', onKey);
      const ro = new ResizeObserver(() => { layout(); render(); }); ro.observe(root);
      layout(); reset(); render(); raf = requestAnimationFrame(frame);

      return {
        destroy() { alive = false; cancelAnimationFrame(raf); clearInterval(tick); timers.forEach(clearTimeout); ro.disconnect(); window.removeEventListener('keydown', onKey); cv.remove(); },
        autoSolve() {
          if (st.done) return;
          timers.forEach(clearTimeout); timers.length = 0;
          st.quick = true; reset(); st.busy = true;
          const seq = solveSeq(ND, 0, 2, 1, []);
          api.msg(tr('Die kleinste Scheibe wandert im Kreis: links → rechts → Mitte …', 'The smallest disc goes round in a circle: left → right → middle …'), 'info');
          const next = () => { const m = seq.shift(); if (!m) return; st.busy = false; lift(m[0]); drop(m[1]); st.busy = !st.done; if (seq.length) later(next, 45); };
          later(next, 120);
        },
      };
    },
  });
})();

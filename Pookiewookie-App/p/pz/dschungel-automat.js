/* Pookiewookie puzzle: "Der Affen-Spielautomat" (Dschungel, slot 0).
   A wooden jungle slot machine with 3 reels. Every reel carries the same 8 symbols in a fixed order (shown as a strip beside it).
   Three levers turn the reels by fixed amounts (brass plates). Goal: three bananas on the payline with at most 10 coins.
   Start and lever amounts are generated so that a solution exists within 10 pulls but needs at least 5 (checked by search). */
(function () {
  const G = window.PW = window.PW || {};
  const TAU = Math.PI * 2, N = 8, COINS = 10;
  const NAMES = ['Banane', 'Kokosnuss', 'Affe', 'Blume', 'Papagei', 'Ananas', 'Schlange', 'Kirsche'];
  const OL = '#2a1508';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const mod = (a, n) => ((a % n) + n) % n;
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function txt(c, s, x, y, px, col, align, w, ol) {
    c.font = (w || 700) + ' ' + px + 'px "Fredoka", sans-serif'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (ol) { c.lineJoin = 'round'; c.lineWidth = px * 0.28; c.strokeStyle = ol; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function sfx(api, n) { try { api.sfx(n); } catch (e) {} }
  function tone(f, d, o) { try { G.audio.tone(f, d, o); } catch (e) {} }

  /* ---------------- the eight symbols (centre 0,0, size ~ s) ---------------- */
  function sym(c, i, x, y, s, glow) {
    c.save(); c.translate(x, y); c.scale(s / 40, s / 40); c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 2.4; c.strokeStyle = OL;
    if (glow) { c.shadowColor = 'rgba(255,230,90,.95)'; c.shadowBlur = 18; }
    switch (i) {
      case 0: { /* banana */
        c.beginPath(); c.moveTo(-15, -10); c.quadraticCurveTo(-14, 14, 16, 12); c.quadraticCurveTo(10, 4, -8, -12); c.closePath();
        c.fillStyle = '#ffd84a'; c.fill(); c.shadowBlur = 0; c.stroke();
        c.beginPath(); c.moveTo(-11, -6); c.quadraticCurveTo(-9, 8, 10, 9); c.strokeStyle = 'rgba(200,140,20,.7)'; c.lineWidth = 1.6; c.stroke();
        c.beginPath(); c.moveTo(-9, -11); c.quadraticCurveTo(-4, -5, 2, -1); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#6b3f1d'; c.beginPath(); c.arc(-12, -12, 3, 0, TAU); c.fill(); c.beginPath(); c.arc(16, 12, 2, 0, TAU); c.fill();
        break; }
      case 1: { /* coconut */
        c.beginPath(); c.arc(0, 1, 15, 0, TAU); c.fillStyle = '#8a5a2e'; c.fill(); c.shadowBlur = 0; c.stroke();
        c.strokeStyle = 'rgba(60,30,10,.5)'; c.lineWidth = 1.4;
        for (let k = 0; k < 7; k++) { const a = -2.6 + k * 0.5; c.beginPath(); c.moveTo(Math.cos(a) * 6, 1 + Math.sin(a) * 6); c.lineTo(Math.cos(a) * 12, 1 + Math.sin(a) * 12); c.stroke(); }
        c.fillStyle = '#3a2010'; for (const [dx, dy] of [[-4, -4], [4, -4], [0, 3]]) { c.beginPath(); c.arc(dx, dy, 2.6, 0, TAU); c.fill(); }
        c.beginPath(); c.arc(-6, -6, 3.5, 0, TAU); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill();
        break; }
      case 2: { /* monkey face */
        c.fillStyle = '#7a4a26';
        for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 14, 0, 5.5, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(d * 14, 0, 2.8, 0, TAU); c.fillStyle = '#f2c79a'; c.fill(); c.fillStyle = '#7a4a26'; }
        c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fill(); c.shadowBlur = 0; c.stroke();
        c.beginPath(); c.moveTo(-9, -2); c.bezierCurveTo(-11, -10, -1, -10, 0, -4); c.bezierCurveTo(1, -10, 11, -10, 9, -2); c.bezierCurveTo(12, 6, 6, 12, 0, 12); c.bezierCurveTo(-6, 12, -12, 6, -9, -2); c.closePath();
        c.fillStyle = '#f2c79a'; c.fill(); c.lineWidth = 1.4; c.stroke();
        c.fillStyle = OL; c.beginPath(); c.arc(-4, -3, 2, 0, TAU); c.arc(4, -3, 2, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-3.4, -3.7, 0.7, 0, TAU); c.arc(4.6, -3.7, 0.7, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(-4, 5); c.quadraticCurveTo(0, 9, 4, 5); c.lineWidth = 1.6; c.stroke();
        break; }
      case 3: { /* flower */
        c.fillStyle = '#ff7fb0';
        for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - Math.PI / 2; c.beginPath(); c.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 8, 6, a, 0, TAU); c.fill(); c.lineWidth = 2; c.stroke(); }
        c.shadowBlur = 0;
        c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fillStyle = '#ffd84a'; c.fill(); c.stroke();
        c.fillStyle = '#e8a020'; for (let k = 0; k < 5; k++) { const a = k * 1.3; c.beginPath(); c.arc(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0.9, 0, TAU); c.fill(); }
        break; }
      case 4: { /* parrot */
        c.beginPath(); c.ellipse(-1, 4, 11, 13, -0.3, 0, TAU); c.fillStyle = '#e8443a'; c.fill(); c.shadowBlur = 0; c.stroke();
        c.beginPath(); c.moveTo(-8, 4); c.quadraticCurveTo(-4, 18, 6, 16); c.quadraticCurveTo(-2, 10, -8, 4); c.fillStyle = '#3fb86a'; c.fill(); c.lineWidth = 1.8; c.stroke();
        c.beginPath(); c.moveTo(-6, 12); c.quadraticCurveTo(-3, 18, 3, 17); c.strokeStyle = '#4a7ae8'; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = OL;
        c.beginPath(); c.arc(1, -7, 9, 0, TAU); c.fillStyle = '#e8443a'; c.fill(); c.lineWidth = 2.4; c.stroke();
        c.beginPath(); c.ellipse(3, -8, 4.2, 4.6, 0, 0, TAU); c.fillStyle = '#fff'; c.fill();
        c.beginPath(); c.arc(4, -8, 1.8, 0, TAU); c.fillStyle = OL; c.fill();
        c.beginPath(); c.moveTo(8, -9); c.quadraticCurveTo(17, -8, 12, 1); c.quadraticCurveTo(11, -3, 8, -3); c.closePath(); c.fillStyle = '#ffb02a'; c.fill(); c.lineWidth = 1.8; c.stroke();
        c.beginPath(); c.moveTo(-3, -15); c.quadraticCurveTo(-2, -21, 3, -19); c.strokeStyle = '#ffd84a'; c.lineWidth = 3; c.stroke();
        break; }
      case 5: { /* pineapple */
        c.fillStyle = '#3fb86a';
        for (const [a, l] of [[-0.6, 12], [0, 15], [0.6, 12], [-0.3, 13], [0.3, 13]]) { c.save(); c.translate(0, -7); c.rotate(a); c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(0, -l * 1.2, 3, 0); c.closePath(); c.fill(); c.lineWidth = 1.6; c.stroke(); c.restore(); }
        c.beginPath(); c.ellipse(0, 6, 11, 13, 0, 0, TAU); c.fillStyle = '#f6b42a'; c.fill(); c.shadowBlur = 0; c.lineWidth = 2.4; c.stroke();
        c.save(); c.clip(); c.strokeStyle = 'rgba(150,80,10,.6)'; c.lineWidth = 1.3;
        for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 7 - 14, -8); c.lineTo(k * 7 + 14, 20); c.stroke(); c.beginPath(); c.moveTo(k * 7 + 14, -8); c.lineTo(k * 7 - 14, 20); c.stroke(); }
        c.restore();
        c.beginPath(); c.ellipse(-5, 1, 2.5, 5, 0.3, 0, TAU); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill();
        break; }
      case 6: { /* snake */
        c.beginPath(); c.moveTo(-14, 14); c.bezierCurveTo(-2, 16, 12, 10, 4, 3); c.bezierCurveTo(-4, -3, -12, -4, -2, -10);
        c.lineWidth = 10; c.strokeStyle = OL; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = '#6ad06a'; c.stroke(); c.shadowBlur = 0;
        c.lineWidth = 2; c.strokeStyle = '#ffd84a'; c.setLineDash([2, 5]); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.ellipse(4, -12, 8, 6, -0.2, 0, TAU); c.fillStyle = '#6ad06a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.2; c.stroke();
        c.fillStyle = OL; c.beginPath(); c.arc(4, -14, 1.7, 0, TAU); c.arc(9, -14.6, 1.7, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(11, -10); c.lineTo(17, -8); c.moveTo(17, -8); c.lineTo(19, -10); c.moveTo(17, -8); c.lineTo(19, -6); c.strokeStyle = '#e8443a'; c.lineWidth = 1.5; c.stroke();
        break; }
      case 7: { /* cherries */
        c.beginPath(); c.moveTo(-6, 6); c.quadraticCurveTo(-4, -8, 3, -15); c.moveTo(8, 8); c.quadraticCurveTo(6, -6, 3, -15); c.strokeStyle = '#4a7a2a'; c.lineWidth = 2.4; c.stroke();
        c.beginPath(); c.moveTo(3, -15); c.quadraticCurveTo(12, -20, 16, -12); c.quadraticCurveTo(8, -10, 3, -15); c.fillStyle = '#5fc46a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.6; c.stroke();
        for (const [cx, cy] of [[-7, 8], [8, 10]]) { c.beginPath(); c.arc(cx, cy, 7.5, 0, TAU); c.fillStyle = '#e02a4a'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OL; c.stroke(); c.beginPath(); c.arc(cx - 2.5, cy - 2.5, 2.2, 0, TAU); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); }
        c.shadowBlur = 0;
        break; }
    }
    c.restore();
  }

  function drawMonkey(c, x, y, s, mood, t) {
    /* sitting monkey, feet at (x, y); mood: 'idle' | 'laugh' | 'happy' */
    c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OL; c.lineWidth = 2.2;
    const bob = mood === 'happy' ? -Math.abs(Math.sin(t * 9)) * 8 : (mood === 'laugh' ? Math.sin(t * 22) * 1.5 : Math.sin(t * 2) * 1);
    c.translate(0, bob);
    /* tail */
    c.beginPath(); c.moveTo(10, -6); c.bezierCurveTo(30, -4, 30, -26, 20, -24); c.bezierCurveTo(14, -22, 18, -14, 22, -16); c.lineWidth = 6; c.stroke(); c.lineWidth = 3.4; c.strokeStyle = '#7a4a26'; c.stroke(); c.strokeStyle = OL; c.lineWidth = 2.2;
    /* body */
    c.beginPath(); c.ellipse(0, -14, 13, 15, 0, 0, TAU); c.fillStyle = '#7a4a26'; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -11, 8, 10, 0, 0, TAU); c.fillStyle = '#f2c79a'; c.fill();
    /* feet */
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 8, -1, 6, 3.5, 0, 0, TAU); c.fillStyle = '#f2c79a'; c.fill(); c.stroke(); }
    /* arms: happy = up, laugh = hold belly, idle = holding a banana */
    const arm = (sx, sy, ex, ey) => { c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineWidth = 7; c.strokeStyle = OL; c.stroke(); c.lineWidth = 4.2; c.strokeStyle = '#7a4a26'; c.stroke(); c.beginPath(); c.arc(ex, ey, 3.4, 0, TAU); c.fillStyle = '#f2c79a'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OL; c.stroke(); };
    if (mood === 'happy') { const w = Math.sin(t * 18) * 3; arm(-10, -22, -18 + w, -40); arm(10, -22, 18 - w, -40); }
    else if (mood === 'laugh') { arm(-10, -22, -4, -10); arm(10, -22, 4, -10); }
    else { arm(-10, -22, -14, -10); arm(10, -22, 16, -28); c.save(); c.translate(19, -34); c.rotate(-0.6); sym(c, 0, 0, 0, 14); c.restore(); }
    /* head */
    const hy = -36;
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 13, hy, 5.5, 0, TAU); c.fillStyle = '#7a4a26'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OL; c.stroke(); c.beginPath(); c.arc(d * 13, hy, 3, 0, TAU); c.fillStyle = '#f2c79a'; c.fill(); }
    c.beginPath(); c.arc(0, hy, 13, 0, TAU); c.fillStyle = '#7a4a26'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-9, hy - 1); c.bezierCurveTo(-11, hy - 10, -1, hy - 10, 0, hy - 4); c.bezierCurveTo(1, hy - 10, 11, hy - 10, 9, hy - 1); c.bezierCurveTo(12, hy + 8, 6, hy + 11, 0, hy + 11); c.bezierCurveTo(-6, hy + 11, -12, hy + 8, -9, hy - 1); c.closePath();
    c.fillStyle = '#f2c79a'; c.fill(); c.lineWidth = 1.5; c.stroke();
    if (mood === 'laugh' || mood === 'happy') {
      c.lineWidth = 1.8; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 4 - 2.4, hy - 2); c.quadraticCurveTo(d * 4, hy - 5, d * 4 + 2.4, hy - 2); c.stroke(); }
      c.beginPath(); c.moveTo(-5, hy + 3); c.quadraticCurveTo(0, hy + 13, 5, hy + 3); c.closePath(); c.fillStyle = '#7a2a2a'; c.fill(); c.stroke();
      c.beginPath(); c.arc(0, hy + 7.5, 2, 0, Math.PI); c.fillStyle = '#ff8fa8'; c.fill();
    } else {
      c.fillStyle = OL; c.beginPath(); c.arc(-4, hy - 2, 2, 0, TAU); c.arc(4, hy - 2, 2, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-3.4, hy - 2.7, 0.7, 0, TAU); c.arc(4.6, hy - 2.7, 0.7, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-4, hy + 5); c.quadraticCurveTo(0, hy + 9, 4, hy + 5); c.lineWidth = 1.6; c.stroke();
    }
    c.fillStyle = 'rgba(255,120,140,.45)'; c.beginPath(); c.arc(-7, hy + 3, 2.4, 0, TAU); c.arc(7, hy + 3, 2.4, 0, TAU); c.fill();
    c.restore();
  }

  /* ---------------- generation: levers + start with a guaranteed 5..8 pull solution ---------------- */
  function minSolve(pos, lev, maxSum) {
    /* smallest x+y+z (each pull count) that brings every reel to 0; returns {n, cnt} or null */
    let best = null;
    for (let x = 0; x <= maxSum; x++) for (let y = 0; x + y <= maxSum; y++) for (let z = 0; x + y + z <= maxSum; z++) {
      let ok = true;
      for (let r = 0; r < 3 && ok; r++) if (mod(pos[r] + x * lev[0][r] + y * lev[1][r] + z * lev[2][r], N) !== 0) ok = false;
      if (ok && (!best || x + y + z < best.n)) best = {n: x + y + z, cnt: [x, y, z]};
    }
    return best;
  }
  function goodStart(lev, rnd) {
    for (let k = 0; k < 400; k++) {
      const pos = [Math.floor(rnd() * N), Math.floor(rnd() * N), Math.floor(rnd() * N)];
      const sol = minSolve(pos, lev, COINS);
      if (sol && sol.n >= 5 && sol.n <= 8 && sol.cnt.filter(v => v > 0).length >= 2) return pos;
    }
    return null;
  }
  function generate(rnd) {
    for (let k = 0; k < 500; k++) {
      const lev = [0, 1, 2].map(() => [0, 1, 2].map(() => Math.floor(rnd() * 5)));
      if (lev.some(l => l.every(v => v === 0) || l.filter(v => v === 0).length > 1)) continue;
      if (lev[0].join() === lev[1].join() || lev[0].join() === lev[2].join() || lev[1].join() === lev[2].join()) continue;
      const pos = goodStart(lev, rnd);
      if (pos) return {lev, pos};
    }
    return {lev: [[1, 3, 0], [0, 2, 3], [2, 0, 1]], pos: [0, 0, 2]};   /* fallback: shortest solution 2× A, 1× B, 3× C = 6 pulls */
  }

  G.PZ = G.PZ || {register() {}};
  G.PZ.register({
    id: 'dschungel-automat', world: 'dschungel', slot: 0,
    title: 'Der Affen-Spielautomat',
    intro: 'Drei Bananen auf die rote Linie! Jeder Hebel dreht Walze 1, 2 und 3 um die Zahlen auf seinem Schild weiter. Jeder Zug kostet eine von 10 Münzen.',
    letter: 'Jeder Hebel dreht die Walzen immer gleich weit. Die Reihenfolge ist also egal – es zählt nur, wie oft du an welchem Hebel ziehst. Erst rechnen, dann ziehen!',
    hint: 'Zähle für jede Walze, wie viele Felder sie noch bis zur Banane braucht (im Kreis gezählt: nach der Kirsche kommt wieder die Banane, 8 Felder sind eine Runde). Für jede Walze muss gelten: (wie oft A × Zahl von A) + (wie oft B × Zahl von B) + (wie oft C × Zahl von C) = genau diese Felderzahl, oder 8, 16, 24 mehr. Probier für A der Reihe nach 0, 1, 2 … und rechne aus, was B und C dann noch schaffen müssen.',
    station(c, x, y, t, solved) {
      c.save(); c.translate(x, y); c.lineJoin = 'round';
      c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 0, 16, 3, 0, 0, TAU); c.fill();
      rr(c, -14, -28, 26, 28, 4); c.fillStyle = '#a0612e'; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.2; c.stroke();
      rr(c, -12, -26, 22, 4, 2); c.fillStyle = '#ffd84a'; c.fill();
      rr(c, -11, -20, 20, 10, 2); c.fillStyle = '#fff4e0'; c.fill(); c.stroke();
      for (let i = 0; i < 3; i++) sym(c, solved ? 0 : (i * 3 + Math.floor(t * 2)) % 8, -7.5 + i * 6.5, -15, 6);
      c.strokeStyle = '#e8443a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-11, -15); c.lineTo(9, -15); c.stroke();
      rr(c, -8, -7, 14, 3, 1); c.fillStyle = '#3a2010'; c.fill();
      c.strokeStyle = OL; c.lineWidth = 1.6; c.beginPath(); c.moveTo(13, -14); c.lineTo(16, -24 + Math.max(0, Math.sin(t * 2)) * 4); c.stroke();
      c.beginPath(); c.arc(16, -24 + Math.max(0, Math.sin(t * 2)) * 4, 2.4, 0, TAU); c.fillStyle = '#e8443a'; c.fill(); c.lineWidth = 0.8; c.stroke();
      drawMonkey(c, -1, -28, 0.3, solved ? 'happy' : 'idle', t);
      if (solved) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6); txt(c, '★', 12, -40, 8, '#ffd84a'); c.globalAlpha = 1; }
      c.restore();
    },
    mount(root, api) {
      const rnd = api.rng || Math.random;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;cursor:pointer';
      root.appendChild(cv);
      const c = cv.getContext('2d');
      const DH = 300, DW = 860;
      let W = 0, H = 0, sc = 1, LW = 0, LH = 0, dpr = 1;
      const st = {lev: null, pos: [0, 0, 0], start: [0, 0, 0], coins: COINS, busy: false, done: false, spins: [], pulls: [0, 0, 0],
        leverAnim: [0, 0, 0], hover: -1, mood: 'idle', moodT: 0, parts: [], flash: 0, coinDrop: [], won: false, total: 0};
      const timers = []; const later = (fn, ms) => { const id = setTimeout(() => { fn(); draw(); }, ms); timers.push(id); return id; };
      let L = {};   /* layout */

      function newGame(keepLevers) {
        if (!keepLevers || !st.lev) { const g = generate(rnd); st.lev = g.lev; st.start = g.pos.slice(); }
        else { st.start = goodStart(st.lev, rnd) || st.start; }
        st.pos = st.start.slice(); st.coins = COINS; st.pulls = [0, 0, 0]; st.spins = []; st.busy = false; st.won = false; st.coinDrop = [];
        st.vis = st.pos.slice();
      }
      newGame(false);

      function layout() {
        W = root.clientWidth || 880; H = root.clientHeight || 400; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        sc = Math.min(H / DH, W / DW); LW = W / sc; LH = H / sc;
        const cx = LW / 2, top = (LH - DH) / 2;
        const symH = 62, reelW = 84, stripW = 24, gap = 16, unit = reelW + 6 + stripW;
        const cabW = unit * 3 + gap * 2 + 40, cabX = cx - cabW / 2 - 54, cabY = top + 4, cabH = DH - 8;
        L = {top, symH, reelW, stripW, gap, unit, cabW, cabX, cabY, cabH,
          reelY: cabY + 46, reelH: symH * 3, reels: [], levers: [], coinX: cabX - 86, coinY: top + 72};
        for (let i = 0; i < 3; i++) L.reels.push({x: cabX + 20 + i * (unit + gap), stripX: cabX + 20 + i * (unit + gap) + reelW + 6});
        const lx0 = cabX + cabW + 34, lw = 74;
        for (let i = 0; i < 3; i++) L.levers.push({x: lx0 + i * lw + lw / 2, y: top + 150, w: lw - 6});
        L.btn = {x: L.coinX - 62, y: top + DH - 42, w: 124, h: 38};
      }

      function render() {
        const now = performance.now() / 1000;
        c.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0); c.clearRect(0, 0, LW, LH);
        /* jungle backdrop */
        let g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#1f4a2e'); g.addColorStop(1, '#10261a'); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
        c.globalAlpha = 0.5;
        for (let i = 0; i < 14; i++) {
          const x = (i * 97) % LW, y = (i * 53) % LH, a = i * 1.7 + Math.sin(now + i) * 0.05;
          c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 60, 18, 0, 0, TAU); c.fillStyle = i % 2 ? '#2f6b3e' : '#285c36'; c.fill(); c.restore();
        }
        c.globalAlpha = 1;
        /* hanging vines */
        c.strokeStyle = '#3f8a4a'; c.lineWidth = 4;
        for (let i = 0; i < 6; i++) { const x = 30 + i * LW / 6; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 12 * Math.sin(now * 0.8 + i), 30, x + 4, 50 + (i % 3) * 14); c.stroke(); c.fillStyle = '#5fc46a'; c.beginPath(); c.ellipse(x + 4, 52 + (i % 3) * 14, 6, 3, 0.5, 0, TAU); c.fill(); }

        drawCoins(now); drawMonkey(c, L.coinX, L.coinY + 2, 1, st.mood, now); drawCabinet(now); drawLevers(now); drawButton();
        /* particles */
        for (const p of st.parts) {
          if (p.kind === 'coin') { c.save(); c.translate(p.x, p.y); c.scale(Math.cos(p.rot), 1); c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fillStyle = '#ffd84a'; c.fill(); c.strokeStyle = '#a0782a'; c.lineWidth = 2; c.stroke(); c.restore(); }
          else if (p.kind === 'star') { c.globalAlpha = clamp(p.life, 0, 1); txt(c, '✦', p.x, p.y, p.r, p.col); c.globalAlpha = 1; }
          else if (p.kind === 'text') { c.globalAlpha = clamp(p.life * 1.5, 0, 1); txt(c, p.s, p.x, p.y, p.r, p.col, 'center', 700, OL); c.globalAlpha = 1; }
        }
        if (st.flash > 0) { c.fillStyle = 'rgba(255,240,180,' + st.flash * 0.5 + ')'; c.fillRect(0, 0, LW, LH); }
      }

      function drawCoins(now) {
        const x = L.coinX, y = L.coinY;
        rr(c, x - 62, y, 124, 176, 18); c.fillStyle = 'rgba(42,21,8,.55)'; c.fill(); c.strokeStyle = 'rgba(255,216,74,.35)'; c.lineWidth = 2; c.stroke();
        txt(c, 'Münzen', x, y + 17, 16, '#ffe9a8', 'center', 600);
        for (let i = 0; i < COINS; i++) {
          const have = i < st.coins, cy = y + 136 - i * 9.5;
          c.save(); c.translate(x, cy); c.globalAlpha = have ? 1 : 0.18;
          c.beginPath(); c.ellipse(0, 3, 24, 7, 0, 0, TAU); c.fillStyle = '#a0782a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.6; c.stroke();
          c.beginPath(); c.ellipse(0, 0, 24, 7, 0, 0, TAU); c.fillStyle = have ? '#ffd84a' : '#776'; c.fill(); c.stroke();
          c.beginPath(); c.ellipse(0, 0, 14, 3.5, 0, 0, TAU); c.strokeStyle = 'rgba(160,120,40,.8)'; c.lineWidth = 1.4; c.stroke();
          c.restore();
        }
        txt(c, st.coins + ' / ' + COINS, x, y + 159, 20, st.coins <= 2 ? '#ff8fa8' : '#fff4e0', 'center', 700, OL);
      }

      function drawCabinet(now) {
        const {cabX: x, cabY: y, cabW: w, cabH: h} = L;
        /* shadow + wooden body */
        c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, x + 8, y + 10, w, h, 22); c.fill();
        let g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#8a5226'); g.addColorStop(0.5, '#b8743a'); g.addColorStop(1, '#7a4620');
        rr(c, x, y, w, h, 22); c.fillStyle = g; c.fill(); c.strokeStyle = OL; c.lineWidth = 4; c.stroke();
        c.save(); rr(c, x, y, w, h, 22); c.clip(); c.strokeStyle = 'rgba(60,30,10,.25)'; c.lineWidth = 2;
        for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(x, y + 20 + i * 34); c.bezierCurveTo(x + w * 0.3, y + 10 + i * 34, x + w * 0.6, y + 34 + i * 34, x + w, y + 22 + i * 34); c.stroke(); }
        c.restore();
        /* sign */
        const sx = x + w / 2, sy = y + 22;
        rr(c, sx - 120, sy - 18, 240, 34, 17); c.fillStyle = '#ffd84a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.stroke();
        for (let i = 0; i < 12; i++) { const bx = sx - 108 + i * 19.6, on = (Math.floor(now * 6) + i) % 3 === 0 || st.won; c.beginPath(); c.arc(bx, sy - 18, 3.2, 0, TAU); c.fillStyle = on ? '#fff7c0' : '#e8a020'; c.fill(); }
        txt(c, 'BANANEN-JACKPOT', sx, sy, 19, '#e0457b', 'center', 700);
        /* reels */
        for (let i = 0; i < 3; i++) drawReel(i, now);
        /* payline */
        const py = L.reelY + L.reelH / 2;
        c.strokeStyle = st.won ? 'rgba(255,240,120,' + (0.6 + 0.4 * Math.sin(now * 12)) + ')' : 'rgba(232,68,58,.85)'; c.lineWidth = 3;
        for (const R of L.reels) { c.beginPath(); c.moveTo(R.x - 14, py); c.lineTo(R.x + L.reelW + 4, py); c.stroke(); }
        for (const [ax, d] of [[x + 6, 1], [x + w - 6, -1]]) { c.beginPath(); c.moveTo(ax, py - 9); c.lineTo(ax + d * 12, py); c.lineTo(ax, py + 9); c.closePath(); c.fillStyle = '#e8443a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); }
        /* coin slot + tray */
        const ty = L.reelY + L.reelH + 18;
        rr(c, x + w / 2 - 70, ty, 140, 22, 10); c.fillStyle = '#3a2010'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke();
        rr(c, x + w / 2 - 22, ty + 7, 44, 7, 3); c.fillStyle = '#120804'; c.fill();
        for (const d of st.coinDrop) { const k = clamp((now - d.t0) / 0.35, 0, 1); if (k >= 1) continue; c.save(); c.translate(x + w / 2, ty + 10 - 40 * (1 - k)); c.scale(1, 1); c.beginPath(); c.ellipse(0, 0, 9, 9 * (1 - k * 0.8), 0, 0, TAU); c.fillStyle = '#ffd84a'; c.fill(); c.strokeStyle = '#a0782a'; c.lineWidth = 2; c.stroke(); c.restore(); }
        txt(c, 'Züge: ' + st.total, x + w - 54, ty + 11, 14, '#fff4e0', 'center', 600);
      }

      function drawReel(i, now) {
        const R = L.reels[i], y = L.reelY, h = L.reelH, sh = L.symH, w = L.reelW;
        /* window */
        rr(c, R.x - 4, y - 4, w + 8, h + 8, 12); c.fillStyle = OL; c.fill();
        c.save(); rr(c, R.x, y, w, h, 9); c.clip();
        const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#d9c8a8'); g.addColorStop(0.5, '#fffaf0'); g.addColorStop(1, '#d9c8a8');
        c.fillStyle = g; c.fillRect(R.x, y, w, h);
        const vis = st.vis[i], cy = y + h / 2, sp = st.spins[i];
        const speed = sp && now < sp.t1 ? 1 : 0;
        for (let k = -3; k <= 3; k++) {
          const idx = Math.floor(vis) + k, off = idx - vis, sy = cy + off * sh;
          if (sy < y - sh || sy > y + h + sh) continue;
          const si = mod(idx, N), win = st.won && Math.abs(off) < 0.5;
          if (speed) { c.globalAlpha = 0.85; }
          sym(c, si, R.x + w / 2, sy, sh * 0.78 * (win ? 1 + 0.08 * Math.sin(now * 10) : 1), win);
          c.globalAlpha = 1;
          if (speed) { c.fillStyle = 'rgba(255,250,240,.35)'; c.fillRect(R.x, sy - sh / 2, w, sh); }
        }
        /* glass shading */
        const gl = c.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, 'rgba(40,20,5,.55)'); gl.addColorStop(0.22, 'rgba(40,20,5,0)'); gl.addColorStop(0.78, 'rgba(40,20,5,0)'); gl.addColorStop(1, 'rgba(40,20,5,.55)');
        c.fillStyle = gl; c.fillRect(R.x, y, w, h);
        c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(R.x + 8, y, 7, h);
        c.restore();
        c.beginPath(); c.arc(R.x + 13, y + 13, 11, 0, TAU); c.fillStyle = '#ffd84a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
        txt(c, String(i + 1), R.x + 13, y + 14, 14, '#3a2004', 'center', 700);
        /* strip legend: all 8 symbols in order; current one framed */
        const sx = R.stripX, sw = L.stripW, ssh = h / N;
        rr(c, sx - 2, y - 4, sw + 4, h + 8, 8); c.fillStyle = 'rgba(42,21,8,.75)'; c.fill();
        const cur = mod(Math.round(vis), N);
        for (let k = 0; k < N; k++) {
          const ky = y + ssh * (k + 0.5);
          if (k === cur) { rr(c, sx - 1, ky - ssh / 2 + 1, sw + 2, ssh - 2, 5); c.fillStyle = 'rgba(255,216,74,.85)'; c.fill(); }
          sym(c, k, sx + sw / 2, ky, ssh * 0.82);
        }
        /* small arrow: the strip runs downwards and wraps */
        c.strokeStyle = 'rgba(255,233,168,.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sx + sw + 6, y + 6); c.lineTo(sx + sw + 6, y + h - 6); c.stroke();
        c.beginPath(); c.moveTo(sx + sw + 2, y + h - 11); c.lineTo(sx + sw + 6, y + h - 5); c.lineTo(sx + sw + 10, y + h - 11); c.stroke();
      }

      function drawLevers(now) {
        for (let i = 0; i < 3; i++) {
          const Lv = L.levers[i], x = Lv.x, by = Lv.y, k = st.leverAnim[i] ? clamp(1 - (now - st.leverAnim[i]) / 0.5, 0, 1) : 0;
          const pull = Math.sin(k * Math.PI) * (k > 0 ? 1 : 0), hov = st.hover === i && !st.busy ? 1 : 0;
          /* base box */
          rr(c, x - 22, by - 6, 44, 30, 8); c.fillStyle = '#5a3418'; c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.stroke();
          /* rod */
          const len = 120 * (1 - pull * 0.85), kx = x, ky = by - len;
          c.lineCap = 'round'; c.strokeStyle = OL; c.lineWidth = 11; c.beginPath(); c.moveTo(x, by + 6); c.lineTo(kx, ky); c.stroke();
          c.strokeStyle = '#d9d9e8'; c.lineWidth = 6; c.stroke();
          c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 1.5, by + 4); c.lineTo(kx - 1.5, ky + 4); c.stroke();
          const kr = 17 + hov * 2 + pull * 3;
          const gk = c.createRadialGradient(kx - 5, ky - 6, 2, kx, ky, kr); gk.addColorStop(0, '#ffb0b8'); gk.addColorStop(0.35, ['#e8443a', '#3fb86a', '#4a8ae8'][i]); gk.addColorStop(1, ['#8a1a14', '#1a6a3a', '#1a3a8a'][i]);
          c.beginPath(); c.arc(kx, ky, kr, 0, TAU); c.fillStyle = gk; c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.stroke();
          txt(c, 'ABC'[i], kx, ky + 1, 18, '#fff', 'center', 700, 'rgba(0,0,0,.5)');
          /* brass plate */
          const py = by + 40, pw = Lv.w, ph = 72;
          const gb = c.createLinearGradient(0, py, 0, py + ph); gb.addColorStop(0, '#f6d77a'); gb.addColorStop(0.5, '#d9a93a'); gb.addColorStop(1, '#b07d1e');
          rr(c, x - pw / 2, py, pw, ph, 10); c.fillStyle = gb; c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.stroke();
          for (const [sx, sy] of [[x - pw / 2 + 7, py + 7], [x + pw / 2 - 7, py + 7], [x - pw / 2 + 7, py + ph - 7], [x + pw / 2 - 7, py + ph - 7]]) { c.beginPath(); c.arc(sx, sy, 2.2, 0, TAU); c.fillStyle = '#8a5a14'; c.fill(); }
          txt(c, 'ABC'[i] + ':', x, py + 16, 17, '#5a3408', 'center', 700);
          txt(c, st.lev[i].join(' · '), x, py + 40, 20, '#3a2004', 'center', 700);
          txt(c, st.pulls[i] + '× gezogen', x, py + 60, 11, '#6a4410', 'center', 600);
        }
      }

      function drawButton() {
        const b = L.btn;
        rr(c, b.x, b.y, b.w, b.h, b.h / 2); c.fillStyle = st.busy ? 'rgba(255,111,156,.4)' : '#ff6f9c'; c.fill(); c.strokeStyle = '#7a3b57'; c.lineWidth = 3; c.stroke();
        txt(c, 'Neu mischen', b.x + b.w / 2, b.y + b.h / 2 + 1, 15, '#fff', 'center', 700);
      }

      /* ---------------- actions ---------------- */
      function pull(i, fast) {
        if (st.busy || st.done || st.won) return;
        if (st.coins <= 0) return;
        st.busy = true; st.coins--; st.pulls[i]++; st.total++;
        const now = performance.now() / 1000;
        st.leverAnim[i] = now; st.coinDrop.push({t0: now});
        sfx(api, 'coin'); try { G.audio.noise(0.25, {type: 'lowpass', freq: 600, freqTo: 200, gain: 0.25}); } catch (e) {}
        const dur = fast ? 0.35 : 1;
        for (let r = 0; r < 3; r++) {
          const a = st.lev[i][r], from = st.vis[r];
          const steps = a === 0 ? 0 : (fast ? a : a + N);
          st.spins[r] = {from, to: from + steps, t0: now + 0.12, t1: now + 0.12 + (steps ? dur + r * (fast ? 0.08 : 0.28) : 0), last: Math.floor(from)};
          st.pos[r] = mod(st.pos[r] + a, N);
        }
        anim();
      }
      function finishPull() {
        st.busy = false;
        for (let r = 0; r < 3; r++) st.vis[r] = st.pos[r];
        if (st.pos.every(p => p === 0)) return win();
        if (st.coins <= 0) {
          st.mood = 'laugh'; st.moodT = performance.now() / 1000;
          api.wrong('Keine Münzen mehr! Der Affe lacht.');
          try { G.audio.tone(520, 0.12, {type: 'square', gain: 0.08}); G.audio.tone(620, 0.12, {type: 'square', gain: 0.08, delay: 0.13}); G.audio.tone(520, 0.12, {type: 'square', gain: 0.08, delay: 0.26}); G.audio.tone(700, 0.2, {type: 'square', gain: 0.08, delay: 0.39}); } catch (e) {}
          later(() => { st.mood = 'idle'; newGame(true); api.msg('Neue Runde: 10 frische Münzen, neue Startbilder. Erst rechnen, dann ziehen!', 'info'); }, 1700);
        }
      }
      function win() {
        st.won = true; st.done = true; st.mood = 'happy'; st.flash = 1;
        sfx(api, 'combo');
        [0, 4, 7, 12].forEach((n, k) => tone(523 * Math.pow(2, n / 12), 0.25, {type: 'triangle', gain: 0.12, delay: k * 0.1}));
        const cx = L.cabX + L.cabW / 2, cy = L.reelY + L.reelH / 2;
        for (let k = 0; k < 40; k++) st.parts.push({kind: 'coin', x: cx + (rnd() - 0.5) * 60, y: cy + 60, vx: (rnd() - 0.5) * 9, vy: -6 - rnd() * 8, rot: rnd() * 6, vr: 0.2 + rnd() * 0.3, life: 2.2});
        for (let k = 0; k < 30; k++) st.parts.push({kind: 'star', x: cx + (rnd() - 0.5) * L.cabW, y: cy + (rnd() - 0.5) * 200, vx: 0, vy: -0.5, r: 12 + rnd() * 14, col: ['#ffd84a', '#fff', '#ff9eb0', '#9be7a5'][k % 4], life: 1 + rnd()});
        st.parts.push({kind: 'text', s: 'JACKPOT!', x: cx, y: cy - 10, vx: 0, vy: -0.6, r: 46, col: '#ffd84a', life: 2});
        anim();
        later(() => api.solved(), 1000);
      }

      /* ---------------- animation loop ---------------- */
      let raf = 0, last = 0;
      function step() {
        const now = performance.now() / 1000; const dt = clamp(now - (last || now), 0, 0.05); last = now;
        let spinning = false;
        for (let r = 0; r < 3; r++) {
          const sp = st.spins[r]; if (!sp) continue;
          if (now < sp.t1) {
            spinning = true;
            const k = clamp((now - sp.t0) / (sp.t1 - sp.t0), 0, 1), e = 1 - Math.pow(1 - k, 3);
            const v = sp.from + (sp.to - sp.from) * e; st.vis[r] = v;
            const f = Math.floor(v + 0.5); if (f !== sp.last) { sp.last = f; tone(900 + r * 120, 0.03, {type: 'square', gain: 0.03}); }
          } else if (!sp.doneAt) { sp.doneAt = now; st.vis[r] = sp.to; if (sp.to !== sp.from) { tone(220 + r * 40, 0.08, {type: 'triangle', gain: 0.12}); } }
          else st.vis[r] = sp.to;
        }
        if (st.busy && !spinning && st.spins.every(s => !s || s.doneAt)) { st.spins = []; finishPull(); }
        if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 2);
        for (const p of st.parts) { p.life -= dt; p.x += (p.vx || 0) * dt * 60; p.y += (p.vy || 0) * dt * 60; if (p.kind === 'coin') { p.vy += 0.35 * dt * 60; p.rot += p.vr * dt * 60; } }
        st.parts = st.parts.filter(p => p.life > 0 && p.y < LH + 40);
        st.coinDrop = st.coinDrop.filter(d => now - d.t0 < 0.4);
      }
      function frame() { raf = 0; step(); render(); if (alive) raf = requestAnimationFrame(frame); }
      function anim() { if (!raf && alive) raf = requestAnimationFrame(frame); }
      /* rAF may be throttled (headless); a slow timer keeps the logic alive */
      const tick = setInterval(() => { if (alive) { step(); render(); } }, 50);
      let alive = true;
      function draw() { step(); render(); }

      /* ---------------- input ---------------- */
      function pt(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc}; }
      function hitLever(p) {
        for (let i = 0; i < 3; i++) { const Lv = L.levers[i]; if (Math.abs(p.x - Lv.x) < Lv.w / 2 + 2 && p.y > Lv.y - 145 && p.y < Lv.y + 115) return i; }
        return -1;
      }
      function onDown(e) {
        e.preventDefault(); const p = pt(e);
        const b = L.btn; if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { if (!st.busy && !st.done) { sfx(api, 'select'); newGame(true); api.msg('Neu gemischt: 10 Münzen, neue Startbilder.', 'info'); draw(); } return; }
        const i = hitLever(p);
        if (i >= 0) {
          if (st.coins <= 0 || st.busy) { sfx(api, 'bump'); return; }
          pull(i);
        }
      }
      function onMove(e) { const i = hitLever(pt(e)); if (i !== st.hover) { st.hover = i; cv.style.cursor = i >= 0 ? 'pointer' : 'default'; draw(); } }
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
      const onKey = e => { const k = {KeyA: 0, KeyB: 1, KeyC: 2, Digit1: 0, Digit2: 1, Digit3: 2}[e.code]; if (k !== undefined && !e.repeat) { pull(k); } };
      window.addEventListener('keydown', onKey);
      const ro = new ResizeObserver(() => { layout(); render(); }); ro.observe(root);
      layout(); render(); anim();

      return {
        destroy() { alive = false; cancelAnimationFrame(raf); clearInterval(tick); timers.forEach(clearTimeout); ro.disconnect(); window.removeEventListener('keydown', onKey); cv.remove(); },
        autoSolve() {
          if (st.done) return;
          timers.forEach(clearTimeout); timers.length = 0;
          /* wait for a running spin, then play the shortest pull sequence from the current position (coins refilled) */
          const go = () => {
            if (st.busy) { later(go, 120); return; }
            st.mood = 'idle'; st.coins = COINS;
            let sol = minSolve(st.pos, st.lev, COINS);
            if (!sol) { st.pos = st.start.slice(); st.vis = st.pos.slice(); sol = minSolve(st.pos, st.lev, COINS); }
            api.msg('So geht es: ' + sol.cnt.map((n, i) => n + '× ' + 'ABC'[i]).join(', '), 'info');
            /* all pulls at once: one combined spin */
            const now = performance.now() / 1000;
            st.busy = true; st.coins -= sol.n; st.total += sol.n; sol.cnt.forEach((n, i) => { st.pulls[i] += n; if (n) st.leverAnim[i] = now + i * 0.12; });
            st.coinDrop.push({t0: now}); sfx(api, 'coin');
            for (let r = 0; r < 3; r++) {
              const from = st.vis[r], steps = mod(-st.pos[r], N) + N;
              st.spins[r] = {from, to: from + steps, t0: now + 0.1, t1: now + 0.8 + r * 0.15, last: Math.floor(from)};
              st.pos[r] = 0;
            }
            anim();
          };
          go();
        },
      };
    },
  });
})();

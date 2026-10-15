/* Pookiewookie puzzle: "Die Chili-Praline" (Schoko, slot 0).
   Chomp on a 5x5 chocolate bar against the Schoko-Maus. The bottom-left piece is a red-hot chili praline.
   A bite eats the tapped piece plus every piece above it and to its right. Whoever has to eat the chili loses.
   The player starts; the mouse plays perfectly (the game is solved by memoized search over staircase states). */
(function () {
  const G = window.PW = window.PW || {};
  const TAU = Math.PI * 2, NC = 5, NR = 5, OL = '#2a1508';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function txt(c, s, x, y, px, col, align, w, ol) {
    c.font = (w || 700) + ' ' + px + 'px "Fredoka", sans-serif'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (ol) { c.lineJoin = 'round'; c.lineWidth = px * 0.28; c.strokeStyle = ol; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function tone(f, d, o) { try { G.audio.tone(f, d, o); } catch (e) {} }
  function noise(d, o) { try { G.audio.noise(d, o); } catch (e) {} }

  /* ---------------- game theory: state = column heights (non-increasing) ---------------- */
  const memo = new Map();
  const key = h => h.join('');
  const onlyChili = h => h[0] === 1 && h.slice(1).every(v => v === 0);
  function bite(h, c, r) { return h.map((v, i) => (i >= c ? Math.min(v, r) : v)); }
  function moves(h) { const m = []; for (let c = 0; c < NC; c++) for (let r = 0; r < h[c]; r++) if (c || r) m.push([c, r]); return m; }
  function wins(h) {   /* true if the player to move can force a win (never having to eat the chili) */
    const k = key(h); if (memo.has(k)) return memo.get(k);
    let w = false; for (const [c, r] of moves(h)) if (!wins(bite(h, c, r))) { w = true; break; }
    memo.set(k, w); return w;
  }
  function eaten(h, c, r) { let n = 0; for (let i = c; i < NC; i++) n += Math.max(0, h[i] - r); return n; }
  function bestMove(h, rnd, quick) {
    const ms = moves(h); if (!ms.length) return null;
    const good = ms.filter(([c, r]) => !wins(bite(h, c, r)));
    if (good.length) return quick ? good.sort((a, b) => eaten(h, b[0], b[1]) - eaten(h, a[0], a[1]))[0] : good[Math.floor(rnd() * good.length)];
    /* losing: make it as hard as possible -> leave the position with the fewest winning replies, prefer small bites */
    let best = null, bs = 1e9;
    for (const [c, r] of ms) {
      const nh = bite(h, c, r), replies = moves(nh).filter(([c2, r2]) => !wins(bite(nh, c2, r2))).length;
      const score = quick ? -eaten(h, c, r) : replies * 100 + eaten(h, c, r) + rnd();
      if (score < bs) { bs = score; best = [c, r]; }
    }
    return best;
  }

  /* ---------------- drawings ---------------- */
  function drawMouse(c, x, y, s, mood, t, look) {
    c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OL; c.lineWidth = 2.2;
    const hop = mood === 'chomp' ? -Math.abs(Math.sin(t * 16)) * 6 : (mood === 'giggle' ? -Math.abs(Math.sin(t * 20)) * 3 : Math.sin(t * 2.4) * 1.2);
    c.translate(0, hop);
    const fur = mood === 'hot' ? '#e86a5a' : '#b8a8b0', furD = mood === 'hot' ? '#b03a2a' : '#8a7882';
    /* tail */
    c.beginPath(); c.moveTo(14, -6); c.bezierCurveTo(34, -2, 30, -26, 40, -30 + Math.sin(t * 3) * 3); c.lineWidth = 5; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = '#f2a0b0'; c.stroke(); c.strokeStyle = OL; c.lineWidth = 2.2;
    /* body */
    c.beginPath(); c.ellipse(0, -16, 16, 17, 0, 0, TAU); c.fillStyle = fur; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -13, 10, 11, 0, 0, TAU); c.fillStyle = '#efe4ea'; c.fill();
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 9, -1, 7, 3.6, 0, 0, TAU); c.fillStyle = '#f2a0b0'; c.fill(); c.stroke(); }
    /* paws */
    const pawY = mood === 'chomp' ? -30 : -18;
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 8, pawY, 4, 0, TAU); c.fillStyle = '#f2a0b0'; c.fill(); c.lineWidth = 1.6; c.stroke(); }
    c.lineWidth = 2.2;
    /* head */
    const hy = -40;
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 15, hy - 12, 11, 0, TAU); c.fillStyle = fur; c.fill(); c.stroke(); c.beginPath(); c.arc(d * 15, hy - 12, 6.5, 0, TAU); c.fillStyle = '#f7b8c6'; c.fill(); }
    c.beginPath(); c.ellipse(0, hy, 16, 14, 0, 0, TAU); c.fillStyle = fur; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(look * 3, hy + 6, 7, 5, 0, 0, TAU); c.fillStyle = '#efe4ea'; c.fill();
    c.beginPath(); c.arc(look * 3, hy + 3, 2.8, 0, TAU); c.fillStyle = '#ff6f9c'; c.fill(); c.lineWidth = 1.4; c.stroke();
    /* whiskers */
    c.strokeStyle = 'rgba(42,21,8,.6)'; c.lineWidth = 1;
    for (const d of [-1, 1]) for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(look * 3 + d * 6, hy + 5 + k * 2); c.lineTo(look * 3 + d * 17, hy + 2 + k * 5); c.stroke(); }
    c.strokeStyle = OL;
    /* eyes */
    if (mood === 'giggle' || mood === 'happy') { c.lineWidth = 2; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(look * 2 + d * 6 - 3, hy - 2); c.quadraticCurveTo(look * 2 + d * 6, hy - 6, look * 2 + d * 6 + 3, hy - 2); c.stroke(); } }
    else if (mood === 'hot') { c.lineWidth = 2; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 6 - 3, hy - 5); c.lineTo(d * 6 + 3, hy - 1); c.moveTo(d * 6 + 3, hy - 5); c.lineTo(d * 6 - 3, hy - 1); c.stroke(); } }
    else { for (const d of [-1, 1]) { c.beginPath(); c.arc(look * 2 + d * 6, hy - 3, 3, 0, TAU); c.fillStyle = OL; c.fill(); c.beginPath(); c.arc(look * 2 + d * 6 - 1, hy - 4.2, 1, 0, TAU); c.fillStyle = '#fff'; c.fill(); } }
    /* mouth */
    c.lineWidth = 1.6;
    if (mood === 'chomp') { const o = 2 + Math.abs(Math.sin(t * 16)) * 3; c.beginPath(); c.ellipse(look * 3, hy + 10, 3.5, o, 0, 0, TAU); c.fillStyle = '#5a1a2a'; c.fill(); c.stroke(); }
    else if (mood === 'giggle') { c.beginPath(); c.moveTo(look * 3 - 4, hy + 8); c.quadraticCurveTo(look * 3, hy + 14, look * 3 + 4, hy + 8); c.closePath(); c.fillStyle = '#5a1a2a'; c.fill(); c.stroke(); }
    else if (mood === 'hot') { c.beginPath(); c.ellipse(0, hy + 10, 4.5, 4, 0, 0, TAU); c.fillStyle = '#5a1a2a'; c.fill(); c.stroke(); c.beginPath(); c.ellipse(0, hy + 13, 2.5, 3.5, 0, 0, TAU); c.fillStyle = '#ff6f9c'; c.fill(); }
    else { c.beginPath(); c.moveTo(look * 3 - 3, hy + 9); c.quadraticCurveTo(look * 3 - 1.5, hy + 11, look * 3, hy + 9); c.quadraticCurveTo(look * 3 + 1.5, hy + 11, look * 3 + 3, hy + 9); c.stroke(); c.fillStyle = '#fff'; c.fillRect(look * 3 - 1.6, hy + 9, 3.2, 2.6); }
    /* chocolate smear */
    c.fillStyle = '#6b3a1e'; c.beginPath(); c.ellipse(look * 3 + 10, hy + 9, 3, 2, 0.4, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,120,150,.45)'; c.beginPath(); c.arc(-10, hy + 5, 3, 0, TAU); c.arc(10, hy + 5, 3, 0, TAU); c.fill();
    if (mood === 'hot') { /* steam */
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5;
      for (const d of [-1, 1]) { const p = (t * 2) % 1; c.globalAlpha = 1 - p; c.beginPath(); c.moveTo(d * 15, hy - 24 - p * 16); c.quadraticCurveTo(d * 15 + 5, hy - 30 - p * 16, d * 15, hy - 36 - p * 16); c.stroke(); }
      c.globalAlpha = 1;
    }
    c.restore();
  }
  function drawChili(c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s / 40, s / 40); c.rotate(-0.5 + Math.sin(t * 3) * 0.05); c.lineJoin = 'round'; c.strokeStyle = OL; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-12, -6); c.bezierCurveTo(-6, -12, 10, -8, 16, 8); c.bezierCurveTo(8, 2, -4, 4, -12, 2); c.closePath();
    c.fillStyle = '#ff2a2a'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-6, -6); c.quadraticCurveTo(4, -8, 10, 0); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.moveTo(-12, -2); c.quadraticCurveTo(-18, -6, -16, -12); c.strokeStyle = '#3fb86a'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.ellipse(-12, -2, 3.5, 4.5, 0, 0, TAU); c.fillStyle = '#3fb86a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.4; c.stroke();
    c.restore();
  }
  function fallbackBear(c, x, y, s, white) {
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = OL; c.lineWidth = 1;
    const fur = white ? '#fffaf4' : '#9a6234';
    c.beginPath(); c.ellipse(0, -7, 7, 7.5, 0, 0, TAU); c.fillStyle = fur; c.fill(); c.stroke();
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 5, -21, 2.6, 0, TAU); c.fillStyle = fur; c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, -16, 6.5, 0, TAU); c.fillStyle = fur; c.fill(); c.stroke();
    c.fillStyle = OL; c.beginPath(); c.arc(-2.4, -17, 1.1, 0, TAU); c.arc(2.4, -17, 1.1, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, -14, 1.4, 1, 0, 0, TAU); c.fill();
    c.restore();
  }

  G.PZ = G.PZ || {register() {}};
  G.PZ.register({
    id: 'schoko-chomp', world: 'schoko', slot: 0,
    title: 'Die Chili-Praline',
    intro: 'Ihr beißt abwechselnd ab: Ein Stück verschwindet mit allen Stücken darüber und rechts davon. Wer zum Schluss die Chili-Praline essen muss, verliert. Du fängst an!',
    letter: 'Auf einer quadratischen Tafel beiß zuerst schräg neben die Chili – und danach sei ein Spiegel.',
    hint: 'Beiß als Erstes das Stück schräg rechts über der Chili ab. Dann bleibt ein L übrig: ein Arm nach oben, einer nach rechts, beide gleich lang. Was die Maus von einem Arm abbeißt, beißt du danach vom anderen Arm genauso viel ab. So sind beide Arme immer gleich lang – und am Ende bleibt der Maus nur die Chili.',
    station(c, x, y, t, solved) {
      c.save(); c.translate(x, y); c.lineJoin = 'round';
      c.beginPath(); c.ellipse(0, -2, 17, 4.5, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#b8a8c0'; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.ellipse(0, -2.5, 12, 2.6, 0, 0, TAU); c.strokeStyle = 'rgba(180,170,200,.6)'; c.stroke();
      /* bar standing on the plate, slightly tilted */
      c.save(); c.translate(-2, -4); c.rotate(-0.08);
      rr(c, -12, -30, 22, 27, 2.5); c.fillStyle = '#5a2e14'; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.2; c.stroke();
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        if (solved) { if (i === 1 && j === 2) { c.fillStyle = '#8a5030'; for (const [cx2, cy2] of [[-8, -6], [-3, -9], [2, -5], [-6, -12]]) c.fillRect(cx2, cy2, 1.6, 1.6); } continue; }
        const px = -11 + i * 7, py = -29 + j * 8.6;
        if (i === 0 && j === 2) { rr(c, px + 0.6, py + 0.6, 5.8, 7.4, 1.5); c.fillStyle = '#e8303a'; c.fill(); continue; }
        rr(c, px + 0.6, py + 0.6, 5.8, 7.4, 1.5); c.fillStyle = '#8a5030'; c.fill(); c.fillStyle = 'rgba(255,220,180,.3)'; c.fillRect(px + 1.2, py + 1.2, 4.6, 1.2);
      }
      c.restore();
      drawMouse(c, 15, -3, 0.28, solved ? 'hot' : 'idle', t, -1);
      c.restore();
    },
    mount(root, api) {
      const rnd = api.rng || Math.random;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
      root.appendChild(cv);
      const c = cv.getContext('2d');
      const DH = 300, DW = 720;
      let W = 0, H = 0, sc = 1, LW = 0, LH = 0, dpr = 1, L = {};
      const st = {h: [5, 5, 5, 5, 5], turn: 'player', gone: [], parts: [], preview: null, armed: null, mouseHL: null, mood: 'idle', wook: 'idle',
        done: false, bites: 0, flash: 0, chiliGlow: 0, quick: false, moodT: 0, msgT: 0};
      const timers = []; const later = (fn, ms) => { const id = setTimeout(() => { fn(); draw(); }, ms); timers.push(id); return id; };
      const now = () => performance.now() / 1000;

      function reset() {
        timers.forEach(clearTimeout); timers.length = 0;
        st.h = [5, 5, 5, 5, 5]; st.turn = 'player'; st.gone = []; st.preview = null; st.armed = null; st.mouseHL = null; st.mood = 'idle'; st.wook = 'idle'; st.bites = 0;
        for (let i = 0; i < NC; i++) for (let j = 0; j < NR; j++) st.parts.push({kind: 'spark', x: L.bx + (i + 0.5) * L.cs, y: cellY(j) + L.cs / 2, vx: (rnd() - 0.5) * 2, vy: -1 - rnd(), life: 0.5 + rnd() * 0.4, col: '#ffe9a8'});
      }

      function layout() {
        W = root.clientWidth || 880; H = root.clientHeight || 400; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        sc = Math.min(H / DH, W / DW); LW = W / sc; LH = H / sc;
        const top = (LH - DH) / 2, cs = 48, bw = cs * NC, bh = cs * NR, cx = LW / 2;
        L = {top, cs, bw, bh, bx: cx - bw / 2, by: top + 18, cx, wx: cx - bw / 2 - 130, mx: cx + bw / 2 + 125, floorY: top + 228};
        L.btn = {x: L.wx - 62, y: top + DH - 40, w: 124, h: 36};
      }
      const cellY = r => L.by + (NR - 1 - r) * L.cs;
      function cellAt(p) {
        const ci = Math.floor((p.x - L.bx) / L.cs), ri = NR - 1 - Math.floor((p.y - L.by) / L.cs);
        if (ci < 0 || ci >= NC || ri < 0 || ri >= NR) return null;
        if (ri >= st.h[ci]) return null;
        return [ci, ri];
      }
      const inRegion = (reg, i, j) => reg && i >= reg[0] && j >= reg[1];

      function drawPiece(i, j, t, scale, tint) {
        const cs = L.cs, x = L.bx + i * cs, y = cellY(j);
        c.save(); c.translate(x + cs / 2, y + cs / 2); c.scale(scale, scale); c.translate(-cs / 2, -cs / 2);
        if (i === 0 && j === 0) {
          /* chili praline */
          const glow = 0.5 + 0.5 * Math.sin(t * 4);
          c.shadowColor = 'rgba(255,60,40,' + (0.4 + glow * 0.4) + ')'; c.shadowBlur = 12 + glow * 8;
          rr(c, 3, 3, cs - 6, cs - 6, 10); c.fillStyle = '#7a1a14'; c.fill(); c.shadowBlur = 0;
          const g = c.createRadialGradient(cs * 0.4, cs * 0.35, 2, cs / 2, cs / 2, cs * 0.55); g.addColorStop(0, '#ff8a6a'); g.addColorStop(0.5, '#e02a2a'); g.addColorStop(1, '#8a1010');
          c.beginPath(); c.arc(cs / 2, cs / 2 + 1, cs * 0.36, 0, TAU); c.fillStyle = g; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke();
          drawChili(c, cs / 2, cs / 2, cs * 0.62, t);
          c.strokeStyle = 'rgba(255,200,120,' + (0.3 + glow * 0.5) + ')'; c.lineWidth = 1.6;
          for (let k = 0; k < 3; k++) { const ph = (t * 1.2 + k / 3) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.moveTo(10 + k * 12, 6 - ph * 8); c.quadraticCurveTo(14 + k * 12, 2 - ph * 8, 10 + k * 12, -2 - ph * 8); c.stroke(); }
          c.globalAlpha = 1;
        } else {
          rr(c, 2, 2, cs - 4, cs - 4, 6); c.fillStyle = '#4a240e'; c.fill();
          const g = c.createLinearGradient(0, 0, cs, cs); g.addColorStop(0, '#a5653a'); g.addColorStop(1, '#6b3a1e');
          rr(c, 6, 6, cs - 12, cs - 12, 5); c.fillStyle = g; c.fill();
          c.fillStyle = 'rgba(255,225,190,.35)'; rr(c, 9, 8, cs - 20, 4, 2); c.fill();
          c.fillStyle = 'rgba(40,15,5,.35)'; rr(c, 9, cs - 12, cs - 18, 3, 1.5); c.fill();
          /* tiny embossed heart */
          c.fillStyle = 'rgba(60,25,8,.35)'; c.beginPath(); const hx = cs / 2, hy = cs / 2 + 1; c.moveTo(hx, hy + 5); c.bezierCurveTo(hx - 8, hy - 1, hx - 4, hy - 7, hx, hy - 3); c.bezierCurveTo(hx + 4, hy - 7, hx + 8, hy - 1, hx, hy + 5); c.fill();
        }
        if (tint) { rr(c, 2, 2, cs - 4, cs - 4, 6); c.fillStyle = tint; c.fill(); }
        c.restore();
      }

      function render() {
        const t = now();
        c.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0); c.clearRect(0, 0, LW, LH);
        /* chocolate-world backdrop: caramel gradient, dripping chocolate top, cocoa dots */
        let g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#f7d9b0'); g.addColorStop(1, '#e8b88a'); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
        c.fillStyle = 'rgba(160,90,50,.12)';
        for (let i = 0; i < 40; i++) { c.beginPath(); c.arc((i * 137) % LW, (i * 71) % LH, 4 + (i % 4) * 3, 0, TAU); c.fill(); }
        c.fillStyle = '#5a2e14'; c.beginPath(); c.moveTo(0, 0); c.lineTo(LW, 0);
        for (let x = LW; x >= 0; x -= 36) { const d = 10 + 10 * Math.abs(Math.sin(x * 0.07)) + 3 * Math.sin(t * 1.5 + x); c.lineTo(x, d); c.quadraticCurveTo(x - 9, d + 10, x - 18, d * 0.6); }
        c.closePath(); c.fill();
        /* table */
        c.fillStyle = '#c98a5a'; c.fillRect(0, L.floorY + 20, LW, LH); c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(0, L.floorY + 20, LW, 4);

        /* plate */
        const pcx = L.cx, pcy = L.by + L.bh + 14;
        c.beginPath(); c.ellipse(pcx, pcy + 6, L.bw * 0.78, 22, 0, 0, TAU); c.fillStyle = 'rgba(80,40,20,.25)'; c.fill();
        c.beginPath(); c.ellipse(pcx, pcy, L.bw * 0.78, 20, 0, 0, TAU); c.fillStyle = '#fffaf4'; c.fill(); c.strokeStyle = '#b8a8c0'; c.lineWidth = 2; c.stroke();
        c.beginPath(); c.ellipse(pcx, pcy - 1, L.bw * 0.62, 13, 0, 0, TAU); c.strokeStyle = 'rgba(255,158,176,.6)'; c.stroke();
        /* bar backing (wrapper foil) */
        c.fillStyle = 'rgba(42,21,8,.25)'; rr(c, L.bx - 6, L.by - 2, L.bw + 16, L.bh + 14, 12); c.fill();
        const fg = c.createLinearGradient(L.bx, 0, L.bx + L.bw, 0); fg.addColorStop(0, '#e8e8f0'); fg.addColorStop(0.5, '#ffffff'); fg.addColorStop(1, '#c8c8d8');
        rr(c, L.bx - 8, L.by - 8, L.bw + 16, L.bh + 16, 12); c.fillStyle = fg; c.fill(); c.strokeStyle = '#8a8aa0'; c.lineWidth = 2; c.stroke();
        /* pieces */
        for (let i = 0; i < NC; i++) for (let j = 0; j < NR; j++) {
          if (j < st.h[i]) {
            let tint = null, sc2 = 1;
            if (i === 0 && j === 0 && st.chiliWarn && t - st.chiliWarn < 0.5) { sc2 = 1 + 0.12 * Math.sin((t - st.chiliWarn) * 40) * (1 - (t - st.chiliWarn) * 2); }
            else if (st.mouseHL && inRegion(st.mouseHL, i, j)) { tint = 'rgba(184,168,176,' + (0.35 + 0.25 * Math.sin(t * 20)) + ')'; sc2 = 0.96; }
            else if (st.turn === 'player') {
              const reg = st.armed || st.preview;
              if (reg && inRegion(reg, i, j)) { const chili = reg[0] === 0 && reg[1] === 0; tint = chili ? 'rgba(255,40,40,.45)' : 'rgba(255,111,156,' + (st.armed ? 0.45 + 0.15 * Math.sin(t * 12) : 0.35) + ')'; sc2 = st.armed ? 0.94 + 0.03 * Math.sin(t * 12) : 0.97; }
            }
            drawPiece(i, j, t, sc2, tint);
          } else {
            const gd = st.gone.find(q => q.i === i && q.j === j);
            if (gd && t < gd.t0 + 0.35) { const k = clamp((t - gd.t0) / 0.35, 0, 1); if (t >= gd.t0) { c.globalAlpha = 1 - k; drawPiece(i, j, t, 1 - k * 0.7); c.globalAlpha = 1; } else drawPiece(i, j, t, 1); }
          }
        }
        /* armed hint */
        if (st.armed && st.turn === 'player') {
          const ax = clamp(L.bx + (st.armed[0] + 0.5) * L.cs, L.bx + 64, L.bx + L.bw - 64), ay = cellY(st.armed[1]) + L.cs / 2, up = st.armed[1] < NR - 1;
          const ly = ay + (up ? -0.8 : 0.8) * L.cs; rr(c, ax - 66, ly - 14, 132, 28, 14); c.fillStyle = '#fff4e0'; c.fill(); c.strokeStyle = '#7a3b57'; c.lineWidth = 2.5; c.stroke(); txt(c, 'Nochmal tippen!', ax, ly + 1, 15, '#7a3b57', 'center', 700);
        }
        /* empty foil after the last bite: crumbs and the result */
        if (st.h.every(v => v === 0) && st.gone.every(q => t > q.t0 + 0.35)) {
          c.fillStyle = 'rgba(107,58,30,.55)';
          for (let k = 0; k < 26; k++) { const x = L.bx + 14 + ((k * 97) % (L.bw - 28)), y = L.by + 14 + ((k * 61) % (L.bh - 28)); c.save(); c.translate(x, y); c.rotate(k); c.fillRect(-2 - (k % 3), -2, 4 + (k % 3) * 2, 4); c.restore(); }
          const bob = Math.sin(t * 4) * 3;
          if (st.done) { txt(c, 'Gewonnen!', L.cx, L.by + L.bh / 2 - 18 + bob, 40, '#ffd84a', 'center', 700, OL); txt(c, 'Die Maus hat die Chili!', L.cx, L.by + L.bh / 2 + 22, 17, '#7a3b57', 'center', 700); }
          else { txt(c, 'Autsch, scharf!', L.cx, L.by + L.bh / 2 - 18 + bob, 34, '#ff4a3a', 'center', 700, OL); txt(c, 'Gleich gibt es eine neue Tafel …', L.cx, L.by + L.bh / 2 + 22, 16, '#7a3b57', 'center', 700); }
        }

        /* Wookie */
        const wx = L.wx, wy = L.floorY;
        if (st.turn === 'player' && !st.done) { c.beginPath(); c.ellipse(wx, wy + 2, 46, 11, 0, 0, TAU); c.fillStyle = 'rgba(255,216,74,' + (0.45 + 0.25 * Math.sin(t * 5)) + ')'; c.fill(); }
        c.beginPath(); c.ellipse(wx, wy + 2, 30, 7, 0, 0, TAU); c.fillStyle = 'rgba(60,30,10,.25)'; c.fill();
        const wpose = st.wook === 'win' ? 'victory' : (st.wook === 'hot' ? 'sad' : 'idle');
        if (G.draw && G.draw.drawBearAt) { try { G.draw.drawBearAt(c, wx, wy, {scale: 3.4, facing: 1, frame: t * 8, t, pose: wpose, mood: st.wook === 'hot' ? 'sad' : 'happy', outfit: 'schoko'}); } catch (e) { fallbackBear(c, wx, wy, 3.4, false); } }
        else fallbackBear(c, wx, wy, 3.4, false);
        if (st.wook === 'hot') { c.fillStyle = 'rgba(255,40,40,.35)'; c.beginPath(); c.arc(wx + 3, wy - 50, 26, 0, TAU); c.fill(); for (const d of [-1, 1]) { const p = (t * 2) % 1; c.globalAlpha = 1 - p; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(wx + d * 20, wy - 76 - p * 18); c.quadraticCurveTo(wx + d * 26, wy - 84 - p * 18, wx + d * 20, wy - 92 - p * 18); c.stroke(); c.globalAlpha = 1; } }
        txt(c, 'Du', wx, wy + 24, 17, '#7a3b57', 'center', 700);
        /* Mouse */
        const mx = L.mx, my = L.floorY;
        if (st.turn === 'mouse' && !st.done) { c.beginPath(); c.ellipse(mx, my + 2, 46, 11, 0, 0, TAU); c.fillStyle = 'rgba(255,216,74,' + (0.45 + 0.25 * Math.sin(t * 5)) + ')'; c.fill(); }
        c.beginPath(); c.ellipse(mx, my + 2, 30, 7, 0, 0, TAU); c.fillStyle = 'rgba(60,30,10,.25)'; c.fill();
        drawMouse(c, mx, my, 1.55, st.mood, t, -1);
        txt(c, 'Schoko-Maus', mx, my + 24, 17, '#7a3b57', 'center', 700);
        /* turn bubble */
        const bubble = st.done ? null : (st.turn === 'player' ? ['Du bist dran!', wx, wy - 118] : (st.turn === 'mouse' ? ['Hmm … ich überlege …', mx, my - 122] : null));
        if (bubble) {
          c.font = '700 15px "Fredoka", sans-serif'; const bw = c.measureText(bubble[0]).width + 24, bx = clamp(bubble[1] - bw / 2, 4, LW - bw - 4), by = bubble[2];
          rr(c, bx, by - 16, bw, 32, 16); c.fillStyle = '#fff4e0'; c.fill(); c.strokeStyle = '#7a3b57'; c.lineWidth = 2.5; c.stroke();
          c.beginPath(); c.moveTo(bubble[1] - 7, by + 15); c.lineTo(bubble[1], by + 26); c.lineTo(bubble[1] + 7, by + 15); c.fillStyle = '#fff4e0'; c.fill();
          txt(c, bubble[0], bx + bw / 2, by + 1, 15, '#7a3b57', 'center', 700);
        }
        /* reset button */
        const b = L.btn; rr(c, b.x, b.y, b.w, b.h, b.h / 2); c.fillStyle = '#ff6f9c'; c.fill(); c.strokeStyle = '#7a3b57'; c.lineWidth = 3; c.stroke();
        txt(c, 'Neue Tafel', b.x + b.w / 2, b.y + b.h / 2 + 1, 15, '#fff', 'center', 700);
        /* particles */
        for (const p of st.parts) {
          c.globalAlpha = clamp(p.life * 2, 0, 1);
          if (p.kind === 'crumb') { c.fillStyle = p.col; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); c.restore(); }
          else if (p.kind === 'spark') txt(c, '✦', p.x, p.y, 14, p.col);
          else if (p.kind === 'text') txt(c, p.s, p.x, p.y, p.r, p.col, 'center', 700, OL);
          c.globalAlpha = 1;
        }
        if (st.flash > 0) { c.fillStyle = 'rgba(255,90,60,' + st.flash * 0.35 + ')'; c.fillRect(0, 0, LW, LH); }
      }

      /* ---------------- game flow ---------------- */
      function applyBite(c0, r0, who) {
        const t = now();
        for (let i = c0; i < NC; i++) for (let j = r0; j < st.h[i]; j++) {
          const d = ((i - c0) + (j - r0)) * 0.04;
          st.gone = st.gone.filter(q => !(q.i === i && q.j === j)); st.gone.push({i, j, t0: t + d});
          const x = L.bx + (i + 0.5) * L.cs, y = cellY(j) + L.cs / 2;
          for (let k = 0; k < 4; k++) st.parts.push({kind: 'crumb', x: x + (rnd() - 0.5) * 30, y: y + (rnd() - 0.5) * 30, vx: (rnd() - 0.5) * 3, vy: -1 - rnd() * 3, rot: rnd() * 3, vr: (rnd() - 0.5) * 0.4, r: 1.5 + rnd() * 2.5, life: 0.8 + rnd() * 0.5, col: ['#6b3a1e', '#a5653a', '#4a240e'][k % 3], delay: d});
        }
        st.h = bite(st.h, c0, r0); st.bites++;
        noise(0.12, {type: 'bandpass', freq: 1800, q: 1.2, gain: 0.35}); noise(0.1, {type: 'bandpass', freq: 900, q: 1, gain: 0.3, delay: 0.09});
        tone(who === 'mouse' ? 880 : 520, 0.06, {type: 'triangle', gain: 0.08, delay: 0.05});
        st.parts.push({kind: 'text', s: who === 'mouse' ? 'knusper!' : 'mampf!', x: L.bx + (c0 + 0.5) * L.cs, y: cellY(r0) + 4, vx: 0, vy: -0.8, r: 18, col: who === 'mouse' ? '#e6dce4' : '#ffd84a', life: 0.9});
      }
      function playerBite(i, j) {
        if (st.turn !== 'player' || st.done) return;
        st.preview = null; st.armed = null;
        if (i === 0 && j === 0) {
          if (!onlyChili(st.h)) {   /* never eat the chili by accident while other pieces are left */
            tone(200, 0.12, {type: 'triangle', gain: 0.08}); st.chiliWarn = now();
            api.msg('Finger weg! Die Chili isst nur, wer muss.', 'bad'); return;
          }
          eatChili('player'); return;
        }
        applyBite(i, j, 'player'); st.wook = 'idle';
        if (onlyChili(st.h)) { st.turn = 'mouse'; later(() => eatChili('mouse'), st.quick ? 300 : 900); return; }
        st.turn = 'mouse'; st.mood = 'idle';
        later(mouseThink, st.quick ? 250 : 700);
      }
      function mouseThink() {
        if (st.done) return;
        const m = bestMove(st.h, rnd, st.quick); if (!m) return;
        st.mouseHL = m; st.mood = 'chomp';
        later(() => {
          st.mouseHL = null; applyBite(m[0], m[1], 'mouse');
          later(() => { if (st.mood === 'chomp') st.mood = 'idle'; }, 400);
          if (onlyChili(st.h)) { st.turn = 'wait'; api.msg('Oh oh … nur noch die Chili ist übrig!', 'bad'); later(() => eatChili('player'), 900); return; }
          st.turn = 'player';
        }, st.quick ? 250 : 650);
      }
      function eatChili(who) {
        st.turn = 'over'; st.preview = null; st.armed = null;
        const t = now(); for (let i = 0; i < NC; i++) for (let j = 0; j < st.h[i]; j++) { st.gone = st.gone.filter(q => !(q.i === i && q.j === j)); st.gone.push({i, j, t0: t + (i + j) * 0.04}); } st.h = [0, 0, 0, 0, 0];
        st.flash = 1; noise(0.5, {type: 'lowpass', freq: 3000, freqTo: 300, gain: 0.3});
        const x = L.bx + L.cs / 2, y = cellY(0) + L.cs / 2;
        for (let k = 0; k < 24; k++) st.parts.push({kind: 'crumb', x, y, vx: (rnd() - 0.5) * 7, vy: -2 - rnd() * 5, rot: rnd() * 3, vr: 0.3, r: 2 + rnd() * 3, life: 1 + rnd() * 0.6, col: ['#ff2a2a', '#ff8a3a', '#ffd84a'][k % 3]});
        st.parts.push({kind: 'text', s: 'SCHARF!', x: who === 'mouse' ? L.mx : L.wx, y: L.floorY - 135, vx: 0, vy: -0.5, r: 30, col: '#ff4a3a', life: 1.6});
        if (who === 'mouse') {
          st.mood = 'hot'; st.wook = 'win'; st.done = true;
          tone(1200, 0.4, {type: 'sawtooth', gain: 0.06, slide: 300}); tone(523, 0.2, {type: 'triangle', gain: 0.12, delay: 0.4}); tone(659, 0.2, {type: 'triangle', gain: 0.12, delay: 0.52}); tone(784, 0.35, {type: 'triangle', gain: 0.12, delay: 0.64});
          for (let k = 0; k < 30; k++) st.parts.push({kind: 'spark', x: L.cx + (rnd() - 0.5) * LW * 0.8, y: L.top + rnd() * 240, vx: 0, vy: -0.6, life: 0.8 + rnd() * 0.8, col: ['#ffd84a', '#ff9eb0', '#9be7a5', '#fff'][k % 4]});
          api.msg('Die Maus muss die Chili essen – SCHARF!', 'good');
          later(() => api.solved(), 1200);
        } else {
          st.wook = 'hot'; st.mood = 'giggle';
          api.wrong('Die Maus kichert … nochmal!');
          later(() => { reset(); api.msg('Neue Tafel – du fängst wieder an.', 'info'); }, 1800);
        }
      }

      /* ---------------- loop ---------------- */
      let raf = 0, last = 0, alive = true;
      function step() {
        const t = now(), dt = clamp(t - (last || t), 0, 0.05); last = t;
        for (const p of st.parts) {
          if (p.delay > 0) { p.delay -= dt; continue; }
          p.life -= dt; p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
          if (p.kind === 'crumb') { p.vy += 0.3 * dt * 60; p.rot += p.vr; }
        }
        st.parts = st.parts.filter(p => p.life > 0);
        if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 1.5);
      }
      function frame() { raf = 0; if (!alive) return; step(); render(); raf = requestAnimationFrame(frame); }
      const tick = setInterval(() => { if (alive) { step(); render(); } }, 50);
      function draw() { if (!alive) return; step(); render(); }

      /* ---------------- input ---------------- */
      function pt(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc}; }
      function onDown(e) {
        e.preventDefault(); const p = pt(e);
        const b = L.btn; if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { if (!st.done && st.turn !== 'over' && st.turn !== 'wait') { try { api.sfx('select'); } catch (er) {} reset(); api.msg('Neue Tafel – du fängst an.', 'info'); draw(); } return; }
        const cell = cellAt(p);
        if (!cell || st.turn !== 'player' || st.done) { st.armed = null; draw(); return; }
        if (e.pointerType === 'mouse') { playerBite(cell[0], cell[1]); draw(); return; }
        /* touch / pen: first tap previews, second tap on the same piece bites */
        if ((st.armed && st.armed[0] === cell[0] && st.armed[1] === cell[1]) || (cell[0] === 0 && cell[1] === 0)) playerBite(cell[0], cell[1]);
        else { st.armed = cell; tone(660, 0.05, {type: 'sine', gain: 0.06}); }
        draw();
      }
      function onMove(e) {
        if (e.pointerType !== 'mouse') return;
        const cell = cellAt(pt(e));
        const same = (cell && st.preview && cell[0] === st.preview[0] && cell[1] === st.preview[1]) || (!cell && !st.preview);
        if (!same) { st.preview = cell; cv.style.cursor = cell ? 'pointer' : 'default'; draw(); }
      }
      function onLeave() { st.preview = null; draw(); }
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerleave', onLeave);
      const ro = new ResizeObserver(() => { layout(); render(); }); ro.observe(root);
      layout(); render(); raf = requestAnimationFrame(frame);

      return {
        destroy() { alive = false; cancelAnimationFrame(raf); clearInterval(tick); timers.forEach(clearTimeout); ro.disconnect(); cv.remove(); },
        autoSolve() {
          if (st.done) return;
          st.quick = true;
          const play = () => {
            if (st.done) return;
            if (st.turn !== 'player') { later(play, 120); return; }
            if (!wins(st.h)) { reset(); }
            const m = bestMove(st.h, rnd, true);
            if (!m) return;
            api.msg(st.bites === 0 ? 'Erst schräg neben die Chili beißen …' : '… dann spiegeln!', 'info');
            playerBite(m[0], m[1]);
            later(play, 200);
          };
          timers.forEach(clearTimeout); timers.length = 0;
          if (st.turn === 'over' || st.turn === 'wait') { reset(); }
          if (st.turn === 'mouse') { st.turn = 'player'; st.mouseHL = null; st.mood = 'idle'; }
          play();
        },
      };
    },
  });
})();

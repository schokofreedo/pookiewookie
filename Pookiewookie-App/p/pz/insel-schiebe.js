/* Pookiewookie puzzle: "Das Ebbe-Schiebebild" (Insel, slot 1).
   A 4x4 sliding-tile puzzle. The picture (island sunset, palm, boat, Pookie on the beach) is painted procedurally into an offscreen
   canvas and cut into 15 tiles plus a gap at the bottom right. It is scrambled by 60-80 random legal moves from the solved state
   (never undoing the previous move), so it is always solvable. */
(function () {
  const G = window.PW = window.PW || {};
  const TAU = Math.PI * 2, N = 4, EMPTY = N * N - 1, OL = '#2a1508';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function txt(c, s, x, y, px, col, align, w, ol) {
    c.font = (w || 700) + ' ' + px + 'px "Fredoka", sans-serif'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (ol) { c.lineJoin = 'round'; c.lineWidth = px * 0.28; c.strokeStyle = ol; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function tone(f, d, o) { try { G.audio.tone(f, d, o); } catch (e) {} }
  function noise(d, o) { try { G.audio.noise(d, o); } catch (e) {} }

  function fallbackPookie(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = OL; c.lineWidth = 1; c.lineJoin = 'round';
    c.beginPath(); c.ellipse(0, -6, 7, 7, 0, 0, TAU); c.fillStyle = '#fffaf4'; c.fill(); c.stroke();
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 5, -20.5, 2.6, 0, TAU); c.fillStyle = '#fffaf4'; c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, -15, 6.5, 0, TAU); c.fillStyle = '#fffaf4'; c.fill(); c.stroke();
    c.fillStyle = OL; c.beginPath(); c.arc(-2.4, -16, 1.1, 0, TAU); c.arc(2.4, -16, 1.1, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -13.2, 1.3, 0.9, 0, 0, TAU); c.fill();
    c.fillStyle = '#ff6f9c'; c.beginPath(); c.moveTo(3.5, -21); c.lineTo(8, -24); c.lineTo(8, -18); c.closePath(); c.moveTo(3.5, -21); c.lineTo(-1, -24); c.lineTo(-1, -18); c.closePath(); c.fill();
    c.restore();
  }

  /* the picture, drawn into a 400x400 coordinate system */
  function paintPicture(c, t) {
    /* sky */
    let g = c.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, '#6a5ac8'); g.addColorStop(0.35, '#ff8fb0'); g.addColorStop(0.75, '#ffb07a'); g.addColorStop(1, '#ffe08a');
    c.fillStyle = g; c.fillRect(0, 0, 400, 222);
    /* stars in the purple top */
    c.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, r] of [[30, 20, 2], [90, 46, 1.5], [150, 14, 2.2], [262, 30, 1.6], [330, 12, 2], [375, 52, 1.4], [205, 50, 1.2]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    /* sun setting on the horizon */
    const sg = c.createRadialGradient(150, 205, 10, 150, 205, 120); sg.addColorStop(0, 'rgba(255,240,170,.9)'); sg.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = sg; c.fillRect(0, 60, 400, 170);
    c.save(); c.beginPath(); c.rect(0, 0, 400, 214); c.clip();
    c.beginPath(); c.arc(150, 214, 62, 0, TAU); const sun = c.createLinearGradient(0, 150, 0, 214); sun.addColorStop(0, '#fff3a0'); sun.addColorStop(1, '#ff8a4a'); c.fillStyle = sun; c.fill();
    c.fillStyle = '#ffb07a'; for (let i = 0; i < 4; i++) c.fillRect(80, 178 + i * 9, 140, 2 + i * 1.2);
    c.restore();
    /* rainbow */
    c.save(); c.globalAlpha = 0.5; c.lineWidth = 9;
    ['#ff6a6a', '#ffb04a', '#ffe94a', '#6ad08a', '#5aa8ff', '#9a7aff'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(230, 250, 190 - i * 9, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); });
    c.restore();
    /* clouds */
    const cloud = (x, y, s, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, 14 * s, 0, TAU); c.arc(x + 16 * s, y - 8 * s, 18 * s, 0, TAU); c.arc(x + 36 * s, y, 14 * s, 0, TAU); c.rect(x, y - 2 * s, 36 * s, 16 * s); c.fill(); };
    cloud(28, 92, 1.1, 'rgba(255,214,230,.95)'); cloud(250, 70, 1.4, 'rgba(255,200,220,.95)'); cloud(320, 138, 0.8, 'rgba(255,226,236,.9)');
    /* gulls */
    c.strokeStyle = '#4a2a4a'; c.lineWidth = 2.6; c.lineCap = 'round';
    for (const [x, y, s] of [[70, 40, 1.2], [104, 62, 0.9], [212, 112, 0.8], [358, 92, 1]]) { c.beginPath(); c.moveTo(x - 9 * s, y); c.quadraticCurveTo(x - 4 * s, y - 6 * s, x, y); c.quadraticCurveTo(x + 4 * s, y - 6 * s, x + 9 * s, y); c.stroke(); }
    /* sea */
    g = c.createLinearGradient(0, 214, 0, 400); g.addColorStop(0, '#5ab0e8'); g.addColorStop(1, '#2a6ab8'); c.fillStyle = g; c.fillRect(0, 214, 400, 186);
    c.fillStyle = 'rgba(255,230,150,.75)'; for (let i = 0; i < 7; i++) { const w = 80 - i * 8; c.fillRect(150 - w / 2 + (i % 2) * 6, 222 + i * 11, w, 3); }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const x = (i * 83) % 380 + 10, y = 240 + (i * 37) % 80; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 7, y - 4, x + 14, y); c.stroke(); }
    /* island on the right with palm */
    c.fillStyle = '#f2d27a'; c.beginPath(); c.ellipse(318, 238, 82, 20, 0, Math.PI, TAU); c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#e0b85a'; c.beginPath(); c.ellipse(318, 236, 60, 8, 0, Math.PI, TAU); c.fill();
    c.strokeStyle = OL; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(330, 232); c.quadraticCurveTo(318, 180, 340, 132); c.stroke();
    c.strokeStyle = '#a0612e'; c.lineWidth = 7; c.stroke();
    c.strokeStyle = 'rgba(60,30,10,.5)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const k = i / 6, y = 228 - k * 92, x = 330 - Math.sin(k * Math.PI) * 10 + k * 12; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y - 2); c.stroke(); }
    const leaf = (a, l) => { c.save(); c.translate(340, 132); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(l * 0.5, -22, l, 8); c.quadraticCurveTo(l * 0.5, -6, 0, 0); c.fillStyle = '#3fb86a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.2; c.stroke(); c.restore(); };
    leaf(-2.7, 62); leaf(-1.9, 54); leaf(-0.4, 64); leaf(0.3, 58); leaf(-1.2, 50); leaf(2.5, 46);
    c.fillStyle = '#7a4a26'; for (const [x, y] of [[334, 140], [346, 142], [340, 148]]) { c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.5; c.stroke(); }
    /* sailing boat on the left */
    c.save(); c.translate(64, 262);
    c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.lineTo(24, 16); c.lineTo(-24, 16); c.closePath(); c.fillStyle = '#e8443a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-24, 5, 48, 4);
    c.strokeStyle = OL; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -66); c.stroke();
    c.beginPath(); c.moveTo(3, -62); c.quadraticCurveTo(34, -30, 30, -6); c.lineTo(3, -6); c.closePath(); c.fillStyle = '#fff4e0'; c.fill(); c.lineWidth = 2.2; c.stroke();
    c.save(); c.clip(); c.fillStyle = '#ff9eb0'; for (let i = 0; i < 4; i++) c.fillRect(0, -56 + i * 14, 40, 6); c.restore();
    c.beginPath(); c.moveTo(-3, -56); c.quadraticCurveTo(-22, -26, -24, -8); c.lineTo(-3, -8); c.closePath(); c.fillStyle = '#8fd3ff'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -66); c.lineTo(14, -72); c.lineTo(0, -76); c.closePath(); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 1.5; c.stroke();
    c.restore();
    /* beach in the foreground */
    c.fillStyle = '#f6dc8e'; c.beginPath(); c.moveTo(0, 400); c.lineTo(0, 318); c.quadraticCurveTo(120, 296, 230, 322); c.quadraticCurveTo(320, 340, 400, 330); c.lineTo(400, 400); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 318); c.quadraticCurveTo(120, 296, 230, 322); c.quadraticCurveTo(320, 340, 400, 330); c.stroke();
    c.fillStyle = 'rgba(200,150,80,.35)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc((i * 61) % 400, 340 + (i * 29) % 56, 1.6, 0, TAU); c.fill(); }
    /* starfish + shell */
    c.save(); c.translate(330, 372); c.rotate(0.3); c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 15, a = i / 10 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#ff7f6a'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.restore();
    c.save(); c.translate(372, 352); c.beginPath(); c.moveTo(-12, 6); c.quadraticCurveTo(0, -18, 12, 6); c.closePath(); c.fillStyle = '#ffd1e0'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.strokeStyle = 'rgba(200,100,140,.7)'; c.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, 4); c.lineTo(i * 4.5, -6 + Math.abs(i) * 3); c.stroke(); } c.restore();
    /* sand castle */
    c.save(); c.translate(36, 368); c.fillStyle = '#e8c06a'; c.strokeStyle = OL; c.lineWidth = 2;
    c.beginPath(); c.rect(-20, -18, 40, 22); c.fill(); c.stroke(); c.beginPath(); c.rect(-12, -34, 24, 16); c.fill(); c.stroke();
    for (const x of [-12, -4, 4]) { c.fillRect(x, -39, 5, 5); c.strokeRect(x, -39, 5, 5); }
    c.beginPath(); c.moveTo(0, -39); c.lineTo(0, -54); c.stroke(); c.fillStyle = '#ff6f9c'; c.beginPath(); c.moveTo(0, -54); c.lineTo(12, -50); c.lineTo(0, -46); c.closePath(); c.fill(); c.stroke();
    c.restore();
    /* Pookie on the beach, big and happy */
    c.beginPath(); c.ellipse(192, 386, 56, 10, 0, 0, TAU); c.fillStyle = 'rgba(160,110,50,.35)'; c.fill();
    const bear = {scale: 7.4, facing: 1, frame: 0, t: 0.5, pose: 'idle', mood: 'happy', white: true, bow: true};
    if (G.draw && G.draw.drawBearAt) { try { G.draw.drawBearAt(c, 192, 386, bear); } catch (e) { fallbackPookie(c, 192, 386, 7.4); } }
    else fallbackPookie(c, 192, 386, 7.4);
    /* a heart above her */
    c.save(); c.translate(262, 214); c.rotate(0.2); c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-16, -3, -8, -15, 0, -6); c.bezierCurveTo(8, -15, 16, -3, 0, 9); c.fillStyle = '#ff6f9c'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); c.restore();
  }

  G.PZ = G.PZ || {register() {}};
  G.PZ.register({
    id: 'insel-schiebe', world: 'insel', slot: 1,
    title: 'Das Ebbe-Schiebebild',
    intro: 'Die Flut hat Pookies Strandbild durcheinandergewirbelt! Tippe ein Teil in der Reihe oder Spalte der Lücke, um es hineinzuschieben.',
    letter: 'Ein Schiebebild löst man nicht alles auf einmal: zuerst die obere Reihe, dann die linke Spalte – danach wird alles kleiner und leichter.',
    hint: 'Schalte die Zahlen ein. Bring zuerst 1, 2, 3, 4 in die obere Reihe (die letzten beiden zusammen: erst die 4 auf den Platz der 3, dann die 3 direkt darunter, dann rutschen beide mit einem Schwung an ihren Platz). Dann die linke Spalte 5, 9, 13 genauso (die letzten beiden wieder als Paar). Übrig bleibt ein 3×3-Feld – wieder erst Reihe, dann Spalte, zum Schluss das letzte 2×2 im Kreis drehen. Fertige Reihen nie wieder anfassen!',
    station(c, x, y, t, solved) {
      c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, 0, 14, 3, 0, 0, TAU); c.fill();
      /* easel legs */
      c.strokeStyle = '#7a4a26'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(-3, -38); c.moveTo(10, 0); c.lineTo(3, -38); c.moveTo(0, -30); c.lineTo(4, 0); c.stroke();
      c.fillStyle = '#7a4a26'; c.fillRect(-13, -12, 26, 2.5);
      /* the canvas with a 4x4 tiled sunset picture */
      const px = -12, py = -36, s = 24, ts = s / 4;
      rr(c, px - 1.5, py - 1.5, s + 3, s + 3, 2); c.fillStyle = '#fff4e0'; c.fill(); c.strokeStyle = OL; c.lineWidth = 1; c.stroke();
      const order = solved ? [...Array(16).keys()] : [5, 0, 2, 3, 4, 9, 1, 7, 8, 13, 6, 11, 12, 15, 10, 14];
      const col = i => { const r = Math.floor(i / 4); return r === 0 ? '#ff9eb0' : r === 1 ? '#ffc07a' : r === 2 ? '#5ab0e8' : '#f6dc8e'; };
      for (let k = 0; k < 16; k++) {
        const id = order[k]; if (id === 15 && !solved) continue;
        const cx = px + (k % 4) * ts, cy = py + Math.floor(k / 4) * ts;
        c.fillStyle = col(id); c.fillRect(cx + 0.3, cy + 0.3, ts - 0.6, ts - 0.6);
        if (id === 5 || id === 6) { c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(cx + ts / 2, cy + ts * 0.8, ts * 0.35, Math.PI, TAU); c.fill(); }
        if (id === 13 || id === 14) { c.fillStyle = '#fffaf4'; c.beginPath(); c.arc(cx + ts / 2, cy + ts / 2, ts * 0.3, 0, TAU); c.fill(); }
        if (id === 7) { c.fillStyle = '#3fb86a'; c.fillRect(cx + 2, cy + 1, 3, 2); }
      }
      if (solved) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5); c.fillStyle = '#ffd84a'; txt(c, '✦', px + s + 3, py - 2, 8, '#ffd84a'); c.globalAlpha = 1; }
      c.restore();
    },
    mount(root, api) {
      const rnd = api.rng || Math.random;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
      root.appendChild(cv);
      const c = cv.getContext('2d');
      const pic = document.createElement('canvas'), pc = pic.getContext('2d');
      const DH = 300, DW = 640;
      let W = 0, H = 0, sc = 1, LW = 0, LH = 0, dpr = 1, L = {};
      const st = {board: [], e: EMPTY, hist: [], moves: 0, nums: false, done: false, busy: false, tiles: [], parts: [], winT: 0, hover: -1, quick: false};
      const timers = []; const later = (fn, ms) => { const id = setTimeout(() => { fn(); draw(); }, ms); timers.push(id); return id; };
      const now = () => performance.now() / 1000;

      function layout() {
        W = root.clientWidth || 880; H = root.clientHeight || 400; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        sc = Math.min(H / DH, W / DW); LW = W / sc; LH = H / sc;
        const top = (LH - DH) / 2, bs = 260, cx = LW / 2;
        L = {top, bs, ts: bs / N, bx: cx - bs / 2 - 90, by: top + 20};
        L.side = {x: L.bx + bs + 34, y: top + 14, w: 150};
        L.prev = {x: L.side.x + 12, y: L.side.y + 26, s: 126};
        L.bNums = {x: L.side.x, y: top + 208, w: 150, h: 36};
        L.bMix = {x: L.side.x, y: top + 252, w: 150, h: 36};
        /* picture at device resolution */
        const px = Math.max(64, Math.round(bs * sc * dpr));
        if (pic.width !== px) { pic.width = px; pic.height = px; pc.setTransform(px / 400, 0, 0, px / 400, 0, 0); pc.clearRect(0, 0, 400, 400); pc.lineJoin = 'round'; paintPicture(pc, 0); }
      }

      /* ---------------- board logic ---------------- */
      const rc = i => [Math.floor(i / N), i % N];
      function neighbours(i) { const [r, q] = rc(i), out = []; if (r > 0) out.push(i - N); if (r < N - 1) out.push(i + N); if (q > 0) out.push(i - 1); if (q < N - 1) out.push(i + 1); return out; }
      const isSolved = () => st.board.every((v, i) => v === i);
      function stepEmpty(j, silent) {   /* move the tile at j into the gap */
        const id = st.board[j]; st.board[st.e] = id; st.board[j] = EMPTY;
        if (st.hist.length && st.hist[st.hist.length - 1] === j) st.hist.pop(); else st.hist.push(st.e);
        st.e = j;
        if (!silent) st.moves++;
      }
      function scramble() {
        st.board = [...Array(N * N).keys()]; st.e = EMPTY; st.hist = [];
        do {
          st.board = [...Array(N * N).keys()]; st.e = EMPTY; st.hist = [];
          const n = 60 + Math.floor(rnd() * 21); let prev = -1;
          for (let k = 0; k < n; k++) { const opts = neighbours(st.e).filter(j => j !== prev); const j = opts[Math.floor(rnd() * opts.length)]; prev = st.e; stepEmpty(j, true); }
        } while (st.board.filter((v, i) => v === i).length > 5 || st.hist.length < 24);
        st.moves = 0; st.done = false; st.winT = 0;
        st.tiles = []; st.board.forEach((id, i) => { const [r, q] = rc(i); st.tiles[id] = {x: q, y: r, pop: 0}; });
      }
      function slideFrom(j) {
        if (st.done || st.busy) return false;
        const [r, q] = rc(j), [er, eq] = rc(st.e);
        if (j === st.e || (r !== er && q !== eq)) { st.tiles[st.board[j]] && (st.tiles[st.board[j]].pop = 1); tone(160, 0.06, {type: 'triangle', gain: 0.06}); return false; }
        /* slide every tile between the gap and j */
        let n = 0;
        while (st.e !== j) { const [cr, cq] = rc(st.e); const nxt = cr === r ? st.e + Math.sign(q - cq) : st.e + N * Math.sign(r - cr); stepEmpty(nxt); n++; }
        noise(0.09 + n * 0.03, {type: 'bandpass', freq: 1400, q: 0.8, gain: 0.18}); tone(420 + rnd() * 80, 0.05, {type: 'sine', gain: 0.06});
        if (isSolved()) win();
        return true;
      }
      function win() {
        st.done = true; st.winT = now();
        [0, 4, 7, 11, 12].forEach((n, i) => tone(523 * Math.pow(2, n / 12), 0.28, {type: 'triangle', gain: 0.11, delay: 0.25 + i * 0.09}));
        try { api.sfx('splash'); } catch (e) {}
        later(() => {
          for (let i = 0; i < 40; i++) st.parts.push({x: L.bx + rnd() * L.bs, y: L.by + rnd() * L.bs, vx: (rnd() - 0.5) * 2, vy: -0.5 - rnd() * 1.5, r: 10 + rnd() * 14, life: 0.8 + rnd() * 0.9, col: ['#ffd84a', '#fff', '#ff9eb0', '#8fd3ff'][i % 4]});
          api.msg('Das Bild ist wieder ganz – Pookie strahlt!', 'good');
        }, 450);
        later(() => api.solved(), 1500);
      }

      /* ---------------- rendering ---------------- */
      function drawTile(id, x, y, s, alpha, pop) {
        const g = 2.5, sx = (id % N) * (pic.width / N), sy = Math.floor(id / N) * (pic.width / N), sw = pic.width / N;
        c.save(); c.globalAlpha = alpha;
        const k = 1 + pop * 0.06; c.translate(x + s / 2, y + s / 2); c.scale(k, k); c.translate(-s / 2, -s / 2);
        rr(c, g, g + 2, s - g * 2, s - g * 2, 8); c.fillStyle = 'rgba(20,40,70,.35)'; c.fill();
        c.save(); rr(c, g, g, s - g * 2, s - g * 2, 8); c.clip();
        c.drawImage(pic, sx, sy, sw, sw, 0, 0, s, s);
        const hl = c.createLinearGradient(0, 0, 0, s); hl.addColorStop(0, 'rgba(255,255,255,.28)'); hl.addColorStop(0.25, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,.12)'); c.fillStyle = hl; c.fillRect(0, 0, s, s);
        c.restore();
        rr(c, g, g, s - g * 2, s - g * 2, 8); c.strokeStyle = 'rgba(255,250,240,.9)'; c.lineWidth = 2; c.stroke();
        if (st.nums) { c.beginPath(); c.arc(16, 16, 12, 0, TAU); c.fillStyle = 'rgba(42,21,8,.72)'; c.fill(); txt(c, String(id + 1), 16, 17, 14, '#fff4e0', 'center', 700); }
        c.restore();
      }
      function button(b, label, on) {
        rr(c, b.x, b.y, b.w, b.h, b.h / 2); c.fillStyle = on ? '#9be7a5' : '#ff6f9c'; c.fill(); c.strokeStyle = on ? '#2f7a4a' : '#7a3b57'; c.lineWidth = 3; c.stroke();
        txt(c, label, b.x + b.w / 2, b.y + b.h / 2 + 1, 15, on ? '#1f4a2e' : '#fff', 'center', 700);
      }
      function render() {
        const t = now();
        c.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0); c.clearRect(0, 0, LW, LH);
        /* beach backdrop: water at the top, wet sand, foam line */
        let g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#7fd0f0'); g.addColorStop(0.32, '#a8e4f4'); g.addColorStop(0.36, '#f6e2a8'); g.addColorStop(1, '#ecc98a');
        c.fillStyle = g; c.fillRect(0, 0, LW, LH);
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 5; c.beginPath();
        for (let x = 0; x <= LW; x += 10) c.lineTo(x, LH * 0.34 + Math.sin(x * 0.04 + t * 1.6) * 4);
        c.stroke();
        c.fillStyle = 'rgba(180,130,70,.18)'; for (let i = 0; i < 50; i++) { c.beginPath(); c.arc((i * 89) % LW, LH * 0.4 + (i * 47) % (LH * 0.6), 1.8, 0, TAU); c.fill(); }
        /* footprints */
        c.fillStyle = 'rgba(160,110,60,.2)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(30 + i * 34, LH - 30 - (i % 2) * 14, 7, 10, 0.3, 0, TAU); c.fill(); }
        /* board frame (driftwood) */
        const {bx, by, bs, ts} = L;
        rr(c, bx - 12, by - 12 + 4, bs + 24, bs + 24, 18); c.fillStyle = 'rgba(80,50,20,.3)'; c.fill();
        const wg = c.createLinearGradient(bx, by, bx + bs, by + bs); wg.addColorStop(0, '#c89a62'); wg.addColorStop(1, '#9a6a3a');
        rr(c, bx - 12, by - 12, bs + 24, bs + 24, 18); c.fillStyle = wg; c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.stroke();
        rr(c, bx - 3, by - 3, bs + 6, bs + 6, 10); c.fillStyle = '#2a5a7a'; c.fill();
        /* gap: wet sand with a little wave */
        const [er, eq] = rc(st.e);
        if (!st.done) { c.save(); rr(c, bx + eq * ts + 3, by + er * ts + 3, ts - 6, ts - 6, 8); c.clip(); c.fillStyle = '#3a7aa0'; c.fillRect(bx + eq * ts, by + er * ts, ts, ts); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const yy = by + er * ts + 14 + k * 18; c.beginPath(); for (let x = 0; x <= ts; x += 6) c.lineTo(bx + eq * ts + x, yy + Math.sin(x * 0.2 + t * 3 + k) * 2); c.stroke(); } c.restore(); }
        /* tiles */
        for (let id = 0; id < EMPTY; id++) { const T = st.tiles[id]; if (!T) continue; drawTile(id, bx + T.x * ts, by + T.y * ts, ts, 1, T.pop); }
        if (st.done) {
          const k = clamp((t - st.winT) / 0.5, 0, 1);
          drawTile(EMPTY, bx + 3 * ts, by + 3 * ts, ts, k, (1 - k) * 2);
          /* one shine sweep over the whole picture */
          const sw = clamp((t - st.winT - 0.4) / 0.8, 0, 1);
          if (sw > 0 && sw < 1) { c.save(); rr(c, bx, by, bs, bs, 8); c.clip(); const sx = bx - bs * 0.4 + sw * bs * 1.8; const sg = c.createLinearGradient(sx - 50, 0, sx + 50, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sg; c.fillRect(bx, by, bs, bs); c.restore(); }
          if (k >= 1) { c.save(); c.shadowColor = 'rgba(255,230,120,.9)'; c.shadowBlur = 24; rr(c, bx - 12, by - 12, bs + 24, bs + 24, 18); c.strokeStyle = 'rgba(255,230,120,' + (0.6 + 0.4 * Math.sin(t * 6)) + ')'; c.lineWidth = 4; c.stroke(); c.restore(); }
        }
        /* side panel: preview, counter, buttons */
        const S = L.side, P = L.prev;
        rr(c, S.x - 2, S.y - 4, S.w + 4, 186, 16); c.fillStyle = 'rgba(255,250,240,.88)'; c.fill(); c.strokeStyle = 'rgba(122,59,87,.5)'; c.lineWidth = 2; c.stroke();
        txt(c, 'Vorlage', S.x + S.w / 2, S.y + 12, 13, '#7a3b57', 'center', 700);
        c.save(); rr(c, P.x, P.y, P.s, P.s, 8); c.clip(); c.drawImage(pic, 0, 0, pic.width, pic.height, P.x, P.y, P.s, P.s); c.restore();
        rr(c, P.x, P.y, P.s, P.s, 8); c.strokeStyle = OL; c.lineWidth = 2; c.stroke();
        txt(c, 'Züge: ' + st.moves, S.x + S.w / 2, S.y + 166, 15, '#7a3b57', 'center', 700);
        button(L.bNums, st.nums ? 'Zahlen: an' : 'Zahlen: aus', st.nums);
        button(L.bMix, 'Neu mischen', false);
        /* particles */
        for (const p of st.parts) { c.globalAlpha = clamp(p.life * 1.5, 0, 1); txt(c, '✦', p.x, p.y, p.r, p.col); c.globalAlpha = 1; }
      }

      /* ---------------- loop ---------------- */
      let raf = 0, last = 0, alive = true;
      function step() {
        const t = now(), dt = clamp(t - (last || t), 0, 0.05); last = t;
        st.board.forEach((id, i) => { if (id === EMPTY) return; const T = st.tiles[id], [r, q] = rc(i); const f = Math.min(1, dt * (st.quick ? 40 : 18)); T.x += (q - T.x) * f; T.y += (r - T.y) * f; if (Math.abs(q - T.x) < 0.002) T.x = q; if (Math.abs(r - T.y) < 0.002) T.y = r; T.pop = Math.max(0, T.pop - dt * 5); });
        for (const p of st.parts) { p.life -= dt; p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; }
        st.parts = st.parts.filter(p => p.life > 0);
      }
      function frame() { raf = 0; if (!alive) return; step(); render(); raf = requestAnimationFrame(frame); }
      const tick = setInterval(() => { if (alive) { step(); render(); } }, 40);
      function draw() { if (!alive) return; step(); render(); }

      /* ---------------- input ---------------- */
      function pt(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc}; }
      const inB = (p, b) => p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;
      let downAt = null;
      function onDown(e) {
        e.preventDefault(); const p = pt(e);
        if (inB(p, L.bNums)) { st.nums = !st.nums; tone(st.nums ? 760 : 560, 0.06, {type: 'sine', gain: 0.08}); draw(); return; }
        if (inB(p, L.bMix)) { if (!st.done && !st.busy) { try { api.sfx('select'); } catch (er) {} scramble(); api.msg('Neu gemischt!', 'info'); draw(); } return; }
        const q = Math.floor((p.x - L.bx) / L.ts), r = Math.floor((p.y - L.by) / L.ts);
        if (q < 0 || q >= N || r < 0 || r >= N) return;
        downAt = {p, j: r * N + q};
        slideFrom(r * N + q); draw();
      }
      function onUp(e) {
        /* swipe on the gap's neighbour row/column: a swipe starting on a tile toward the gap also works via the tap above */
        downAt = null;
      }
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp);
      const onKey = e => {
        if (st.done || st.busy) return;
        const [er, eq] = rc(st.e); let j = -1;
        if (e.code === 'ArrowLeft' && eq < N - 1) j = st.e + 1; else if (e.code === 'ArrowRight' && eq > 0) j = st.e - 1;
        else if (e.code === 'ArrowUp' && er < N - 1) j = st.e + N; else if (e.code === 'ArrowDown' && er > 0) j = st.e - N;
        if (j >= 0) { e.preventDefault(); slideFrom(j); draw(); }
      };
      window.addEventListener('keydown', onKey);
      const ro = new ResizeObserver(() => { layout(); render(); }); ro.observe(root);
      layout(); scramble(); render(); raf = requestAnimationFrame(frame);

      return {
        destroy() { alive = false; cancelAnimationFrame(raf); clearInterval(tick); timers.forEach(clearTimeout); ro.disconnect(); window.removeEventListener('keydown', onKey); cv.remove(); },
        autoSolve() {
          if (st.done) return;
          timers.forEach(clearTimeout); timers.length = 0;
          st.quick = true; st.busy = true; st.nums = true;
          api.msg('Pookie schiebt mit: Reihe für Reihe …', 'info');
          /* walk the gap back along its (loop-free) history: that restores the solved picture */
          const total = st.hist.length, per = Math.max(8, Math.min(40, Math.floor(1600 / Math.max(1, total))));
          const next = () => {
            if (!st.hist.length) { st.busy = false; if (isSolved() && !st.done) win(); return; }
            const j = st.hist[st.hist.length - 1]; stepEmpty(j);
            if (st.hist.length % 3 === 0) tone(500 + st.hist.length * 3, 0.03, {type: 'sine', gain: 0.04});
            later(next, per);
          };
          later(next, 100);
        },
      };
    },
  });
})();

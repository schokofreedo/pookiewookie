/* The Starway Home puzzle: "Die Luftleitung" (Unterwasser, slot 0).
   A "Net"-style rotation puzzle on 6x5 tiles: a brass diving-bell pump sits in one tile, every tile holds a piece of air pipe
   (end, straight, corner, T). Tap rotates a tile 90 degrees clockwise, long press / right click pins it. Solved when no pipe points
   into nothing and every tile gets air from the pump. Generated from a random spanning tree (no crosses), scrambled far from solved. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, COLS = 6, ROWS = 5, N = COLS * ROWS;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          /* bit d: 1=N 2=E 4=S 8=W */
  const rot = (m, k) => { k = ((k % 4) + 4) % 4; for (let i = 0; i < k; i++) m = ((m << 1) | (m >> 3)) & 15; return m; };
  const bits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
  const isStraight = m => m === 5 || m === 10;
  const snd = f => { try { const A = G.audio; if (A && A.ctx) f(A); } catch (e) {} };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const fnt = (ctx, w, px) => { ctx.font = w + ' ' + Math.round(px) + 'px "Fredoka", sans-serif'; };

  /* ---------- generation ---------- */
  function genTree(rng) {
    for (let tries = 0; tries < 400; tries++) {
      const sol = new Array(N).fill(0), inT = new Array(N).fill(false), deg = new Array(N).fill(0);
      const s0 = Math.floor(rng() * N); inT[s0] = true; let count = 1;
      const front = [];
      const addF = i => { const x = i % COLS, y = (i / COLS) | 0; for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) front.push([i, d, ny * COLS + nx]); } };
      addF(s0);
      while (count < N && front.length) {
        const k = Math.floor(rng() * front.length), e = front[k]; front[k] = front[front.length - 1]; front.pop();
        const [a, d, b] = e;
        if (inT[b] || deg[a] >= 3) continue;
        sol[a] |= 1 << d; sol[b] |= 1 << ((d + 2) % 4); deg[a]++; deg[b]++; inT[b] = true; count++; addF(b);
      }
      if (count < N) continue;
      let ends = 0, tees = 0, str = 0, cor = 0;
      for (const m of sol) { const b = bits(m); if (b === 1) ends++; else if (b === 3) tees++; else if (isStraight(m)) str++; else cor++; }
      if (tees < 4 || tees > 9 || str < 3 || cor < 5 || ends > 11) continue;
      /* pump: an inner tile with 2-3 pipes, preferably near the middle */
      const cand = [];
      for (let i = 0; i < N; i++) { const x = i % COLS, y = (i / COLS) | 0; if (x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1 && bits(sol[i]) >= 2) cand.push(i); }
      if (!cand.length) continue;
      return {sol, pump: cand[Math.floor(rng() * cand.length)]};
    }
    return null;
  }

  G.PZ.register({
    id: 'unterwasser-rohre', world: 'unterwasser', slot: 0, _gen: genTree,
    title: tr('Die Luftleitung', 'The Air Pipes'),
    intro: tr('Die Taucherglocke pumpt Luft, aber die Rohre sind verdreht. Tippe auf ein Feld, um es zu drehen (halten oder Rechtsklick = festmachen). Jedes Rohr muss Luft bekommen und kein Rohrende darf ins Leere zeigen.', 'The diving bell pumps air, but the pipes are all twisted. Tap a tile to turn it (hold or right-click = pin it). Every pipe must get air and no pipe end may point into nothing.'),
    letter: tr('Kein Rohr darf ins Nichts zeigen, am Rand schon gar nicht. Fang in den Ecken an, dort hat ein Rohr die wenigsten Möglichkeiten.', 'No pipe may point into nothing, and certainly not at the edge. Start in the corners, that’s where a pipe has the fewest choices.'),
    hint: tr('Arbeite dich von außen nach innen: Ein gerades Rohr am Rand muss am Rand entlang liegen, ein Knick in der Ecke zeigt nach innen, und ein T am Rand kehrt seinen Rücken nach außen. Mach sichere Felder mit Halten fest. Zwei Endstücke dürfen nie direkt aufeinander zeigen, sonst wäre der Rest abgeschnitten.', 'Work from the outside in: a straight pipe at the edge must run along the edge, a bend in a corner points inward, and a T at the edge turns its back to the outside. Pin safe tiles by holding them. Two end pieces may never point straight at each other, or the rest would be cut off.'),
    station(ctx, x, y, t, solved) {
      ctx.save(); ctx.translate(x, y);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      /* pipes leaving the pump */
      ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(-8, -6); ctx.moveTo(8, -12); ctx.lineTo(15, -12); ctx.lineTo(15, 0); ctx.stroke();
      ctx.strokeStyle = solved ? '#9fefff' : '#d9a441'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(-8, -6); ctx.moveTo(8, -12); ctx.lineTo(15, -12); ctx.lineTo(15, 0); ctx.stroke();
      /* base */
      rr(ctx, -12, -6, 24, 6, 2); ctx.fillStyle = '#6b4a2a'; ctx.fill(); ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1.5; ctx.stroke();
      /* bell */
      ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(-10, -22); ctx.quadraticCurveTo(-10, -34, 0, -34); ctx.quadraticCurveTo(10, -34, 10, -22); ctx.lineTo(11, -6); ctx.closePath();
      const g = ctx.createLinearGradient(-11, 0, 11, 0); g.addColorStop(0, '#a8722a'); g.addColorStop(0.35, '#ffd27a'); g.addColorStop(1, '#a8722a');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(0, -37, 2.5, 0, TAU); ctx.fill(); ctx.stroke();
      /* porthole */
      ctx.beginPath(); ctx.arc(0, -20, 5.5, 0, TAU); ctx.fillStyle = solved ? '#bff6ff' : '#3e7c9c'; ctx.fill(); ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-1.8, -22, 1.6, 0, TAU); ctx.fill();
      for (const [a, b] of [[-8, -12], [8, -12], [-8, -28], [8, -28]]) { ctx.fillStyle = '#7a4a1a'; ctx.beginPath(); ctx.arc(a * 0.92, b, 0.9, 0, TAU); ctx.fill(); }
      /* bubbles */
      for (let i = 0; i < 4; i++) { const p = ((t * (solved ? 0.9 : 0.4) + i * 0.25) % 1); ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(15 + Math.sin(p * 9 + i) * 2, -2 - p * 34, 1.5 + p * 1.5, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.restore();
    },
    mount(root, api) {
      const rng = api.rng || Math.random;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:pointer';
      root.appendChild(cv);
      const ctx = cv.getContext('2d');
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ghost'; btn.textContent = tr('Neu mischen', 'Shuffle');
      btn.style.cssText = 'position:absolute;margin:0;padding:7px 14px;font-size:13px;min-height:36px;background:rgba(10,40,70,.55);border-color:rgba(143,211,255,.6);color:#e8fbff';
      root.appendChild(btn);

      let W = 0, H = 0, dpr = 1, cell = 40, bx = 0, by = 0, px0 = 0, compact = false;
      let sol = [], pump = 0, rc = [], disp = [], aFrom = [], aT0 = [], locked = [], conn = null, done = false, busy = false, solvedAt = 0, autoT = [];
      const fx = []; let rippleAt = new Array(N).fill(-9);
      const bg = [];
      for (let i = 0; i < 26; i++) bg.push({x: rng(), y: rng(), r: 1 + rng() * 3, s: 0.2 + rng() * 0.5, ph: rng() * 9});

      const cur = i => rot(sol[i], rc[i]);
      function newPuzzle() {
        let g = null;
        for (let k = 0; k < 50 && !g; k++) {
          const tr = genTree(rng); if (!tr) continue;
          const r = []; for (let i = 0; i < N; i++) r.push(Math.floor(rng() * 4));
          sol = tr.sol; pump = tr.pump; rc = r;
          let off = 0; for (let i = 0; i < N; i++) if (cur(i) !== sol[i]) off++;
          const c = computeConn();
          if (off >= 22 && c.count <= 5 && !c.solved) g = tr;
        }
        disp = rc.map(v => v * Math.PI / 2); aFrom = disp.slice(); aT0 = new Array(N).fill(-9); locked = new Array(N).fill(false); rippleAt.fill(-9);
        done = false; busy = false; conn = computeConn();
      }
      function computeConn() {
        const m = []; for (let i = 0; i < N; i++) m.push(cur(i));
        const dist = new Array(N).fill(-1), par = new Array(N).fill(-1); dist[pump] = 0; const q = [pump];
        while (q.length) { const i = q.shift(), x = i % COLS, y = (i / COLS) | 0; for (let d = 0; d < 4; d++) { if (!(m[i] & (1 << d))) continue; const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue; const j = ny * COLS + nx; if (!(m[j] & (1 << ((d + 2) % 4))) || dist[j] >= 0) continue; dist[j] = dist[i] + 1; par[j] = i; q.push(j); } }
        let open = 0, count = 0;
        const openArm = new Array(N).fill(0);
        for (let i = 0; i < N; i++) {
          if (dist[i] >= 0) count++;
          const x = i % COLS, y = (i / COLS) | 0;
          for (let d = 0; d < 4; d++) { if (!(m[i] & (1 << d))) continue; const nx = x + DX[d], ny = y + DY[d]; const ok = nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && (m[ny * COLS + nx] & (1 << ((d + 2) % 4))); if (!ok) { open++; openArm[i] |= 1 << d; } }
        }
        return {m, dist, par, count, open, openArm, solved: open === 0 && count === N};
      }

      function layout() {
        const w = root.clientWidth, h = root.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
        if (w !== W || h !== H || d !== dpr) { W = w; H = h; dpr = d; cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); }
        compact = H < 300;
        const side = compact ? 170 : 210;
        cell = Math.floor(Math.min((H - (compact ? 22 : 30)) / ROWS, (W - side - 30) / COLS));
        cell = Math.max(30, Math.min(cell, 84));
        const bw = cell * COLS, bh = cell * ROWS;
        const total = bw + 20 + side;
        bx = Math.round((W - total) / 2); by = Math.round((H - bh) / 2);
        px0 = bx + bw + 20;
        btn.style.left = px0 + 'px'; btn.style.top = (by + bh - (compact ? 38 : 42)) + 'px';
        btn.style.fontSize = compact ? '12px' : '13px';
        draw(performance.now() / 1000);
      }

      /* ---------- drawing ---------- */
      function drawBackground(t) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d6f9a'); g.addColorStop(0.55, '#124e78'); g.addColorStop(1, '#0b2f52');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        /* light rays */
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) { const x = W * (0.1 + i * 0.22) + Math.sin(t * 0.3 + i) * 20; ctx.fillStyle = 'rgba(160,230,255,0.05)'; ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 110, H); ctx.lineTo(x + 30, H); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        /* sand */
        ctx.fillStyle = '#c9a66b'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - 10 - Math.sin(x * 0.03) * 5); ctx.lineTo(W, H); ctx.fill();
        /* seaweed */
        for (let k = 0; k < 6; k++) {
          const sx = k < 3 ? 10 + k * 14 : W - 12 - (k - 3) * 14, hgt = H * (0.35 + (k % 3) * 0.12);
          ctx.strokeStyle = k % 2 ? '#2f9e6b' : '#45b97a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, H);
          for (let s = 1; s <= 8; s++) ctx.lineTo(sx + Math.sin(t * 1.3 + s * 0.7 + k) * s * 1.4, H - hgt * s / 8);
          ctx.stroke();
        }
        /* drifting bubbles */
        ctx.strokeStyle = 'rgba(220,250,255,.35)'; ctx.lineWidth = 1;
        for (const b of bg) { const y = ((b.y - t * b.s * 0.08) % 1 + 1) % 1; ctx.beginPath(); ctx.arc(b.x * W + Math.sin(t + b.ph) * 6, y * H, b.r, 0, TAU); ctx.stroke(); }
      }
      function armPath(m) {
        const h = cell / 2; ctx.beginPath();
        for (let d = 0; d < 4; d++) if (m & (1 << d)) { ctx.moveTo(0, 0); ctx.lineTo(DX[d] * h, DY[d] * h); }
      }
      function drawTile(i, t) {
        const x = i % COLS, y = (i / COLS) | 0, cx = bx + x * cell + cell / 2, cy = by + y * cell + cell / 2;
        const on = conn.dist[i] >= 0, pad = Math.max(2, cell * 0.04), rip = Math.max(0, 1 - (t - rippleAt[i]) / 0.6);
        /* tile */
        rr(ctx, cx - cell / 2 + pad, cy - cell / 2 + pad, cell - pad * 2, cell - pad * 2, cell * 0.16);
        ctx.fillStyle = on ? 'rgba(40,120,150,.92)' : 'rgba(22,60,92,.92)'; ctx.fill();
        ctx.lineWidth = locked[i] ? 3 : 2; ctx.strokeStyle = locked[i] ? '#ffd84a' : 'rgba(5,20,40,.8)'; ctx.stroke();
        if (rip > 0) { ctx.save(); ctx.globalAlpha = rip * 0.6; ctx.fillStyle = '#bff6ff'; ctx.fill(); ctx.restore(); }
        if (locked[i]) { ctx.fillStyle = '#ffd84a'; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(cx + a * (cell / 2 - pad - 6), cy + b * (cell / 2 - pad - 6), 2.4, 0, TAU); ctx.fill(); } }
        /* pipe */
        const pw = cell * 0.24, m = sol[i];
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(disp[i]);
        ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
        if (on) { ctx.shadowColor = 'rgba(140,240,255,.9)'; ctx.shadowBlur = cell * 0.22; }
        armPath(m); ctx.strokeStyle = '#2a1508'; ctx.lineWidth = pw + 5; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, (pw + 5) / 2, 0, TAU); ctx.fillStyle = '#2a1508'; ctx.fill();
        armPath(m); ctx.strokeStyle = on ? '#8fe9ff' : '#c08a3e'; ctx.lineWidth = pw; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, pw / 2, 0, TAU); ctx.fillStyle = on ? '#8fe9ff' : '#c08a3e'; ctx.fill();
        /* rims at the tile border */
        for (let d = 0; d < 4; d++) if (m & (1 << d)) { const ex = DX[d] * (cell / 2 - pad - 2), ey = DY[d] * (cell / 2 - pad - 2); ctx.fillStyle = on ? '#e9fdff' : '#e8b862'; ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1.5; const rw = DX[d] ? 5 : pw + 8, rh = DX[d] ? pw + 8 : 5; rr(ctx, ex - rw / 2, ey - rh / 2, rw, rh, 2); ctx.fill(); ctx.stroke(); }
        /* highlight streak */
        ctx.globalAlpha = 0.45; armPath(m); ctx.strokeStyle = '#fff'; ctx.lineWidth = pw * 0.22; ctx.setLineDash([pw * 0.6, pw * 0.9]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.restore();
        /* end piece: air dome with a little fish */
        if (bits(m) === 1 && i !== pump) {
          const r = cell * 0.2;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = on ? '#d9fbff' : '#6aa5c4'; ctx.fill(); ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = on ? '#ff9eb0' : '#ff9eb088'; const wig = Math.sin(t * 5 + i) * (on ? 2 : 0.5);
          ctx.beginPath(); ctx.ellipse(cx + wig * 0.3, cy, r * 0.42, r * 0.28, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx - r * 0.35 + wig * 0.3, cy); ctx.lineTo(cx - r * 0.7, cy - r * 0.25 + wig * 0.4); ctx.lineTo(cx - r * 0.7, cy + r * 0.25 - wig * 0.4); ctx.fill();
          ctx.fillStyle = '#2a1508'; ctx.beginPath(); ctx.arc(cx + r * 0.2, cy - r * 0.05, Math.max(1, r * 0.08), 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.45, r * 0.18, 0, TAU); ctx.fill();
        }
      }
      function drawFlow(t) {
        /* bubbles inside connected pipes: from parent edge into the centre, then out to the children */
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        const h = cell / 2;
        for (let i = 0; i < N; i++) {
          if (conn.dist[i] < 0 || Math.abs(disp[i] - rc[i] * Math.PI / 2) > 0.05) continue;
          const x = i % COLS, y = (i / COLS) | 0, cx = bx + x * cell + h, cy = by + y * cell + h, m = conn.m[i];
          for (let d = 0; d < 4; d++) {
            if (!(m & (1 << d)) || (conn.openArm[i] & (1 << d))) continue;
            const j = (y + DY[d]) * COLS + x + DX[d], inward = conn.par[i] === j;
            for (let k = 0; k < 2; k++) {
              let s = ((t * 1.1 - conn.dist[i] * 0.5 + k * 0.5) % 1 + 1) % 1; if (inward) s = 1 - s;
              ctx.beginPath(); ctx.arc(cx + DX[d] * h * s, cy + DY[d] * h * s, cell * 0.045 + 0.6, 0, TAU); ctx.fill();
            }
          }
        }
        /* leaks: open ends of the air network spill bubbles */
        ctx.strokeStyle = 'rgba(230,252,255,.85)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < N; i++) {
          if (conn.dist[i] < 0 || !conn.openArm[i] || Math.abs(disp[i] - rc[i] * Math.PI / 2) > 0.05) continue;
          const x = i % COLS, y = (i / COLS) | 0, cx = bx + x * cell + h, cy = by + y * cell + h;
          for (let d = 0; d < 4; d++) {
            if (!(conn.openArm[i] & (1 << d))) continue;
            const ex = cx + DX[d] * h * 0.92, ey = cy + DY[d] * h * 0.92;
            for (let k = 0; k < 3; k++) { const p = ((t * 1.4 + k / 3 + i * 0.13) % 1); ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(ex + Math.sin(p * 10 + k) * 3 + DX[d] * p * 6, ey - p * cell * 0.5, 1.5 + p * 2.5, 0, TAU); ctx.stroke(); }
            ctx.globalAlpha = 1;
          }
        }
      }
      function drawPump(t) {
        const x = pump % COLS, y = (pump / COLS) | 0, cx = bx + x * cell + cell / 2, cy = by + y * cell + cell / 2, s = cell / 62;   /* small enough that the pump's own pipe arms stay visible */
        const bob = Math.sin(t * 3) * 1.2 * s;
        ctx.save(); ctx.translate(cx, cy + bob);
        ctx.beginPath(); ctx.moveTo(-11 * s, 10 * s); ctx.lineTo(-10 * s, -4 * s); ctx.quadraticCurveTo(-10 * s, -15 * s, 0, -15 * s); ctx.quadraticCurveTo(10 * s, -15 * s, 10 * s, -4 * s); ctx.lineTo(11 * s, 10 * s); ctx.closePath();
        const g = ctx.createLinearGradient(-11 * s, 0, 11 * s, 0); g.addColorStop(0, '#a8722a'); g.addColorStop(0.35, '#ffd98a'); g.addColorStop(1, '#9a6522');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 2; ctx.stroke();
        rr(ctx, -13 * s, 8 * s, 26 * s, 5 * s, 2 * s); ctx.fillStyle = '#7a4a1a'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -2 * s, 5 * s, 0, TAU); ctx.fillStyle = '#bff6ff'; ctx.fill(); ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#2a1508'; ctx.beginPath(); ctx.arc(-1.6 * s, -2.5 * s, 0.9 * s, 0, TAU); ctx.arc(1.6 * s, -2.5 * s, 0.9 * s, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -1.2 * s, 1.6 * s, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(0, -17 * s, 2.6 * s, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = 'rgba(230,252,255,.9)'; ctx.lineWidth = 1.2;
        for (let k = 0; k < 3; k++) { const p = ((t * 0.8 + k / 3) % 1); ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(cx + Math.sin(p * 8 + k) * 3, cy - 18 * s - p * cell * 0.45, 1.5 + p * 2, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      function drawPanel(t) {
        const x = px0, w = W - px0 - 10;
        if (w < 60) return;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        const big = compact ? 15 : 18, sm = compact ? 11 : 13;
        let y = by + (compact ? 14 : 22);
        fnt(ctx, '700', big); ctx.fillStyle = '#ffd84a'; ctx.fillText(tr('Luft im Netz', 'Air in the pipes'), x, y);
        y += compact ? 10 : 14;
        const bw = Math.min(160, w - 4), frac = conn.count / N;
        rr(ctx, x, y, bw, compact ? 12 : 16, 7); ctx.fillStyle = 'rgba(0,20,40,.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(143,211,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
        if (frac > 0) { rr(ctx, x + 2, y + 2, Math.max(8, (bw - 4) * frac), (compact ? 12 : 16) - 4, 5); ctx.fillStyle = '#8fe9ff'; ctx.fill(); }
        y += (compact ? 12 : 16) + (compact ? 14 : 20);
        fnt(ctx, '600', sm + 1); ctx.fillStyle = '#e8fbff'; ctx.fillText(tr(`${conn.count} von ${N} Rohren`, `${conn.count} of ${N} pipes`), x, y);
        y += compact ? 15 : 20;
        fnt(ctx, '600', sm); ctx.fillStyle = conn.open ? '#ffb3c4' : '#9be7a5';
        ctx.fillText(conn.open ? tr(`${conn.open} offene Rohrenden`, conn.open === 1 ? '1 open pipe end' : `${conn.open} open pipe ends`) : tr('Keine offenen Enden', 'No open ends'), x, y);
        if (!compact) {
          y += 30; fnt(ctx, '500', 12); ctx.fillStyle = 'rgba(232,251,255,.8)';
          ctx.fillText(tr('Tippen: drehen', 'Tap: turn'), x, y); y += 17;
          ctx.fillText(tr('Halten / Rechtsklick:', 'Hold / right-click:'), x, y); y += 16; ctx.fillText(tr('Feld festmachen', 'pin a tile'), x, y);
        } else {
          y += 15; fnt(ctx, '500', 10.5); ctx.fillStyle = 'rgba(232,251,255,.8)'; ctx.fillText(tr('Halten = festmachen', 'Hold = pin'), x, y);
        }
      }
      function draw(t) {
        if (!W) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (let i = 0; i < N; i++) { const tg = rc[i] * Math.PI / 2, k = Math.min(1, Math.max(0, (t - aT0[i]) / 0.18)); const e = k >= 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); disp[i] = aFrom[i] + (tg - aFrom[i]) * e; }
        drawBackground(t);
        /* board frame */
        rr(ctx, bx - 8, by - 8, cell * COLS + 16, cell * ROWS + 16, 16); ctx.fillStyle = 'rgba(5,25,45,.55)'; ctx.fill(); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 3; ctx.stroke();
        for (const [a, b] of [[bx - 2, by - 2], [bx + cell * COLS + 2, by - 2], [bx - 2, by + cell * ROWS + 2], [bx + cell * COLS + 2, by + cell * ROWS + 2]]) { ctx.beginPath(); ctx.arc(a, b, 4, 0, TAU); ctx.fillStyle = '#ffd98a'; ctx.fill(); ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1.5; ctx.stroke(); }
        for (let i = 0; i < N; i++) drawTile(i, t);
        drawFlow(t);
        drawPump(t);
        drawPanel(t);
        /* fx: burst bubbles */
        for (let k = fx.length - 1; k >= 0; k--) {
          const f = fx[k], a = (t - f.t0) / f.life; if (a >= 1) { fx.splice(k, 1); continue; } if (a < 0) continue;
          ctx.globalAlpha = 1 - a; ctx.strokeStyle = f.col || '#e8fbff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(f.x + Math.sin(a * 8 + f.ph) * 5, f.y - a * f.rise, f.r * (0.6 + a), 0, TAU); ctx.stroke();
          if (f.star) { ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(f.x + Math.sin(a * 8 + f.ph) * 5, f.y - a * f.rise, 1.5, 0, TAU); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
        if (done) {
          const a = Math.min(1, (t - solvedAt) / 0.4);
          ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; fnt(ctx, '700', compact ? 22 : 30);
          const tx = bx + cell * COLS / 2, ty = by + cell * ROWS / 2 + Math.sin(t * 4) * 3;
          ctx.lineWidth = 7; ctx.strokeStyle = '#0b2f52'; ctx.lineJoin = 'round'; const won = tr('Luft marsch!', 'Air flows!'); ctx.strokeText(won, tx, ty); ctx.fillStyle = '#bff6ff'; ctx.fillText(won, tx, ty);
          ctx.restore();
        }
      }

      let raf = 0, alive = true;
      function loop(now) {
        if (!alive) return;
        draw(performance.now() / 1000);
        raf = requestAnimationFrame(loop);
      }

      /* ---------- interaction ---------- */
      function rotateTile(i, quiet) {
        aFrom[i] = disp[i]; aT0[i] = performance.now() / 1000; rc[i]++;
        const before = conn.dist;
        conn = computeConn();
        const now = performance.now() / 1000;
        let gained = 0; for (let j = 0; j < N; j++) if (conn.dist[j] >= 0 && before[j] < 0) { gained++; rippleAt[j] = now + 0.12; }
        if (!quiet) {
          snd(A => { A.tone(520 + (rc[i] % 4) * 60, 0.06, {type: 'triangle', gain: 0.1}); A.noise(0.08, {type: 'bandpass', freq: 1400, q: 2, gain: 0.05}); });
          if (gained) snd(A => { A.tone(600, 0.2, {type: 'sine', slide: 1200 + gained * 60, gain: 0.08, delay: 0.1}); });
        }
        if (conn.solved) win();
      }
      function win() {
        if (done) return; done = true; busy = true; solvedAt = performance.now() / 1000;
        locked.fill(false);
        for (let i = 0; i < N; i++) rippleAt[i] = solvedAt + conn.dist[i] * 0.07;
        for (let k = 0; k < 40; k++) fx.push({x: bx + rng() * cell * COLS, y: by + rng() * cell * ROWS, r: 2 + rng() * 5, rise: 40 + rng() * 80, life: 1 + rng(), t0: solvedAt + rng() * 0.6, ph: rng() * 9, star: k % 3 === 0});
        api.msg(tr('Die Luft strömt durch alle Rohre!', 'Air is flowing through every pipe!'), 'good');
        snd(A => { A.noise(0.9, {type: 'bandpass', freq: 600, freqTo: 2400, q: 1, gain: 0.12}); [523, 659, 784, 1047, 1319].forEach((f, i) => A.bell(f, 0.4, 0.1, 0.1 + i * 0.08)); });
        draw(solvedAt);
        autoT.push(setTimeout(() => api.solved(), 1000));
      }
      function hit(e) {
        const r = cv.getBoundingClientRect(), x = e.clientX - r.left - bx, y = e.clientY - r.top - by;
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
        return cy * COLS + cx;
      }
      let press = null;
      function toggleLock(i) {
        locked[i] = !locked[i];
        snd(A => A.tone(locked[i] ? 880 : 440, 0.08, {type: 'square', gain: 0.05}));
        const r = cell / 2, cx = bx + (i % COLS) * cell + r, cy = by + ((i / COLS) | 0) * cell + r, now = performance.now() / 1000;
        if (locked[i]) for (let k = 0; k < 5; k++) fx.push({x: cx + (rng() - 0.5) * cell * 0.7, y: cy + (rng() - 0.5) * cell * 0.5, r: 2, rise: 20, life: 0.5, t0: now, ph: k, col: '#ffd84a', star: true});
      }
      const onDown = e => {
        if (busy) return;
        const i = hit(e); if (i < 0) return;
        e.preventDefault();
        if (e.button === 2) { toggleLock(i); return; }
        press = {i, id: e.pointerId, fired: false, tm: setTimeout(() => { if (press && press.i === i) { press.fired = true; toggleLock(i); } }, 430)};
      };
      const onUp = e => {
        if (!press || press.id !== e.pointerId) return;
        clearTimeout(press.tm);
        const p = press; press = null;
        if (p.fired || busy) return;
        if (hit(e) !== p.i) return;
        if (locked[p.i]) { snd(A => A.tone(200, 0.08, {type: 'triangle', gain: 0.1})); api.msg(tr('Dieses Feld ist festgemacht. Halten löst es wieder.', 'This tile is pinned. Hold it again to unpin it.'), 'info'); return; }
        rotateTile(p.i);
      };
      const onCancel = () => { if (press) { clearTimeout(press.tm); press = null; } };
      const onCtx = e => e.preventDefault();
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onCancel); cv.addEventListener('pointerleave', onCancel); cv.addEventListener('contextmenu', onCtx);
      btn.addEventListener('click', () => { if (busy) return; api.sfx('select'); newPuzzle(); api.msg(tr('Neue Leitung gemischt.', 'New pipes shuffled.'), 'info'); draw(performance.now() / 1000); });

      newPuzzle();
      const ro = new ResizeObserver(() => layout()); ro.observe(root);
      layout();
      raf = requestAnimationFrame(loop);

      return {
        _s: () => ({sol, rc, locked, pump, cell, bx, by, done, conn}),
        destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); autoT.forEach(clearTimeout); if (press) clearTimeout(press.tm); },
        autoSolve() {
          if (done || busy) return; busy = true; locked.fill(false);
          /* turn the tiles in order of their distance from the pump in the solution tree */
          const order = []; const seen = new Array(N).fill(false); const q = [pump]; seen[pump] = true;
          while (q.length) { const i = q.shift(); order.push(i); const x = i % COLS, y = (i / COLS) | 0; for (let d = 0; d < 4; d++) if (sol[i] & (1 << d)) { const j = (y + DY[d]) * COLS + x + DX[d]; if (!seen[j]) { seen[j] = true; q.push(j); } } }
          let k = 0;
          for (const i of order) {
            const need = isStraight(sol[i]) ? (2 - rc[i] % 2) % 2 : (4 - rc[i] % 4) % 4;
            for (let s = 0; s < need; s++) autoT.push(setTimeout(() => { if (!done) rotateTile(i, s < need - 1); }, 60 + (k++) * 28));
          }
          autoT.push(setTimeout(() => { conn = computeConn(); if (!done) { if (conn.solved) win(); else { sol.forEach((m, i) => { rc[i] = rc[i] - (rc[i] % 4); }); conn = computeConn(); win(); } } }, 120 + k * 28));
        },
      };
    },
  });
})();

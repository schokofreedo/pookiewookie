/* The Starway Home puzzle: "Die Pinguin-Rutsche" (Schnee, slot 0).
   Ice sliding on 9x9: the penguin slides until a rock or the edge stops it, and it has to STOP exactly on the igloo tile (sliding
   over the igloo does not stop it). Fields are generated with random rocks and a reverse BFS until the optimal solution needs 8-11
   moves and the start is not in line with the igloo. Move limit = optimum + 2. Swipe, arrow buttons or arrow keys. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, S = 9, NC = S * S;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const snd = f => { try { const A = G.audio; if (A && A.ctx) f(A); } catch (e) {} };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const fnt = (ctx, w, px) => { ctx.font = w + ' ' + Math.round(px) + 'px "Fredoka", sans-serif'; };

  function slide(rock, p, d) {
    let x = p % S, y = (p / S) | 0;
    for (;;) { const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= S || ny >= S || rock[ny * S + nx]) break; x = nx; y = ny; }
    return y * S + x;
  }
  /* distance of every cell to "stopped on goal" (reverse BFS), and the next-move table */
  function analyse(rock, goal) {
    const nxt = []; const pred = []; for (let i = 0; i < NC; i++) pred.push([]);
    for (let i = 0; i < NC; i++) { const r = [-1, -1, -1, -1]; if (!rock[i]) for (let d = 0; d < 4; d++) { const j = slide(rock, i, d); if (j !== i) { r[d] = j; pred[j].push(i); } } nxt.push(r); }
    const dist = new Array(NC).fill(-1); dist[goal] = 0; const q = [goal];
    while (q.length) { const j = q.shift(); for (const i of pred[j]) if (dist[i] < 0) { dist[i] = dist[j] + 1; q.push(i); } }
    return {nxt, dist};
  }
  function generate(rng) {
    let keep = null;
    for (let attempt = 0; attempt < 6000; attempt++) {
      if (keep && attempt > 400) return keep;
      const rock = new Array(NC).fill(false), nr = 10 + Math.floor(rng() * 9);
      for (let k = 0; k < nr; k++) rock[Math.floor(rng() * NC)] = true;
      const free = []; for (let i = 0; i < NC; i++) if (!rock[i]) free.push(i);
      const goal = free[Math.floor(rng() * free.length)];
      const gx = goal % S, gy = (goal / S) | 0;
      const {nxt, dist} = analyse(rock, goal);
      let best = -1; const cand = [];
      for (const i of free) { const d = dist[i]; if (d < 8 || d > 11 || i % S === gx || ((i / S) | 0) === gy) continue; if (d > best) { best = d; cand.length = 0; } if (d === best) cand.push(i); }
      if (!cand.length) continue;
      const start = cand[Math.floor(rng() * cand.length)];
      /* solution: greedy descent along the BFS distances */
      const sol = []; let p = start;
      while (p !== goal) { let ok = false; for (let d = 0; d < 4; d++) { const j = nxt[p][d]; if (j >= 0 && dist[j] === dist[p] - 1) { sol.push(d); p = j; ok = true; break; } } if (!ok) break; }
      if (p !== goal) continue;
      const res = {rock, goal, start, opt: dist[start], sol, nxt};
      if (res.opt >= 10) return res;
      if (!keep || res.opt > keep.opt) keep = res;
    }
    return keep;
  }

  function drawPenguin(ctx, x, y, s, t, o) {
    /* (x, y) = feet. o: {dir: -1..1 lean, slide: 0..1, squash, happy} */
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const sq = o.squash || 0; ctx.scale(1 + sq * 0.25, 1 - sq * 0.25);
    ctx.rotate((o.lean || 0) * 0.35);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    /* feet */
    ctx.fillStyle = '#ff9a3c'; ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(-4, -1.2, 3.6, 1.8, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(4, -1.2, 3.6, 1.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    /* body */
    ctx.beginPath(); ctx.ellipse(0, -11, 9, 11, 0, 0, TAU); ctx.fillStyle = '#2b3550'; ctx.fill(); ctx.strokeStyle = '#141a2a'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -9.5, 6.3, 8.6, 0, 0, TAU); ctx.fillStyle = '#fffaf2'; ctx.fill();
    /* flippers */
    const fl = o.happy ? Math.sin(t * 18) * 0.6 - 0.6 : (o.slide ? -0.9 : 0.15);
    for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 8, -13); ctx.rotate(sx * (0.3 - fl)); ctx.beginPath(); ctx.ellipse(sx * 1.5, 4, 2.4, 6, sx * 0.2, 0, TAU); ctx.fillStyle = '#2b3550'; ctx.fill(); ctx.strokeStyle = '#141a2a'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
    /* face */
    ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.ellipse(-2.6, -15.5, 2.6, 2.8, 0, 0, TAU); ctx.ellipse(2.6, -15.5, 2.6, 2.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#141a2a';
    if (o.happy) { ctx.strokeStyle = '#141a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-2.6, -15, 1.3, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(3.9, -15); ctx.arc(2.6, -15, 1.3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(-2.3 + (o.lean || 0) * 0.8, -15.6, 1.2, 0, TAU); ctx.arc(2.9 + (o.lean || 0) * 0.8, -15.6, 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -16, 0.4, 0, TAU); ctx.arc(3.2, -16, 0.4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ff9a3c'; ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -13); ctx.lineTo(2, -13); ctx.lineTo(0, -10.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9eb0'; ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.arc(-5.3, -12.5, 1.3, 0, TAU); ctx.arc(5.3, -12.5, 1.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    /* little scarf */
    ctx.fillStyle = '#ff6f9c'; rr(ctx, -6.5, -10.2, 13, 2.6, 1.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(3, -8.5); ctx.lineTo(6.5, -4 + Math.sin(t * 6) * 0.8); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawIgloo(ctx, x, y, r, glow) {
    /* (x, y) = bottom centre, r = radius */
    ctx.save();
    if (glow > 0) { ctx.shadowColor = 'rgba(255,230,140,' + glow + ')'; ctx.shadowBlur = r * 0.9; }
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI, TAU); ctx.closePath();
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bfe1f5'); ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = Math.max(1.2, r * 0.08); ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(70,120,160,.55)'; ctx.lineWidth = Math.max(0.8, r * 0.05);
    for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.arc(x, y, r * (1 - k * 0.33), Math.PI, TAU); ctx.stroke(); }
    for (let k = 0; k < 5; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r * 0.38, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = glow > 0 ? '#ffcf6a' : '#28405a'; ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    ctx.restore();
  }

  G.PZ.register({
    id: 'schnee-rutsche', world: 'schnee', slot: 0, _gen: generate,
    title: tr('Die Pinguin-Rutsche', 'The Penguin Slide'),
    intro: tr('Der Pinguin rutscht immer, bis ihn ein Fels oder der Rand stoppt. Er muss genau AUF dem Iglu-Feld anhalten (über das Iglu rutscht er drüber). Wische, tippe die Pfeile oder nutze die Pfeiltasten. Die Züge sind begrenzt!', 'The penguin always slides until a rock or the edge stops it. It has to stop exactly ON the igloo tile (it slides right over the igloo otherwise). Swipe, tap the arrows or use the arrow keys. Your moves are limited!'),
    letter: tr('Manchmal musst du erst vom Iglu wegrutschen, um anzukommen. Und ein Fels ist dein bester Freund.', 'Sometimes you have to slide away from the igloo first to get there. And a rock is your best friend.'),
    hint: tr('Denk rückwärts: Von welchen Feldern aus würde der Pinguin genau auf dem Iglu stehen bleiben? Dafür braucht es einen Fels oder den Rand direkt hinter dem Iglu. Such diesen Haltepunkt zuerst und überlege dann, wie du auf seine Linie kommst.', 'Think backwards: from which tiles would the penguin stop exactly on the igloo? That needs a rock or the edge right behind the igloo. Find that stopping point first, then work out how to get onto its line.'),
    station(ctx, x, y, t, solved) {
      ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
      /* snow mound */
      ctx.fillStyle = '#f4fbff'; ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, -1, 16, 4, 0, Math.PI, TAU); ctx.fill(); ctx.stroke();
      /* post */
      rr(ctx, -2.2, -36, 4.4, 35, 1.5); ctx.fillStyle = '#a7d8f0'; ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.stroke();
      /* signs */
      const sign = (yy, dir, col) => { ctx.beginPath(); if (dir > 0) { ctx.moveTo(-10, yy - 5); ctx.lineTo(10, yy - 5); ctx.lineTo(15, yy); ctx.lineTo(10, yy + 5); ctx.lineTo(-10, yy + 5); } else { ctx.moveTo(10, yy - 5); ctx.lineTo(-10, yy - 5); ctx.lineTo(-15, yy); ctx.lineTo(-10, yy + 5); ctx.lineTo(10, yy + 5); } ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-7, yy - 3, 12, 1.5); };
      sign(-31, 1, solved ? '#9be7a5' : '#cfeeff'); sign(-20, -1, '#cfeeff');
      /* icicles */
      ctx.fillStyle = '#e8f8ff'; for (const ix of [-8, -3, 5]) { ctx.beginPath(); ctx.moveTo(ix - 1.5, -26); ctx.lineTo(ix + 1.5, -26); ctx.lineTo(ix, -22); ctx.closePath(); ctx.fill(); }
      /* snow cap */
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(1, -36.5, 11, 3, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1; ctx.stroke();
      drawPenguin(ctx, 9, -1, 0.55, t, {happy: solved, lean: Math.sin(t * 2) * 0.2});
      ctx.restore();
    },
    mount(root, api) {
      const rng = api.rng || Math.random;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
      root.appendChild(cv);
      const ctx = cv.getContext('2d');
      const mkBtn = (txt, big) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost'; b.innerHTML = txt; b.style.cssText = 'position:absolute;margin:0;padding:0 10px;font-size:13px;min-height:36px;background:rgba(30,70,110,.55);border-color:rgba(190,235,255,.7);color:#f2fbff;white-space:nowrap;display:flex;align-items:center;justify-content:center;touch-action:manipulation' + (big ? ';font-size:20px;padding:0;border-radius:12px' : ''); root.appendChild(b); return b; };
      const arrows = ['▲', '▶', '▼', '◀'].map(a => mkBtn(a, true));
      const bUndo = mkBtn(tr('↶ Zug zurück', '↶ Undo')), bReset = mkBtn(tr('Von vorn', 'Restart'));

      let W = 0, H = 0, dpr = 1, cell = 30, bx = 0, by = 0, compact = false, padX = 0, panelX = 0;
      let P = null, pos = 0, hist = [], moves = 0, limit = 0, done = false, busy = false, solvedAt = 0, timers = [];
      let anim = {fx: 0, fy: 0, to: 0, t0: -9, dur: 0.1, dir: 1}, bumpT = -9, bumpDir = 0, stopT = -9, fx = [];
      const flakes = []; for (let i = 0; i < 40; i++) flakes.push({x: rng(), y: rng(), r: 0.8 + rng() * 2, s: 0.3 + rng() * 0.7, ph: rng() * 9});
      const cracks = []; for (let i = 0; i < 14; i++) cracks.push({x: rng(), y: rng(), a: rng() * TAU, l: 0.5 + rng()});

      function newLevel() { P = generate(rng); if (!P) throw new Error('no field'); limit = P.opt + 2; reset(); }
      function reset() { pos = P.start; hist = []; moves = 0; done = false; busy = false; anim = {fx: pos % S, fy: (pos / S) | 0, to: pos, t0: -9, dur: 0.1, dir: 2}; fx.length = 0; }
      const cx = i => bx + (i % S) * cell + cell / 2, cy = i => by + ((i / S) | 0) * cell + cell / 2;

      function layout() {
        const w = root.clientWidth, h = root.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
        if (w !== W || h !== H || d !== dpr) { W = w; H = h; dpr = d; cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); }
        compact = H < 300;
        const ab = compact ? 40 : 46, padW = ab * 3 + 8, side = compact ? 150 : 180, gap = compact ? 18 : 26;
        cell = Math.floor(Math.min((H - (compact ? 12 : 24)) / S, (W - padW - side - gap * 2 - 16) / S));
        cell = Math.max(22, Math.min(cell, 52));
        const bw = cell * S, total = padW + gap + bw + gap + side;
        padX = Math.round((W - total) / 2); bx = padX + padW + gap; by = Math.round((H - bw) / 2); panelX = bx + bw + gap;
        const pcx = padX + padW / 2, pcy = by + bw / 2 + (compact ? 6 : 10);
        const P4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        arrows.forEach((b, k) => { b.style.width = ab + 'px'; b.style.height = ab + 'px'; b.style.left = (pcx + P4[k][0] * (ab + 2) - ab / 2) + 'px'; b.style.top = (pcy + P4[k][1] * (ab + 2) - ab / 2) + 'px'; });
        const bh = 36; [bReset, bUndo].forEach((b, k) => { b.style.left = panelX + 'px'; b.style.top = (by + bw - bh - k * (bh + 8)) + 'px'; b.style.fontSize = compact ? '12px' : '13px'; b.style.height = bh + 'px'; });
        draw(performance.now() / 1000);
      }

      /* ---------- drawing ---------- */
      function penguinXY(t) {
        const k = Math.min(1, Math.max(0, (t - anim.t0) / anim.dur)), e = 1 - Math.pow(1 - k, 3);
        const gx = anim.fx + ((anim.to % S) - anim.fx) * e, gy = anim.fy + (((anim.to / S) | 0) - anim.fy) * e;
        let x = bx + gx * cell + cell / 2, y = by + gy * cell + cell / 2;
        const bk = (t - bumpT) / 0.25; if (bk >= 0 && bk < 1) { const o = Math.sin(bk * Math.PI) * cell * 0.15; x += DX[bumpDir] * o; y += DY[bumpDir] * o; }
        return {x, y, gx, gy, moving: k < 1, k};
      }
      function drawRock(i, t) {
        const x = cx(i), y = cy(i), r = cell * 0.43;
        ctx.fillStyle = 'rgba(40,70,110,.25)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * 0.95, r * 0.35, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.55); ctx.quadraticCurveTo(x - r * 1.05, y - r * 0.3, x - r * 0.35, y - r * 0.75); ctx.quadraticCurveTo(x + r * 0.2, y - r * 1.05, x + r * 0.75, y - r * 0.45); ctx.quadraticCurveTo(x + r * 1.1, y + r * 0.1, x + r, y + r * 0.55); ctx.closePath();
        const g = ctx.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, '#9aa8bb'); g.addColorStop(1, '#5d6a80'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.6; ctx.stroke();
        /* snow cap */
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - r * 0.62, y - r * 0.5); ctx.quadraticCurveTo(x - r * 0.1, y - r * 1.12, x + r * 0.62, y - r * 0.5); ctx.quadraticCurveTo(x + r * 0.3, y - r * 0.25, x + r * 0.05, y - r * 0.42); ctx.quadraticCurveTo(x - r * 0.3, y - r * 0.22, x - r * 0.62, y - r * 0.5); ctx.fill();
      }
      function draw(t) {
        if (!W || !P) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5b7fc9'); g.addColorStop(1, '#a8d4f2'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        /* distant snowy hills */
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * 0.72 - Math.sin(x * 0.012) * 20 - Math.sin(x * 0.031) * 8); ctx.lineTo(W, H); ctx.fill();
        /* board: ice */
        const bw = cell * S;
        rr(ctx, bx - 7, by - 7, bw + 14, bw + 14, 14); ctx.fillStyle = '#eaf7ff'; ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 3; ctx.stroke();
        const ig = ctx.createLinearGradient(bx, by, bx + bw, by + bw); ig.addColorStop(0, '#d9f1ff'); ig.addColorStop(0.5, '#bfe4fb'); ig.addColorStop(1, '#a6d7f5'); rr(ctx, bx, by, bw, bw, 8); ctx.fillStyle = ig; ctx.fill();
        ctx.save(); rr(ctx, bx, by, bw, bw, 8); ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
        for (let k = 1; k < S; k++) { ctx.beginPath(); ctx.moveTo(bx + k * cell, by); ctx.lineTo(bx + k * cell, by + bw); ctx.moveTo(bx, by + k * cell); ctx.lineTo(bx + bw, by + k * cell); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(120,170,210,.4)';
        for (const c of cracks) { const x = bx + c.x * bw, y = by + c.y * bw, l = c.l * cell; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(c.a) * l, y + Math.sin(c.a) * l); ctx.lineTo(x + Math.cos(c.a + 0.6) * l * 1.6, y + Math.sin(c.a + 0.6) * l * 1.6); ctx.stroke(); }
        /* sheen sweeping over the ice */
        const sx = bx + ((t * 0.12) % 1.6 - 0.3) * bw; const sh = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.35)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(bx, by, bw, bw);
        ctx.restore();
        /* trail of this attempt */
        if (hist.length) {
          ctx.strokeStyle = 'rgba(80,140,200,.45)'; ctx.lineWidth = Math.max(2, cell * 0.12); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([cell * 0.15, cell * 0.2]);
          ctx.beginPath(); ctx.moveTo(cx(P.start), cy(P.start)); for (let k = 1; k < hist.length; k++) ctx.lineTo(cx(hist[k]), cy(hist[k])); ctx.lineTo(cx(pos), cy(pos)); ctx.stroke(); ctx.setLineDash([]);
        }
        /* start mark */
        ctx.strokeStyle = 'rgba(42,74,106,.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(cx(P.start), cy(P.start), cell * 0.36, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        /* igloo tile */
        const gx = cx(P.goal), gy = cy(P.goal), pul = 0.5 + 0.5 * Math.sin(t * 3.5);
        ctx.fillStyle = 'rgba(255,216,74,' + (0.25 + pul * 0.25) + ')'; rr(ctx, gx - cell / 2 + 2, gy - cell / 2 + 2, cell - 4, cell - 4, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(255,190,40,.9)'; ctx.lineWidth = 2; ctx.stroke();
        drawIgloo(ctx, gx, gy + cell * 0.3, cell * 0.4, done ? 0.9 : 0);
        for (let i = 0; i < NC; i++) if (P.rock[i]) drawRock(i, t);
        /* penguin */
        const pp = penguinXY(t), dirX = DX[anim.dir], stopK = (t - stopT) / 0.3;
        let squash = 0; if (stopK >= 0 && stopK < 1) squash = Math.sin(stopK * Math.PI) * 0.6 * (1 - stopK);
        let px = pp.x, py = pp.y + cell * 0.32, sc = cell / 32;
        if (done) { const k = Math.min(1, (t - solvedAt) / 0.9); sc *= 1 - k * 0.65; py -= k * cell * 0.05; }
        if (pp.moving) {
          /* spray behind */
          ctx.fillStyle = 'rgba(255,255,255,.8)';
          for (let k = 0; k < 4; k++) { const a = (t * 20 + k * 1.7) % 1; ctx.globalAlpha = 1 - a; ctx.beginPath(); ctx.arc(px - DX[anim.dir] * cell * (0.3 + a * 0.5) + (k - 1.5) * 2, py - 2 - DY[anim.dir] * cell * (0.3 + a * 0.5) - a * 6, 1.5 + a * 2, 0, TAU); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = 'rgba(40,70,110,.25)'; ctx.beginPath(); ctx.ellipse(px, py, cell * 0.28 * sc / (cell / 32), cell * 0.08, 0, 0, TAU); ctx.fill();
        drawPenguin(ctx, px, py, sc, t, {lean: pp.moving ? dirX * 1.2 + (DY[anim.dir] ? 0.0 : 0) : Math.sin(t * 2) * 0.08, slide: pp.moving, squash, happy: done});
        /* fx */
        for (let k = fx.length - 1; k >= 0; k--) {
          const f = fx[k], a = (t - f.t0) / f.life; if (a >= 1) { fx.splice(k, 1); continue; } if (a < 0) continue;
          ctx.globalAlpha = 1 - a; ctx.fillStyle = f.col; const x = f.x + f.vx * a, y = f.y + f.vy * a + f.g * a * a;
          if (f.flake) { ctx.save(); ctx.translate(x, y); ctx.rotate(a * 4); ctx.strokeStyle = f.col; ctx.lineWidth = 1.3; ctx.beginPath(); for (let j = 0; j < 3; j++) { const an = j * Math.PI / 3; ctx.moveTo(-Math.cos(an) * f.r, -Math.sin(an) * f.r); ctx.lineTo(Math.cos(an) * f.r, Math.sin(an) * f.r); } ctx.stroke(); ctx.restore(); }
          else { ctx.beginPath(); ctx.arc(x, y, f.r, 0, TAU); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
        /* falling snow */
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (const f of flakes) { const y = ((f.y + t * f.s * 0.06) % 1) * H, x = f.x * W + Math.sin(t * 0.8 + f.ph) * 10; ctx.beginPath(); ctx.arc(x, y, f.r, 0, TAU); ctx.fill(); }
        drawPanel(t);
        if (done) {
          const a = Math.min(1, (t - solvedAt) / 0.4); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; fnt(ctx, '700', compact ? 22 : 30);
          const tx = bx + bw / 2, ty = by + bw * 0.22 + Math.sin(t * 4) * 3; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = '#2a4a6a'; const wt = tr('Ab ins Iglu!', 'Into the igloo!'); ctx.strokeText(wt, tx, ty); ctx.fillStyle = '#fff'; ctx.fillText(wt, tx, ty); ctx.restore();
        }
      }
      function drawPanel(t) {
        const x = panelX, w = W - panelX - 8; if (w < 60) return;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        let y = by + (compact ? 14 : 20);
        fnt(ctx, '700', compact ? 14 : 17); ctx.fillStyle = '#2a4a6a'; ctx.fillText(tr('Züge', 'Moves'), x, y);
        y += compact ? 32 : 42;
        const left = limit - moves;
        fnt(ctx, '700', compact ? 30 : 40); ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#2a4a6a'; const txt = moves + ' / ' + limit; ctx.strokeText(txt, x, y); ctx.fillStyle = left <= 1 && !done ? '#ffb3c4' : '#ffffff'; ctx.fillText(txt, x, y);
        y += compact ? 14 : 20;
        const dw = Math.min(14, (w - 4) / limit - 2);
        for (let k = 0; k < limit; k++) { ctx.beginPath(); ctx.arc(x + dw / 2 + k * (dw + 2), y, dw / 2, 0, TAU); ctx.fillStyle = k < moves ? (k >= P.opt ? '#ff9eb0' : '#5b7fc9') : 'rgba(255,255,255,.75)'; ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1; ctx.stroke(); }
        y += compact ? 18 : 26;
        fnt(ctx, '600', compact ? 11 : 13); ctx.fillStyle = '#21405e';
        ctx.fillText(tr('Beste Lösung: ' + P.opt + ' Züge', 'Best solution: ' + P.opt + ' moves'), x, y);
      }

      let raf = 0, alive = true;
      const loop = () => { if (!alive) return; draw(performance.now() / 1000); raf = requestAnimationFrame(loop); };

      /* ---------- moves ---------- */
      function puff(i, n, col) { const now = performance.now() / 1000; for (let k = 0; k < n; k++) { const a = rng() * TAU, v = 15 + rng() * 40; fx.push({x: cx(i), y: cy(i) + cell * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 20, g: 30, r: 1.5 + rng() * 2.5, life: 0.4 + rng() * 0.3, t0: now + 0.02, col: col || '#ffffff'}); } }
      function move(d) {
        if (busy || done) return;
        const now = performance.now() / 1000, j = slide(P.rock, pos, d);
        if (j === pos) { bumpT = now; bumpDir = d; snd(A => A.tone(150, 0.1, {type: 'triangle', gain: 0.12})); return; }
        const cur = penguinXY(now);
        const dist = Math.abs((j % S) - (pos % S)) + Math.abs(((j / S) | 0) - ((pos / S) | 0));
        hist.push(pos); pos = j; moves++;
        anim = {fx: cur.gx, fy: cur.gy, to: j, t0: now, dur: 0.08 + dist * 0.045, dir: d};
        stopT = now + anim.dur; const dur = anim.dur;
        snd(A => { A.noise(dur, {type: 'bandpass', freq: 2600, freqTo: 1200, q: 2, gain: 0.07}); A.tone(260, 0.08, {type: 'triangle', gain: 0.1, delay: dur}); });
        timers.push(setTimeout(() => { if (alive) puff(j, 7); }, dur * 1000));
        if (j === P.goal) { busy = true; timers.push(setTimeout(win, dur * 1000 + 60)); return; }
        if (moves >= limit) {
          busy = true;
          timers.push(setTimeout(() => {
            if (!alive) return;
            api.wrong(tr('Keine Züge mehr! Die Bestlösung braucht nur ' + P.opt + '. Der Pinguin rutscht zurück zum Start.', 'Out of moves! The best solution needs only ' + P.opt + '. The penguin slides back to the start.'));
            timers.push(setTimeout(() => { if (alive) { reset(); draw(performance.now() / 1000); } }, 900));
          }, dur * 1000 + 120));
        }
      }
      function win() {
        if (done) return; done = true; busy = true; solvedAt = performance.now() / 1000;
        api.msg(tr('Genau angehalten! Der Pinguin watschelt ins Iglu.', 'A perfect stop! The penguin waddles into the igloo.'), 'good');
        const now = solvedAt; for (let k = 0; k < 28; k++) { const a = rng() * TAU, v = 30 + rng() * 80; fx.push({x: cx(P.goal), y: cy(P.goal), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 40, r: 2 + rng() * 3, life: 0.8 + rng() * 0.6, t0: now + rng() * 0.3, col: k % 2 ? '#ffffff' : '#ffd84a', flake: k % 3 === 0}); }
        snd(A => { [784, 988, 1175, 1568, 1976].forEach((f, k) => A.bell(f, 0.4, 0.1, k * 0.08)); A.tone(500, 0.2, {type: 'square', gain: 0.04, slide: 900, delay: 0.45}); });
        draw(now);
        timers.push(setTimeout(() => api.solved(), 1100));
      }
      function undo() {
        if (busy || done || !hist.length) { api.sfx('bump'); return; }
        const p = hist.pop(), now = performance.now() / 1000; const cur = penguinXY(now); anim = {fx: cur.gx, fy: cur.gy, to: p, t0: now, dur: 0.18, dir: anim.dir}; pos = p; moves--; stopT = -9;
        snd(A => A.tone(500, 0.12, {type: 'sine', slide: 300, gain: 0.08}));
      }

      let sw = null;
      const onDown = e => { if (busy) return; e.preventDefault(); sw = {id: e.pointerId, x: e.clientX, y: e.clientY}; };
      const onUp = e => {
        if (!sw || sw.id !== e.pointerId) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
        let ddx = dx, ddy = dy;
        if (Math.hypot(dx, dy) < 18) {
          /* a tap on the field: move towards the tapped point */
          const r = cv.getBoundingClientRect(), tx = e.clientX - r.left, ty = e.clientY - r.top;
          if (tx < bx || ty < by || tx > bx + cell * S || ty > by + cell * S) return;
          ddx = tx - cx(pos); ddy = ty - cy(pos);
          if (Math.hypot(ddx, ddy) < cell * 0.5) return;
        }
        move(Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 1 : 3) : (ddy > 0 ? 2 : 0));
      };
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', () => { sw = null; });
      arrows.forEach((b, d) => b.addEventListener('pointerdown', e => { e.preventDefault(); move(d); }));
      bUndo.addEventListener('click', undo);
      bReset.addEventListener('click', () => { if (busy) return; api.sfx('select'); reset(); api.msg(tr('Zurück zum Start.', 'Back to the start.'), 'info'); });
      const KEYS = {ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3};
      const onKey = e => {
        if (!root.isConnected) return;
        if (e.code in KEYS) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) move(KEYS[e.code]); }
        else if (e.code === 'Backspace') { e.preventDefault(); e.stopPropagation(); undo(); }
      };
      document.addEventListener('keydown', onKey, true);

      newLevel();
      const ro = new ResizeObserver(() => layout()); ro.observe(root);
      layout();
      raf = requestAnimationFrame(loop);

      return {
        _s: () => ({P, pos, moves, limit, cell, bx, by, done, busy}),
        destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey, true); },
        autoSolve() {
          if (done) return; timers.forEach(clearTimeout); timers = []; reset(); busy = true;
          P.sol.forEach((d, k) => timers.push(setTimeout(() => { busy = false; move(d); if (!done && pos !== P.goal) busy = true; }, 150 + k * 260)));
          timers.push(setTimeout(() => { if (!done) { pos = P.goal; win(); } }, 400 + P.sol.length * 260));
        },
      };
    },
  });
})();

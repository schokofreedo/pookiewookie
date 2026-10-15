/* The Starway Home puzzle: himmel-laternen "Die Laternen des Schlosses".
   Lights Out 5x5 with castle lanterns: tapping a lantern toggles it and its four neighbours; goal: all 25 lit.
   The start is 6..9 random taps applied to "all lit" (so it is always solvable), with at least 8 dark lanterns; a GF(2) solver
   checks every start, rates it (minimum number of taps) and drives autoSolve from the current state. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, FONT = '"Fredoka", sans-serif';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

  /* ---------- tiny shared helpers ---------- */
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function txt(g, s, x, y, px, col, o) {
    o = o || {}; g.font = (o.w || 700) + ' ' + px + 'px ' + FONT; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.sw || px * 0.28; g.strokeStyle = o.stroke; g.strokeText(s, x, y); }
    if (o.glow) { g.save(); g.shadowColor = o.glow; g.shadowBlur = o.blur || px * 0.6; g.fillStyle = col; g.fillText(s, x, y); g.restore(); }
    g.fillStyle = col; g.fillText(s, x, y);
  }
  function makeStage(root, hooks) {
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
    root.appendChild(cv);
    const ctx = cv.getContext('2d');
    const S = {cv, ctx, w: 0, h: 0, dpr: 1, t: 0, hits: [], hover: null, dead: false, last: performance.now(), raf: 0};
    S.hit = (id, x, y, w, h, data) => S.hits.push({id, x, y, w, h, data});
    S.render = dt => { if (!S.w) return; S.dt = dt || 0; ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); S.hits.length = 0; hooks.draw(ctx, S); };
    const resize = () => {
      const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === S.w && h === S.h && dpr === S.dpr) return;
      S.w = w; S.h = h; S.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      if (hooks.layout) hooks.layout(S); S.render(0);
    };
    const find = (x, y) => { for (let i = S.hits.length - 1; i >= 0; i--) { const b = S.hits[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; };
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const down = e => { e.preventDefault(); const [x, y] = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} if (hooks.down) hooks.down(find(x, y), x, y, e); };
    const move = e => { const [x, y] = pos(e); const h = find(x, y); S.hover = e.pointerType === 'touch' ? null : (h ? h.id : null); cv.style.cursor = h ? 'pointer' : 'default'; if (hooks.move) hooks.move(h, x, y, e); };
    const up = e => { const [x, y] = pos(e); if (hooks.up) hooks.up(find(x, y), x, y, e); };
    const leave = () => { S.hover = null; };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', leave);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(root); window.addEventListener('resize', resize);
    const loop = now => { if (S.dead) return; const dt = Math.min(0.05, Math.max(0, (now - S.last) / 1000)); S.last = now; S.t += dt; S.render(dt); S.raf = requestAnimationFrame(loop); };
    resize(); S.raf = requestAnimationFrame(loop);
    /* the host may still change the header/footer height right after mounting: re-measure a few times */
    const reT = [30, 200, 600].map(ms => setTimeout(resize, ms));
    S.destroy = () => { S.dead = true; reT.forEach(clearTimeout); cancelAnimationFrame(S.raf); if (ro) ro.disconnect(); window.removeEventListener('resize', resize); cv.remove(); };
    return S;
  }
  function tone(f, d, o) { try { G.audio.tone(f, d, o); } catch (e) {} }
  function bell(f, d, gn, dl) { try { G.audio.bell(f, d, gn, dl); } catch (e) { tone(f, d, {type: 'sine', gain: gn, delay: dl}); } }

  /* ---------- Lights Out model (bit i = row*5+col, 1 = dark) ---------- */
  const N = 5, ALL = (1 << 25) - 1;
  const TOG = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    let m = 1 << (r * N + c);
    if (r > 0) m |= 1 << ((r - 1) * N + c); if (r < N - 1) m |= 1 << ((r + 1) * N + c);
    if (c > 0) m |= 1 << (r * N + c - 1); if (c < N - 1) m |= 1 << (r * N + c + 1);
    TOG.push(m);
  }
  const pop = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  /* minimum set of taps that turns `dark` into all-lit, or null if unsolvable */
  function solve(dark) {
    const rows = TOG.map((m, j) => ({m, b: (dark >> j) & 1}));
    const pivCol = [], pivRow = [];
    let r = 0;
    for (let c = 0; c < 25 && r < 25; c++) {
      let p = -1; for (let k = r; k < 25; k++) if ((rows[k].m >> c) & 1) { p = k; break; }
      if (p < 0) continue;
      [rows[r], rows[p]] = [rows[p], rows[r]];
      for (let k = 0; k < 25; k++) if (k !== r && ((rows[k].m >> c) & 1)) { rows[k].m ^= rows[r].m; rows[k].b ^= rows[r].b; }
      pivCol.push(c); pivRow.push(r); r++;
    }
    for (let k = r; k < 25; k++) if (rows[k].b) return null;
    const isPiv = new Set(pivCol), free = []; for (let c = 0; c < 25; c++) if (!isPiv.has(c)) free.push(c);
    let best = null, bestN = 99;
    for (let f = 0; f < (1 << free.length); f++) {
      let x = 0; free.forEach((c, i) => { if ((f >> i) & 1) x |= 1 << c; });
      pivCol.forEach((c, i) => { const row = rows[pivRow[i]]; const v = row.b ^ (pop(row.m & x & ~(1 << c)) & 1); if (v) x |= 1 << c; });
      /* verify */
      let d = dark; for (let i = 0; i < 25; i++) if ((x >> i) & 1) d ^= TOG[i];
      if (d !== 0) continue;
      const n = pop(x); if (n < bestN) { bestN = n; best = x; }
    }
    return best;
  }
  function generate(rng) {
    for (let tries = 0; tries < 500; tries++) {
      const k = 6 + Math.floor(rng() * 4), cells = new Set();
      while (cells.size < k) cells.add(Math.floor(rng() * 25));
      let d = 0; cells.forEach(i => { d ^= TOG[i]; });
      if (pop(d) < 8) continue;
      const sol = solve(d);
      if (sol === null || pop(sol) < 6) continue;
      return d;
    }
    let d = 0; [0, 6, 12, 18, 24, 4, 20].forEach(i => { d ^= TOG[i]; }); return d;
  }

  /* ---------- lantern painter ---------- */
  function lantern(g, x, y, s, lv, t, seed, hot) {
    /* x,y = hook point; lantern hangs below; s = cell size */
    const bw = s * 0.42, bh = s * 0.46, top = y + s * 0.16;
    g.strokeStyle = '#2a1508'; g.lineWidth = Math.max(1.2, s * 0.03); g.beginPath(); g.moveTo(x, y); g.lineTo(x, top); g.stroke();
    if (lv > 0.02) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x, top + bh * 0.6, 0, x, top + bh * 0.6, s * (0.75 + 0.06 * Math.sin(t * 3 + seed)));
      gr.addColorStop(0, 'rgba(255,200,80,' + (0.55 * lv) + ')'); gr.addColorStop(0.45, 'rgba(255,150,60,' + (0.22 * lv) + ')'); gr.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = gr; g.fillRect(x - s, top - s * 0.4, s * 2, s * 2); g.restore();
    }
    /* ring + cap */
    g.beginPath(); g.arc(x, top - s * 0.02, s * 0.05, 0, TAU); g.lineWidth = Math.max(1.2, s * 0.03); g.strokeStyle = '#2a1508'; g.stroke();
    g.beginPath(); g.moveTo(x - bw * 0.34, top + s * 0.03); g.lineTo(x + bw * 0.34, top + s * 0.03); g.lineTo(x + bw * 0.62, top + s * 0.12); g.lineTo(x - bw * 0.62, top + s * 0.12); g.closePath();
    g.fillStyle = '#7a3b57'; g.fill(); g.lineWidth = Math.max(1.5, s * 0.035); g.strokeStyle = '#2a1018'; g.lineJoin = 'round'; g.stroke();
    /* body */
    const by = top + s * 0.12;
    rr(g, x - bw / 2, by, bw, bh, s * 0.1);
    const lit = lv;
    const body = g.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
    if (lit > 0.5) { body.addColorStop(0, '#ffb347'); body.addColorStop(0.5, '#fff1a8'); body.addColorStop(1, '#ff9a3a'); }
    else { body.addColorStop(0, '#2c2c58'); body.addColorStop(0.5, '#43457a'); body.addColorStop(1, '#262650'); }
    g.fillStyle = body; g.fill();
    if (lit > 0.02 && lit < 0.98) { g.save(); g.globalAlpha = lit < 0.5 ? lit * 2 * 0.6 : (1 - lit) * 2 * 0.6; g.fillStyle = lit < 0.5 ? '#ffd84a' : '#43457a'; g.fill(); g.restore(); }
    g.lineWidth = Math.max(1.5, s * 0.035); g.strokeStyle = '#2a1018'; g.stroke();
    /* frame bars */
    g.strokeStyle = lit > 0.5 ? 'rgba(122,59,87,.9)' : 'rgba(20,16,40,.9)'; g.lineWidth = Math.max(1, s * 0.022);
    g.beginPath(); g.moveTo(x - bw * 0.17, by + 1); g.lineTo(x - bw * 0.17, by + bh - 1); g.moveTo(x + bw * 0.17, by + 1); g.lineTo(x + bw * 0.17, by + bh - 1); g.stroke();
    /* flame / ember */
    if (lit > 0.5) {
      const fh = bh * 0.42 * (1 + 0.08 * Math.sin(t * 10 + seed)), fy = by + bh * 0.72;
      g.beginPath(); g.moveTo(x, fy - fh); g.quadraticCurveTo(x + bw * 0.18, fy - fh * 0.35, x, fy); g.quadraticCurveTo(x - bw * 0.18, fy - fh * 0.35, x, fy - fh); g.fillStyle = '#ff6f3c'; g.fill();
      g.beginPath(); g.moveTo(x, fy - fh * 0.6); g.quadraticCurveTo(x + bw * 0.09, fy - fh * 0.2, x, fy); g.quadraticCurveTo(x - bw * 0.09, fy - fh * 0.2, x, fy - fh * 0.6); g.fillStyle = '#fff'; g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, x - bw * 0.38, by + bh * 0.12, bw * 0.12, bh * 0.4, bw * 0.06); g.fill();
    } else {
      g.beginPath(); g.arc(x, by + bh * 0.68, Math.max(1, s * 0.025), 0, TAU); g.fillStyle = 'rgba(255,140,90,' + (0.35 + 0.2 * Math.sin(t * 2 + seed)) + ')'; g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; rr(g, x - bw * 0.38, by + bh * 0.12, bw * 0.12, bh * 0.4, bw * 0.06); g.fill();
    }
    /* base + tassel */
    rr(g, x - bw * 0.36, by + bh - s * 0.01, bw * 0.72, s * 0.07, s * 0.03); g.fillStyle = '#7a3b57'; g.fill(); g.lineWidth = Math.max(1.2, s * 0.03); g.strokeStyle = '#2a1018'; g.stroke();
    g.strokeStyle = hot ? '#ffd84a' : '#ff6f9c'; g.lineWidth = Math.max(1.5, s * 0.04); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, by + bh + s * 0.06); g.lineTo(x + Math.sin(t * 2 + seed) * s * 0.02, by + bh + s * 0.14); g.stroke(); g.lineCap = 'butt';
  }

  /* ---------- in-level station: a castle lantern post ---------- */
  function station(g, x, y, t, solved) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 12, 3, 0, 0, TAU); g.fill();
    rr(g, x - 8, y - 6, 16, 6, 2); g.fillStyle = '#8a8aa8'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#2a2040'; g.stroke();
    g.fillStyle = '#4a3a6a'; g.fillRect(x - 2, y - 34, 4, 28); g.strokeRect(x - 2, y - 34, 4, 28);
    g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + 9, y - 34); g.stroke();
    const lv = solved ? 1 : 0.5 + 0.5 * Math.sin(t * 2.2);
    g.translate(0, 0);
    lantern(g, x + 9, y - 34, 26, solved ? 1 : (lv > 0.5 ? 1 : 0), t, 1, false);
    g.restore();
  }

  /* ---------- mount ---------- */
  function mount(root, api) {
    const rng = api.rng || Math.random;
    let start = generate(rng), dark = start, moves = 0, done = false, winT = -1, lastTap = -1, auto = false;
    const cells = []; for (let i = 0; i < 25; i++) { const d = (dark >> i) & 1; cells.push({lv: d ? 0 : 1, sw: 0, swV: 0, pop: 0, ph: Math.random() * 6}); }
    const parts = [], stars = [];
    for (let i = 0; i < 70; i++) stars.push({x: Math.random(), y: Math.random() * 0.8, r: 0.5 + Math.random() * 1.3, ph: Math.random() * 6});
    let L = {}, pressBtn = null, pressT = 0;
    const timers = []; const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

    function burst(x, y, n, cols, sp, grav) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.3 + Math.random()) * (sp || 120); parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.7, age: 0, r: 1.2 + Math.random() * 2.2, col: cols[i % cols.length], star: Math.random() < 0.5, g: grav === undefined ? 160 : grav}); } }
    function cellCenter(i) { const r = Math.floor(i / N), c = i % N; return [L.gx + c * L.cs + L.cs / 2, L.gy + r * L.cs]; }

    function layout(S) {
      const w = S.w, h = S.h, pad = Math.max(6, Math.min(12, h * 0.03));
      const side = clamp(w * 0.26, 170, 240);
      const cs = Math.floor(Math.min((h - pad * 2) / (N + 0.2), (w - side - pad * 4) / N));
      L.cs = cs; L.gw = cs * N;
      const free = w - side - pad * 2;
      L.gx = Math.round(pad + (free - L.gw) / 2); L.gy = Math.round((h - cs * (N + 0.2)) / 2);
      L.side = {x: w - side - pad, y: pad, w: side, h: h - pad * 2};
    }

    function tap(i, silent) {
      if (done) return;
      dark ^= TOG[i]; moves++; lastTap = i;
      const m = TOG[i];
      for (let k = 0; k < 25; k++) if ((m >> k) & 1) { const c = cells[k]; c.swV += (k === i ? 0 : (k % N < i % N ? -1 : 1) * 2.5) + (Math.random() - 0.5); c.pop = k === i ? 1 : 0.5; const lit = !((dark >> k) & 1); const [x, y] = cellCenter(k); if (lit) burst(x, y + L.cs * 0.45, 5, ['#ffd84a', '#fff4e0', '#ffb347'], 70, 40); }
      const litN = 25 - pop(dark);
      if (!silent) { bell(440 * Math.pow(2, litN / 25 * 1.5), 0.35, 0.12, 0); tone(660 + litN * 12, 0.06, {type: 'triangle', gain: 0.08}); }
      if (dark === 0) win();
    }
    function win() {
      if (done) return; done = true; winT = 0;
      [0, 1, 2, 3].forEach(k => later(() => { try { G.audio.sfx.bell(k); } catch (e) {} }, k * 110));
      for (let k = 0; k < 6; k++) later(() => { const x = L.gx + Math.random() * L.gw, y = L.gy + Math.random() * L.cs * 3; burst(x, y, 30, ['#ffd84a', '#ff9eb0', '#8fd3ff', '#fff4e0', '#9be7a5'], 170, 60); tone(800 + Math.random() * 600, 0.12, {type: 'sine', gain: 0.07}); }, 120 + k * 140);
      later(() => api.solved(), 1000);
    }
    function reset() {
      if (done) return; dark = start; moves = 0; for (let i = 0; i < 25; i++) cells[i].swV += (Math.random() - 0.5) * 3;
      tone(392, 0.12, {type: 'triangle', gain: 0.14}); tone(330, 0.16, {type: 'triangle', gain: 0.12, delay: 0.08});
      api.msg(tr('Zurück zum Anfangsmuster.', 'Back to the starting pattern.'), 'info');
    }
    function fresh() {
      if (done) return; start = generate(rng); dark = start; moves = 0; for (let i = 0; i < 25; i++) cells[i].swV += (Math.random() - 0.5) * 4;
      try { G.audio.sfx.appear(); } catch (e) {}
      api.msg(tr('Ein neues Laternenmuster!', 'A new lantern pattern!'), 'info');
    }

    function draw(g, S) {
      const {w, h, t} = S, dt = S.dt || 0; pressT = Math.max(0, pressT - dt); if (winT >= 0) winT += dt;
      /* night sky */
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#141642'); sky.addColorStop(0.6, '#33296a'); sky.addColorStop(1, '#6a4a8a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      for (const s of stars) { g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + s.ph)); g.fillStyle = '#fff4e0'; g.beginPath(); g.arc(s.x * w, s.y * h, s.r, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      /* moon */
      const mx = (L.gx + L.gw + L.side.x) / 2 + L.cs * 0.2, my = h * 0.15, mr = Math.min(24, h * 0.075);
      const mg = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3); mg.addColorStop(0, 'rgba(255,244,224,.35)'); mg.addColorStop(1, 'rgba(255,244,224,0)'); g.fillStyle = mg; g.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
      g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fillStyle = '#fff4e0'; g.fill(); g.beginPath(); g.arc(mx + mr * 0.35, my - mr * 0.2, mr * 0.85, 0, TAU); g.fillStyle = 'rgba(20,22,66,.0)'; g.fill();
      g.fillStyle = 'rgba(200,190,170,.5)'; g.beginPath(); g.arc(mx - mr * 0.3, my + mr * 0.2, mr * 0.18, 0, TAU); g.fill(); g.beginPath(); g.arc(mx + mr * 0.25, my - mr * 0.3, mr * 0.12, 0, TAU); g.fill();
      /* castle silhouettes */
      castle(g, L.gx - L.cs * 0.9, h, L.cs * 1.2, h * 0.75, t);
      castle(g, L.gx + L.gw + L.cs * 0.1, h, L.cs * 0.8, h * 0.55, t);
      /* garlands per row */
      for (let r = 0; r < N; r++) {
        const y = L.gy + r * L.cs + L.cs * 0.1;
        g.strokeStyle = 'rgba(42,21,8,.85)'; g.lineWidth = Math.max(1.5, L.cs * 0.035);
        g.beginPath(); g.moveTo(L.gx - L.cs * 0.1, y - L.cs * 0.05);
        for (let c = 0; c < N; c++) { const x = L.gx + c * L.cs + L.cs / 2; g.quadraticCurveTo(x - L.cs * 0.25, y + L.cs * 0.08, x, y); }
        g.quadraticCurveTo(L.gx + L.gw, y + L.cs * 0.06, L.gx + L.gw + L.cs * 0.1, y - L.cs * 0.05); g.stroke();
      }
      /* hover preview of the plus shape (mouse only) */
      const hov = S.hover && S.hover[0] === 'c' ? +S.hover.slice(1) : -1;
      /* lanterns */
      for (let i = 0; i < 25; i++) {
        const c = cells[i], target = (dark >> i) & 1 ? 0 : 1;
        c.lv += (target - c.lv) * Math.min(1, dt * 12); if (Math.abs(target - c.lv) < 0.01) c.lv = target;
        c.swV += (-c.sw * 40 - c.swV * 3.2) * dt; c.sw += c.swV * dt; c.pop = Math.max(0, c.pop - dt * 3);
        const [x, y] = cellCenter(i);
        const inHov = hov >= 0 && ((TOG[hov] >> i) & 1);
        if (inHov) { g.fillStyle = 'rgba(255,216,74,.13)'; rr(g, x - L.cs * 0.46, y + L.cs * 0.04, L.cs * 0.92, L.cs * 0.92, L.cs * 0.2); g.fill(); }
        let lv = c.lv;
        if (winT >= 0) { const wv = Math.sin(winT * 8 - (Math.floor(i / N) + i % N) * 0.7); lv = 1; c.pop = Math.max(c.pop, wv > 0.85 ? 0.6 : 0); }
        g.save(); g.translate(x, y + L.cs * 0.1); g.rotate(c.sw * 0.25 + Math.sin(t * 1.2 + c.ph) * 0.03); const sc = 1 + c.pop * 0.18; g.scale(sc, sc);
        lantern(g, 0, 0, L.cs * 1.05, lv, t, c.ph, inHov && i === hov);
        g.restore();
        S.hit('c' + i, x - L.cs / 2, y, L.cs, L.cs, i);
      }
      drawSide(g, S);
      /* particles */
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = 1 - p.age / p.life; g.fillStyle = p.col; if (p.star) { const r = p.r * 1.7; g.beginPath(); g.moveTo(p.x, p.y - r); g.lineTo(p.x + r * 0.3, p.y - r * 0.3); g.lineTo(p.x + r, p.y); g.lineTo(p.x + r * 0.3, p.y + r * 0.3); g.lineTo(p.x, p.y + r); g.lineTo(p.x - r * 0.3, p.y + r * 0.3); g.lineTo(p.x - r, p.y); g.lineTo(p.x - r * 0.3, p.y - r * 0.3); g.closePath(); g.fill(); } else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); } }
      g.restore(); g.globalAlpha = 1;
    }
    function castle(g, x, base, w, hgt, t) {
      g.fillStyle = 'rgba(30,22,64,.85)';
      const tw = w * 0.5;
      g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - hgt);
      const mer = 4, mw = tw / (mer * 2 - 1);
      for (let k = 0; k < mer * 2 - 1; k++) { const xx = x + k * mw; if (k % 2 === 0) { g.lineTo(xx, base - hgt - mw); g.lineTo(xx + mw, base - hgt - mw); g.lineTo(xx + mw, base - hgt); } else g.lineTo(xx + mw, base - hgt); }
      g.lineTo(x + tw, base - hgt * 0.55); g.lineTo(x + w, base - hgt * 0.55); g.lineTo(x + w, base); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,216,74,' + (0.55 + 0.2 * Math.sin(t * 2 + x)) + ')'; rr(g, x + tw * 0.35, base - hgt * 0.8, tw * 0.3, hgt * 0.1, tw * 0.15); g.fill();
      rr(g, x + tw * 0.35, base - hgt * 0.45, tw * 0.3, hgt * 0.1, tw * 0.15); g.fill();
    }
    function button(g, S, id, label, x, y, w, h, col) {
      const p = pressBtn === id && pressT > 0 ? 3 : 0, hov = S.hover === id;
      rr(g, x, y + 4, w, h, h / 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
      rr(g, x, y + p, w, h, h / 2); g.fillStyle = hov ? shadeUp(col) : col; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#3a2030'; g.stroke();
      rr(g, x + 4, y + p + 3, w - 8, h * 0.35, h * 0.2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fill();
      txt(g, label, x + w / 2, y + p + h / 2 + 1, Math.min(h * 0.42, 16), '#fff', {stroke: '#3a2030', sw: 3});
      S.hit(id, x, y, w, h);
    }
    const shadeUp = c => c === '#ff6f9c' ? '#ff86ad' : (c === '#7a3b57' ? '#8e4a6a' : c);
    function drawSide(g, S) {
      const P = L.side, small = P.h < 260, t = S.t;
      rr(g, P.x, P.y, P.w, P.h, 16); g.fillStyle = 'rgba(74,34,58,.82)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,158,176,.55)'; g.stroke();
      const cx = P.x + P.w / 2; let y = P.y + (small ? 8 : 16);
      const litN = 25 - pop(dark);
      txt(g, tr('Leuchten', 'Lit'), cx, y + 6, small ? 11 : 13, '#e6c9d6', {w: 600}); y += small ? 14 : 22;
      /* progress bar */
      const bw = P.w - 28, bh = small ? 12 : 16;
      rr(g, cx - bw / 2, y, bw, bh, bh / 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
      rr(g, cx - bw / 2, y, Math.max(bh, bw * litN / 25), bh, bh / 2); const pg = g.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); pg.addColorStop(0, '#ffb347'); pg.addColorStop(1, '#ffd84a'); g.fillStyle = pg; g.fill();
      txt(g, litN + ' / 25', cx, y + bh / 2 + 0.5, bh * 0.8, '#fff', {w: 700, stroke: '#3a2030', sw: 3});
      y += bh + (small ? 8 : 16);
      txt(g, tr('Züge', 'Moves'), cx, y + 4, small ? 11 : 13, '#e6c9d6', {w: 600}); y += small ? 6 : 10;
      const mh = small ? 28 : 46;
      txt(g, String(moves), cx, y + mh / 2, mh * 0.85, '#ffd84a', {stroke: '#3a2030', sw: 5, glow: 'rgba(255,216,74,.5)', blur: 10});
      y += mh + (small ? 6 : 14);
      const bH = small ? 36 : 42, gap = small ? 6 : 10;
      const room = P.y + P.h - (small ? 8 : 14) - y;
      const y0 = y + Math.max(0, room - bH * 2 - gap);
      const spare = y0 - y;
      if (spare >= 58) {
        /* little plus diagram: what one tap does */
        const q = Math.min(15, (spare - 26) / 3), dx = cx - q * 1.5, dy = y + (spare - q * 3 - 18) / 2;
        txt(g, tr('Ein Tipp wechselt:', 'One tap switches:'), cx, dy, 11, '#e6c9d6', {w: 600});
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const on = (r === 1 || c === 1), ctr = r === 1 && c === 1;
          rr(g, dx + c * q + 1, dy + 10 + r * q + 1, q - 2, q - 2, 3);
          g.fillStyle = on ? (ctr ? 'rgba(255,216,74,' + (0.7 + 0.3 * pulse) + ')' : 'rgba(255,179,71,' + (0.45 + 0.3 * pulse) + ')') : 'rgba(255,255,255,.08)'; g.fill();
        }
      }
      button(g, S, 'reset', tr('↺ Zurücksetzen', '↺ Reset'), P.x + 12, y0, P.w - 24, bH, '#7a3b57');
      button(g, S, 'new', tr('✦ Neues Muster', '✦ New pattern'), P.x + 12, y0 + bH + gap, P.w - 24, bH, '#ff6f9c');
      if (done) { g.save(); g.globalAlpha = Math.min(1, winT * 3); txt(g, tr('Alle leuchten!', 'All lit up!'), cx, P.y + P.h * 0.5, small ? 16 : 22, '#fff4e0', {stroke: '#7a3b57', sw: 5}); g.restore(); }
      void t;
    }

    const S = makeStage(root, {
      layout, draw,
      down(h) {
        if (!h || done || auto) return;
        if (h.id[0] === 'c') tap(h.data);
        else if (h.id === 'reset') { pressBtn = 'reset'; pressT = 0.15; reset(); }
        else if (h.id === 'new') { pressBtn = 'new'; pressT = 0.15; fresh(); }
      },
    });
    api.msg(tr('Tippe eine Laterne an: Sie und ihre vier Nachbarn wechseln zwischen an und aus.', 'Tap a lantern: it and its four neighbors switch between on and off.'), 'info');

    return {
      destroy() { S.destroy(); timers.forEach(clearTimeout); },
      autoSolve() {
        if (done || auto) return; auto = true;   /* the precomputed taps must not be mixed with player taps */
        const sol = solve(dark); if (sol === null) { dark = 0; win(); return; }
        const list = []; for (let i = 0; i < 25; i++) if ((sol >> i) & 1) list.push(i);
        list.forEach((i, k) => later(() => tap(i), 120 + k * 150));
        if (!list.length) later(() => win(), 100);
      },
    };
  }

  G.PZ.register({
    id: 'himmel-laternen', world: 'himmel', slot: 1,
    title: tr('Die Laternen des Schlosses', 'The Castle Lanterns'),
    intro: tr('Bring alle 25 Laternen zum Leuchten! Tippst du eine an, wechseln sie und ihre Nachbarn oben, unten, links und rechts zwischen an und aus.', 'Make all 25 lanterns glow! When you tap one, it and its neighbors above, below, left and right switch between on and off.'),
    letter: tr('Arbeite Reihe für Reihe von oben nach unten: Ist eine Laterne dunkel, tippe die direkt darunter an. Was ganz unten dunkel übrig bleibt, verrät dir, wie du oben anfangen musst.', 'Work row by row from top to bottom: if a lantern is dark, tap the one right below it. Whatever stays dark at the very bottom tells you how to start at the top.'),
    hint: tr('Jage die dunklen Laternen nach unten (unter jede dunkle tippen). Bleiben in der untersten Reihe dunkle übrig (Plätze 1–5 von links), tippe in der obersten Reihe: 1+5 dunkel → 1 und 2 · 2+4 → 1 und 4 · 1+2+3 → 2 · 3+4+5 → 4 · 1+3+4 → 5 · 2+3+5 → 1 · 1+2+4+5 → 3. Danach noch einmal von oben nach unten jagen.', 'Chase the dark lanterns down (tap below every dark one). If dark ones are left in the bottom row (spots 1–5 from the left), tap in the top row: 1+5 dark → 1 and 2 · 2+4 → 1 and 4 · 1+2+3 → 2 · 3+4+5 → 4 · 1+3+4 → 5 · 2+3+5 → 1 · 1+2+4+5 → 3. Then chase them down from top to bottom once more.'),
    station,
    mount,
  });
})();

/* Pookiewookie puzzle: lava-mathe "Das Magma-Rechentor".
   A picture equation on a glowing basalt tablet: four clue rows (flame clusters, rock, crystal, volcano) and a question row.
   Traps: the number of flames in a cluster matters (each single flame has the same value), and the question row needs
   multiplication before addition/subtraction. Values are generated per visit; the generator asserts integer, unique values and
   that the typical wrong readings give different numbers. Entry through a carved stone keypad (also keyboard digits). */
(function () {
  const G = window.PW = window.PW || {};
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
    const move = e => { const [x, y] = pos(e); const h = find(x, y); S.hover = h ? h.id : null; cv.style.cursor = h ? 'pointer' : 'default'; if (hooks.move) hooks.move(h, x, y, e); };
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
  function noise(d, o) { try { G.audio.noise(d, o); } catch (e) {} }

  /* ---------- the equation model ---------- */
  /* tokens: {k:'F', n:2|3} flame cluster, {k:'R'} rock, {k:'C'} crystal, {k:'V'} volcano; operators '+', '−', '×' */
  function evalRow(tokens, val, leftToRight) {
    const nums = [], ops = [];
    tokens.forEach((tk, i) => { if (i % 2) ops.push(tk); else nums.push(val(tk)); });
    if (leftToRight) { let r = nums[0]; ops.forEach((o, i) => { const b = nums[i + 1]; r = o === '+' ? r + b : (o === '−' ? r - b : r * b); }); return r; }
    /* multiplication first */
    const n2 = [nums[0]], o2 = [];
    ops.forEach((o, i) => { if (o === '×') n2[n2.length - 1] *= nums[i + 1]; else { o2.push(o); n2.push(nums[i + 1]); } });
    let r = n2[0]; o2.forEach((o, i) => { r = o === '+' ? r + n2[i + 1] : r - n2[i + 1]; }); return r;
  }
  function generate(rng) {
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    for (let tries = 0; tries < 2000; tries++) {
      const u = ri(2, 4), kc = rng() < 0.5 ? 3 : 2, kq = 5 - kc;
      const R = ri(5, 12), C = ri(2, 9), V = ri(3, 12);
      const vals = {R, C, V};
      if (new Set([u * kc, u * kq, R, C, V]).size < 5) continue;
      const F = n => ({k: 'F', n}), T = k => ({k});
      const val = tk => tk.k === 'F' ? tk.n * u : vals[tk.k];
      const clues = [
        [F(kc), '+', F(kc), '+', F(kc)],
        rng() < 0.5 ? [T('R'), '+', T('R'), '+', F(kc)] : [T('R'), '+', F(kc), '+', T('R')],
        rng() < 0.5 ? [T('C'), '+', T('R'), '+', T('C')] : [T('R'), '+', T('C'), '+', T('C')],
        /* the volcano row already needs "Punkt vor Strich": read left to right it gives a wrong (mostly non-integer) volcano */
        rng() < 0.5 ? [T('V'), '+', T('V'), '×', T('C')] : [T('V'), '+', T('C'), '×', T('V')],
      ];
      const q = rng() < 0.5 ? [T('R'), '+', F(kq), '×', T('V'), '−', T('C')] : [T('V'), '+', T('C'), '×', F(kq), '−', T('R')];
      const results = clues.map(r => evalRow(r, val));
      const ans = evalRow(q, val);
      if (results.some(v => v <= 0 || v > 120) || ans < 10 || ans > 199) continue;
      /* the left-to-right misreading of the volcano row must not give the same row value */
      if (evalRow(clues[3], val, true) === results[3]) continue;
      /* the classic wrong readings must give other numbers */
      const valWrongCluster = tk => tk.k === 'F' ? kc * u : vals[tk.k];
      const traps = [evalRow(q, val, true), evalRow(q, valWrongCluster), evalRow(q, valWrongCluster, true)];
      if (traps.some(v => v === ans)) continue;
      /* uniqueness: brute force every integer assignment of (flame, rock, crystal, volcano) against the clue rows */
      let found = 0, sol = null;
      for (let fu = 1; fu <= 20; fu++) {
        const v1 = tk => tk.k === 'F' ? tk.n * fu : 0;
        if (evalRow(clues[0], v1) !== results[0]) continue;
        for (let r = 1; r <= 40; r++) {
          const v2 = tk => tk.k === 'F' ? tk.n * fu : (tk.k === 'R' ? r : 0);
          if (evalRow(clues[1], v2) !== results[1]) continue;
          for (let c = 1; c <= 40; c++) {
            const v3 = tk => tk.k === 'F' ? tk.n * fu : ({R: r, C: c})[tk.k] || 0;
            if (evalRow(clues[2], v3) !== results[2]) continue;
            for (let v = 1; v <= 40; v++) {
              const v4 = tk => tk.k === 'F' ? tk.n * fu : ({R: r, C: c, V: v})[tk.k];
              if (evalRow(clues[3], v4) !== results[3]) continue;
              found++; sol = evalRow(q, v4);
            }
          }
        }
      }
      if (found !== 1 || sol !== ans) continue;
      return {u, kc, kq, R, C, V, clues, results, q, ans};
    }
    /* fallback (never reached in practice): a hand-checked set */
    const F = n => ({k: 'F', n}), T = k => ({k});
    return {u: 2, kc: 3, kq: 2, R: 7, C: 4, V: 8,
      clues: [[F(3), '+', F(3), '+', F(3)], [T('R'), '+', T('R'), '+', F(3)], [T('C'), '+', T('R'), '+', T('C')], [T('V'), '+', T('V'), '×', T('C')]],
      results: [18, 20, 15, 40], q: [T('R'), '+', F(2), '×', T('V'), '−', T('C')], ans: 35};
  }

  /* ---------- icon painters (centre cx, cy, size s) ---------- */
  function flame(g, x, y, h, t, seed) {
    const r = h * 0.34, sway = Math.sin(t * 7 + seed * 3.1) * h * 0.07, tipY = y - h * (1 + Math.sin(t * 9 + seed) * 0.04);
    const path = (rs, top) => {
      g.beginPath(); g.moveTo(x + sway, top);
      g.bezierCurveTo(x + sway * 0.5 + rs * 0.35, y - h * 0.62, x + rs * 1.1, y - rs * 1.3, x + rs, y - rs);
      g.arc(x, y - rs, rs, 0, Math.PI);
      g.bezierCurveTo(x - rs * 1.1, y - rs * 1.3, x + sway * 0.5 - rs * 0.35, y - h * 0.62, x + sway, top);
      g.closePath();
    };
    path(r, tipY);
    const gr = g.createLinearGradient(0, tipY, 0, y); gr.addColorStop(0, '#ff3d1f'); gr.addColorStop(0.55, '#ff7a1a'); gr.addColorStop(1, '#ffb02e');
    g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1.5, h * 0.07); g.strokeStyle = '#3a1408'; g.stroke();
    path(r * 0.5, y - h * 0.55); g.fillStyle = '#ffe680'; g.fill();
  }
  function flameCluster(g, cx, cy, s, n, t, seed) {
    const base = cy + s * 0.36;
    g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(cx, base - s * 0.2, 0, cx, base - s * 0.2, s * 0.62); gl.addColorStop(0, 'rgba(255,120,30,.45)'); gl.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gl; g.fillRect(cx - s, cy - s, s * 2, s * 2); g.restore();
    /* coal bed */
    g.beginPath(); g.ellipse(cx, base, s * 0.42, s * 0.1, 0, 0, TAU); g.fillStyle = '#2a1612'; g.fill(); g.lineWidth = Math.max(1.2, s * 0.04); g.strokeStyle = '#120806'; g.stroke();
    const xs = n === 3 ? [-0.27, 0, 0.27] : [-0.15, 0.15], hs = n === 3 ? [0.56, 0.74, 0.56] : [0.66, 0.66];
    xs.forEach((dx, i) => flame(g, cx + dx * s, base, s * hs[i], t, seed + i * 1.7));
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx + (i - 1) * s * 0.2, base, s * 0.03, 0, TAU); g.fillStyle = '#ffb347'; g.fill(); }
  }
  function rock(g, cx, cy, s) {
    const pts = [[-0.42, 0.28], [-0.46, 0.02], [-0.3, -0.24], [-0.04, -0.34], [0.24, -0.28], [0.44, -0.04], [0.42, 0.24], [0.14, 0.34], [-0.2, 0.34]];
    g.beginPath(); pts.forEach(([px, py], i) => { const X = cx + px * s, Y = cy + py * s + s * 0.04; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.closePath();
    const gr = g.createLinearGradient(cx - s * 0.3, cy - s * 0.35, cx + s * 0.3, cy + s * 0.4); gr.addColorStop(0, '#b2aab8'); gr.addColorStop(0.5, '#827a8a'); gr.addColorStop(1, '#4e4756');
    g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; g.lineWidth = Math.max(1.5, s * 0.06); g.strokeStyle = '#1e1418'; g.stroke();
    g.strokeStyle = 'rgba(30,20,24,.55)'; g.lineWidth = Math.max(1, s * 0.03); g.beginPath(); g.moveTo(cx - s * 0.1, cy - s * 0.26); g.lineTo(cx + s * 0.02, cy - s * 0.04); g.lineTo(cx - s * 0.06, cy + s * 0.14); g.moveTo(cx + s * 0.02, cy - s * 0.04); g.lineTo(cx + s * 0.22, cy + s * 0.04); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - s * 0.2, cy - s * 0.14, s * 0.1, s * 0.05, -0.5, 0, TAU); g.fill();
  }
  function crystal(g, cx, cy, s, t) {
    const top = cy - s * 0.46, bot = cy + s * 0.42, w = s * 0.25;
    g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + w, top + s * 0.22); g.lineTo(cx + w, bot - s * 0.16); g.lineTo(cx, bot); g.lineTo(cx - w, bot - s * 0.16); g.lineTo(cx - w, top + s * 0.22); g.closePath();
    const gr = g.createLinearGradient(cx - w, 0, cx + w, 0); gr.addColorStop(0, '#5ae0ff'); gr.addColorStop(0.5, '#a98bff'); gr.addColorStop(1, '#6a3ad8');
    g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; g.lineWidth = Math.max(1.5, s * 0.06); g.strokeStyle = '#1e1040'; g.stroke();
    g.beginPath(); g.moveTo(cx, top + s * 0.06); g.lineTo(cx + w * 0.42, top + s * 0.24); g.lineTo(cx + w * 0.42, bot - s * 0.2); g.lineTo(cx, bot - s * 0.06); g.lineTo(cx - w * 0.42, bot - s * 0.2); g.lineTo(cx - w * 0.42, top + s * 0.24); g.closePath();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
    const tw = (Math.sin(t * 3 + cx * 0.05) + 1) / 2; g.fillStyle = 'rgba(255,255,255,' + (0.5 + tw * 0.5) + ')';
    g.beginPath(); const sx = cx - w * 0.45, sy = top + s * 0.3, sr = s * (0.05 + tw * 0.04); g.moveTo(sx, sy - sr * 2); g.lineTo(sx + sr * 0.5, sy - sr * 0.5); g.lineTo(sx + sr * 2, sy); g.lineTo(sx + sr * 0.5, sy + sr * 0.5); g.lineTo(sx, sy + sr * 2); g.lineTo(sx - sr * 0.5, sy + sr * 0.5); g.lineTo(sx - sr * 2, sy); g.lineTo(sx - sr * 0.5, sy - sr * 0.5); g.closePath(); g.fill();
  }
  function volcano(g, cx, cy, s, t) {
    const by = cy + s * 0.4, ty = cy - s * 0.2;
    for (let i = 0; i < 3; i++) { const k = ((t * 0.5 + i / 3) % 1); g.beginPath(); g.arc(cx + Math.sin(k * 5 + i) * s * 0.08, ty - s * 0.08 - k * s * 0.3, s * (0.06 + k * 0.08), 0, TAU); g.fillStyle = 'rgba(120,110,120,' + (0.55 * (1 - k)) + ')'; g.fill(); }
    g.beginPath(); g.moveTo(cx - s * 0.48, by); g.quadraticCurveTo(cx - s * 0.3, by - s * 0.12, cx - s * 0.16, ty); g.lineTo(cx + s * 0.16, ty); g.quadraticCurveTo(cx + s * 0.3, by - s * 0.12, cx + s * 0.48, by); g.closePath();
    const gr = g.createLinearGradient(0, ty, 0, by); gr.addColorStop(0, '#9a5a34'); gr.addColorStop(1, '#4a2414');
    g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; g.lineWidth = Math.max(1.5, s * 0.06); g.strokeStyle = '#1e0c06'; g.stroke();
    /* lava cap and drips */
    g.beginPath(); g.moveTo(cx - s * 0.17, ty); g.lineTo(cx + s * 0.17, ty); g.lineTo(cx + s * 0.2, ty + s * 0.08); g.quadraticCurveTo(cx + s * 0.15, ty + s * 0.24, cx + s * 0.1, ty + s * 0.1); g.lineTo(cx - s * 0.02, ty + s * 0.12); g.quadraticCurveTo(cx - s * 0.1, ty + s * 0.3, cx - s * 0.14, ty + s * 0.1); g.lineTo(cx - s * 0.21, ty + s * 0.08); g.closePath();
    g.fillStyle = '#ff7a1a'; g.fill(); g.lineWidth = Math.max(1, s * 0.04); g.strokeStyle = '#5a1a08'; g.stroke();
    g.beginPath(); g.ellipse(cx, ty, s * 0.15, s * 0.04, 0, 0, TAU); g.fillStyle = '#ffd25a'; g.fill();
  }
  function icon(g, tk, cx, cy, s, t, seed) {
    if (tk.k === 'F') flameCluster(g, cx, cy, s, tk.n, t, seed); else if (tk.k === 'R') rock(g, cx, cy, s); else if (tk.k === 'C') crystal(g, cx, cy, s, t); else volcano(g, cx, cy, s, t);
  }

  /* ---------- in-level station: a basalt tablet with glowing numbers ---------- */
  function station(g, x, y, t, solved) {
    const glow = solved ? '#9be7a5' : '#ff8a2a';
    g.save();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 15, 3, 0, 0, TAU); g.fill();
    rr(g, x - 13, y - 6, 26, 6, 2); g.fillStyle = '#3a2a2e'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1a0e10'; g.stroke();
    rr(g, x - 11, y - 38, 22, 33, 5); const gr = g.createLinearGradient(0, y - 38, 0, y - 5); gr.addColorStop(0, '#5a464c'); gr.addColorStop(1, '#2e2226'); g.fillStyle = gr; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1a0e10'; g.stroke();
    const p = 0.6 + 0.4 * Math.sin(t * 3);
    g.save(); g.shadowColor = glow; g.shadowBlur = 6 * p;
    g.font = '700 7px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = solved ? '#d8ffe0' : '#ffd27a';
    g.fillText('3+3', x, y - 30); g.fillText('×2=', x, y - 22); g.fillText(solved ? '✓' : '?', x, y - 13);
    g.restore();
    g.strokeStyle = glow; g.globalAlpha = 0.5 + 0.3 * p; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + 10, y - 16); g.lineTo(x + 6, y - 12); g.lineTo(x + 9, y - 8); g.stroke();
    g.restore();
  }

  /* ---------- mount ---------- */
  function mount(root, api) {
    const rng = api.rng || Math.random;
    let P = generate(rng);
    let entry = '', done = false, shake = 0, flashBad = 0, flashGood = 0, pressed = null, pressT = 0, solveT = -1;
    const parts = [], embers = [];
    for (let i = 0; i < 40; i++) embers.push({x: Math.random(), y: Math.random(), v: 0.03 + Math.random() * 0.06, r: 0.8 + Math.random() * 1.8, ph: Math.random() * 6});
    const cracks = [];
    for (let i = 0; i < 7; i++) { const pts = []; let x = Math.random(), y = Math.random() < 0.5 ? 0 : 1; const dir = y ? -1 : 1; pts.push([x, y]); for (let k = 0; k < 3; k++) { x += (Math.random() - 0.5) * 0.06; y += dir * (0.03 + Math.random() * 0.04); pts.push([x, y]); } cracks.push(pts); }
    let L = {};
    const timers = [];
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

    function burst(x, y, n, cols, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.3 + Math.random()) * (sp || 160); parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.6 + Math.random() * 0.6, age: 0, r: 1.5 + Math.random() * 2.5, col: cols[i % cols.length], star: Math.random() < 0.4}); } }

    function layout(S) {
      const w = S.w, h = S.h, pad = Math.max(6, Math.min(14, h * 0.035));
      const kw = clamp(w * 0.29, 170, 250);
      L.kp = {x: w - kw - pad, y: pad, w: kw, h: h - pad * 2};
      L.tab = {x: pad, y: pad, w: w - kw - pad * 3, h: h - pad * 2};
    }

    function press(key) {
      if (done) return;
      pressed = key; pressT = 0.18;
      if (key === 'del') { entry = entry.slice(0, -1); tone(220, 0.07, {type: 'triangle', gain: 0.18}); return; }
      if (key === 'ok') { submit(); return; }
      if (entry.length >= 3) { tone(150, 0.08, {type: 'square', gain: 0.08}); return; }
      entry += key; tone(330 + (+key) * 28, 0.08, {type: 'triangle', gain: 0.2}); noise(0.05, {type: 'bandpass', freq: 900, gain: 0.06});
    }
    function submit() {
      if (done) return;
      if (!entry) { api.msg('Tippe zuerst eine Zahl auf den Steintasten ein.', 'info'); tone(180, 0.1, {type: 'triangle', gain: 0.12}); return; }
      if (+entry === P.ans) win();
      else {
        shake = 0.45; flashBad = 0.7; const r = L.kp; burst(r.x + r.w / 2, r.y + 30, 14, ['#ff5a2a', '#5a3a3a', '#ff9a4a'], 120);
        noise(0.35, {type: 'lowpass', freq: 400, freqTo: 90, gain: 0.25});
        const n = api.attempts();
        api.wrong(n === 0 ? 'Das Magma-Tor grollt nur. ' + entry + ' stimmt nicht.' : (n === 1 ? 'Wieder falsch. Prüfe jede Zeile – und schau dir die Flammen genau an.' : 'Noch nicht. Punkt vor Strich – in jeder Zeile, auch beim Vulkan!'));
        entry = '';
      }
    }
    function win() {
      if (done) return; done = true; entry = String(P.ans); flashGood = 1.2; solveT = 0;
      const q = L.qRow; if (q) { burst(q.x + q.w * 0.85, q.y + q.h / 2, 46, ['#ffd84a', '#fff4e0', '#ff9a2a', '#ff6f9c'], 220); burst(q.x + q.w * 0.4, q.y + q.h / 2, 26, ['#ffd84a', '#ffb347'], 160); }
      try { G.audio.sfx.melt(); } catch (e) {}
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, {type: 'triangle', gain: 0.16, delay: i * 0.09}));
      later(() => api.solved(), 900);
    }

    function draw(g, S) {
      const {w, h, t} = S, dt = S.dt || 0;
      shake = Math.max(0, shake - dt); flashBad = Math.max(0, flashBad - dt); flashGood = Math.max(0, flashGood - dt * 0.5); pressT = Math.max(0, pressT - dt); if (solveT >= 0) solveT += dt;
      /* cave background */
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#1c0a0c'); bg.addColorStop(0.7, '#2e1010'); bg.addColorStop(1, '#5a1c0c'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const lg = g.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h * 1.1, h * 0.9); lg.addColorStop(0, 'rgba(255,110,30,' + (0.45 + 0.1 * Math.sin(t * 1.7)) + ')'); lg.addColorStop(1, 'rgba(255,60,20,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const e of embers) { e.y -= e.v * dt; if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); } const x = e.x * w + Math.sin(t * 1.3 + e.ph) * 10, y = e.y * h; g.fillStyle = 'rgba(255,' + (120 + Math.floor(80 * Math.sin(t * 3 + e.ph) ** 2)) + ',40,' + (0.3 + 0.5 * e.y) + ')'; g.beginPath(); g.arc(x, y, e.r, 0, TAU); g.fill(); }
      g.restore();

      drawTablet(g, S);
      drawKeypad(g, S);

      /* particles */
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; const a = 1 - p.age / p.life; g.globalAlpha = a; g.fillStyle = p.col; if (p.star) { const r = p.r * 1.8; g.beginPath(); g.moveTo(p.x, p.y - r); g.lineTo(p.x + r * 0.3, p.y - r * 0.3); g.lineTo(p.x + r, p.y); g.lineTo(p.x + r * 0.3, p.y + r * 0.3); g.lineTo(p.x, p.y + r); g.lineTo(p.x - r * 0.3, p.y + r * 0.3); g.lineTo(p.x - r, p.y); g.lineTo(p.x - r * 0.3, p.y - r * 0.3); g.closePath(); g.fill(); } else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); } }
      g.restore(); g.globalAlpha = 1;
    }

    function drawTablet(g, S) {
      const {t} = S, T = L.tab; const sx = shake > 0 ? Math.sin(shake * 70) * 6 * shake : 0;
      g.save(); g.translate(sx, 0);
      /* slab */
      g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, T.x + 4, T.y + 6, T.w, T.h, 18); g.fill();
      rr(g, T.x, T.y, T.w, T.h, 18);
      const sg = g.createLinearGradient(0, T.y, 0, T.y + T.h); sg.addColorStop(0, '#5a464e'); sg.addColorStop(0.5, '#3e3036'); sg.addColorStop(1, '#2a1f24'); g.fillStyle = sg; g.fill();
      g.lineWidth = 4; g.strokeStyle = '#140a0c'; g.stroke();
      rr(g, T.x + 5, T.y + 5, T.w - 10, T.h - 10, 14); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,220,200,.12)'; g.stroke();
      /* lava cracks */
      const won = solveT >= 0, cg = won ? Math.min(1, solveT * 1.5) : 0;
      g.save(); rr(g, T.x + 3, T.y + 3, T.w - 6, T.h - 6, 16); g.clip(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const c of cracks) { g.beginPath(); c.forEach(([x, y], i) => { const X = T.x + 10 + x * (T.w - 20), Y = T.y + 4 + y * (T.h - 8); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.strokeStyle = won ? 'rgba(255,190,60,' + (0.18 + 0.3 * cg) + ')' : 'rgba(255,100,30,' + (0.13 + 0.08 * Math.sin(t * 2 + c[0][0] * 9)) + ')'; g.lineWidth = won ? 2.2 : 1.6; if (won) { g.shadowColor = '#ffb020'; g.shadowBlur = 10; } g.stroke(); }
      g.restore();
      /* rows */
      const rows = P.clues.length + 1, padY = Math.max(6, T.h * 0.04), rh = (T.h - padY * 2) / rows;
      let s = Math.min(rh * 0.86, (T.w - 24) / 7.6);
      s = Math.min(s, 64);
      const opW = s * 0.55, iconW = s * 1.0;
      for (let r = 0; r < rows; r++) {
        const isQ = r === rows - 1, toks = isQ ? P.q : P.clues[r], cy = T.y + padY + rh * (r + 0.5);
        if (r) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(T.x + 18, T.y + padY + rh * r); g.lineTo(T.x + T.w - 18, T.y + padY + rh * r); g.stroke(); g.strokeStyle = 'rgba(255,220,200,.07)'; g.lineWidth = 1; g.beginPath(); g.moveTo(T.x + 18, T.y + padY + rh * r + 2); g.lineTo(T.x + T.w - 18, T.y + padY + rh * r + 2); g.stroke(); }
        let width = 0; toks.forEach((tk, i) => width += i % 2 ? opW : iconW); width += opW + s * 1.3;
        let x = T.x + (T.w - width) / 2;
        if (isQ) {
          L.qRow = {x: T.x + 10, y: cy - rh / 2 + 2, w: T.w - 20, h: rh - 4};
          rr(g, T.x + 10, cy - rh / 2 + 3, T.w - 20, rh - 6, 12);
          g.fillStyle = won ? 'rgba(255,216,74,' + (0.12 + 0.1 * Math.sin(t * 6)) + ')' : 'rgba(255,110,30,' + (0.09 + 0.05 * Math.sin(t * 2.5)) + ')'; g.fill();
          g.lineWidth = 2; g.strokeStyle = won ? 'rgba(255,216,74,.7)' : 'rgba(255,140,60,.35)'; g.stroke();
        }
        toks.forEach((tk, i) => {
          if (i % 2) { txt(g, tk, x + opW / 2, cy, s * 0.5, '#ffd9b0', {glow: '#ff7a1a', blur: 8}); x += opW; }
          else { icon(g, tk, x + iconW / 2, cy, s * 0.9, t, r * 3 + i); x += iconW; }
        });
        txt(g, '=', x + opW / 2, cy, s * 0.5, '#ffd9b0', {glow: '#ff7a1a', blur: 8}); x += opW;
        if (isQ && !won) {
          const p = 1 + 0.08 * Math.sin(t * 4);
          txt(g, '?', x + s * 0.55, cy, s * 0.62 * p, '#ffe9a8', {glow: '#ff9a2a', blur: 16, stroke: '#4a1a08', sw: 4});
        } else {
          const v = isQ ? String(P.ans) : String(P.results[r]);
          const sc = isQ ? 1 + Math.max(0, 0.4 - solveT) * 1.2 : 1;
          txt(g, v, x + s * 0.65, cy, s * 0.56 * sc, isQ ? '#fff4c0' : '#ffd27a', {glow: isQ ? '#ffd84a' : '#ff6a1a', blur: isQ ? 22 : 12, stroke: '#3a1206', sw: 4});
        }
      }
      g.restore();
    }

    function drawKeypad(g, S) {
      const {t} = S, K = L.kp, small = K.h < 300;
      const sx = shake > 0 ? Math.sin(shake * 70) * 4 * shake : 0;
      g.save(); g.translate(sx, 0);
      g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, K.x + 4, K.y + 6, K.w, K.h, 18); g.fill();
      rr(g, K.x, K.y, K.w, K.h, 18); const kg = g.createLinearGradient(0, K.y, 0, K.y + K.h); kg.addColorStop(0, '#463238'); kg.addColorStop(1, '#241a1e'); g.fillStyle = kg; g.fill(); g.lineWidth = 4; g.strokeStyle = '#140a0c'; g.stroke();
      const ip = small ? 8 : 12, dispH = small ? Math.max(34, K.h * 0.17) : Math.max(44, K.h * 0.17);
      /* display slot */
      const D = {x: K.x + ip, y: K.y + ip, w: K.w - ip * 2, h: dispH};
      rr(g, D.x, D.y, D.w, D.h, 10); g.fillStyle = flashBad > 0 ? 'rgba(120,20,20,' + (0.6 + flashBad * 0.4) + ')' : (done ? '#2a2410' : '#140a0a'); g.fill(); g.lineWidth = 2.5; g.strokeStyle = done ? '#ffd84a' : '#0a0405'; g.stroke();
      g.save(); g.beginPath(); rr(g, D.x, D.y, D.w, D.h, 10); g.clip();
      const shown = entry || '';
      if (shown) txt(g, shown, D.x + D.w / 2, D.y + D.h / 2 + 1, D.h * 0.62, done ? '#fff4c0' : '#ffb347', {glow: done ? '#ffd84a' : '#ff6a1a', blur: 14});
      else txt(g, 'Zahl?', D.x + D.w / 2, D.y + D.h / 2 + 1, D.h * 0.4, 'rgba(255,170,100,.35)', {w: 600});
      if (!done && shown && Math.floor(t * 2) % 2 === 0) { g.font = '700 ' + (D.h * 0.62) + 'px ' + FONT; const tw = shown ? g.measureText(shown).width : -D.h * 0.9; g.fillStyle = '#ff9a4a'; g.fillRect(D.x + D.w / 2 + tw / 2 + 3, D.y + D.h * 0.24, 3, D.h * 0.52); }
      g.restore();
      /* keys */
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
      const gy = D.y + D.h + ip * 0.8, gh = K.y + K.h - ip - gy, gap = small ? 5 : 8;
      const kw = (K.w - ip * 2 - gap * 2) / 3, kh = (gh - gap * 3) / 4;
      keys.forEach((k, i) => {
        const c = i % 3, r = Math.floor(i / 3), x = K.x + ip + c * (kw + gap), y = gy + r * (kh + gap);
        const isP = pressed === k && pressTT() > 0, hov = S.hover === 'k' + k;
        const dy = isP ? 3 : 0;
        rr(g, x, y + 4, kw, kh, 10); g.fillStyle = '#0e0708'; g.fill();
        rr(g, x, y + dy, kw, kh - 1, 10);
        const bgk = g.createLinearGradient(0, y, 0, y + kh); const okC = k === 'ok';
        bgk.addColorStop(0, okC ? '#ff8a3a' : (k === 'del' ? '#6a4e56' : (hov ? '#7a646c' : '#6a565e'))); bgk.addColorStop(1, okC ? '#c2421a' : (k === 'del' ? '#3e2a30' : '#3a2c32'));
        g.fillStyle = bgk; g.fill(); g.lineWidth = 2; g.strokeStyle = '#140a0c'; g.stroke();
        if (isP) { g.save(); g.globalCompositeOperation = 'lighter'; rr(g, x, y + dy, kw, kh - 1, 10); g.fillStyle = 'rgba(255,140,50,' + (pressTT() * 2.5) + ')'; g.fill(); g.restore(); }
        rr(g, x + 3, y + dy + 2, kw - 6, kh * 0.35, 7); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
        const label = k === 'del' ? '⌫' : (okC ? 'OK' : k);
        txt(g, label, x + kw / 2, y + dy + kh / 2, Math.min(kh * 0.5, kw * 0.42) * (okC ? 0.85 : 1), okC ? '#fff4e0' : '#ffd9b0', {glow: okC ? null : 'rgba(255,120,40,.6)', blur: 6, stroke: '#1a0c0e', sw: 3});
        S.hit('k' + k, x, y, kw, kh, k);
      });
      g.restore();
    }
    const pressTT = () => pressT;

    const S = makeStage(root, {
      layout, draw,
      down(h) { if (h && h.id[0] === 'k') press(h.data); },
    });
    const onKey = e => {
      if (done) return;
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('del'); e.preventDefault(); }
      else if (e.key === 'Enter') { press('ok'); e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    api.msg('Jedes Bild hat einen festen Wert. Finde die Zahl für das Fragezeichen.', 'info');

    return {
      destroy() { S.destroy(); document.removeEventListener('keydown', onKey); timers.forEach(clearTimeout); },
      autoSolve() {
        if (done) return; entry = '';
        const digits = String(P.ans).split('');
        digits.forEach((d, i) => later(() => press(d), 160 * (i + 1)));
        later(() => press('ok'), 160 * (digits.length + 1) + 120);
      },
    };
  }

  G.PZ.register({
    id: 'lava-mathe', world: 'lava', slot: 0,
    title: 'Das Magma-Rechentor',
    intro: 'Jedes Bild steht für eine feste Zahl, jede einzelne Flamme zählt gleich viel. Knack die Zeilen und tippe die Zahl für das „?“ ein.',
    letter: 'Punkt vor Strich, Wookie! Und zähl die Flammen in jeder Gruppe ganz genau – jede einzelne Flamme zählt gleich viel.',
    hint: 'Rechne Zeile für Zeile: erst eine Flamme, dann den Stein, dann den Kristall, dann den Vulkan. Eine Flammengruppe ist so viel wert wie ihre Flammen zusammen – in der letzten Zeile hat die Gruppe eine andere Zahl an Flammen! Und in jeder Zeile gilt: erst malnehmen, dann plus und minus (auch schon beim Vulkan).',
    station,
    mount,
  });
})();

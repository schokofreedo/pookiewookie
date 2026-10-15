/* The Starway Home puzzle: weltraum-planeten "Die Planeten-Uhr".
   Three planets circle on rings with 3, 5 and 7 positions and move one position per day (clockwise). The docking beam points at
   position 0 of every ring. Question: in how many days do all three stand in the beam at the same time? (Chinese remainder; the
   answer is generated in 13..104 so the 12 energy for "1 Tag vor" can never reach it by brute force.) Wrong -> new positions. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, FONT = '"Fredoka", sans-serif';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const mod = (a, n) => ((a % n) + n) % n;

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
  function noise(d, o) { try { G.audio.noise(d, o); } catch (e) {} }
  function sparkle(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.3, y - r * 0.3); g.lineTo(x + r, y); g.lineTo(x + r * 0.3, y + r * 0.3); g.lineTo(x, y + r); g.lineTo(x - r * 0.3, y + r * 0.3); g.lineTo(x - r, y); g.lineTo(x - r * 0.3, y - r * 0.3); g.closePath(); g.fill(); }

  /* ---------- model ---------- */
  const RINGS = [
    {n: 3, name: tr('Rubini', 'Ruby'), col: '#ff6f6f', col2: '#b8324a', ring: '#ff9eb0'},
    {n: 5, name: tr('Saturnchen', 'Saturny'), col: '#ffd27a', col2: '#c48a3a', ring: '#ffd84a', rings: true},
    {n: 7, name: tr('Blaumond', 'Blue Moon'), col: '#8fd3ff', col2: '#3a6ad8', ring: '#8fd3ff'},
  ];
  const ENERGY = 12;
  function firstAlign(pos) { for (let d = 1; d <= 105; d++) if (RINGS.every((r, i) => mod(pos[i] + d, r.n) === 0)) return d; return -1; }
  function generate(rng, avoid) {
    for (let k = 0; k < 400; k++) {
      const d = 13 + Math.floor(rng() * 92);  /* 13..104 */
      if (d === avoid) continue;
      const pos = RINGS.map(r => mod(-d, r.n));
      if (pos.filter(p => p === 0).length > 1) continue;
      /* assert: unique answer in 1..104 equals d */
      let hits = 0; for (let x = 1; x <= 104; x++) if (RINGS.every((r, i) => mod(pos[i] + x, r.n) === 0)) hits++;
      if (hits !== 1 || firstAlign(pos) !== d) continue;
      return {pos, ans: d};
    }
    return {pos: [1, 2, 3], ans: firstAlign([1, 2, 3])};
  }

  /* ---------- painters ---------- */
  function planet(g, R, x, y, r, t, happy) {
    if (R.rings) { g.save(); g.translate(x, y); g.rotate(-0.35); g.beginPath(); g.ellipse(0, 0, r * 1.8, r * 0.5, 0, Math.PI, TAU); g.strokeStyle = '#3a2030'; g.lineWidth = r * 0.42; g.stroke(); g.strokeStyle = '#ffe9b0'; g.lineWidth = r * 0.24; g.stroke(); g.restore(); }
    const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.2, R.col); gr.addColorStop(1, R.col2);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1.5, r * 0.16); g.strokeStyle = '#2a1a3a'; g.stroke();
    if (R.n === 7) { g.fillStyle = 'rgba(30,40,120,.25)'; g.beginPath(); g.arc(x + r * 0.4, y + r * 0.35, r * 0.2, 0, TAU); g.fill(); g.beginPath(); g.arc(x - r * 0.45, y + r * 0.1, r * 0.13, 0, TAU); g.fill(); }
    /* cute face */
    const ey = y - r * 0.05, ex = r * 0.32, er = Math.max(0.9, r * 0.13);
    const blink = Math.sin(t * 1.3 + R.n) > 0.97;
    g.fillStyle = '#2a1a3a';
    if (blink) { g.fillRect(x - ex - er, ey, er * 2, Math.max(1, er * 0.5)); g.fillRect(x + ex - er, ey, er * 2, Math.max(1, er * 0.5)); }
    else { g.beginPath(); g.arc(x - ex, ey, er, 0, TAU); g.arc(x + ex, ey, er, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - ex + er * 0.35, ey - er * 0.35, er * 0.4, 0, TAU); g.arc(x + ex + er * 0.35, ey - er * 0.35, er * 0.4, 0, TAU); g.fill(); }
    g.strokeStyle = '#2a1a3a'; g.lineWidth = Math.max(1, r * 0.1); g.lineCap = 'round'; g.beginPath(); g.arc(x, y + r * 0.18, r * (happy ? 0.28 : 0.18), 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = 'rgba(255,120,150,.45)'; g.beginPath(); g.arc(x - ex * 1.5, y + r * 0.2, r * 0.13, 0, TAU); g.arc(x + ex * 1.5, y + r * 0.2, r * 0.13, 0, TAU); g.fill();
    if (R.rings) { g.save(); g.translate(x, y); g.rotate(-0.35); g.beginPath(); g.ellipse(0, 0, r * 1.8, r * 0.5, 0, 0, Math.PI); g.strokeStyle = '#3a2030'; g.lineWidth = r * 0.42; g.stroke(); g.strokeStyle = '#ffe9b0'; g.lineWidth = r * 0.24; g.stroke(); g.restore(); }
  }
  function spaceStation(g, x, y, s, t) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#5a6a9a'; g.fillRect(-s * 1.5, -s * 0.12, s * 3, s * 0.24); g.strokeStyle = '#1a1a3a'; g.lineWidth = Math.max(1, s * 0.08); g.strokeRect(-s * 1.5, -s * 0.12, s * 3, s * 0.24);
    for (const d of [-1, 1]) { rr(g, d * s * 1.5 - (d > 0 ? 0 : s * 0.7), -s * 0.4, s * 0.7, s * 0.8, s * 0.1); g.fillStyle = '#3a6ad8'; g.fill(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(d * s * 1.5 + d * s * 0.35, -s * 0.4); g.lineTo(d * s * 1.5 + d * s * 0.35, s * 0.4); g.stroke(); g.strokeStyle = '#1a1a3a'; }
    rr(g, -s * 0.7, -s * 0.55, s * 1.4, s * 1.0, s * 0.45); const gr = g.createLinearGradient(0, -s * 0.55, 0, s * 0.45); gr.addColorStop(0, '#fff4e0'); gr.addColorStop(1, '#b8b0d8'); g.fillStyle = gr; g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -s * 0.08, s * 0.24, 0, TAU); g.fillStyle = '#8fd3ff'; g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-s * 0.08, -s * 0.16, s * 0.07, 0, TAU); g.fill();
    g.strokeStyle = '#1a1a3a'; g.beginPath(); g.moveTo(0, -s * 0.55); g.lineTo(0, -s * 0.9); g.stroke();
    g.fillStyle = Math.sin(t * 5) > 0 ? '#ff6f9c' : '#7a3b57'; g.beginPath(); g.arc(0, -s * 0.95, s * 0.1, 0, TAU); g.fill();
    rr(g, -s * 0.25, s * 0.38, s * 0.5, s * 0.22, s * 0.06); g.fillStyle = '#8fd3ff'; g.fill(); g.stroke();
    g.restore();
  }

  /* ---------- in-level station: an orrery on a pedestal ---------- */
  function station(g, x, y, t, solved) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 13, 3, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x - 5, y - 12); g.lineTo(x + 5, y - 12); g.lineTo(x + 9, y); g.closePath(); g.fillStyle = '#6a5a9a'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#1a1a3a'; g.stroke();
    g.fillStyle = '#c8b0ff'; g.fillRect(x - 1, y - 22, 2, 10);
    const cy = y - 26;
    [[14, 0.7, '#8fd3ff'], [10, 1.1, '#ffd27a'], [6, 1.7, '#ff6f6f']].forEach(([r, sp, c], i) => {
      g.strokeStyle = 'rgba(90,70,150,.85)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, cy, r, r * 0.42, 0, 0, TAU); g.stroke();
      const a = t * sp + i * 2; g.beginPath(); g.arc(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.42, 2.2, 0, TAU); g.fillStyle = c; g.fill(); g.strokeStyle = '#1a1a3a'; g.stroke();
    });
    g.beginPath(); g.arc(x, cy, 3, 0, TAU); g.fillStyle = solved ? '#9be7a5' : '#ffd84a'; g.fill(); g.strokeStyle = '#1a1a3a'; g.stroke();
    g.restore();
  }

  /* ---------- mount ---------- */
  function mount(root, api) {
    const rng = api.rng || Math.random;
    let P = generate(rng), day = 0, disp = 0, energy = ENERGY, entry = '', done = false, winT = -1;
    let flashBad = 0, pressed = null, pressT = 0, spin = 0, autoMode = false;
    const parts = [], stars = [];
    for (let i = 0; i < 110; i++) stars.push({x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.3, ph: Math.random() * 6, c: Math.random() < 0.2 ? '#ffd8f0' : '#e8ecff'});
    let L = {};
    const timers = []; const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    function burst(x, y, n, cols, sp, grav) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.3 + Math.random()) * (sp || 120); parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.8, age: 0, r: 1.2 + Math.random() * 2.2, col: cols[i % cols.length], star: Math.random() < 0.5, g: grav || 0}); } }

    function layout(S) {
      const w = S.w, h = S.h, pad = Math.max(6, Math.min(12, h * 0.03)), small = h < 260;
      const D = Math.min(h - pad * 2, w * 0.42);
      L.small = small;
      L.orr = {cx: pad + D / 2 + (small ? 0 : 6), cy: h / 2 + D * 0.03, D};
      const kw = clamp(w * 0.25, 160, 230);
      L.kp = {x: w - kw - pad, y: pad, w: kw, h: h - pad * 2};
      const ix = L.orr.cx + D / 2 + pad * 1.5;
      L.info = {x: ix, y: pad, w: L.kp.x - ix - pad * 1.5, h: h - pad * 2};
    }
    function ringR(i) { const D = L.orr.D; return D * [0.15, 0.25, 0.35][i]; }
    function posAngle(n, p) { return -Math.PI / 2 + (p / n) * TAU; }

    function advance() {
      if (done) return;
      if (energy <= 0) { api.msg(tr('Keine Energie mehr – jetzt hilft nur noch Rechnen!', 'Out of energy – only math can help now!'), 'bad'); tone(160, 0.2, {type: 'square', gain: 0.08}); return; }
      energy--; day++;
      try { G.audio.sfx.thrust(); } catch (e) {}
      tone(520, 0.08, {type: 'triangle', gain: 0.12}); tone(780, 0.1, {type: 'triangle', gain: 0.1, delay: 0.07});
      const inBeam = RINGS.map((r, i) => mod(P.pos[i] + day, r.n) === 0);
      if (inBeam.some(b => b)) later(() => tone(1040, 0.15, {type: 'sine', gain: 0.08}), 250);
      api.msg(tr('Tag +', 'Day +') + day + ' · ' + (inBeam.filter(Boolean).length ? inBeam.map((b, i) => b ? RINGS[i].name : null).filter(Boolean).join(tr(' und ', ' and ')) + tr(' im Strahl.', ' in the beam.') : tr('Niemand im Strahl.', 'Nobody in the beam.')), 'info');
    }
    function today() { if (done || day === 0) return; day = 0; tone(392, 0.12, {type: 'triangle', gain: 0.12}); api.msg(tr('Zurück zu heute (Tag 0). Die Energie bleibt verbraucht.', 'Back to today (Day 0). The energy you used stays used.'), 'info'); }
    function press(key) {
      if (done) return;
      pressed = key; pressT = 0.18;
      if (key === 'del') { entry = entry.slice(0, -1); tone(240, 0.07, {type: 'triangle', gain: 0.15}); return; }
      if (key === 'ok') { submit(); return; }
      if (entry.length >= 3) { tone(150, 0.08, {type: 'square', gain: 0.08}); return; }
      if (entry === '0') entry = '';
      entry += key; tone(600 + (+key) * 40, 0.06, {type: 'sine', gain: 0.16}); tone(1200 + (+key) * 60, 0.04, {type: 'sine', gain: 0.05, delay: 0.03});
    }
    function submit() {
      if (done) return;
      if (!entry) { api.msg(tr('Tippe die Anzahl der Tage ein.', 'Type in the number of days.'), 'info'); return; }
      if (+entry === P.ans) { win(); return; }
      flashBad = 0.8; noise(0.3, {type: 'lowpass', freq: 600, freqTo: 120, gain: 0.2});
      const n = api.attempts();
      api.wrong(n === 0 ? tr(entry + ' Tage stimmt nicht – die Planeten springen auf neue Plätze!', entry + ' days is not right – the planets jump to new spots!') : tr('Leider falsch. Neue Positionen – rechne nochmal in Ruhe.', 'Sorry, that is wrong. New positions – take your time and work it out again.'));
      P = generate(rng, P.ans); day = 0; energy = ENERGY; entry = ''; spin = 1;
      const o = L.orr; burst(o.cx, o.cy, 24, ['#8fd3ff', '#c8b0ff', '#ff9eb0'], 140);
    }
    function win() {
      if (done) return; done = true; winT = 0; entry = String(P.ans); day = P.ans;
      try { G.audio.sfx.laser(); } catch (e) {}
      [523, 659, 784, 988, 1175].forEach((f, i) => tone(f, 0.22, {type: 'triangle', gain: 0.14, delay: 0.25 + i * 0.08}));
      later(() => { const o = L.orr; burst(o.cx, o.cy - ringR(2), 50, ['#8fd3ff', '#ffd84a', '#fff4e0', '#ff9eb0', '#9be7a5'], 200); }, 300);
      later(() => api.solved(), 1100);
    }

    function draw(g, S) {
      const {w, h, t} = S, dt = S.dt || 0;
      flashBad = Math.max(0, flashBad - dt); pressT = Math.max(0, pressT - dt); if (winT >= 0) winT += dt; spin = Math.max(0, spin - dt * 1.5);
      /* disp approaches day */
      const diff = day - disp; disp += diff * Math.min(1, dt * (Math.abs(diff) > 3 ? 4 : 7)); if (Math.abs(day - disp) < 0.002) disp = day;
      /* space */
      const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#0e0c2a'); bg.addColorStop(0.5, '#1a1240'); bg.addColorStop(1, '#2a1438'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const nb = g.createRadialGradient(w * 0.75, h * 0.2, 0, w * 0.75, h * 0.2, h * 0.9); nb.addColorStop(0, 'rgba(255,110,170,.18)'); nb.addColorStop(1, 'rgba(255,110,170,0)'); g.fillStyle = nb; g.fillRect(0, 0, w, h);
      const nb2 = g.createRadialGradient(w * 0.15, h * 0.85, 0, w * 0.15, h * 0.85, h * 0.8); nb2.addColorStop(0, 'rgba(110,170,255,.16)'); nb2.addColorStop(1, 'rgba(110,170,255,0)'); g.fillStyle = nb2; g.fillRect(0, 0, w, h);
      for (const s of stars) { g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.2 + s.ph)); g.fillStyle = s.c; g.fillRect(s.x * w, s.y * h, s.r, s.r); }
      g.globalAlpha = 1;
      drawOrrery(g, S);
      drawInfo(g, S);
      drawKeypad(g, S);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; g.globalAlpha = 1 - p.age / p.life; g.fillStyle = p.col; if (p.star) sparkle(g, p.x, p.y, p.r * 1.8); else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); } }
      g.restore(); g.globalAlpha = 1;
    }

    function drawOrrery(g, S) {
      const {t} = S, O = L.orr, cx = O.cx, cy = O.cy, D = O.D, Rout = ringR(2);
      const topY = cy - D * 0.5 + D * 0.03;
      /* beam */
      const bw = D * 0.07;
      g.save(); g.globalCompositeOperation = 'lighter';
      const bg = g.createLinearGradient(cx - bw, 0, cx + bw, 0); bg.addColorStop(0, 'rgba(120,220,255,0)'); bg.addColorStop(0.5, 'rgba(160,235,255,' + (0.35 + 0.1 * Math.sin(t * 6)) + ')'); bg.addColorStop(1, 'rgba(120,220,255,0)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(cx - bw * 0.6, topY + D * 0.04); g.lineTo(cx + bw * 0.6, topY + D * 0.04); g.lineTo(cx + bw * 1.1, cy); g.lineTo(cx - bw * 1.1, cy); g.closePath(); g.fill();
      for (let k = 0; k < 5; k++) { const f = ((t * 0.8 + k / 5) % 1); const y = topY + D * 0.04 + f * (cy - topY - D * 0.04); g.fillStyle = 'rgba(200,245,255,' + (0.5 * (1 - f)) + ')'; g.fillRect(cx - bw * 0.5, y, bw, 2); }
      g.restore();
      /* core */
      const cg = g.createRadialGradient(cx, cy, 0, cx, cy, D * 0.12); cg.addColorStop(0, '#fff4e0'); cg.addColorStop(0.35, '#ffd84a'); cg.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, D * 0.12, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx, cy, D * 0.05, 0, TAU); g.fillStyle = '#ffe680'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#7a3b2a'; g.stroke();
      /* rings */
      RINGS.forEach((R, i) => {
        const r = ringR(i);
        g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = Math.max(4, D * 0.03); g.stroke();
        g.strokeStyle = R.ring; g.globalAlpha = 0.5; g.lineWidth = Math.max(1.5, D * 0.008); g.stroke(); g.globalAlpha = 1;
        /* direction chevrons */
        for (let p = 0; p < R.n; p++) {
          const a = posAngle(R.n, p + 0.5), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, s = Math.max(2.5, D * 0.012);
          g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.strokeStyle = R.ring; g.globalAlpha = 0.65; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-s, -s); g.lineTo(s * 0.4, 0); g.lineTo(-s, s); g.stroke(); g.restore();
        }
        /* position badges */
        const br = Math.max(6, D * 0.03);
        for (let p = 0; p < R.n; p++) {
          const a = posAngle(R.n, p), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          g.beginPath(); g.arc(x, y, br, 0, TAU); g.fillStyle = p === 0 ? '#2a6a8a' : '#2a2050'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = p === 0 ? '#bff0ff' : R.ring; g.stroke();
          txt(g, String(p), x, y + 0.5, br * 1.15, p === 0 ? '#e8fbff' : '#fff4e0', {w: 700});
        }
      });
      /* planets */
      RINGS.forEach((R, i) => {
        const r = ringR(i), p = P.pos[i] + disp + spin * spin * R.n * 2, a = posAngle(R.n, p);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, pr = Math.max(7, D * [0.042, 0.045, 0.05][i]);
        const inBeam = Math.abs(disp - day) < 0.05 && mod(P.pos[i] + day, R.n) === 0;
        if (inBeam) { g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(x, y, 0, x, y, pr * 2.6); gg.addColorStop(0, 'rgba(160,240,255,.7)'); gg.addColorStop(1, 'rgba(160,240,255,0)'); g.fillStyle = gg; g.fillRect(x - pr * 3, y - pr * 3, pr * 6, pr * 6); g.restore(); }
        /* little label: current number on the badge is hidden, so show it above the planet */
        planet(g, R, x, y - pr * 0.35, pr, t, inBeam || done);
        const cur = mod(Math.round(P.pos[i] + day), R.n);
        if (Math.abs(disp - day) < 0.05) { rr(g, x + pr * 0.6, y - pr * 1.6, pr * 1.2, pr * 0.95, pr * 0.4); g.fillStyle = '#fff4e0'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#2a1a3a'; g.stroke(); txt(g, String(cur), x + pr * 1.2, y - pr * 1.12, pr * 0.8, '#2a1a3a'); }
      });
      spaceStation(g, cx, cy - D * 0.462, Math.max(8, D * 0.048), t);
      if (done) { g.save(); g.globalAlpha = Math.min(1, winT * 2); txt(g, tr('Andocken!', 'Docking!'), cx, cy + Rout + D * 0.035, Math.max(12, D * 0.07), '#bff0ff', {stroke: '#1a1a3a', sw: 4, glow: '#8fd3ff', blur: 12}); g.restore(); }
    }

    function button(g, S, id, label, x, y, w, h, col, disabled) {
      const p = pressed === id && pressT > 0 ? 3 : 0, hov = S.hover === id && !disabled;
      rr(g, x, y + 4, w, h, h / 2); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
      rr(g, x, y + p, w, h, h / 2); g.fillStyle = disabled ? '#4a4060' : col; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#1a1a3a'; g.stroke();
      if (hov) { rr(g, x, y + p, w, h, h / 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill(); }
      rr(g, x + 5, y + p + 3, w - 10, h * 0.33, h * 0.2); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
      txt(g, label, x + w / 2, y + p + h / 2 + 1, Math.min(h * 0.42, 15), disabled ? '#a89ac0' : '#fff', {stroke: '#1a1a3a', sw: 3});
      S.hit(id, x, y, w, h);
    }
    function drawInfo(g, S) {
      const I = L.info, small = L.small, t = S.t;
      rr(g, I.x, I.y, I.w, I.h, 16); g.fillStyle = 'rgba(30,24,70,.72)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(143,211,255,.45)'; g.stroke();
      const cx = I.x + I.w / 2; let y = I.y + (small ? 13 : 20);
      txt(g, day === 0 ? tr('Heute · Tag 0', 'Today · Day 0') : tr('Vorschau: Tag +', 'Preview: Day +') + day, cx, y, small ? 15 : 19, day === 0 ? '#ffd84a' : '#8fd3ff', {stroke: '#1a1a3a', sw: 4});
      y += small ? 16 : 26;
      /* energy cells */
      const cw = Math.min(16, (I.w - 50) / ENERGY), ch = small ? 11 : 14, ex = cx - (cw * ENERGY) / 2 + 9;
      txt(g, '⚡', ex - 14, y + ch / 2, ch * 1.2, '#ffd84a');
      for (let k = 0; k < ENERGY; k++) { rr(g, ex + k * cw + 1, y, cw - 2, ch, 3); g.fillStyle = k < energy ? (energy <= 3 ? '#ff8fa8' : '#9be7a5') : 'rgba(255,255,255,.1)'; g.fill(); }
      y += ch + (small ? 7 : 12);
      const bH = small ? 36 : 40, gap = 8, bw1 = (I.w - 24 - gap) * 0.58, bw2 = (I.w - 24 - gap) - bw1;
      button(g, S, 'adv', tr('1 Tag vor ⚡1', '+1 day ⚡1'), I.x + 12, y, bw1, bH, '#3a8ad8', energy <= 0 || done);
      button(g, S, 'today', tr('↺ Heute', '↺ Today'), I.x + 12 + bw1 + gap, y, bw2, bH, '#7a3b57', day === 0 || done);
      y += bH + (small ? 8 : 14);
      /* legend */
      const lh = small ? 15 : 22;
      RINGS.forEach((R, i) => {
        const yy = y + i * lh + lh / 2, cur = mod(P.pos[i], R.n);
        g.beginPath(); g.arc(I.x + 22, yy, small ? 5 : 7, 0, TAU); g.fillStyle = R.col; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1a1a3a'; g.stroke();
        txt(g, R.name + ': ' + R.n + tr(' Felder · heute auf ', ' spots · today on ') + cur, I.x + 34, yy, small ? 11 : 13, '#e8ecff', {align: 'left', w: 500});
      });
      y += lh * 3 + (small ? 4 : 10);
      if (I.y + I.h - y > (small ? 24 : 36)) {
        const qy = (y + I.y + I.h) / 2;
        txt(g, tr('Wann sind alle drei gleichzeitig', 'When are all three together'), cx, qy - (small ? 7 : 10), small ? 12 : 15, '#fff4e0', {w: 600});
        txt(g, tr('auf Feld 0 im Strahl?', 'on spot 0 in the beam?'), cx, qy + (small ? 7 : 10), small ? 12 : 15, '#fff4e0', {w: 600});
      }
      void t;
    }

    function drawKeypad(g, S) {
      const {t} = S, K = L.kp, small = K.h < 300;
      rr(g, K.x, K.y, K.w, K.h, 16); g.fillStyle = 'rgba(30,24,70,.85)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(143,211,255,.45)'; g.stroke();
      const ip = small ? 8 : 12, dispH = small ? 34 : Math.max(44, K.h * 0.16);
      const D = {x: K.x + ip, y: K.y + ip, w: K.w - ip * 2, h: dispH};
      rr(g, D.x, D.y, D.w, D.h, 10); g.fillStyle = flashBad > 0 ? 'rgba(150,30,60,' + (0.5 + flashBad * 0.5) + ')' : (done ? '#173a2a' : '#0a0a22'); g.fill(); g.lineWidth = 2; g.strokeStyle = done ? '#9be7a5' : '#3a8ad8'; g.stroke();
      if (entry) txt(g, entry + tr(' Tage', ' days'), D.x + D.w / 2, D.y + D.h / 2 + 1, D.h * 0.5, done ? '#c8ffd8' : '#8fd3ff', {glow: '#3a8ad8', blur: 10});
      else txt(g, tr('in ? Tagen', 'in ? days'), D.x + D.w / 2, D.y + D.h / 2 + 1, D.h * 0.4, 'rgba(143,211,255,.35)', {w: 600});
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
      const gy = D.y + D.h + ip * 0.8, gh = K.y + K.h - ip - gy, gap = small ? 5 : 7;
      const kw = (K.w - ip * 2 - gap * 2) / 3, kh = (gh - gap * 3) / 4;
      keys.forEach((k, i) => {
        const c = i % 3, r = Math.floor(i / 3), x = K.x + ip + c * (kw + gap), y = gy + r * (kh + gap);
        const isP = pressed === k && pressT > 0, hov = S.hover === 'k' + k, okC = k === 'ok', dy = isP ? 3 : 0;
        rr(g, x, y + 3, kw, kh, 9); g.fillStyle = '#05051a'; g.fill();
        rr(g, x, y + dy, kw, kh - 1, 9);
        const gk = g.createLinearGradient(0, y, 0, y + kh); gk.addColorStop(0, okC ? '#6fd3a0' : (hov ? '#5a5aa0' : '#4a4a8a')); gk.addColorStop(1, okC ? '#2a8a5a' : '#2a2a5a'); g.fillStyle = gk; g.fill();
        g.lineWidth = 1.5; g.strokeStyle = okC ? '#c8ffd8' : 'rgba(143,211,255,.5)'; g.stroke();
        if (isP) { g.save(); g.globalCompositeOperation = 'lighter'; rr(g, x, y + dy, kw, kh - 1, 9); g.fillStyle = 'rgba(143,211,255,' + pressT * 2.5 + ')'; g.fill(); g.restore(); }
        txt(g, k === 'del' ? '⌫' : (okC ? 'OK' : k), x + kw / 2, y + dy + kh / 2, Math.min(kh * 0.48, kw * 0.4) * (okC ? 0.85 : 1), '#fff', {stroke: '#1a1a3a', sw: 3});
        S.hit('k' + k, x, y, kw, kh, k);
      });
      void t;
    }

    const S = makeStage(root, {
      layout, draw,
      down(h) {
        if (!h || done || autoMode) return;
        if (h.id[0] === 'k') press(h.data);
        else if (h.id === 'adv') { pressed = 'adv'; pressT = 0.15; advance(); }
        else if (h.id === 'today') { pressed = 'today'; pressT = 0.15; today(); }
      },
    });
    const onKey = e => {
      if (done || autoMode) return;
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('del'); e.preventDefault(); }
      else if (e.key === 'Enter') { press('ok'); e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    api.msg(tr('Jeden Tag rückt jeder Planet ein Feld weiter (Pfeilrichtung).', 'Every day, each planet moves one spot forward (the way the arrows point).'), 'info');

    return {
      destroy() { S.destroy(); document.removeEventListener('keydown', onKey); timers.forEach(clearTimeout); },
      autoSolve() {
        if (done || autoMode) return; autoMode = true; entry = '';
        day = P.ans;  /* planets spin forward to the meeting day */
        const digits = String(P.ans).split('');
        digits.forEach((d, i) => later(() => { autoMode = false; press(d); autoMode = true; }, 250 + 160 * i));
        later(() => { autoMode = false; press('ok'); }, 250 + 160 * digits.length + 150);
      },
    };
  }

  G.PZ.register({
    id: 'weltraum-planeten', world: 'weltraum', slot: 1,
    title: tr('Die Planeten-Uhr', 'The Planet Clock'),
    intro: tr('Jeden Tag rückt jeder Planet ein Feld weiter. In wie vielen Tagen stehen alle drei zugleich auf Feld 0 im Strahl? „1 Tag vor“ kostet Energie.', 'Every day, each planet moves one spot forward. In how many days will all three stand on spot 0 in the beam at the same time? “+1 day” costs energy.'),
    letter: tr('Der Planet mit der längsten Runde ist der Boss: Schau nur auf die Tage, an denen er im Strahl steht, und prüf dann die anderen beiden.', 'The planet with the longest lap is the boss: only look at the days when it is in the beam, then check the other two.'),
    hint: tr('Ein Planet auf Feld p eines Rings mit n Feldern erreicht den Strahl nach n − p Tagen und danach alle n Tage wieder. Schreib dir die Tage des 7er-Planeten auf (z. B. 4, 11, 18, 25, …) und streiche alle, an denen der 5er-Planet nicht auf 0 steht. Von den übrigen nimm den ersten, an dem auch der 3er-Planet passt.', 'A planet on spot p of a ring with n spots reaches the beam after n − p days, and then again every n days. Write down the days of the 7-spot planet (e.g. 4, 11, 18, 25, …) and cross out every day when the 5-spot planet is not on 0. Of the ones left, take the first day when the 3-spot planet fits too.'),
    station,
    mount,
  });
})();

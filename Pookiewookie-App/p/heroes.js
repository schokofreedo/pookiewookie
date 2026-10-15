/* The Starway Home: buyable heroes in Toffo's bold "cool" style: Flitz (fox), Rexi (dino), Bolt (robot) and Hollo (Halloween event: a ghost in a pumpkin).
   G.heroes.renderer(id) -> draw(g, x, y, o) with the same options as G.draw.drawBearAt (feet at x, y; about 24 px tall at scale 1).
   G.heroes.portrait(ctx, cx, cy, size, id, t) -> head-and-shoulders bust for menus and shop cards.
   Stateless and self-contained. Like renderBearCool, every silhouette gets an outline pass and then a fill pass, so overlapping
   parts merge into one clean shape; flat colours with one darker shade; squash & stretch; secondary motion (tail, ears, antenna). */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- colours: hex, rgb() and hsl() (the star-power palette arrives as hsl strings) ---------- */
  const cc = new Map();
  function hsl2rgb(h, s, l) { if (s <= 0) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = x => { if (x < 0) x += 1; if (x > 1) x -= 1; return x < 1 / 6 ? p + (q - p) * 6 * x : (x < 0.5 ? q : (x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p)); }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
  function parse(c) {
    let v = cc.get(c); if (v) return v;
    if (cc.size > 3000) cc.clear();
    const s = String(c);
    if (s[0] === '#') { const h = s.length < 7 ? s[1] + s[1] + s[2] + s[2] + s[3] + s[3] : s.slice(1, 7), n = parseInt(h, 16) || 0; v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    else { const m = s.match(/-?[\d.]+/g) || ['128', '128', '128']; v = /^hsl/i.test(s) ? hsl2rgb((((+m[0] % 360) + 360) % 360) / 360, clamp(+m[1] / 100, 0, 1), clamp(+m[2] / 100, 0, 1)) : [+m[0], +m[1], +m[2]]; }
    cc.set(c, v); return v;
  }
  function shade(c, f) { const k = c + '~' + f; let s = cc.get(k); if (s) return s; const q = parse(c), t = f > 0 ? 255 : 0, a = Math.abs(f); s = 'rgb(' + Math.round(lerp(q[0], t, a)) + ',' + Math.round(lerp(q[1], t, a)) + ',' + Math.round(lerp(q[2], t, a)) + ')'; cc.set(k, s); return s; }
  function rgba(c, a) { const k = c + '@' + a; let s = cc.get(k); if (s) return s; const q = parse(c); s = 'rgba(' + Math.round(q[0]) + ',' + Math.round(q[1]) + ',' + Math.round(q[2]) + ',' + a + ')'; cc.set(k, s); return s; }

  /* ---------- shapes ---------- */
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function fs(g, fill, stroke, lw) { if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); } }
  function fcirc(g, x, y, r, fill, stroke, lw) { circ(g, x, y, r); fs(g, fill, stroke, lw); }
  function fell(g, x, y, rx, ry, fill, stroke, lw) { ell(g, x, y, rx, ry); fs(g, fill, stroke, lw); }
  /* a limb hanging from (x, y), rotated by rot (0 = down, + = forward); the path ends at len */
  function capPath(g, x, y, len, w, rot) { g.save(); g.translate(x, y); g.rotate(-rot); rr(g, -w / 2, -w * 0.25, w, len + w * 0.25, w / 2); g.restore(); }
  const limbEnd = (x, y, rot, len) => [x + Math.sin(rot) * len, y + Math.cos(rot) * len];
  /* paint the lower part of a limb (socks, gloves, boots) */
  function limbTip(g, x, y, len, w, rot, from, col) { g.save(); g.translate(x, y); g.rotate(-rot); rr(g, -w / 2, -w * 0.25, w, len + w * 0.25, w / 2); g.clip(); g.beginPath(); g.moveTo(-w, from + 0.25); g.quadraticCurveTo(0, from - 0.35, w, from + 0.25); g.lineTo(w, len + w); g.lineTo(-w, len + w); g.closePath(); g.fillStyle = col; g.fill(); g.restore(); }
  function heartPath(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.95); g.bezierCurveTo(x - s * 1.35, y, x - s * 0.9, y - s * 1.1, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.35, y, x, y + s * 0.95); g.closePath(); }
  /* closed smooth curve using the points as quadratic control points */
  function smoothClosed(g, pts) { const n = pts.length; g.beginPath(); g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } g.closePath(); }
  /* a bendy spine: angAt(s) gives the heading at s in 0..1 */
  function spinePts(x0, y0, n, len, angAt) { const pts = [[x0, y0]], ds = len / n; let x = x0, y = y0; for (let i = 1; i <= n; i++) { const a = angAt((i - 0.5) / n); x += Math.cos(a) * ds; y += Math.sin(a) * ds; pts.push([x, y]); } return pts; }
  function frameAt(sp, i) { const n = sp.length - 1, p = sp[Math.max(0, i - 1)], q = sp[Math.min(n, i + 1)]; let dx = q[0] - p[0], dy = q[1] - p[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; return [dx, dy, -dy, dx]; }
  /* outline points around a spine (side A out, rounded tip, side B back); A is the side to the left of the heading */
  function ribbonPts(sp, wAt, cap) {
    const n = sp.length - 1, A = [], B = []; let tx = 1, ty = 0;
    for (let i = 0; i <= n; i++) { const [dx, dy, nx, ny] = frameAt(sp, i), w = wAt(i / n) / 2; tx = dx; ty = dy; A.push([sp[i][0] + nx * w, sp[i][1] + ny * w]); B.push([sp[i][0] - nx * w, sp[i][1] - ny * w]); }
    const e = sp[n], w = wAt(1) / 2, out = A.slice();
    out.push([e[0] + tx * cap * 0.8 - ty * w * 0.75, e[1] + ty * cap * 0.8 + tx * w * 0.75]);
    out.push([e[0] + tx * cap * 1.3, e[1] + ty * cap * 1.3]);
    out.push([e[0] + tx * cap * 0.8 + ty * w * 0.75, e[1] + ty * cap * 0.8 - tx * w * 0.75]);
    for (let i = n; i >= 0; i--) out.push(B[i]);
    return out;
  }
  /* rounded spike / ear: base centre (x, y), heading ang, length h, base width b, tip roundness r */
  function spikePath(g, x, y, ang, h, b, r) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, tx = x + dx * h, ty = y + dy * h; r = r || b * 0.16;
    g.beginPath(); g.moveTo(x + nx * b / 2 - dx * 0.6, y + ny * b / 2 - dy * 0.6);
    g.quadraticCurveTo(x + nx * b * 0.42 + dx * h * 0.55, y + ny * b * 0.42 + dy * h * 0.55, tx + nx * r - dx * r, ty + ny * r - dy * r);
    g.quadraticCurveTo(tx + dx * r * 0.6, ty + dy * r * 0.6, tx - nx * r - dx * r, ty - ny * r - dy * r);
    g.quadraticCurveTo(x - nx * b * 0.42 + dx * h * 0.55, y - ny * b * 0.42 + dy * h * 0.55, x - nx * b / 2 - dx * 0.6, y - ny * b / 2 - dy * 0.6);
    g.closePath();
  }
  function trailPts(nx, ny, speed, up, len, phase, amp, n) { let dx = -(0.35 + 0.65 * speed), dy = 0.95 - 0.9 * speed - up * 1.3; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const px = -dy, py = dx, pts = []; for (let i = 0; i <= n; i++) { const d = len * i / n, wv = Math.sin(phase - i * 1.15) * amp * (i / n); pts.push([nx + dx * d + px * wv, ny + dy * d + py * wv]); } return pts; }
  function clothPoly(g, pts, w0, w1, col, ol, lw) { const n = pts.length; g.beginPath(); for (let i = 0; i < n; i++) { const [dx, dy, nx, ny] = frameAt(pts, i), w = lerp(w0, w1, i / (n - 1)) / 2; if (i === 0) g.moveTo(pts[i][0] + nx * w, pts[i][1] + ny * w); else g.lineTo(pts[i][0] + nx * w, pts[i][1] + ny * w); } for (let i = n - 1; i >= 0; i--) { const [, , nx, ny] = frameAt(pts, i), w = lerp(w0, w1, i / (n - 1)) / 2; g.lineTo(pts[i][0] - nx * w, pts[i][1] - ny * w); } g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = ol; g.lineWidth = lw; g.stroke(); }
  /* the golden power-up wings (same look as Toffo's) */
  function wingG(g, x, y, s, rot, a) { g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a; for (let i = 0; i < 3; i++) { ell(g, -s * (0.5 + i * 0.42), -s * 0.1 - i * s * 0.12, s * 0.62, s * 0.26 - i * 0.02 * s); g.fillStyle = i % 2 ? '#ffd84a' : '#ffe9a8'; g.fill(); g.strokeStyle = '#e3a92a'; g.lineWidth = 0.8; g.stroke(); } g.restore(); }
  function backWings(g, R, o, x0, y0) {
    if (o.gliding) { const fl = Math.sin(R.fr * 2 + R.t * 12) * 0.35; wingG(g, x0, y0, 12, -0.4 + fl, 0.95); g.save(); g.scale(-1, 1); wingG(g, x0, y0, 12, -0.4 + fl, 0.95); g.restore(); }
    else if (o.wings) wingG(g, x0 - 0.5, y0 - 1.5, 6, -1.1, 0.9);
  }
  function coffeeCup(g, x, y, ol, lw) { g.save(); g.translate(x, y); rr(g, -2.2, -2.2, 4.4, 4.4, 1.1); fs(g, '#fff', ol, lw * 0.7); g.fillStyle = '#6b3f1d'; rr(g, -1.5, -1.5, 3, 1.4, 0.4); g.fill(); g.strokeStyle = ol; g.lineWidth = lw * 0.7; g.beginPath(); g.arc(2.7, 0, 1.3, -1.3, 1.3); g.stroke(); g.restore(); }

  /* ================= shared pose rig (same pose meanings as Toffo) ================= */
  const POSES = new Set(['idle', 'run', 'jump', 'fall', 'glide', 'skydive', 'victory', 'sad', 'wall', 'climb', 'pound', 'jet', 'launch', 'dead']);
  function rig(o, d) {
    const pose = POSES.has(o.pose) ? o.pose : 'idle', t = +o.t || 0, fr = +o.frame || 0, sp = clamp(+o.speed || 0, 0, 1), sc = +o.scale || 1;
    const R = {pose, t, fr, sp, sc, f: (o.facing || 1) < 0 ? -1 : 1, pal: o.pal || null, lw: 1.3 / Math.sqrt(sc), vy: +o.vy || 0};
    R.upF = clamp(R.vy / 6, 0, 1); R.vyN = clamp(-R.vy / 6, 0, 1);
    const sx = +o.sx || 1, sy = +o.sy || 1; R.ssx = 1 + (sx - 1) * 1.3; R.ssy = 1 + (sy - 1) * 1.3;
    let rot = 0, dy = 0, pivot = 0;
    if (pose === 'run') { rot = d.lean * sp + (d.waddle ? Math.sin(fr) * d.waddle : 0); dy = -Math.abs(Math.cos(fr)) * d.bounce * sp; }
    else if (pose === 'jet') rot = 0.5; else if (pose === 'wall') rot = -0.1;
    else if (pose === 'launch') { rot = 1.15; pivot = d.pivot; } else if (pose === 'skydive') { rot = PI / 2 - 0.12; pivot = d.pivot; }
    else if (pose === 'pound') { rot = fr * 0.55; pivot = d.pivot; }
    else if (pose === 'dead') rot = Math.min(0.5, (o.deadT == null ? 0.4 : +o.deadT || 0) * 1.2);
    else if (pose === 'sad') dy = 0.5;
    else if (pose === 'victory') dy = -Math.abs(Math.sin(t * 7)) * 2;
    else if (pose === 'idle' && d.sway) rot = Math.sin(t * 1.3) * d.sway;
    R.rot = rot; R.dy = dy; R.pivot = pivot;
    let aF = -0.1, aB = 0.1, lF = 0, lB = 0, legK = 1, armK = 1;
    const sw = Math.sin(fr);
    if (pose === 'run') { lF = sw * d.stride; lB = -sw * d.stride; aF = -sw * d.pump - 0.15; aB = sw * d.pump - 0.15; }
    else if (pose === 'jump') { aF = 2.45; aB = -2.45; lF = 0.8; lB = 0.8; legK = 0.8; }
    else if (pose === 'fall') { aF = 1.45 + Math.sin(t * 18) * 0.08; aB = -1.45 - Math.sin(t * 18 + 1) * 0.08; lF = 0.3; lB = -0.3; }
    else if (pose === 'glide') { aF = 1.3; aB = -1.3; lF = 0.15; lB = -0.15; }
    else if (pose === 'skydive') { aF = 1.9; aB = -1.9; lF = 0.6; lB = -0.6; }
    else if (pose === 'victory') { aF = 2.4 + Math.sin(t * 10) * 0.2; aB = -2.4 - Math.sin(t * 10 + 1) * 0.2; }
    else if (pose === 'wall') { aF = 2.3; aB = 1.2; lF = 0.5; lB = 0.2; legK = 0.85; }
    else if (pose === 'pound') { aF = 1.6; aB = -1.6; lF = 1.3; lB = 1.3; legK = 0.67; armK = 0.67; }
    else if (pose === 'jet') { aF = -1.3; aB = -1.5; lF = -0.6; lB = -0.75; }
    else if (pose === 'launch') { aF = 2.75; aB = -2.75; lF = -0.1; lB = 0.1; }
    else if (pose === 'climb') { const c = Math.sin(fr * 1.5); aF = 2.4 + c * 0.5; aB = -2.4 + c * 0.5; lF = 0.4 + c * 0.4; lB = 0.4 - c * 0.4; }
    else if (pose === 'dead') { aF = 0.35; aB = -0.35; }
    Object.assign(R, {aF, aB, lF, lB, legK, armK, sw});
    R.raisedF = Math.abs(aF) > 1.45; R.raisedB = Math.abs(aB) > 1.45;
    let mood = o.mood || '';
    if (!mood) { if (pose === 'fall' || pose === 'launch') mood = 'wide'; else if (pose === 'jump' || pose === 'victory' || pose === 'glide') mood = 'happy'; else if (pose === 'dead') mood = 'dead'; else if (pose === 'sad') mood = 'sad'; else if (pose === 'skydive') mood = 'squint'; else mood = 'cool'; }
    R.baseMood = mood;
    if ((t % d.blink) < 0.11 && (mood === 'cool' || mood === 'wide')) mood = 'blink';
    R.mood = mood; R.explicitCool = o.mood === 'cool';
    R.breath = pose === 'idle' ? Math.sin(t * 2.2) * 0.025 : 0;
    return R;
  }
  function begin(g, x, y, R) { g.translate(x, y); g.scale(R.f * R.sc * R.ssx, R.sc * R.ssy); g.lineJoin = 'round'; g.lineCap = 'round'; g.translate(0, R.dy + R.pivot); g.rotate(R.rot); g.translate(0, -R.pivot); }
  function headXf(g, H) { g.translate(H.px, H.py); g.rotate(H.tilt); g.translate(-H.px, -H.py); }
  function outlinePass(g, shapes, ol, lw) { g.lineWidth = lw * 2; g.strokeStyle = ol; g.fillStyle = ol; for (const s of shapes) { s(); g.fill(); g.stroke(); } }
  function fillPass(g, shapes, col) { for (const s of shapes) { s(); g.fillStyle = col; g.fill(); } }
  /* draws `shapes` (already filled) once more inside `clip`, with a thin outline ring: separates a front part from what lies behind it */
  function seam(g, clip, shapes, col, ol, w) { g.save(); clip(); g.clip(); g.lineWidth = w; g.strokeStyle = ol; g.fillStyle = ol; for (const s of shapes) { s(); g.fill(); g.stroke(); } for (const s of shapes) { s(); g.fillStyle = col; g.fill(); } g.restore(); }

  /* glossy cartoon eyes with lids (fox and dino); d = -1 back eye, +1 front eye */
  function eyeGloss(g, cx, cy, rx, ry, mood, lidCol, ol, lw, d, lid, slant) {
    if (mood === 'dead') { const r = rx * 1.05; g.strokeStyle = ol; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy + r); g.moveTo(cx + r, cy - r); g.lineTo(cx - r, cy + r); g.stroke(); return; }
    if (mood === 'happy') { g.strokeStyle = ol; g.lineWidth = lw * 1.05; g.beginPath(); g.moveTo(cx - rx * 1.25, cy + ry * 0.4); g.quadraticCurveTo(cx, cy - ry * 1.2, cx + rx * 1.25, cy + ry * 0.4); g.stroke(); return; }
    if (mood === 'blink') { g.strokeStyle = ol; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - rx * 1.2, cy + ry * 0.2); g.lineTo(cx + rx * 1.2, cy + ry * 0.2); g.stroke(); return; }
    const wide = mood === 'wide', ex = wide ? rx * 1.22 : rx, ey = wide ? ry * 1.15 : ry, k = Math.max(1, rx / 1.15);
    ell(g, cx, cy, ex, ey); g.fillStyle = ol; g.fill();
    fcirc(g, cx + ex * 0.28, cy - ey * 0.4, (wide ? 0.5 : 0.44) * k, '#fff');
    fcirc(g, cx - ex * 0.32, cy + ey * 0.42, 0.22 * k, 'rgba(255,255,255,.7)');
    if ((mood === 'cool' && lid > 0) || mood === 'squint' || mood === 'sad') {
      const f = mood === 'squint' ? 0.56 : (mood === 'sad' ? 0.4 : lid), s = mood === 'sad' ? d * 0.5 : (mood === 'squint' ? -d * 0.25 : slant), ly = cy - ey + ey * 2 * f;
      g.save(); ell(g, cx, cy, ex + 0.4, ey + 0.4); g.clip(); g.beginPath(); g.moveTo(cx - 4, cy - 5); g.lineTo(cx + 4, cy - 5); g.lineTo(cx + 4, ly + s * 4); g.lineTo(cx - 4, ly - s * 4); g.closePath(); g.fillStyle = lidCol; g.fill(); g.restore();
      const e = ex + 0.3; g.strokeStyle = ol; g.lineWidth = lw * 0.75; g.beginPath(); g.moveTo(cx - e, ly - s * e); g.lineTo(cx + e, ly + s * e); g.stroke();
    }
  }

  /* ======================================================================================================
     FLITZ: the fox. Slim speedster, huge fluffy tail with a white tip, dark socks, teal neckerchief, cheeky grin.
     ====================================================================================================== */
  const FOX = {fur: '#f0842e', sock: '#4a2a1c', cream: '#fff3e2', ol: '#3a1b0e', earIn: '#ffd9c2', tip: '#fffaf4', teal: '#1fbcab', nose: '#2a130b', mouth: '#5a1a1a', tongue: '#ff8d9a'};
  const FOX_RIG = {lean: 0.46, bounce: 1.1, pivot: -8, blink: 3.3, stride: 1.35, pump: 1.4, sway: 0.015};
  function foxTail(R) {
    const {pose, t, fr, sp, upF, vyN, rot} = R;
    let a0 = PI + 0.2, curl = 1.5, amp = 0.28, ph = t * 2.3, k = 2.4, len = 12.6, w = 1;
    if (pose === 'idle') { const ft = t % 6.1; if (ft < 0.8) amp += Math.sin(ft / 0.8 * PI) * 0.3; a0 += Math.sin(t * 1.1) * 0.06; }
    else if (pose === 'run') { a0 = PI + 0.16 - rot * 0.85 - upF * 0.2; curl = 0.3 * (1 - sp) + 0.14; amp = 0.22 + 0.12 * sp; ph = fr * 1.25; k = 3.1; len = 12.6 + sp * 1.4; }
    else if (pose === 'jump') { a0 = PI - 0.62 - 0.3 * vyN; curl = 0.8; amp = 0.14; ph = t * 6; len = 12.8; }
    else if (pose === 'fall') { a0 = PI + 0.5 + upF * 0.35; curl = 0.75; amp = 0.12; ph = t * 15; k = 3.5; }
    else if (pose === 'glide') { a0 = PI + 0.12; curl = 0.4; amp = 0.18; ph = t * 4.5; }
    else if (pose === 'skydive') { a0 = PI + 0.05; curl = 0.2; amp = 0.2; ph = t * 16; k = 3.5; len = 13.4; }
    else if (pose === 'victory') { a0 = PI + 0.4; curl = 1.3; amp = 0.45; ph = t * 9.5; }
    else if (pose === 'sad') { a0 = PI - 0.55; curl = 0.6; amp = 0.04; ph = t * 1.2; len = 11; w = 0.86; }
    else if (pose === 'wall') { a0 = PI - 1.3; curl = 0.35; amp = 0.12; ph = t * 2.2; }
    else if (pose === 'climb') { a0 = PI - 1.35; curl = 0.3; amp = 0.28; ph = fr * 1.5; }
    else if (pose === 'pound') { a0 = PI - 0.7; curl = 2.7; amp = 0; len = 10.5; w = 0.92; }
    else if (pose === 'jet') { a0 = PI - 0.42; curl = 0.08; amp = 0.2; ph = t * 17; k = 3.4; len = 13.6; }
    else if (pose === 'launch') { a0 = PI - 1.05; curl = 0.05; amp = 0.16; ph = t * 17; k = 3.4; len = 13.8; }
    else if (pose === 'dead') { a0 = PI - 0.75; curl = 0.45; amp = 0; len = 12; }
    return {a0, curl, amp, ph, k, len, w};
  }
  function drawFlitz(g, x, y, o) {
    o = o || {}; const R = rig(o, FOX_RIG), {pose, t, fr, sp, lw, mood} = R, pal = R.pal;
    const fur = (pal && pal.fur) || FOX.fur, sock = (pal && pal.dark) || FOX.sock, cream = (pal && pal.belly) || FOX.cream, ol = (pal && pal.outline) || FOX.ol, earIn = (pal && pal.ear) || FOX.earIn;
    g.save();
    try {
      begin(g, x, y, R);
      const {aF, aB, lF, lB, raisedF, raisedB} = R, legLen = 3.5 * R.legK, armLen = 3.6 * R.armK, sad = pose === 'sad';
      const hx = 0.5, hy = -15.6 + (sad ? 0.7 : 0) + (pose === 'idle' ? Math.sin(t * 2.2 - 0.7) * 0.18 : 0);
      let tilt = 0;
      if (pose === 'idle') tilt = Math.sin(t * 1.15) * 0.035; else if (pose === 'run') tilt = 0.05 * sp + Math.sin(fr * 2) * 0.03; else if (sad) tilt = 0.16; else if (pose === 'victory') tilt = Math.sin(t * 7) * 0.07; else if (pose === 'dead') tilt = 0.15; else if (pose === 'jump') tilt = -0.08; else if (pose === 'fall') tilt = -0.05;
      const H = {px: hx, py: hy + 5, tilt};
      /* ears: heading angles, secondary motion */
      let eB = -2.02, eF = -1.2;
      const tw = (t % 4.7) < 0.32 ? Math.sin((t % 4.7) / 0.32 * PI * 3) * 0.22 : 0;
      if (pose === 'idle') eF += tw;
      else if (pose === 'run') { const fl = Math.sin(fr + 1) * 0.07; eB += -0.45 * sp + fl; eF += -0.5 * sp + fl; }
      else if (pose === 'jump' || pose === 'glide') { eB -= 0.25; eF -= 0.2; }
      else if (pose === 'fall' || pose === 'skydive') { const fl = Math.sin(t * 22) * 0.06; eB -= 0.25 + fl; eF += 0.3 + fl; }
      else if (sad) { eB -= 0.7; eF += 0.75; }
      else if (pose === 'dead') { eB -= 0.5; eF += 0.6; }
      else if (pose === 'victory') { const w = Math.sin(t * 14) * 0.12; eB += w; eF -= w; }
      else if (pose === 'jet' || pose === 'launch') { eB -= 0.55; eF -= 0.6; }
      const earLen = 6.5, earW = 5.6, earBx = hx - 3.0, earBy = hy - 4.3, earFx = hx + 2.6, earFy = hy - 4.7;

      /* ---- wings and the big tail behind everything ---- */
      backWings(g, R, o, -3, -10.5);
      const TP = foxTail(R);
      const spine = spinePts(-3.2, -5.6, 9, TP.len, s => TP.a0 + TP.curl * s + TP.amp * s * Math.sin(TP.ph - s * TP.k));
      const wAt = s => (s < 0.55 ? lerp(2.6, 6.8, Math.sin(s / 0.55 * PI / 2)) : 6.8 * Math.cos((s - 0.55) / 0.45 * PI / 2) + 0.3) * TP.w;
      const tailOut = ribbonPts(spine, wAt, 1.1), tail = () => smoothClosed(g, tailOut);
      tail(); fs(g, ol, ol, lw * 2); tail(); g.fillStyle = fur; g.fill();
      { /* white fluffy tip */
        const n = spine.length - 1, kk = 6, [dx, dy, nx, ny] = frameAt(spine, kk), p = spine[kk], w = wAt(kk / n) / 2 + 2, z = 1.1;
        g.save(); tail(); g.clip(); g.beginPath(); g.moveTo(p[0] + nx * w, p[1] + ny * w);
        const pts = [[0.62, -z], [0.3, 0.2], [0, -z * 1.1], [-0.3, 0.2], [-0.62, -z], [-1, 0]];
        for (const [u, off] of pts) g.lineTo(p[0] + nx * w * u + dx * off, p[1] + ny * w * u + dy * off);
        for (let i = kk + 1; i <= n; i++) { const [, , mx, my] = frameAt(spine, i), q = spine[i]; g.lineTo(q[0] - mx * (w + 1), q[1] - my * (w + 1)); }
        const e = spine[n]; g.lineTo(e[0] + dx * 6, e[1] + dy * 6);
        for (let i = n; i > kk; i--) { const [, , mx, my] = frameAt(spine, i), q = spine[i]; g.lineTo(q[0] + mx * (w + 1), q[1] + my * (w + 1)); }
        g.closePath(); g.fillStyle = FOX.tip; g.fill(); g.restore();
      }

      /* ---- silhouette: outline pass for everything, body fill, kerchief, then the head fill on top ---- */
      /* neckerchief knot tails flutter behind the neck */
      { const airy = pose === 'jump' || pose === 'fall' || pose === 'skydive' || pose === 'launch' || pose === 'glide' || pose === 'jet';
        const pts = trailPts(-3.6, -10.7, sp * 0.85 + (airy ? 0.55 : 0), R.upF, 3.4 + sp * 2, fr * 1.6 + t * 9, 0.7 + sp * 0.6, 3);
        clothPoly(g, pts, 2.4, 0.9, FOX.teal, ol, lw); }
      const sY = -10.2, hipY = -4.6;
      const backArm = () => capPath(g, -3.9, sY, armLen, 2.9, aB), backLeg = () => capPath(g, -2.2, hipY, legLen, 3.3, lB), frontLeg = () => capPath(g, 2.2, hipY, legLen, 3.3, lF);
      const body = () => ell(g, 0, -7.6, 4.8, 5.2 * (1 + R.breath));
      const H0 = {
        cranium: () => circ(g, hx, hy, 6.1),
        snout: () => { g.beginPath(); g.moveTo(hx + 1.0, hy + 0.9); g.quadraticCurveTo(hx + 5.4, hy + 0.6, hx + 8.4, hy + 1.7); g.quadraticCurveTo(hx + 10.1, hy + 2.4, hx + 8.9, hy + 3.5); g.quadraticCurveTo(hx + 6.2, hy + 5.6, hx + 1.4, hy + 5.2); g.closePath(); },
        cheek: () => { g.beginPath(); g.moveTo(hx - 4.3, hy - 1.2); g.quadraticCurveTo(hx - 6.2, hy + 0.2, hx - 7.7, hy + 2.2); g.quadraticCurveTo(hx - 6.6, hy + 2.5, hx - 6.0, hy + 3.0); g.quadraticCurveTo(hx - 6.4, hy + 3.9, hx - 7.0, hy + 4.7); g.quadraticCurveTo(hx - 4.6, hy + 5.7, hx - 2.4, hy + 5.4); g.closePath(); },
        earB: () => spikePath(g, earBx, earBy, eB, earLen, earW, 0.9),
        earF: () => spikePath(g, earFx, earFy, eF, earLen + 0.3, earW, 0.9),
      };
      const inH = fn => () => { g.save(); headXf(g, H); fn(); g.restore(); };
      const head = [inH(H0.earB), inH(H0.cheek), inH(H0.cranium), inH(H0.snout), inH(H0.earF)];
      const bodyS = (raisedB ? [] : [backArm]).concat([backLeg, frontLeg, body]);
      outlinePass(g, bodyS.concat(head), ol, lw);
      fillPass(g, bodyS, fur);
      /* socks and gloves */
      if (!raisedB) limbTip(g, -3.9, sY, armLen, 2.9, aB, armLen * 0.45, sock);
      limbTip(g, -2.2, hipY, legLen, 3.3, lB, legLen * 0.2, sock); limbTip(g, 2.2, hipY, legLen, 3.3, lF, legLen * 0.2, sock);
      g.strokeStyle = ol; g.lineWidth = lw * 0.8; frontLeg(); g.stroke();
      /* cream chest */
      ell(g, 1.2, -6.5, 2.8, 3.4 * (1 + R.breath)); g.fillStyle = cream; g.fill();
      /* teal neckerchief: collar and a triangle that flaps with speed */
      const kx = 0.5, ky = -15.6, flx = sp * 1.4 * (pose === 'run' ? 1 : 0) + (pose === 'jet' || pose === 'launch' ? 1.6 : 0), fly = (pose === 'fall' || pose === 'skydive' ? 1.6 : 0) + flx * 0.5 + Math.sin(fr * 2) * 0.25 * sp;
      const kerch = () => { g.beginPath(); g.moveTo(kx - 2.2, ky + 5.2); g.quadraticCurveTo(kx + 1.6, ky + 6.4, kx + 5.4, ky + 4.9); g.quadraticCurveTo(kx + 4.2, ky + 8.2, kx + 1.6 - flx, ky + 10.7 - fly); g.quadraticCurveTo(kx - 0.9, ky + 8.0, kx - 2.2, ky + 5.2); g.closePath(); };
      const collar = () => ell(g, kx + 0.5, ky + 5.4, 5.0, 1.6);
      collar(); fs(g, FOX.teal, ol, lw * 0.85); kerch(); fs(g, FOX.teal, ol, lw * 0.85);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = lw * 0.55; g.beginPath(); g.moveTo(kx - 0.6, ky + 6.6); g.quadraticCurveTo(kx + 1.6, ky + 7.3, kx + 3.6, ky + 6.4); g.stroke();
      /* head on top of the collar, with a thin chin line where it overlaps */
      fillPass(g, head, fur);
      seam(g, () => { g.beginPath(); g.ellipse(kx + 0.5, ky + 5.4, 5.0 + lw, 1.6 + lw, 0, 0, TAU); }, [inH(H0.cheek), inH(H0.cranium), inH(H0.snout)], fur, ol, lw * 1.5);

      /* ---- face ---- */
      g.save(); headXf(g, H);
      for (const [bx, by, a, L] of [[earBx, earBy, eB, earLen], [earFx, earFy, eF, earLen + 0.3]]) {
        const dx = Math.cos(a), dy = Math.sin(a);
        spikePath(g, bx + dx * 0.9, by + dy * 0.9, a, L * 0.62, earW * 0.46, 0.5); g.fillStyle = earIn; g.fill();
        g.save(); spikePath(g, bx, by, a, L, earW, 0.9); g.clip(); circ(g, bx + dx * (L * 0.6 + 5.2), by + dy * (L * 0.6 + 5.2), 5.4); g.fillStyle = sock; g.fill(); g.restore();
      }
      /* cream lower face (cheeks and muzzle), clipped to each head part */
      /* cream back cheek and muzzle underside; the snout bridge stays orange */
      const mask = () => { g.beginPath(); g.moveTo(hx + 12, hy + 2.8); g.lineTo(hx + 8.5, hy + 2.7); g.quadraticCurveTo(hx + 5.0, hy + 2.8, hx + 2.3, hy + 2.5); g.quadraticCurveTo(hx + 0.8, hy + 2.4, hx + 0.0, hy + 1.6); g.quadraticCurveTo(hx - 1.6, hy + 0.5, hx - 3.2, hy + 0.9); g.quadraticCurveTo(hx - 4.6, hy + 1.3, hx - 5.6, hy + 0.0); g.lineTo(hx - 11, hy - 0.6); g.lineTo(hx - 11, hy + 10); g.lineTo(hx + 12, hy + 10); g.closePath(); };
      for (const s of [H0.cranium, H0.snout, H0.cheek]) { g.save(); s(); g.clip(); mask(); g.fillStyle = cream; g.fill(); g.restore(); }
      /* nose */
      ell(g, hx + 8.75, hy + 2.15, 1.25, 0.95); g.fillStyle = FOX.nose; g.fill(); fcirc(g, hx + 8.45, hy + 1.8, 0.34, 'rgba(255,255,255,.75)');
      /* mouth: a cheeky grin with one fang */
      const mb = mood === 'blink' ? R.baseMood : mood;
      g.strokeStyle = ol; g.lineWidth = lw * 0.75;
      const fang = (fx, fy) => { g.beginPath(); g.moveTo(fx - 0.5, fy - 0.1); g.lineTo(fx + 0.45, fy - 0.2); g.lineTo(fx + 0.05, fy + 0.95); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = lw * 0.35; g.stroke(); g.lineWidth = lw * 0.75; };
      if (mb === 'happy') { const mp = () => { g.beginPath(); g.moveTo(hx + 3.0, hy + 3.3); g.quadraticCurveTo(hx + 5.8, hy + 3.9, hx + 8.4, hy + 3.3); g.quadraticCurveTo(hx + 6.6, hy + 7.4, hx + 3.0, hy + 3.3); g.closePath(); }; mp(); g.fillStyle = FOX.mouth; g.fill(); g.save(); g.clip(); fell(g, hx + 5.5, hy + 6.0, 1.9, 1.1, FOX.tongue); g.restore(); mp(); g.stroke(); fang(hx + 6.9, hy + 3.75); }
      else if (mb === 'wide') { g.beginPath(); g.moveTo(hx + 8.3, hy + 3.5); g.quadraticCurveTo(hx + 6.4, hy + 4.1, hx + 4.4, hy + 3.8); g.stroke(); fell(g, hx + 6.3, hy + 4.7, 0.85, 1.05, FOX.mouth); }
      else if (mb === 'sad' || mb === 'dead') { g.beginPath(); g.moveTo(hx + 3.6, hy + 4.7); g.quadraticCurveTo(hx + 6.0, hy + 3.3, hx + 8.2, hy + 4.0); g.stroke(); if (mb === 'dead') fell(g, hx + 6.7, hy + 4.9, 0.65, 1.05, FOX.tongue, ol, lw * 0.5); }
      else if (mb === 'squint') { g.beginPath(); g.moveTo(hx + 3.8, hy + 3.9); g.lineTo(hx + 8.1, hy + 3.6); g.stroke(); fang(hx + 6.3, hy + 3.8); }
      else { g.beginPath(); g.moveTo(hx + 8.2, hy + 3.6); g.quadraticCurveTo(hx + 6.2, hy + 5.2, hx + 3.8, hy + 4.0); g.quadraticCurveTo(hx + 3.0, hy + 3.6, hx + 2.9, hy + 2.8); g.stroke(); fang(hx + 6.1, hy + 4.45); }
      /* eyes: relaxed, cocky lids with a foxy flick at the outer corner */
      const wink = o.portrait && (t % 5.3) > 4.85;
      for (const d of [-1, 1]) {
        const cx = hx + (d < 0 ? -2.0 : 2.7), cy = hy - 1.3, m = wink && d > 0 ? 'happy' : mood;
        eyeGloss(g, cx, cy, 1.28, 1.75, m, fur, ol, lw, d, 0.27, -d * 0.16);
      }
      g.restore();

      /* ---- front arm (and a raised back arm) on top ---- */
      const arm = (sx, a) => { g.strokeStyle = ol; g.lineWidth = lw * 2; g.fillStyle = ol; capPath(g, sx, sY, armLen, 2.9, a); g.fill(); g.stroke(); g.fillStyle = fur; capPath(g, sx, sY, armLen, 2.9, a); g.fill(); limbTip(g, sx, sY, armLen, 2.9, a, armLen * 0.45, sock); };
      if (raisedB) arm(-3.9, aB);
      arm(3.9, aF);
      if (o.coffee) { const [cx, cy] = limbEnd(3.9, sY, aF, armLen); coffeeCup(g, cx, cy, ol, lw); }
    } finally { g.restore(); }
  }

  /* ======================================================================================================
     REXI: the little dinosaur. Chunky and round, big head, big eyes, tiny arms, orange back spikes, bouncy tail.
     ====================================================================================================== */
  const DINO = {fur: '#5bc96a', dark: '#3e9f51', belly: '#fff3b4', stripe: '#e6c56a', spike: '#ff9a3c', ol: '#1d3d27', mouth: '#5a1d2a', tongue: '#ff7d92', blush: '#ff9fb8'};
  const DINO_RIG = {lean: 0.3, bounce: 0.9, pivot: -8, blink: 4.4, stride: 1.05, pump: 0.5, waddle: 0.06, sway: 0.025};
  function dinoTail(R) {
    const {pose, t, fr, sp, rot, vyN, upF} = R;
    let a0 = PI - 0.32, curl = 0.55, len = 8.2, wob = 0;
    if (pose === 'idle') wob = Math.sin(t * 2.0) * 0.07;
    else if (pose === 'run') { a0 = PI - 0.22 - rot * 0.6; wob = Math.sin(fr * 2 + 0.6) * 0.13 * (0.4 + sp); curl = 0.45 + Math.sin(fr * 2 - 0.5) * 0.25 * sp; }
    else if (pose === 'jump') { a0 = PI - 0.75 - vyN * 0.2; curl = 0.75; }
    else if (pose === 'fall') { a0 = PI + 0.2 + upF * 0.25; curl = 0.4; wob = Math.sin(t * 16) * 0.05; }
    else if (pose === 'glide' || pose === 'skydive') { a0 = PI - 0.05; curl = 0.25; wob = Math.sin(t * 9) * 0.06; }
    else if (pose === 'victory') { a0 = PI - 0.1; curl = 0.8; wob = Math.sin(t * 14) * 0.2; }
    else if (pose === 'sad') { a0 = PI - 0.55; curl = 0.45; len = 7.8; }
    else if (pose === 'wall' || pose === 'climb') { a0 = PI - 1.0; curl = 0.4; wob = Math.sin((pose === 'climb' ? fr * 1.5 : t * 2)) * 0.12; }
    else if (pose === 'pound') { a0 = PI - 0.9; curl = 1.6; len = 7; }
    else if (pose === 'jet') { a0 = PI - 0.45; curl = 0.2; wob = Math.sin(t * 15) * 0.05; }
    else if (pose === 'launch') { a0 = PI - 1.05; curl = 0.2; wob = Math.sin(t * 15) * 0.05; }
    else if (pose === 'dead') { a0 = PI - 0.5; curl = 0.3; }
    return {a0: a0 + wob, curl, len};
  }
  function drawRexi(g, x, y, o) {
    o = o || {}; const R = rig(o, DINO_RIG), {pose, t, fr, sp, lw, mood} = R, pal = R.pal;
    const fur = (pal && pal.fur) || DINO.fur, dark = (pal && pal.dark) || DINO.dark, belly = (pal && pal.belly) || DINO.belly, ol = (pal && pal.outline) || DINO.ol;
    g.save();
    try {
      begin(g, x, y, R);
      let {aF, aB, lF, lB, raisedF, raisedB} = R; const legLen = 2.3 * R.legK, armLen = 2.5 * R.armK, sad = pose === 'sad';
      /* T-rex arms held up in front unless the pose says otherwise */
      if (pose === 'idle') { aF = 0.95 + Math.sin(t * 3.1) * 0.08; aB = 0.7 + Math.sin(t * 3.1 + 1) * 0.08; }
      else if (pose === 'run') { aF = 1.0 - R.sw * 0.45; aB = 0.8 + R.sw * 0.45; }
      else if (sad || pose === 'dead') { aF = 0.15; aB = 0.05; }
      const hx = -0.1, hy = -15.6 + (sad ? 0.7 : 0) + (pose === 'idle' ? Math.sin(t * 2.2 - 0.6) * 0.2 : 0) + (pose === 'run' ? Math.abs(Math.sin(fr)) * 0.35 * sp : 0);
      let tilt = 0;
      if (pose === 'idle') tilt = Math.sin(t * 1.2) * 0.03; else if (pose === 'run') tilt = 0.04 * sp + Math.sin(fr * 2 + 0.8) * 0.035; else if (sad) tilt = 0.14; else if (pose === 'victory') tilt = -0.1 + Math.sin(t * 7) * 0.06; else if (pose === 'dead') tilt = 0.12; else if (pose === 'jump') tilt = -0.1;
      const H = {px: hx, py: hy + 5, tilt};
      backWings(g, R, o, -3.5, -10.5);
      /* ---- tail spine ---- */
      const TP = dinoTail(R), spine = spinePts(-3.2, -6.0, 5, TP.len, s => TP.a0 + TP.curl * s), wAt = s => lerp(7.4, 2.4, Math.pow(s, 0.9)), tailOut = ribbonPts(spine, wAt, 1.0);
      const tail = () => smoothClosed(g, tailOut);
      /* ---- spikes behind the silhouette (head ones follow the head) ---- */
      const spikes = [];
      const headSp = [[-78, 5.3, 3.3, 3.4], [-114, 5.3, 3.2, 3.3], [-150, 5.2, 2.9, 3.0]];
      for (const [deg, r, h, b] of headSp) { const a = deg * PI / 180; spikes.push(() => { g.save(); headXf(g, H); spikePath(g, hx + Math.cos(a) * r, hy + Math.sin(a) * r, a, h, b, 0.7); g.restore(); }); }
      for (const [deg, h, b] of [[-140, 2.8, 3.0], [-168, 2.5, 2.7]]) { const a = deg * PI / 180; spikes.push(() => spikePath(g, -0.2 + Math.cos(a) * 5.4, -7.3 + Math.sin(a) * 5.2, a, h, b, 0.6)); }
      for (const [s, h, b] of [[0.3, 2.4, 2.6], [0.65, 1.9, 2.1]]) { const n = spine.length - 1, i = Math.round(s * n), [, , nx, ny] = frameAt(spine, i), w = wAt(i / n) / 2 - 0.5, p = spine[i]; spikes.push(() => spikePath(g, p[0] + nx * w, p[1] + ny * w, Math.atan2(ny, nx), h, b, 0.55)); }
      outlinePass(g, spikes, ol, lw); fillPass(g, spikes, DINO.spike);
      /* ---- silhouette ---- */
      const sY = -9.5, hipY = -4.9;
      const foot = (hx0, a) => () => { g.save(); g.translate(hx0, hipY); g.rotate(-a); ell(g, 0.75, legLen + 0.1, 2.75, 1.65); g.restore(); };
      const backArm = () => capPath(g, -3.5, sY, armLen, 2.6, aB);
      const backLeg = () => capPath(g, -3.0, hipY, legLen, 4.4, lB), frontLeg = () => capPath(g, 3.0, hipY, legLen, 4.4, lF);
      const body = () => ell(g, -0.2, -7.3, 6.0, 5.8 * (1 + R.breath));
      const H0 = {cranium: () => circ(g, hx, hy, 5.8), snout: () => ell(g, hx + 4.3, hy + 1.6, 5.2, 4.0)};
      const inH = fn => () => { g.save(); headXf(g, H); fn(); g.restore(); };
      const head = [inH(H0.cranium), inH(H0.snout)];
      const bodyS = (raisedB ? [] : [backArm]).concat([backLeg, foot(-3.0, lB), tail, body, frontLeg, foot(3.0, lF)]);
      outlinePass(g, bodyS.concat(head), ol, lw);
      fillPass(g, bodyS, fur);
      /* feet soles, back spots, belly with plates */
      for (const [hx0, a] of [[-3.0, lB], [3.0, lF]]) { g.save(); g.translate(hx0, hipY); g.rotate(-a); g.save(); ell(g, 0.75, legLen + 0.1, 2.75, 1.65); g.clip(); ell(g, 0.9, legLen + 1.35, 3.1, 1.1); g.fillStyle = dark; g.fill(); g.restore(); if (R.sc >= 1.8) { g.strokeStyle = ol; g.lineWidth = lw * 0.55; for (const ty of [-0.35, 0.55]) { g.beginPath(); g.moveTo(3.45, legLen + ty); g.lineTo(2.6, legLen + ty + 0.15); g.stroke(); } } g.restore(); }
      g.strokeStyle = ol; g.lineWidth = lw * 0.8; frontLeg(); g.stroke(); foot(3.0, lF)(); g.stroke();
      g.save(); body(); g.clip(); g.globalAlpha = 0.6; fcirc(g, -4.4, -9.6, 1.1, dark); fcirc(g, -5.2, -6.8, 0.7, dark); g.restore();
      g.save(); tail(); g.clip(); g.globalAlpha = 0.6; { const p = spine[2]; fcirc(g, p[0], p[1] - 0.6, 0.8, dark); } g.restore();
      const bellyP = () => ell(g, 1.6, -6.6, 3.8, 4.3 * (1 + R.breath));
      bellyP(); g.fillStyle = belly; g.fill();
      g.save(); bellyP(); g.clip(); g.strokeStyle = DINO.stripe; g.lineWidth = lw * 0.75; for (const yy of [-8.9, -6.7, -4.5]) { g.beginPath(); g.moveTo(-2.6, yy - 0.4); g.quadraticCurveTo(1.6, yy + 0.9, 5.8, yy - 0.4); g.stroke(); } g.restore();
      /* head */
      fillPass(g, head, fur);
      seam(g, bellyP, head, fur, ol, lw * 1.5);
      g.save(); headXf(g, H);
      g.save(); H0.cranium(); g.clip(); g.globalAlpha = 0.6; fcirc(g, hx - 3.6, hy - 2.6, 1.05, dark); fcirc(g, hx - 2.0, hy - 4.5, 0.6, dark); fcirc(g, hx - 4.9, hy - 0.2, 0.55, dark); g.restore();
      /* pale jaw and throat below the grin */
      const mb = mood === 'blink' ? R.baseMood : mood, open = mb === 'happy', frown = mb === 'sad' || mb === 'dead';
      const M0 = [hx + 0.7, hy + 2.6], M2 = [hx + 9.3, hy + 2.0], M1 = [hx + 5.0, hy + (open ? 4.0 : (frown ? 1.6 : 4.8))];
      const jaw = () => { g.beginPath(); g.moveTo(hx - 7, hy + 4.4); g.lineTo(M0[0], M0[1]); g.quadraticCurveTo(M1[0], M1[1], M2[0], M2[1]); g.lineTo(hx + 12, hy + 2.0); g.lineTo(hx + 12, hy + 9); g.lineTo(hx - 7, hy + 9); g.closePath(); };
      for (const s of [H0.cranium, H0.snout]) { g.save(); s(); g.clip(); jaw(); g.fillStyle = belly; g.fill(); g.restore(); }
      /* mouth: a wide toothy grin */
      const lipAt = u => [(1 - u) * (1 - u) * M0[0] + 2 * (1 - u) * u * M1[0] + u * u * M2[0], (1 - u) * (1 - u) * M0[1] + 2 * (1 - u) * u * M1[1] + u * u * M2[1]];
      const tooth = (u, s) => { const [bx, by] = lipAt(u); g.beginPath(); g.moveTo(bx - 0.6 * s, by - 0.15); g.lineTo(bx + 0.6 * s, by - 0.15); g.lineTo(bx + 0.05, by + 1.1 * s); g.closePath(); g.fillStyle = '#fff'; g.fill(); };
      const grin = (drop) => { g.beginPath(); g.moveTo(M0[0], M0[1]); g.quadraticCurveTo(M1[0], M1[1], M2[0], M2[1]); g.quadraticCurveTo(M1[0] + 0.6, M1[1] + drop, M0[0] + 0.3, M0[1] + 0.3); g.closePath(); };
      g.lineWidth = lw * 0.75; g.strokeStyle = ol;
      if (open || mb === 'cool') {
        grin(open ? 4.6 : 1.7); g.fillStyle = DINO.mouth; g.fill();
        g.save(); g.clip(); if (open) fell(g, hx + 5.0, hy + 7.0, 2.4, 1.5, DINO.tongue); for (const u of (open ? [0.18, 0.36, 0.54, 0.72, 0.88] : [0.3, 0.5, 0.7, 0.88])) tooth(u, open ? 0.85 : 0.75); g.restore();
        grin(open ? 4.6 : 1.7); g.stroke();
      } else if (mb === 'wide') { g.beginPath(); g.moveTo(M0[0], M0[1]); g.quadraticCurveTo(M1[0], M1[1], M2[0], M2[1]); g.stroke(); fell(g, hx + 5.0, hy + 4.6, 1.15, 1.35, DINO.mouth, ol, lw * 0.6); }
      else if (frown) { g.beginPath(); g.moveTo(M0[0] + 1, M0[1] + 1.2); g.quadraticCurveTo(M1[0], M1[1], M2[0] - 0.8, M2[1] + 0.9); g.stroke(); if (mb === 'dead') fell(g, hx + 5.6, hy + 3.4, 0.75, 1.2, DINO.tongue, ol, lw * 0.5); }
      else if (mb === 'squint') { rr(g, hx + 2.4, hy + 2.6, 5.6, 1.9, 0.8); fs(g, '#fff', ol, lw * 0.6); g.beginPath(); g.moveTo(hx + 2.6, hy + 3.55); g.lineTo(hx + 7.8, hy + 3.55); g.lineWidth = lw * 0.4; g.stroke(); }
      /* nostrils, blush */
      fell(g, hx + 8.6, hy - 0.4, 0.45, 0.33, ol); fell(g, hx + 7.3, hy - 0.8, 0.38, 0.29, ol);
      if (mb !== 'dead') { g.save(); g.globalAlpha = 0.8; fell(g, hx - 0.4, hy + 1.5, 1.35, 0.8, DINO.blush); g.restore(); }
      /* big round eyes */
      for (const d of [-1, 1]) { const cx = hx + (d < 0 ? -0.9 : 3.3), cy = hy - 1.9 + (d > 0 ? -0.2 : 0); eyeGloss(g, cx, cy, 1.45, 1.9, mood, fur, ol, lw, d, R.explicitCool ? 0.32 : 0, 0); }
      if (pose === 'run' && sp > 0.6 && mood === 'cool') { g.strokeStyle = ol; g.lineWidth = lw * 0.9; for (const d of [-1, 1]) { const cx = hx + (d < 0 ? -0.9 : 3.3), by = hy - 4.6 - (d > 0 ? 0.2 : 0); g.beginPath(); g.moveTo(cx - 1.3, by - 0.2); g.lineTo(cx + 1.2, by + 0.45); g.stroke(); } }
      g.restore();
      /* ---- tiny front arm (and a raised back arm) ---- */
      const arm = (sx, a) => { g.strokeStyle = ol; g.lineWidth = lw * 2; g.fillStyle = ol; capPath(g, sx, sY, armLen, 2.6, a); g.fill(); g.stroke(); g.fillStyle = fur; capPath(g, sx, sY, armLen, 2.6, a); g.fill(); limbTip(g, sx, sY, armLen, 2.6, a, armLen * 0.62, dark); };
      if (raisedB) arm(-3.5, aB);
      arm(4.0, aF);
      if (o.coffee) { const [cx, cy] = limbEnd(4.0, sY, aF, armLen + 0.4); coffeeCup(g, cx, cy, ol, lw); }
    } finally { g.restore(); }
  }

  /* ======================================================================================================
     BOLT: the little robot. White/silver shell with blue accents, dark visor with glowing cyan LED eyes,
     blinking antenna, heart chest light, rocket boots that flame up when jumping, jetting and launching.
     ====================================================================================================== */
  const BOT = {hi: '#ffffff', mid: '#eef2f8', lo: '#c3cee0', limb: '#b3bfd3', blue: '#3a7af0', blueLt: '#8fd3ff', visor: '#161e36', visorLo: '#0d1326', led: '#5ff4ff', ol: '#1b2540', heart: '#ff5f8f', ant: '#ff4f6e', antOff: '#9a3a52', sole: '#3a4560'};
  const BOT_RIG = {lean: 0.36, bounce: 0.8, pivot: -8.5, blink: 3.7, stride: 1.2, pump: 1.25, sway: 0};
  function flame(g, x, y, len, w, t, seed) {
    if (len <= 0.2) return;
    const L = len * (1 + Math.sin(t * 43 + seed) * 0.12 + Math.sin(t * 29 + seed * 2.3) * 0.08);
    const tear = (ww, ll) => { g.beginPath(); g.moveTo(x - ww / 2, y); g.quadraticCurveTo(x - ww * 0.62, y + ll * 0.45, x, y + ll); g.quadraticCurveTo(x + ww * 0.62, y + ll * 0.45, x + ww / 2, y); g.closePath(); };
    g.save(); g.globalAlpha = 0.35; tear(w * 1.7, L * 1.15); g.fillStyle = '#ffb347'; g.fill(); g.restore();
    tear(w, L); g.fillStyle = '#ff8a2a'; g.fill(); tear(w * 0.62, L * 0.7); g.fillStyle = '#ffd84a'; g.fill(); tear(w * 0.3, L * 0.38); g.fillStyle = '#fff8dc'; g.fill();
  }
  /* LED shape with a soft glow */
  function led(g, path, stroke, w, col) {
    path(); g.save(); g.globalAlpha = 0.32; g.strokeStyle = col; g.lineWidth = (stroke ? w : 0) + 1.2; g.stroke(); g.restore();
    if (stroke) { g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.strokeStyle = 'rgba(235,255,255,.85)'; g.lineWidth = w * 0.38; g.stroke(); }
    else { g.fillStyle = col; g.fill(); }
  }
  function drawBolt(g, x, y, o) {
    o = o || {}; const R = rig(o, BOT_RIG), {pose, t, fr, sp, lw, mood} = R, pal = R.pal;
    const ol = (pal && pal.outline) || BOT.ol, limb = (pal && pal.dark) || BOT.limb, shellC = pal && pal.fur, hiC = (pal && pal.belly) || BOT.hi;
    g.save();
    try {
      begin(g, x, y, R);
      const {aF, aB, lF, lB, raisedF, raisedB} = R, legLen = 1.8 * R.legK, armLen = 3.2 * R.armK, sad = pose === 'sad', dead = pose === 'dead';
      const bob = pose === 'idle' ? Math.sin(t * 2.4) * 0.3 : (pose === 'run' ? Math.abs(Math.sin(fr)) * 0.4 * sp : 0);
      const hx = 0.3, hy = -16.8 + bob + (sad ? 0.8 : 0);
      let tilt = 0;
      if (pose === 'idle') tilt = Math.sin(t * 0.9) * 0.03; else if (pose === 'run') tilt = 0.04 * sp; else if (sad) tilt = 0.14; else if (pose === 'victory') tilt = Math.sin(t * 7) * 0.08; else if (dead) tilt = 0.18; else if (pose === 'jump') tilt = -0.06;
      const H = {px: hx, py: hy + 5, tilt};
      backWings(g, R, o, -3, -10.5);
      /* ---- rocket flames from the boot soles ---- */
      let fl = 0;
      if (pose === 'jump') fl = 2.6 + 3 * R.vyN; else if (pose === 'jet') fl = 6.2; else if (pose === 'launch') fl = 6.8; else if (pose === 'victory') fl = Math.max(0, Math.sin(t * 7)) * 2.2; else if (pose === 'glide') fl = 1.2;
      const sY = -10.6, hipY = -4.4;
      if (fl > 0) for (const [hx0, a, sd] of [[-2.3, lB, 1], [2.3, lF, 2]]) { g.save(); g.translate(hx0, hipY); g.rotate(-a); flame(g, 0.3, legLen + 1.4, fl, 2.3, t, sd); g.restore(); }
      /* ---- antenna (behind the head top) ---- */
      let bx = Math.sin(t * 3.1) * 0.35 - sp * 1.6 * (pose === 'run' ? 1 : 0) - R.vyN * 0.7, by = R.vyN * 0.6 - R.upF * 0.3;
      if (pose === 'run') bx += Math.sin(fr * 2 + 1) * 0.3; else if (pose === 'victory') bx = Math.sin(t * 14) * 0.9; else if (sad) { bx = 1.9; by = 2.0; } else if (dead) { bx = 3.2; by = 3.6; } else if (pose === 'fall' || pose === 'skydive') { bx = -0.6 + Math.sin(t * 20) * 0.25; by = -0.4; } else if (pose === 'jet' || pose === 'launch') bx = -2.2 + Math.sin(t * 20) * 0.2;
      const ax = hx - 0.9, ay = hy - 5.1, tx = ax + bx, ty = ay - 4.4 + by, on = !dead && ((t * (pose === 'victory' ? 4 : 1.4)) % 1) < 0.62;
      g.save(); headXf(g, H);
      g.beginPath(); g.moveTo(ax, ay + 1.2); g.quadraticCurveTo(ax + bx * 0.05, ay - 2.4, tx, ty);
      g.strokeStyle = ol; g.lineWidth = 0.9 + lw * 2; g.stroke(); g.strokeStyle = BOT.limb; g.lineWidth = 0.9; g.stroke();
      if (on) fcirc(g, tx, ty, 3.0, rgba(BOT.ant, 0.25));
      fcirc(g, tx, ty, 1.55, ol, ol, lw * 2); fcirc(g, tx, ty, 1.55, on ? BOT.ant : BOT.antOff); fcirc(g, tx - 0.5, ty - 0.5, 0.45, 'rgba(255,255,255,.85)');
      g.restore();
      /* ---- silhouette ---- */
      const inLimb = (x0, y0, a, fn) => () => { g.save(); g.translate(x0, y0); g.rotate(-a); fn(); g.restore(); };
      const backArm = () => capPath(g, -4.4, sY, armLen, 2.0, aB), backHand = inLimb(-4.4, sY, aB, () => circ(g, 0, armLen + 0.2, 1.55));
      const legP = (x0, a) => () => capPath(g, x0, hipY, legLen, 2.1, a), boot = (x0, a) => inLimb(x0, hipY, a, () => rr(g, -2.0, legLen - 1.3, 4.6, 2.8, 1.2));
      const body = () => rr(g, -4.8, -13.2, 9.6, 9.6 * (1 + R.breath), 3.8);
      const H0 = {head: () => rr(g, hx - 6.6, hy - 5.3, 13.2, 10.6, 4.4), ear: () => ell(g, hx - 6.4, hy + 0.4, 1.45, 2.4), cap: () => rr(g, hx - 2.1, hy - 6.2, 2.6, 1.6, 0.7)};
      const inH = fn => () => { g.save(); headXf(g, H); fn(); g.restore(); };
      const limbsS = (raisedB ? [] : [backArm, backHand]).concat([legP(-2.3, lB), boot(-2.3, lB), legP(2.3, lF), boot(2.3, lF)]);
      const head = [inH(H0.cap), inH(H0.head), inH(H0.ear)];
      outlinePass(g, limbsS.concat([body], head), ol, lw);
      /* limbs: silver tubes, white hands, two-tone boots */
      if (!raisedB) { backArm(); g.fillStyle = limb; g.fill(); backHand(); g.fillStyle = shellC || BOT.mid; g.fill(); }
      for (const [x0, a] of [[-2.3, lB], [2.3, lF]]) {
        legP(x0, a)(); g.fillStyle = limb; g.fill();
        g.save(); g.translate(x0, hipY); g.rotate(-a); rr(g, -2.0, legLen - 1.3, 4.6, 2.8, 1.2); g.fillStyle = shellC || BOT.mid; g.fill(); g.clip(); g.fillStyle = BOT.blue; g.fillRect(-3, legLen + 0.15, 7, 1.0); g.fillStyle = BOT.sole; g.fillRect(-3, legLen + 1.05, 7, 1); fell(g, -0.6, legLen - 0.5, 1.0, 0.45, 'rgba(255,255,255,.9)'); g.restore();
      }
      g.strokeStyle = ol; g.lineWidth = lw * 0.8; legP(2.3, lF)(); g.stroke(); boot(2.3, lF)(); g.stroke();
      /* body: metallic shell, blue lower half, heart light */
      const shell = (x0, y0, x1, y1) => { if (shellC) return shellC; const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, BOT.hi); gr.addColorStop(0.5, BOT.mid); gr.addColorStop(1, BOT.lo); return gr; };
      body(); g.fillStyle = shell(-4, -13, 3, -3); g.fill();
      g.save(); body(); g.clip(); g.fillStyle = BOT.blue; g.fillRect(-6, -6.0, 12, 4); g.strokeStyle = ol; g.lineWidth = lw * 0.6; g.beginPath(); g.moveTo(-6, -6.0); g.lineTo(6, -6.0); g.stroke(); fell(g, -2.6, -11.3, 1.5, 0.75, 'rgba(255,255,255,.85)'); g.restore();
      rr(g, -1.0, -11.1, 4.2, 3.6, 1.3); fs(g, BOT.blue, ol, lw * 0.7);
      const beat = 0.75 + 0.25 * Math.max(0, Math.sin(t * 5.2)) * (dead ? 0 : 1);
      if (!dead) { heartPath(g, 1.1, -9.2, 1.6 * (0.9 + beat * 0.15)); g.fillStyle = rgba(BOT.heart, 0.35); g.fill(); }
      heartPath(g, 1.1, -9.3, 1.15 * (0.92 + beat * 0.12)); g.fillStyle = dead ? '#7a4a5a' : BOT.heart; g.fill(); fcirc(g, 0.6, -9.7, 0.28, 'rgba(255,255,255,.8)');
      /* ---- head: shell, ear disc, visor and LED face ---- */
      g.save(); headXf(g, H);
      H0.head(); g.fillStyle = shell(hx - 5, hy - 5, hx + 4, hy + 6); g.fill();
      H0.cap(); g.fillStyle = BOT.blue; g.fill();
      g.save(); H0.head(); g.clip(); fell(g, hx - 3.4, hy - 3.6, 2.2, 0.9, 'rgba(255,255,255,.9)'); g.restore();
      H0.ear(); g.fillStyle = BOT.blue; g.fill(); fell(g, hx - 6.5, hy + 0.4, 0.65, 1.3, BOT.blueLt);
      const visor = () => rr(g, hx - 4.1, hy - 3.4, 10.3, 6.8, 3.0);
      visor(); { const gr = g.createLinearGradient(0, hy - 3.4, 0, hy + 3.4); gr.addColorStop(0, '#26345a'); gr.addColorStop(1, BOT.visorLo); g.fillStyle = gr; } g.fill(); g.strokeStyle = ol; g.lineWidth = lw * 0.7; g.stroke();
      g.save(); visor(); g.clip(); g.fillStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(hx - 4, hy - 3.4); g.lineTo(hx + 0.8, hy - 3.4); g.lineTo(hx - 3.2, hy + 3.4); g.lineTo(hx - 4.2, hy + 3.4); g.closePath(); g.fill(); g.restore();
      /* LED eyes: all moods */
      const look = pose === 'idle' ? (((t % 6.4) > 4.6 && (t % 6.4) < 5.5) ? -0.7 : 0) : (pose === 'run' ? 0.3 : 0), C = BOT.led;
      const ex0 = hx - 0.6 + look, ex1 = hx + 3.3 + look, ey = hy - 0.6;
      for (const [cx, d] of [[ex0, -1], [ex1, 1]]) {
        if (mood === 'dead') led(g, () => { g.beginPath(); g.moveTo(cx - 0.95, ey - 0.95); g.lineTo(cx + 0.95, ey + 0.95); g.moveTo(cx + 0.95, ey - 0.95); g.lineTo(cx - 0.95, ey + 0.95); }, true, 0.7, C);
        else if (mood === 'happy') led(g, () => { g.beginPath(); g.moveTo(cx - 1.1, ey + 0.55); g.quadraticCurveTo(cx, ey - 1.5, cx + 1.1, ey + 0.55); }, true, 0.75, C);
        else if (mood === 'blink') led(g, () => { g.beginPath(); g.moveTo(cx - 0.9, ey + 0.3); g.lineTo(cx + 0.9, ey + 0.3); }, true, 0.7, C);
        else if (mood === 'wide') { led(g, () => circ(g, cx, ey, 1.3), true, 0.6, C); fcirc(g, cx + 0.15, ey + 0.1, 0.45, C); }
        else if (mood === 'squint') led(g, () => { g.beginPath(); g.moveTo(cx - d * 0.8, ey - 0.9); g.lineTo(cx + d * 0.7, ey); g.lineTo(cx - d * 0.8, ey + 0.9); }, true, 0.7, C);
        else if (mood === 'sad') led(g, () => { g.beginPath(); g.moveTo(cx - 0.85, ey - 0.2 + d * 0.55); g.lineTo(cx + 0.85, ey - 0.2 - d * 0.55); g.lineTo(cx + 0.85, ey + 0.7); g.quadraticCurveTo(cx + 0.85, ey + 1.5, cx, ey + 1.5); g.quadraticCurveTo(cx - 0.85, ey + 1.5, cx - 0.85, ey + 0.7); g.closePath(); }, false, 0, C);
        else if (R.explicitCool) led(g, () => rr(g, cx - 1.0, ey - 0.1, 2.0, 1.2, 0.55), false, 0, C);
        else { led(g, () => rr(g, cx - 0.85, ey - 1.45, 1.7, 2.9, 0.85), false, 0, C); fell(g, cx - 0.2, ey - 0.75, 0.32, 0.55, 'rgba(235,255,255,.95)'); }
      }
      /* LED mouth */
      const mb = mood === 'blink' ? R.baseMood : mood, mx = hx + 1.4 + look * 0.6, my = hy + 2.0;
      if (mb === 'happy') led(g, () => { g.beginPath(); g.moveTo(mx - 1.3, my - 0.4); g.lineTo(mx + 1.3, my - 0.4); g.quadraticCurveTo(mx + 1.2, my + 1.2, mx, my + 1.2); g.quadraticCurveTo(mx - 1.2, my + 1.2, mx - 1.3, my - 0.4); g.closePath(); }, false, 0, C);
      else if (mb === 'wide') led(g, () => ell(g, mx, my + 0.2, 0.55, 0.65), true, 0.5, C);
      else if (mb === 'sad') led(g, () => { g.beginPath(); g.moveTo(mx - 0.9, my + 0.6); g.quadraticCurveTo(mx, my - 0.4, mx + 0.9, my + 0.6); }, true, 0.5, C);
      else if (mb === 'dead') led(g, () => { g.beginPath(); g.moveTo(mx - 1.2, my + 0.3); g.lineTo(mx - 0.6, my - 0.2); g.lineTo(mx, my + 0.3); g.lineTo(mx + 0.6, my - 0.2); g.lineTo(mx + 1.2, my + 0.3); }, true, 0.45, C);
      else if (mb === 'squint') led(g, () => { g.beginPath(); g.moveTo(mx - 1.0, my + 0.2); g.lineTo(mx + 1.0, my + 0.2); }, true, 0.5, C);
      else led(g, () => { g.beginPath(); g.moveTo(mx - 0.85, my); g.quadraticCurveTo(mx, my + 0.75, mx + 0.85, my); }, true, 0.5, C);
      if (dead) { const dt = (o.deadT == null ? 0.6 : +o.deadT || 0); for (let i = 0; i < 3; i++) { const p = ((dt * 0.8 + i / 3) % 1); g.save(); g.globalAlpha = 0.5 * (1 - p); fcirc(g, hx + 4 + Math.sin(p * 6 + i) * 0.8, hy - 6 - p * 7, 0.9 + p * 1.6, '#b9c2d3'); g.restore(); } }
      g.restore();
      /* ---- front arm: blue shoulder joint, silver tube, white hand ---- */
      const arm = (sx, a) => {
        const tube = () => capPath(g, sx, sY, armLen, 2.0, a), hand = inLimb(sx, sY, a, () => circ(g, 0, armLen + 0.2, 1.55)), joint = () => circ(g, sx, sY + 0.2, 1.35);
        outlinePass(g, [tube, hand, joint], ol, lw);
        tube(); g.fillStyle = limb; g.fill(); hand(); g.fillStyle = shellC || BOT.mid; g.fill(); joint(); g.fillStyle = BOT.blue; g.fill();
        g.save(); g.translate(sx, sY); g.rotate(-a); fcirc(g, -0.5, armLen - 0.3, 0.45, 'rgba(255,255,255,.95)'); g.restore();
      };
      if (raisedB) arm(-4.4, aB);
      arm(4.4, aF);
      if (o.coffee) { const [cx, cy] = limbEnd(4.4, sY, aF, armLen + 0.4); coffeeCup(g, cx, cy, ol, lw); }
    } finally { g.restore(); }
  }

  /* ======================================================================================================
     HOLLO: a cheeky little ghost who lives in a carved pumpkin. The jack-o'-lantern is his body (a candle-warm face flickers inside),
     he peeks out of the top with the pumpkin lid (stem, curly leaf, tendril) worn like a hat, waves with wispy arms and toddles on
     two stubby ghost feet. He pops up when happy, sinks in when sad, hides inside for the ground pound and floats like a sheet.
     ====================================================================================================== */
  const HOL = {pump: '#ff8a2a', pumpDk: '#e0601c', rib: '#b9461a', ol: '#3a1626', ghost: '#fdfbff', ghostSh: '#ddd3f4', wall: '#b8481a', hole: '#4a160c',
    glowHi: '#fffbe0', glow: '#ffd84a', glowLo: '#ff962e', stem: '#7a6a2e', stemLt: '#b4a35a', leaf: '#7fcb4a', leafDk: '#4f9a34', mouth: '#5a1432', tongue: '#ff7d9a', blush: '#ffa8c8'};
  const HOL_RIG = {lean: 0.3, bounce: 1.25, pivot: -9, blink: 3.9, stride: 1.25, pump: 1.3, waddle: 0.05, sway: 0.018};
  const flick = t => 0.84 + Math.sin(t * 11.3) * 0.07 + Math.sin(t * 23.7 + 1.3) * 0.05 + Math.sin(t * 5.1 + 0.4) * 0.04;
  /* a soft ghost arm hanging from (x, y): wide at the shoulder, a round tip that bends forward by `bend` */
  function wispArm(g, x, y, len, w, rot, bend) {
    const r = w * 0.36; g.save(); g.translate(x, y); g.rotate(-rot);
    g.beginPath(); g.moveTo(-w / 2, 0); g.quadraticCurveTo(-w * 0.5 + bend * 0.3, len * 0.55, bend - r, len - r * 0.3); g.arc(bend, len - r * 0.3, r, PI, 0, true);
    g.quadraticCurveTo(w * 0.5 + bend * 0.3, len * 0.5, w / 2, 0); g.arc(0, 0, w / 2, 0, PI, true); g.closePath(); g.restore();
  }
  function leafPath(g, x, y, a, len, wd) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -wd * 0.95, len * 0.75, -wd * 0.75, len, 0); g.bezierCurveTo(len * 0.7, wd * 0.62, len * 0.25, wd * 0.7, 0, 0); g.closePath(); g.restore(); }
  /* the pumpkin lid: origin at the middle of its cut edge; wob drives the tendril */
  function lidParts(g, wob) {
    return {
      cap: () => { g.beginPath(); g.moveTo(-4.3, 0.5); g.bezierCurveTo(-4.5, -2.0, -2.4, -3.0, 0, -3.0); g.bezierCurveTo(2.4, -3.0, 4.5, -2.0, 4.3, 0.5); g.quadraticCurveTo(0, 1.6, -4.3, 0.5); g.closePath(); },
      stem: () => { g.beginPath(); g.moveTo(-0.9, -2.4); g.quadraticCurveTo(-0.9, -4.2, -0.2, -5.3); g.lineTo(1.5, -5.0); g.quadraticCurveTo(0.9, -4.0, 1.0, -2.4); g.closePath(); },
      leaf: () => leafPath(g, 0.8, -2.9, -0.42 + wob * 0.12, 4.9, 2.3),
      curl: () => { g.beginPath(); for (let i = 0; i <= 14; i++) { const s = i / 14, a = -0.2 - s * (4.6 + wob * 0.5), r = 2.0 * (1 - s * 0.72); const px = -2.3 + Math.cos(a) * r, py = -3.7 + Math.sin(a) * r * 0.9; if (i) g.lineTo(px, py); else g.moveTo(px, py); } },
    };
  }
  function drawLid(g, x, y, rot, wob, pump, ol, lw, pal) {
    g.save(); g.translate(x, y); g.rotate(rot);
    const L = lidParts(g, wob);
    L.curl(); g.strokeStyle = ol; g.lineWidth = 0.55 + lw * 1.6; g.stroke();
    outlinePass(g, [L.stem, L.leaf, L.cap], ol, lw);
    L.curl(); g.strokeStyle = (pal && pal.ear) || HOL.leaf; g.lineWidth = 0.6; g.stroke();
    L.stem(); g.fillStyle = HOL.stem; g.fill(); g.save(); L.stem(); g.clip(); g.fillStyle = HOL.stemLt; g.fillRect(-1.2, -5.8, 1.1, 3.6); ell(g, 0.65, -5.15, 0.95, 0.42, 0.18); g.fillStyle = '#d8cb86'; g.fill(); g.restore();
    L.leaf(); g.fillStyle = (pal && pal.ear) || HOL.leaf; g.fill(); g.save(); L.leaf(); g.clip(); leafPath(g, 0.8, -2.9 + 0.9, -0.42 + wob * 0.12, 5.2, 1.3); g.fillStyle = HOL.leafDk; g.globalAlpha = 0.45; g.fill(); g.restore();
    g.strokeStyle = HOL.leafDk; g.lineWidth = lw * 0.45; g.beginPath(); g.moveTo(1.2, -3.05); g.lineTo(1.2 + Math.cos(-0.42 + wob * 0.12) * 3.6, -2.9 + Math.sin(-0.42 + wob * 0.12) * 3.6); g.stroke();
    L.cap(); g.fillStyle = pump; g.fill();
    g.save(); L.cap(); g.clip(); g.strokeStyle = pal ? shade(pump, -0.3) : HOL.rib; g.lineWidth = lw * 0.6;
    for (const k of [-1.9, 1.9]) { g.beginPath(); g.moveTo(k * 0.55, -3.2); g.quadraticCurveTo(k * 1.25, -1.2, k * 1.05, 1.0); g.stroke(); }
    ell(g, -1.9, -1.9, 1.3, 0.55, -0.3); g.fillStyle = 'rgba(255,255,255,.45)'; g.fill(); g.restore();
    g.restore();
  }
  function drawHollo(g, x, y, o) {
    o = o || {}; const R = rig(o, HOL_RIG), {pose, t, fr, sp} = R, pal = R.pal;
    let mood = R.mood;
    const pump = (pal && pal.fur) || HOL.pump, pumpDk = (pal && pal.dark) || HOL.pumpDk, ghost = (pal && pal.belly) || HOL.ghost, ol = (pal && pal.outline) || HOL.ol;
    const ghostSh = pal ? shade(ghost, -0.13) : HOL.ghostSh, rib = pal ? shade(pumpDk, -0.22) : HOL.rib;
    g.save();
    try {
      begin(g, x, y, R); g.scale(0.94, 0.94); R.lw /= 0.94;
      let {aF, aB, lF, lB} = R; const lw = R.lw, legLen = 2.9 * R.legK, sad = pose === 'sad', dead = pose === 'dead', hide = pose === 'pound';
      const floaty = pose === 'glide' || (pose === 'fall' && Math.abs(R.vy - 0.9) < 0.02);   /* the perk clamps vy to 0.9 while jump is held */
      /* "Hollo!": every few seconds in idle he pops up and waves */
      const st = t % 6.8, shout = pose === 'idle' && !o.mood && st > 4.7 && st < 5.75, shK = shout ? Math.sin((st - 4.7) / 1.05 * PI) : 0;
      /* ghost height above the rim, lid hat lift / tilt, arms */
      let rise = 0, hatLift = 0, hatTilt = -0.2, armL = 3.3 * R.armK, armW = 2.7, bendF = 0.5, bendB = 0.3, tilt = 0;
      if (pose === 'idle') { rise = Math.sin(t * 2.2) * 0.35 + shK * 1.4; hatLift = Math.max(0, Math.sin(t * 2.2 - 0.6)) * 0.25 + shK * 0.9; hatTilt += Math.sin(t * 1.15 - 0.5) * 0.06 - shK * 0.2; tilt = Math.sin(t * 1.15) * 0.04 - shK * 0.08;
        aF = 1.0 + Math.sin(t * 2.2) * 0.08; aB = -0.85 - Math.sin(t * 2.2 + 0.8) * 0.08; if (shout) { aF = 2.55 + Math.sin(t * 17) * 0.38; bendF = -0.4; mood = 'happy'; } }
      else if (pose === 'run') { rise = 0.25 - Math.abs(Math.cos(fr - 0.7)) * 0.7 * sp; hatLift = Math.abs(Math.sin(fr - 1.2)) * 0.6 * sp; hatTilt -= 0.18 * sp + Math.sin(fr * 2 - 1) * 0.06; tilt = 0.04 * sp + Math.sin(fr * 2) * 0.03; }
      else if (pose === 'jump') { rise = 1.2 + R.vyN * 0.7; hatLift = 0.5 + R.vyN * 1.2; hatTilt = -0.36; tilt = -0.06; bendF = bendB = -0.5; }
      else if (floaty) { rise = 2.4 + Math.sin(t * 3) * 0.45; hatLift = 0.9 + Math.sin(t * 3 - 0.9) * 0.4; hatTilt = -0.12 + Math.sin(t * 2.4) * 0.1; aF = 1.85 + Math.sin(t * 6) * 0.2; aB = -1.85 - Math.sin(t * 6 + 0.5) * 0.2; armL = 4.4; armW = 3.5; bendF = -0.9 - Math.sin(t * 6 - 1) * 0.4; bendB = 0.9 + Math.sin(t * 6 - 0.5) * 0.4; tilt = Math.sin(t * 1.5) * 0.05; if (!o.mood) mood = 'happy'; }
      else if (pose === 'fall') { rise = 1.6; hatLift = 1.4 + Math.sin(t * 19) * 0.25; hatTilt = 0.08 + Math.sin(t * 13) * 0.12; tilt = -0.04; bendF = -0.4; bendB = 0.4; }
      else if (pose === 'skydive') { rise = 1.1; hatLift = 1.0; hatTilt = -0.55 + Math.sin(t * 17) * 0.08; }
      else if (pose === 'victory') { const b = Math.abs(Math.sin(t * 7)); rise = 2.0 + b * 1.2; hatLift = 0.9 + Math.abs(Math.sin(t * 7 - 0.7)) * 1.8; hatTilt = Math.sin(t * 7) * 0.3; tilt = Math.sin(t * 7) * 0.08; bendF = bendB = -0.5; }
      else if (sad) { rise = -3.5; hatLift = -0.1; hatTilt = 0.36; tilt = 0.12; aF = 0.45; aB = -0.4; armL = 3.0; }
      else if (pose === 'wall') { rise = 0.4; hatTilt = -0.05; }
      else if (pose === 'climb') { rise = 0.3 + Math.sin(fr * 1.5) * 0.3; hatLift = Math.max(0, Math.sin(fr * 1.5 - 0.6)) * 0.4; }
      else if (pose === 'jet' || pose === 'launch') { rise = 0.9; hatLift = 0.5; hatTilt = -0.55 + Math.sin(t * 19) * 0.07; }
      else if (dead) { rise = 1.3 + Math.sin(t * 2.6) * 0.25; tilt = -0.12; hatTilt = -0.85; hatLift = 0.9; aF = 1.5 + Math.sin(t * 3) * 0.1; aB = -1.35; bendF = -0.6; bendB = 0.6; }
      const glowK = dead ? 0 : (sad ? 0.55 : 1) * flick(t) * (pose === 'victory' || shout || floaty ? 1.12 : 1);
      /* pumpkin geometry: four lobes; the cut opening on top */
      const PY = -8.3, br = 1 + R.breath, squish = hide ? 0.06 : 0;
      const LOBES = [[-3.9, 3.3, 4.8], [-1.1, 3.6, 5.4], [2.1, 3.7, 5.5], [4.6, 3.0, 4.8]];
      const lobe = i => () => { const [lx, rx, ry] = LOBES[i]; ell(g, lx * (1 + squish), PY + 0.15 * (5.5 - ry), rx * (1 + squish), ry * br * (1 - squish)); };
      const lobes = [lobe(0), lobe(1), lobe(3), lobe(2)];
      const pumpkin = () => { g.beginPath(); for (const [lx, rx, ry] of LOBES) { const cy = PY + 0.15 * (5.5 - ry); g.moveTo(lx * (1 + squish) + rx * (1 + squish), cy); g.ellipse(lx * (1 + squish), cy, rx * (1 + squish), ry * br * (1 - squish), 0, 0, TAU); } };
      const OX = 0.5, OY = PY - 5.5 * br + 1.4, ORX = 4.35, ORY = 1.35;
      const hx = 0.75, hy = -18.2 - rise, HR = 5.3;
      const H = {px: hx, py: hy + 5, tilt};
      /* the ghost: a round head and a body that narrows into the pumpkin like a genie leaving its lamp */
      const ghostPath = (dx, dy) => {
        const nk = clamp(rise - 0.8, 0, 2.5), yt = hy + 0.5 + dy, yb = OY + 1.8 + dy, xl = hx - 4.15 + dx, xr = hx + 4.15 + dx, bl = OX - 3.4 + nk * 0.3 + dx, bR = OX + 3.4 - nk * 0.3 + dx, ym = (yt + yb) / 2;
        g.beginPath(); g.moveTo(xl, yt); g.lineTo(xr, yt); g.quadraticCurveTo(xr - 0.2 - nk * 0.7, ym, bR, yb); g.lineTo(bl, yb); g.quadraticCurveTo(xl + 0.2 + nk * 0.7, ym, xl, yt); g.closePath();
        g.save(); headXf(g, H); g.moveTo(hx + dx + HR, hy + dy); g.arc(hx + dx, hy + dy, HR, 0, TAU); g.restore();
      };
      const armY = Math.min(hy + 6.1, OY + 0.25), armXF = hx + 4.1, armXB = hx - 4.0;
      const raisedB = Math.abs(aB) > 1.45;
      backWings(g, R, o, -3, -12.5);
      /* floating wisps under him while he glides */
      if (floaty) { g.save(); for (let i = 0; i < 3; i++) { const p = ((t * 0.9 + i / 3) % 1); g.globalAlpha = 0.3 * Math.sin(p * PI); fcirc(g, -4 - p * 5 + Math.sin(p * 7 + i) * 1.0, -4 + p * 3.5, 0.5 + p * 0.9, ghost); } g.restore(); }
      /* ---- legs (stubby ghost feet) and the pumpkin: one merged silhouette ---- */
      const legB = () => capPath(g, -2.6, -3.3, legLen, 3.5, lB), legF = () => capPath(g, 2.7, -3.3, legLen, 3.5, lF);
      outlinePass(g, [legB, legF].concat(lobes, hide ? [] : [() => ghostPath(0, 0)]), ol, lw);
      for (const [s, a, hx0] of [[legB, lB, -2.6], [legF, lF, 2.7]]) { s(); g.fillStyle = ghost; g.fill(); limbTip(g, hx0, -3.3, legLen, 3.5, a, legLen * 0.55, ghostSh); }
      g.strokeStyle = ol; g.lineWidth = lw * 0.8; legF(); g.stroke();
      /* pumpkin fill: lobes back to front, ribs, belly shade and a glossy highlight */
      lobe(0)(); g.fillStyle = pumpDk; g.fill(); lobe(1)(); g.fillStyle = pump; g.fill(); lobe(3)(); g.fillStyle = shade(pump, -0.06); g.fill(); lobe(2)(); g.fillStyle = pump; g.fill();
      g.save(); pumpkin(); g.clip();
      g.fillStyle = rgba(rib, 0.3); g.beginPath(); g.rect(-9, PY - 8, 18, 18); g.ellipse(0.8, PY - 1.4, 8.2, 6.6, 0, 0, TAU); g.fill('evenodd');
      g.strokeStyle = rgba(rib, 0.8); g.lineWidth = lw * 0.65;
      for (const [x0, cx0] of [[-1.9, -3.8], [0.6, -0.6], [3.6, 5.0]]) { g.beginPath(); g.moveTo(x0, PY - 5.6); g.quadraticCurveTo(cx0, PY, x0, PY + 5.4); g.stroke(); }
      ell(g, -4.1, PY - 2.4, 0.9, 2.1, 0.25); g.fillStyle = 'rgba(255,255,255,.34)'; g.fill(); ell(g, 5.1, PY - 2.8, 0.6, 1.4, -0.2); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
      g.restore();
      /* ---- the carved face: glowing holes with a bevel of pumpkin wall ---- */
      const FX = 1.1, FY = PY + 1.2, FK = 0.84;
      g.save(); g.translate(FX, FY); g.scale(FK, FK);
      const eyeB = () => { g.beginPath(); g.moveTo(-4.2, -1.4); g.quadraticCurveTo(-3.5, -3.6, -2.75, -4.3); g.quadraticCurveTo(-2.0, -3.6, -1.3, -1.5); g.quadraticCurveTo(-2.75, -1.0, -4.2, -1.4); g.closePath(); };
      const eyeF = () => { g.beginPath(); g.moveTo(1.1, -1.6); g.quadraticCurveTo(1.95, -4.0, 2.85, -4.75); g.quadraticCurveTo(3.75, -4.0, 4.6, -1.7); g.quadraticCurveTo(2.85, -1.1, 1.1, -1.6); g.closePath(); };
      const nose = () => { g.beginPath(); g.moveTo(-0.55, -0.3); g.lineTo(0.2, -1.6); g.lineTo(0.95, -0.3); g.closePath(); };
      const mouthP = () => { g.beginPath(); g.moveTo(-4.4, 0.3); g.quadraticCurveTo(0.3, 2.1, 5.3, 0.2); g.quadraticCurveTo(4.6, 4.6, 0.4, 4.7); g.quadraticCurveTo(-3.6, 4.5, -4.4, 0.3); g.closePath(); };
      const glowFill = () => { const gr = g.createRadialGradient(0.4, 0.6, 0.3, 0.4, 0.6, 6.4); gr.addColorStop(0, HOL.glowHi); gr.addColorStop(0.45, HOL.glow); gr.addColorStop(1, HOL.glowLo); return gr; };
      if (glowK > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0.4, 0.8, 0.5, 0.4, 0.8, 8.5); gr.addColorStop(0, rgba('#ffb040', 0.3 * glowK)); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(-9, -9, 18, 18); g.restore(); }
      for (const h of [eyeB, eyeF, nose, mouthP]) {
        h(); g.fillStyle = HOL.wall; g.fill();
        g.save(); h(); g.clip(); g.translate(0.35, 0.8); h(); g.fillStyle = glowK > 0 ? glowFill() : HOL.hole; g.fill();
        if (glowK > 0 && glowK < 1) { g.globalAlpha = (1 - glowK) * 0.8; g.fillStyle = HOL.glowLo; g.fill(); }
        g.restore();
        h(); g.strokeStyle = ol; g.lineWidth = lw * 0.65 / FK; g.stroke();
      }
      /* two pumpkin teeth */
      g.save(); mouthP(); g.clip(); g.strokeStyle = ol; g.lineWidth = lw * 0.55 / FK;
      rr(g, -1.3, 0.3, 1.6, 2.0, 0.4); g.fillStyle = pump; g.fill(); g.stroke();
      rr(g, 1.9, 3.0, 1.6, 2.3, 0.4); g.fillStyle = pump; g.fill(); g.stroke(); g.restore();
      g.restore();
      /* ---- the opening, the ghost and the lid ---- */
      const opening = () => ell(g, OX, OY, ORX, ORY);
      if (hide) drawLid(g, OX, OY + 0.4, 0, Math.sin(t * 3), pump, ol, lw, pal);
      else {
        opening(); g.fillStyle = HOL.wall; g.fill();
        g.save(); opening(); g.clip(); ell(g, OX, OY + 0.55, ORX * 0.92, ORY * 0.85); { const gr = g.createRadialGradient(OX, OY + 1.2, 0.2, OX, OY + 1.2, ORX); gr.addColorStop(0, dead ? '#3a1a14' : HOL.glowHi); gr.addColorStop(0.5, dead ? '#2a100a' : HOL.glow); gr.addColorStop(1, dead ? HOL.hole : HOL.glowLo); g.fillStyle = gr; } g.fill(); g.restore();
        opening(); g.strokeStyle = ol; g.lineWidth = lw * 0.7; g.stroke();
        const arm = (sx, a, bend, col) => { const p = () => wispArm(g, sx, armY, armL, armW, a, bend); g.strokeStyle = ol; g.lineWidth = lw * 2; g.fillStyle = ol; p(); g.fill(); g.stroke(); p(); g.fillStyle = col; g.fill(); };
        if (!raisedB) arm(armXB, aB, bendB, shade(ghost, -0.06));
        /* ghost body: only above the front lip of the opening */
        g.save(); g.beginPath(); g.moveTo(-20, -45); g.lineTo(20, -45); g.lineTo(20, OY); g.lineTo(OX + ORX, OY); g.ellipse(OX, OY, ORX, ORY, 0, 0, PI); g.lineTo(-20, OY); g.closePath(); g.clip();
        ghostPath(0, 0); g.lineWidth = lw * 1.6; g.strokeStyle = ol; g.stroke(); g.fillStyle = ghostSh; g.fill();
        /* soft lavender shade on the back, warm candle light from below */
        g.save(); ghostPath(0, 0); g.clip(); ghostPath(0.9, -0.9); g.fillStyle = ghost; g.fill();
        if (glowK > 0) { const gr = g.createLinearGradient(0, OY + 0.6, 0, OY - 3.4); gr.addColorStop(0, rgba('#ffb35a', 0.5 * glowK)); gr.addColorStop(1, 'rgba(255,179,90,0)'); g.fillStyle = gr; g.fillRect(-10, OY - 4, 20, 6); }
        g.restore();
        g.restore();
        /* front lip of the cut */
        g.beginPath(); g.ellipse(OX, OY, ORX, ORY, 0, 0.12, PI - 0.12); g.strokeStyle = ol; g.lineWidth = lw * 0.85; g.stroke();
        /* ---- face ---- */
        g.save(); headXf(g, H);
        const mb = mood === 'blink' ? R.baseMood : mood;
        if (mb !== 'dead') { g.save(); g.globalAlpha = sad ? 0.5 : 0.85; fell(g, hx - 2.8, hy + 1.6, 1.3, 0.75, HOL.blush); fell(g, hx + 4.4, hy + 1.35, 0.95, 0.68, HOL.blush); g.restore(); }
        g.strokeStyle = ol; g.lineWidth = lw * 0.75;
        const mx = hx + 1.0, my = hy + 1.95;
        if (shout) { const k = 0.6 + shK * 0.4, mp = () => ell(g, mx + 0.1, my + 0.5, 1.15 * k + 0.2, 1.55 * k); mp(); g.fillStyle = HOL.mouth; g.fill(); g.save(); g.clip(); fell(g, mx + 0.2, my + 1.6 * k + 0.2, 1.1, 0.75, HOL.tongue); g.restore(); mp(); g.stroke(); }
        else if (mb === 'happy' || mb === 'cool' || mb === 'squint') {
          const w = mb === 'happy' ? 1.75 : 1.35, d = mb === 'happy' ? 2.4 : (mb === 'squint' ? 1.0 : 1.75);
          const mp = () => { g.beginPath(); g.moveTo(mx - w, my - 0.2); g.quadraticCurveTo(mx, my + 0.35, mx + w + 0.2, my - 0.35); g.quadraticCurveTo(mx + w * 0.75, my + d, mx + 0.1, my + d * 0.95); g.quadraticCurveTo(mx - w * 0.85, my + d * 0.9, mx - w, my - 0.2); g.closePath(); };
          mp(); g.fillStyle = HOL.mouth; g.fill(); g.save(); g.clip(); fell(g, mx + 0.4, my + d + 0.1, 1.2, 0.95, HOL.tongue); g.restore(); mp(); g.stroke();
        }
        else if (mb === 'wide') { fell(g, mx + 0.2, my + 0.7, 0.8, 1.0, HOL.mouth, ol, lw * 0.65); }
        else if (mb === 'sad') { g.beginPath(); g.moveTo(mx - 1.2, my + 1.0); g.quadraticCurveTo(mx + 0.2, my - 0.2, mx + 1.5, my + 0.9); g.stroke(); }
        else if (mb === 'dead') { g.beginPath(); g.moveTo(mx - 1.5, my + 0.5); g.quadraticCurveTo(mx - 0.8, my - 0.1, mx - 0.1, my + 0.5); g.quadraticCurveTo(mx + 0.6, my + 1.1, mx + 1.4, my + 0.4); g.stroke(); fell(g, mx + 0.9, my + 1.3, 0.7, 1.0, HOL.tongue, ol, lw * 0.5); }
        /* big glossy eyes with a cheeky little lid */
        const wink = o.portrait && (t % 5.3) > 4.85;
        for (const d of [-1, 1]) { const cx = hx + (d < 0 ? -1.4 : 2.8), cy = hy - 1.0 - (d > 0 ? 0.1 : 0), m = wink && d > 0 ? 'happy' : mood; eyeGloss(g, cx, cy, d < 0 ? 1.3 : 1.42, d < 0 ? 1.78 : 1.92, m, ghost, ol, lw, d, R.explicitCool ? 0.3 : 0, -d * 0.1); }
        if (sad) { g.strokeStyle = ol; g.lineWidth = lw * 0.6; for (const d of [-1, 1]) { const cx = hx + (d < 0 ? -1.4 : 2.8); g.beginPath(); g.moveTo(cx - 1.1, hy - 3.6 + d * 0.5); g.lineTo(cx + 1.1, hy - 3.6 - d * 0.5); g.stroke(); } }
        /* ---- the lid hat ---- */
        drawLid(g, hx + 0.35, hy - HR + 1.05 - hatLift, hatTilt, Math.sin(t * 2.6 + fr * 0.4), pump, ol, lw, pal);
        g.restore();
        /* ---- front arm (and a raised back arm) on top ---- */
        if (raisedB) arm(armXB, aB, bendB, ghost);
        arm(armXF, aF, bendF, ghost);
        if (o.coffee) { const [cx, cy] = limbEnd(armXF, armY, aF, armL + 0.4); coffeeCup(g, cx, cy, ol, lw); }
      }
      /* candle smoke when the light went out; little embers when he is happy */
      if (dead) { const dt = (o.deadT == null ? 0.6 : +o.deadT || 0); for (let i = 0; i < 3; i++) { const p = ((dt * 0.7 + t * 0.3 + i / 3) % 1); g.save(); g.globalAlpha = 0.45 * (1 - p); fcirc(g, FX + 5 + Math.sin(p * 6 + i) * 1.2, FY - 2 - p * 8, 0.8 + p * 1.5, '#b8aec8'); g.restore(); } }
      else if (glowK > 0 && (pose === 'idle' || pose === 'victory')) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 2; i++) { const p = ((t * 0.55 + i * 0.5) % 1); g.globalAlpha = 0.8 * (1 - p) * Math.min(1, p * 5); fcirc(g, OX + (i ? 1 : -1) * (4.6 + p * 2.2) + Math.sin(p * 9 + i * 2) * 0.5, OY - 0.5 - p * 8, 0.4 * (1 - p * 0.5), HOL.glowLo); } g.restore(); }
    } finally { g.restore(); }
  }

  /* ================= API ================= */
  const R = {flitz: drawFlitz, rexi: drawRexi, bolt: drawBolt, hollo: drawHollo};
  /* portrait framing in body units: [top, bottom, x centre] of the head-and-shoulders crop */
  const FRAME = {wookie: [-25.5, -7.5, 0.4], flitz: [-27, -7.5, 1.4], rexi: [-25, -7.5, 1.8], bolt: [-27.4, -7.8, 0.3], hollo: [-27.4, -9.6, 0.9]};
  G.heroes = {
    list: [
      {id: 'wookie', name: 'Toffo', species: tr('Bär', 'Bear'), price: 0, perk: tr('Allrounder', 'All-rounder'), color: '#b9834a'},
      {id: 'flitz', name: 'Flitz', species: tr('Fuchs', 'Fox'), price: 800, perk: tr('Flink: 10 % schneller', 'Speedy: 10% faster'), color: '#f0842e'},
      {id: 'rexi', name: 'Rexi', species: tr('Dino', 'Dino'), price: 1500, perk: tr('Dino-Panzer: hält einen Treffer aus', 'Dino armor: survives one hit'), color: '#5bc96a'},
      {id: 'bolt', name: 'Bolt', species: tr('Roboter', 'Robot'), price: 2500, perk: tr('Raketenstiefel: Dreifachsprung', 'Rocket boots: triple jump'), color: '#8fd3ff'},
      {id: 'hollo', name: 'Hollo', species: tr('Geist', 'Ghost'), price: 1500, perk: tr('Gruselgleiter: Sprung halten = schweben', 'Spooky glide: hold jump to float'), color: '#ff8a2a', event: 'halloween'},
    ],
    renderer(id) { return R[id] || null; },
    portrait(ctx, cx, cy, size, id, t) {
      const F = FRAME[id] || FRAME.wookie, s = size / (F[1] - F[0]), feetY = cy - (F[0] + F[1]) / 2 * s, tt = +t || 0;
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - size, cy - size * 1.2, size * 2, size * 1.7); ctx.clip();
      const o = {scale: s, facing: 1, pose: 'idle', t: tt, frame: tt * 8, speed: 0, portrait: true};
      try {
        if (R[id]) R[id](ctx, cx - F[2] * s, feetY, o);
        else if (G.draw && G.draw.drawBearAt) G.draw.drawBearAt(ctx, cx - F[2] * s, feetY, Object.assign(o, {hero: 'wookie', outfit: 'wiese'}));
      } finally { ctx.restore(); }
    },
  };
})();

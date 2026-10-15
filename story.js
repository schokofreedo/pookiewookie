/* The Starway Home: the opening story film (about 30 s). It plays once after the publisher logo and can be replayed from the menu.
   A golden hour: Toffo and Mallo sit on their hill under the big round tree, a heart floats up.
   B the same hill at night: stars, three shooting stars, the two cheer.
   C a storm rolls in, rain, lightning; a huge shadow with two glowing eyes looms over the hill (pure silhouette, no spoiler).
   D a white flash: Toffo is alone, Mallo's bow flutters down.
   E grey dawn after the rain: close-up, Toffo holds the bow; a trail of Mallo's letters blows toward the horizon.
   F sunrise: Toffo stands up, the camera pulls back over the wide world, he leaps off after the letters, title.
   Everything on screen is a pure function of t (so ?t= screenshots are exact); only the sounds are fired once from update().
   Narration p/voice/story1..6.mp3 with German subtitles on the canvas; synthesized score and sfx run on an own gain bus that
   skip() fades out. API: G.story = {DUR, t, start(done), update(), frame(ctx), skip()}. */
(function () {
  const G = window.PW = window.PW || {}, VH = 270, TAU = Math.PI * 2, DUR = 30;
  const A = () => G.audio;
  /* ---------- math ---------- */
  const clamp01 = k => k < 0 ? 0 : (k > 1 ? 1 : k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ss = (t, a, b) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
  const eio = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const backOut = k => { const s = 1.70158; k -= 1; return 1 + (s + 1) * k * k * k + s * k * k; };
  const win = (t, a, b, fi, fo) => Math.min(ss(t, a, a + fi), 1 - ss(t, b - fo, b));
  const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star4(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? r * 0.3 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
  function heartPath(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.95); ctx.bezierCurveTo(x - s * 1.7, y - s * 0.15, x - s * 0.95, y - s * 1.35, x, y - s * 0.45); ctx.bezierCurveTo(x + s * 0.95, y - s * 1.35, x + s * 1.7, y - s * 0.15, x, y + s * 0.95); ctx.closePath(); }

  /* ---------- colour: one palette per time of day, blended over time ---------- */
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbS = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const rgbaS = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a < 0 ? 0 : (a > 1 ? 1 : a)).toFixed(3) + ')';
  const mixC = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  /* n: tA/tB = shade/light tint on the characters, sunA/moonA/stars/fire/rays/castle = visibility, lum = how much local colour
     (flowers) survives, cTop/cBot = how much the cloud tops/bottoms catch the light */
  const PALS = {
    GOLD: {c: {skyT: '#43397f', skyM: '#b4609a', skyL: '#ff8f78', skyH: '#ffd890', sun: '#ffe6a6', far1: '#8c5f98', far2: '#a8739a', snow: '#ffd6d6', haze: '#ffa894', sea: '#e88a8e', seaHi: '#fff1c0', mid1: '#a08f68', mid2: '#7d9a56', midT: '#577e44', path: '#f2cf96', hillT: '#88c45c', hillB: '#2c6332', rim: '#ffe39a', grass: '#7dbd52', leafD: '#285530', leaf: '#4a8c43', leafH: '#bfd96c', trunk: '#87552f', trunkD: '#4a2a18', bloss: '#ffb8cc', cloud: '#b05f8e', cloudH: '#ffd29a', tintA: '#341a55', tintB: '#ffaa50'},
      n: {tA: 0.22, tB: 0.22, sunA: 1, moonA: 0, stars: 0, fire: 0.55, rays: 0.5, lum: 1, cTop: 0.15, cBot: 1, castle: 0}},
    DUSK: {c: {skyT: '#1d2258', skyM: '#5d468a', skyL: '#c8708e', skyH: '#ffa884', sun: '#ffbf90', far1: '#4c3f74', far2: '#5c4a7c', snow: '#a898c4', haze: '#b07090', sea: '#7a5c94', seaHi: '#e8a0b0', mid1: '#4c4a62', mid2: '#3c5548', midT: '#2a4436', path: '#9a8890', hillT: '#466e48', hillB: '#1c3a2c', rim: '#ff9c8c', grass: '#3f6a40', leafD: '#1a3226', leaf: '#2a5034', leafH: '#6a7458', trunk: '#4c3030', trunkD: '#2a181c', bloss: '#d48cb0', cloud: '#5c4c80', cloudH: '#e8909a', tintA: '#22184a', tintB: '#ff8c8c'},
      n: {tA: 0.35, tB: 0.14, sunA: 0.25, moonA: 0.45, stars: 0.4, fire: 0.75, rays: 0.1, lum: 0.6, cTop: 0.2, cBot: 0.8, castle: 0}},
    NIGHT: {c: {skyT: '#060a22', skyM: '#141d56', skyL: '#352c74', skyH: '#5e4688', sun: '#ffffff', far1: '#1b2150', far2: '#222a5a', snow: '#5e6ca8', haze: '#33337a', sea: '#18225a', seaHi: '#8c9ce6', mid1: '#172446', mid2: '#13243a', midT: '#0d1c2e', path: '#34445e', hillT: '#1d3b4c', hillB: '#081624', rim: '#93b4ff', grass: '#1c3a4a', leafD: '#0a1a28', leaf: '#14304a', leafH: '#4a6aa0', trunk: '#2a2034', trunkD: '#140c1a', bloss: '#8c74b4', cloud: '#1c2252', cloudH: '#5a68b0', tintA: '#0a1032', tintB: '#9ab0ff'},
      n: {tA: 0.5, tB: 0.2, sunA: 0, moonA: 1, stars: 1, fire: 1, rays: 0, lum: 0.32, cTop: 0.7, cBot: 0.1, castle: 0}},
    STORM: {c: {skyT: '#08080f', skyM: '#16162a', skyL: '#26263c', skyH: '#36304a', sun: '#ffffff', far1: '#121220', far2: '#161624', snow: '#34344c', haze: '#20202e', sea: '#12121e', seaHi: '#3c3c54', mid1: '#10141c', mid2: '#0e1218', midT: '#080c12', path: '#262632', hillT: '#182a30', hillB: '#060c10', rim: '#5a6c90', grass: '#16282e', leafD: '#081418', leaf: '#122228', leafH: '#283a48', trunk: '#1a1418', trunkD: '#0a080a', bloss: '#5a4864', cloud: '#1a1a28', cloudH: '#3c3c58', tintA: '#04060e', tintB: '#7080b0'},
      n: {tA: 0.55, tB: 0.1, sunA: 0, moonA: 0, stars: 0, fire: 0, rays: 0, lum: 0.22, cTop: 0.4, cBot: 0, castle: 0}},
    AFTER: {c: {skyT: '#0c1020', skyM: '#1c2440', skyL: '#2e3654', skyH: '#46465e', sun: '#ffffff', far1: '#181c2e', far2: '#1c2234', snow: '#3e4660', haze: '#2a2e44', sea: '#161c30', seaHi: '#4a5270', mid1: '#141c28', mid2: '#121a24', midT: '#0c121a', path: '#2c3242', hillT: '#1c3038', hillB: '#081014', rim: '#7088b0', grass: '#1a2e36', leafD: '#0a161c', leaf: '#14262e', leafH: '#2e4454', trunk: '#1e181c', trunkD: '#0c0a0c', bloss: '#6a5474', cloud: '#1e2234', cloudH: '#444a68', tintA: '#080c1c', tintB: '#8090c0'},
      n: {tA: 0.42, tB: 0.14, sunA: 0, moonA: 0, stars: 0, fire: 0, rays: 0, lum: 0.28, cTop: 0.5, cBot: 0.1, castle: 0}},
    DAWN: {c: {skyT: '#56688e', skyM: '#8896b4', skyL: '#bcc0d0', skyH: '#e9d2d0', sun: '#fff0e0', far1: '#8890ae', far2: '#98a0bc', snow: '#e2e6f2', haze: '#c4c6d8', sea: '#a4acc8', seaHi: '#eceef6', mid1: '#76868c', mid2: '#66807a', midT: '#4c6a62', path: '#b4ada4', hillT: '#68986e', hillB: '#2c4c3c', rim: '#d4dfec', grass: '#5c8c66', leafD: '#2a483e', leaf: '#426c5a', leafH: '#8aa8a0', trunk: '#5a4440', trunkD: '#3a2a2a', bloss: '#d8a8bc', cloud: '#8890ac', cloudH: '#e0e0ec', tintA: '#2c3a5c', tintB: '#dce4f8'},
      n: {tA: 0.3, tB: 0.1, sunA: 0.1, moonA: 0, stars: 0, fire: 0, rays: 0, lum: 0.7, cTop: 0.75, cBot: 0.25, castle: 0.12}},
    RISE: {c: {skyT: '#5276c4', skyM: '#e2a0bc', skyL: '#ffc28a', skyH: '#fff0b4', sun: '#fff3c6', far1: '#9688b8', far2: '#b29ec2', snow: '#fff2f2', haze: '#ffd2bc', sea: '#eeb2ae', seaHi: '#fff8dc', mid1: '#a6b67a', mid2: '#88b866', midT: '#5a9852', path: '#f4daa8', hillT: '#98d266', hillB: '#3e7c40', rim: '#fff0a8', grass: '#8ac85c', leafD: '#336a38', leaf: '#5ea24e', leafH: '#cce67c', trunk: '#87552f', trunkD: '#4a2a18', bloss: '#ffbcd2', cloud: '#f2b8c4', cloudH: '#fff2d8', tintA: '#4a2c5c', tintB: '#ffc070'},
      n: {tA: 0.14, tB: 0.18, sunA: 1, moonA: 0, stars: 0, fire: 0.3, rays: 0.6, lum: 1, cTop: 0.6, cBot: 1, castle: 1}},
  };
  for (const k in PALS) for (const c in PALS[k].c) PALS[k].c[c] = hx(PALS[k].c[c]);
  /* time -> palette (two keys at the same time = a hard cut, hidden by a flash or a dip to black) */
  const PK = [[0, 'GOLD'], [4.6, 'GOLD'], [6.3, 'DUSK'], [7.9, 'NIGHT'], [10.9, 'NIGHT'], [12.1, 'STORM'], [14.56, 'STORM'], [14.56, 'AFTER'], [17.6, 'AFTER'], [17.6, 'DAWN'], [22.4, 'DAWN'], [25.6, 'RISE']];
  const PC = {}, PS = {}, PN = {};
  function palAt(t) {
    let i = 0; while (i < PK.length - 1 && PK[i + 1][0] <= t) i++;
    const a = PALS[PK[i][1]], nb = PK[i + 1], b = nb ? PALS[nb[1]] : a, k = nb ? ss(t, PK[i][0], nb[0]) : 0;
    for (const c in a.c) { const x = a.c[c], y = b.c[c], o = PC[c] || (PC[c] = [0, 0, 0]); o[0] = x[0] + (y[0] - x[0]) * k; o[1] = x[1] + (y[1] - x[1]) * k; o[2] = x[2] + (y[2] - x[2]) * k; PS[c] = rgbS(o); }
    for (const n in a.n) PN[n] = a.n[n] + (b.n[n] - a.n[n]) * k;
  }

  /* ---------- camera and parallax layers. World x = 0 is the screen centre at rest, y in logical px (horizon 176) ---------- */
  let SW = 480;
  const cam = {x: 0, y: 135, z: 1, sx: 0, sy: 0};
  const CAMK = [
    [0, -8, 136, 1.0], [5.6, -6, 149, 1.13],                       /* A: slow push-in on the two */
    [8.6, 2, 126, 1.0], [10.8, 6, 124, 0.985],                      /* B: tilt up to the stars */
    [12.9, 36, 113, 0.9], [14.56, 36, 117, 0.93],                  /* C: pull back for the towering shadow */
    [14.56, 22, 152, 1.3], [17.6, 20, 149, 1.38],                  /* D (cut behind the white flash): Toffo alone */
    [17.6, 12, 167, 2.15], [20.7, 15, 165, 2.22], [23.8, 62, 152, 1.45],   /* E (cut behind a dip to black): close-up, then the letters */
    [25.0, 50, 153, 1.55], [28.1, 118, 124, 0.56], [30, 122, 123, 0.55],   /* F: Toffo stands up, pull back over the world */
  ];
  const STRIKES = [{t: 11.62, x0: -230, x1: -176, y1: 150, pow: 0.45, w: 0.7}, {t: 12.55, x0: 262, x1: 196, y1: 168, pow: 0.9, w: 1.2}, {t: 13.45, x0: -120, x1: -66, y1: 158, pow: 0.75, w: 1}, {t: 14.48, x0: 70, x1: 30, y1: 186, pow: 1, w: 1.7}];
  function camAt(t) {
    let i = 0; while (i < CAMK.length - 1 && CAMK[i + 1][0] <= t) i++;
    const a = CAMK[i], b = CAMK[i + 1] || a, k = b[0] > a[0] ? eio(clamp01((t - a[0]) / (b[0] - a[0]))) : 0;
    cam.x = lerp(a[1], b[1], k); cam.y = lerp(a[2], b[2], k); cam.z = lerp(a[3], b[3], k);
    let sh = (t > 10.9 && t < 14.56 ? 0.5 * ss(t, 10.9, 12) : 0);
    for (const s of STRIKES) { const d = t - s.t; if (d > 0 && d < 0.5) sh += s.pow * 3.2 * (1 - d / 0.5); }
    if (t > 14.1 && t < 14.56) sh += 2.5 * ss(t, 14.1, 14.5);
    cam.sx = (Math.sin(t * 53.1) * 0.6 + Math.sin(t * 31.7 + 1) * 0.4) * sh; cam.sy = (Math.sin(t * 47.3 + 2) * 0.6 + Math.sin(t * 27.1) * 0.4) * sh;
  }
  function layer(ctx, p) { const z = Math.pow(cam.z, p); ctx.translate(SW / 2 + cam.sx * p, 135 + cam.sy * p); ctx.scale(z, z); ctx.translate(-cam.x * p, -(135 + (cam.y - 135) * p)); return z; }
  function proj(x, y, p) { const z = Math.pow(cam.z, p); return {x: SW / 2 + cam.sx * p + (x - cam.x * p) * z, y: 135 + cam.sy * p + (y - 135 - (cam.y - 135) * p) * z, z}; }
  function visX(p, pad) { const z = Math.pow(cam.z, p), c = cam.x * p, h = SW / 2 / z + (pad || 0); return [c - h, c + h]; }
  const PFAR = 0.22, PMID = 0.55, PSHD = 0.8, HZ = 176;

  /* ---------- the hill, the tree, the path ---------- */
  function hillY(x) { const d = x + 10; let y = 196 + 0.0006 * d * d + Math.sin(x * 0.045) * 1.2; if (d > 70) y += 0.0021 * (d - 70) * (d - 70); return y; }
  const TREE_X = -136, WX = -36, PX = 12, WG = 40, EX = 10;   /* tree, Toffo's seat, Mallo's seat, Toffo's guard spot, his dawn spot */
  const CLUMPS = [[0, 0, 44], [-40, 6, 30], [40, 4, 31], [-28, -30, 30], [24, -34, 32], [0, -44, 28], [-52, -16, 24], [54, -14, 25], [-34, 30, 26], [34, 30, 26], [0, 34, 28], [-60, 18, 20], [62, 16, 20]];
  function midBack(x) { let y = 186 + 6 * Math.sin(x * 0.012 + 0.5) + 4 * Math.sin(x * 0.029 + 2); if (x > 40) y += (x - 40) * 0.16; return y; }
  function midFront(x) { return 214 + 9 * Math.sin(x * 0.009 + 1.1) + 5 * Math.sin(x * 0.023) + ss(x, 60, 300) * 12; }
  /* the valley path (mid layer coordinates): from the foot of the hill toward the coast and the sunrise */
  const PATH_PTS = [[96, 300], [150, 262], [118, 238], [176, 222], [150, 208], [186, 200], [172, 193]];
  let PATH = null;   /* sampled: [{x, y, w}] */
  function buildPath() {
    const pts = [], P = PATH_PTS;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let j = 0; j < 8; j++) { const u = j / 8, u2 = u * u, u3 = u2 * u; pts.push({x: 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), y: 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)}); }
    }
    pts.push({x: P[P.length - 1][0], y: P[P.length - 1][1]});
    pts.forEach((p, i) => { p.w = lerp(17, 2.2, Math.pow(i / (pts.length - 1), 0.7)); });
    PATH = pts;
  }
  function pathAt(f) { const n = PATH.length - 1, u = clamp01(f) * n, i = Math.min(n - 1, Math.floor(u)), k = u - i, a = PATH[i], b = PATH[i + 1]; return {x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k)}; }

  /* ---------- seeded scene data ---------- */
  let D = null;
  function bumps(R, n) { const b = []; for (let i = 0; i < n; i++) { const bx = -0.42 + 0.84 * (i + 0.5) / n + (R() - 0.5) * 0.08, mid = 1 - Math.abs(bx) / 0.5; b.push([bx, -0.1 - mid * 0.45 - R() * 0.15, 0.36 + mid * 0.38 + R() * 0.16]); } return b; }
  function boltPts(R, x0, y0, x1, y1, n, jit) { const p = [[x0, y0]]; for (let i = 1; i < n; i++) { const k = i / n; p.push([lerp(x0, x1, k) + (R() - 0.5) * jit, lerp(y0, y1, k) + (R() - 0.5) * jit * 0.25]); } p.push([x1, y1]); return p; }
  function build() {
    const R = rng(20261015), r = (a, b) => a + (b - a) * R();
    D = {stars: [], flies: [], petals: [], rain: [], leaves: [], flowers: [], clouds: [], storm: [], bolts: [], letters: [], motes: [], drips: [], tufts: []};
    for (let i = 0; i < 160; i++) D.stars.push({x: r(-440, 440), y: r(-80, 170), r: Math.pow(R(), 3) * 1.4 + 0.45, f: r(1.2, 4.2), p: r(0, TAU), c: R() < 0.22 ? '#ffe9b0' : (R() < 0.3 ? '#cfe0ff' : '#ffffff')});
    for (let i = 0; i < 26; i++) D.flies.push({x: r(-270, 190), y: r(92, 192), p: r(0, TAU), s: r(0.6, 1.4), r: r(4, 8)});
    for (let i = 0; i < 18; i++) D.petals.push({o: r(0, 1), y: r(60, 170), s: r(0.6, 1.3), p: r(0, TAU), c: R() < 0.5 ? '#ffb8cc' : '#ffd6e2'});
    for (let i = 0; i < 190; i++) D.rain.push({x: R(), y: R(), v: r(0.8, 1.25), l: r(0.6, 1.4), near: R() < 0.35});
    for (let i = 0; i < 24; i++) D.leaves.push({y: R(), o: R(), v: r(0.7, 1.4), s: r(0.7, 1.4), p: r(0, TAU), c: R() < 0.6 ? 0 : 1});
    const fc = ['#fff6e8', '#ffb8d0', '#ffe27a', '#ff8fb0', '#d8b8ff'];
    for (let i = 0; i < 46; i++) { const x = r(-300, 200); D.flowers.push({x, dy: 4 + Math.pow(R(), 1.6) * 60, c: hx(fc[i % fc.length]), s: r(0.7, 1.25), p: r(0, TAU)}); }
    for (let i = 0; i < 40; i++) { const x = r(-320, 260); D.tufts.push({x, dy: 6 + R() * 70, s: r(0.8, 1.6)}); }
    for (let i = 0; i < 8; i++) D.clouds.push({x: -390 + i * 112 + r(-30, 30), y: r(36, 140), w: r(70, 140), h: r(11, 19), b: bumps(R, 4 + Math.floor(R() * 3)), v: r(1.2, 3)});
    for (let i = 0; i < 18; i++) { const x = -470 + i * 56 + r(-18, 18); D.storm.push({x, y: r(-40, 70) + (i % 3) * 14, w: r(110, 180), h: r(36, 58), b: bumps(R, 6), side: x < 30 ? -1 : 1, d: R() * 0.5}); }
    for (const s of STRIKES) { const main = boltPts(R, s.x0, -50, s.x1, s.y1, 14, 26 * s.w), br = []; for (let j = 0; j < 2; j++) { const a = main[3 + Math.floor(R() * 6)]; br.push(boltPts(R, a[0], a[1], a[0] + r(-50, 50), a[1] + r(30, 70), 6, 14)); } D.bolts.push({s, main, br}); }
    for (let i = 0; i < 9; i++) D.letters.push({t0: 20.85 + i * 0.16 + r(0, 0.08), d: r(2.1, 2.7), x0: r(-60, 40), y0: r(130, 205), cx: r(-20, 80), cy: r(118, 172), f: 0.1 + i * 0.07, ph: r(0, TAU), sp: r(5, 8)});
    for (let i = 0; i < 10; i++) D.motes.push({a: r(0, TAU), v: r(14, 34), d: r(0, 0.4), s: r(0.8, 1.6)});
    for (let i = 0; i < 6; i++) D.drips.push({x: TREE_X + r(20, 92), y: r(118, 150), o: r(0, 1.6), v: r(1.1, 1.6)});
    buildPath();
  }

  /* ---------- sprites (soft glows, vignette), made once ---------- */
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    const mk = (r, g, b, soft) => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32), f = a => 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; gr.addColorStop(0, f(1)); gr.addColorStop(soft ? 0.22 : 0.1, f(soft ? 0.5 : 0.85)); gr.addColorStop(0.5, f(soft ? 0.16 : 0.2)); gr.addColorStop(1, f(0)); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; };
    SPR = {sun: mk(255, 220, 150, true), white: mk(255, 255, 255), pink: mk(255, 120, 175, true), cool: mk(170, 196, 255, true), fly: mk(225, 255, 150), gold: mk(255, 214, 110), amber: mk(255, 196, 80), lava: mk(255, 110, 40, true)};
    const v = document.createElement('canvas'); v.width = 160; v.height = 90; const vx = v.getContext('2d'), vg = vx.createRadialGradient(80, 45, 18, 80, 45, 98);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.1)'); vg.addColorStop(1, 'rgba(0,0,0,0.62)'); vx.fillStyle = vg; vx.fillRect(0, 0, 160, 90); SPR.vig = v;
    /* a rainbow arc (left part only) whose ends dissolve into the sky */
    const rb = document.createElement('canvas'); rb.width = 300; rb.height = 170; const rx = rb.getContext('2d'), cols = ['#ff6a6a', '#ffa45a', '#ffe36a', '#8ee07a', '#6ac8ff', '#8a8cff', '#c08aff'];
    rx.lineWidth = 4.6; for (let i = 0; i < 7; i++) { rx.strokeStyle = cols[i]; rx.beginPath(); rx.arc(300, 300, 290 - i * 4.4, Math.PI, Math.PI * 1.5); rx.stroke(); }
    rx.globalCompositeOperation = 'destination-out';
    let fg = rx.createLinearGradient(0, 0, 0, 170); fg.addColorStop(0.55, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)'); rx.fillStyle = fg; rx.fillRect(0, 0, 300, 170);
    fg = rx.createLinearGradient(140, 0, 300, 0); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)'); rx.fillStyle = fg; rx.fillRect(140, 0, 160, 170);
    SPR.rainbow = rb;
    return SPR;
  }
  function glow(ctx, spr, x, y, r, a) { if (a <= 0.004 || r <= 0) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(spr, x - r, y - r, r * 2, r * 2); }

  /* ---------- time functions ---------- */
  function flashAt(t) { let f = 0; for (const s of STRIKES) { const d = t - s.t; if (d < 0 || d > 0.8) continue; const v = d < 0.06 ? 1 : (d < 0.11 ? 0.25 : (d < 0.18 ? 0.85 : Math.exp(-(d - 0.18) * 7) * 0.85)); f = Math.max(f, v * s.pow); } return f; }
  function windAt(t) { return 0.12 + 0.9 * ss(t, 10.6, 11.8) - 0.5 * ss(t, 14.6, 15.4) - 0.4 * ss(t, 17.4, 17.7) + 0.4 * win(t, 20.6, 23.4, 0.4, 1.3) + 0.2 * ss(t, 24.2, 25.5); }
  function sunPos(t) { return t < 12 ? {x: 150, y: lerp(146, 200, ss(t, 0, 6.8))} : {x: 140, y: lerp(206, 132, ss(t, 22.2, 30))}; }
  const stormK = t => ss(t, 10.75, 12.3) * (t < 17.6 ? 1 : 0);

  /* ---------- sky ---------- */
  const FL_T = [96, 92, 170], FL_M = [176, 168, 236], FL_L = [222, 214, 255];
  function drawSky(ctx, t, fl) {
    const hz = proj(0, HZ, PFAR).y, f = fl * 0.7;
    const g = ctx.createLinearGradient(0, -10, 0, hz + 6);
    g.addColorStop(0, rgbS(mixC(PC.skyT, FL_T, f))); g.addColorStop(0.45, rgbS(mixC(PC.skyM, FL_M, f))); g.addColorStop(0.8, rgbS(mixC(PC.skyL, FL_M, f))); g.addColorStop(1, rgbS(mixC(PC.skyH, FL_L, f)));
    ctx.fillStyle = g; ctx.fillRect(-2, -2, SW + 4, VH + 4);
  }
  function cloudPath(ctx, c, x, y, grow) {
    const h = c.h + grow; ctx.beginPath(); ctx.ellipse(x, y, c.w * 0.5 + grow, h * 0.42, 0, 0, TAU);
    for (const b of c.b) { const bx = x + b[0] * c.w, by = y + b[1] * c.h, br = b[2] * c.h + grow; ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU); }
  }
  function drawCloud(ctx, c, x, y, top, bot, a) {
    if (a <= 0.01) return;
    const g = ctx.createLinearGradient(0, y - c.h * 1.1, 0, y + c.h * 0.45); g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.globalAlpha = a * 0.35; ctx.fillStyle = g; cloudPath(ctx, c, x, y, 3.5); ctx.fill();
    ctx.globalAlpha = a; cloudPath(ctx, c, x, y, 0); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawSkyStuff(ctx, t, fl, storm) {
    const S = sprites(), cover = storm;
    /* stars */
    const sa = PN.stars * (1 - cover);
    if (sa > 0.02) {
      ctx.save(); layer(ctx, 0.05);
      for (const s of D.stars) { const a = sa * (0.55 + 0.45 * Math.sin(t * s.f + s.p)); if (a < 0.04) continue; ctx.globalAlpha = a; ctx.fillStyle = s.c; if (s.r > 1.25) { star4(ctx, s.x, s.y, s.r * 2.3); ctx.fill(); } else ctx.fillRect(s.x - s.r / 2, s.y - s.r / 2, s.r, s.r); }
      /* shooting stars: one during "Sternschnuppen" */
      ctx.globalCompositeOperation = 'lighter';
      for (const [t0, d, x0, y0, x1, y1, w] of SHOOT) {
        const k = (t - t0) / d; if (k < 0 || k > 1.3) continue;
        const e = 1 - Math.pow(1 - Math.min(1, k), 2), hx2 = lerp(x0, x1, e), hy = lerp(y0, y1, e), ang = Math.atan2(y1 - y0, x1 - x0);
        const len = 90 * w * Math.min(1, k * 2.5) * (k > 1 ? Math.max(0, 1 - (k - 1) * 3.3) : 1), a = sa * (k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.5) : 1);
        const tx = hx2 - Math.cos(ang) * len, ty = hy - Math.sin(ang) * len, g = ctx.createLinearGradient(tx, ty, hx2, hy);
        g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.7, 'rgba(255,236,200,' + (0.45 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,' + a.toFixed(3) + ')');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = 1.7 * w; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx2, hy); ctx.stroke();
        if (k <= 1.05) { glow(ctx, S.white, hx2, hy, 9 * w, a); glow(ctx, S.gold, hx2, hy, 22 * w, a * 0.45); }
      }
      ctx.restore();
    }
    /* sun and moon live on the far layer, so the sea and the islands hide them when they set */
    ctx.save(); layer(ctx, PFAR);
    const ma = PN.moonA * (1 - cover);
    if (ma > 0.02) {
      const mx = 168, my = 46, mr = 12.5;
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, S.cool, mx, my, 70, ma * 0.55); glow(ctx, S.cool, mx, my, 26, ma * 0.5); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = ma; ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.clip();
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.arc(mx + 6.5, my - 4.5, mr * 0.92, 0, TAU, true); ctx.fillStyle = '#fff6dc'; ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
    }
    const sa2 = PN.sunA;
    if (sa2 > 0.02) {
      const p = sunPos(t);
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, S.sun, p.x, p.y, 150, sa2 * 0.55); glow(ctx, S.sun, p.x, p.y, 46, sa2 * 0.7); ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(p.x - 5, p.y - 6, 2, p.x, p.y, 21); g.addColorStop(0, '#fffef2'); g.addColorStop(0.6, rgbS(mixC(PC.sun, [255, 255, 240], 0.4))); g.addColorStop(1, PS.sun);
      ctx.globalAlpha = Math.min(1, sa2 * 1.2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 21, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    /* rainbow after the storm, opposite the sun */
    const rb = 0.3 * ss(t, 24.6, 26.8);
    if (rb > 0.005) { ctx.save(); layer(ctx, 0.1); ctx.globalAlpha = rb; ctx.drawImage(S.rainbow, -420, 20, 330, 187); ctx.restore(); }
    /* the far cloud castle, only once the morning air is clear */
    const ca = PN.castle * (1 - cover);
    if (ca > 0.02) { ctx.save(); layer(ctx, 0.12); castle(ctx, 236, 72, ca); ctx.restore(); }
    /* gentle clouds (not in the storm) */
    const la = 1 - cover;
    if (la > 0.02) {
      ctx.save(); layer(ctx, 0.1);
      const top = rgbS(mixC(PC.cloud, PC.cloudH, PN.cTop)), bot = rgbS(mixC(PC.cloud, PC.cloudH, PN.cBot));
      for (const c of D.clouds) drawCloud(ctx, c, c.x + t * c.v, c.y, top, bot, la * 0.9);
      ctx.restore();
    }
    /* lightning bolts behind the shadow and the hill */
    if (t > 11.5 && t < 14.56) {
      ctx.save(); layer(ctx, 0.15); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const b of D.bolts) {
        const d = t - b.s.t; if (d < 0 || d > 0.3 || b.s.t > 14) continue;
        const a = d < 0.06 ? 1 : (d < 0.11 ? 0.2 : (d < 0.2 ? 0.9 : 0.9 * (1 - (d - 0.2) / 0.1)));
        boltDraw(ctx, b, a);
      }
      ctx.restore();
    }
    /* storm clouds roll in from both sides */
    if (storm > 0.01) {
      ctx.save(); layer(ctx, 0.2);
      const lit = Math.min(1, fl * 1.2), top = rgbS(mixC(mixC(PC.cloud, PC.cloudH, PN.cTop), [150, 150, 210], lit)), bot = rgbS(mixC(PC.cloud, [70, 70, 110], lit * 0.6));
      for (const c of D.storm) { const k = ss(t, 10.7 + c.d, 12.1 + c.d); if (k <= 0) continue; const x = c.x + (1 - k) * c.side * 460 + Math.sin(t * 0.7 + c.d * 9) * 6; drawCloud(ctx, c, x, c.y, top, bot, k * (t < 17.6 ? 1 : 0)); }
      ctx.restore();
    }
  }
  const SHOOT = [[6.95, 0.75, 10, 8, 170, 58, 1], [8.7, 0.95, -40, -4, 230, 92, 1.5], [9.85, 0.6, 110, 2, 262, 40, 0.9]];
  function boltDraw(ctx, b, a) {
    const line = (pts, w) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.lineWidth = w; ctx.stroke(); };
    ctx.globalAlpha = a * 0.35; ctx.strokeStyle = '#b8b0ff'; line(b.main, 7 * b.s.w); b.br.forEach(p => line(p, 4 * b.s.w));
    ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; line(b.main, 1.8 * b.s.w); b.br.forEach(p => line(p, 1 * b.s.w));
    ctx.globalAlpha = 1;
  }
  function castle(ctx, x, y, a) {
    const wall = rgbS(mixC(PC.far1, [255, 250, 255], 0.55)), roof = rgbS(mixC(PC.far1, [255, 150, 185], 0.6)), puff = rgbS(mixC(PC.cloudH, [255, 255, 255], 0.5));
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = wall; ctx.fillRect(x - 13, y - 14, 26, 14); ctx.fillRect(x - 17, y - 22, 7, 22); ctx.fillRect(x + 10, y - 20, 7, 20); ctx.fillRect(x - 4, y - 30, 8, 30);
    ctx.fillStyle = roof; for (const [rx, ry, rw] of [[-13.5, -22, 9], [13.5, -20, 9], [0, -30, 10]]) { ctx.beginPath(); ctx.moveTo(x + rx - rw / 2, y + ry); ctx.lineTo(x + rx, y + ry - 11); ctx.lineTo(x + rx + rw / 2, y + ry); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = roof; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y - 41); ctx.lineTo(x, y - 47); ctx.stroke(); ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x, y - 47); ctx.lineTo(x + 5, y - 45.5); ctx.lineTo(x, y - 44); ctx.fill();
    ctx.fillStyle = puff; ctx.beginPath(); for (const [px, py, pr] of [[-22, 2, 8], [-10, 4, 10], [4, 4, 11], [18, 3, 9], [28, 5, 6], [-30, 5, 5]]) { ctx.moveTo(x + px + pr, y + py); ctx.arc(x + px, y + py, pr, 0, TAU); } ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ---------- far layer: snowy peaks, a smoking volcano, the sea with islands ---------- */
  function drawFar(ctx, t) {
    const S = sprites(); ctx.save(); layer(ctx, PFAR);
    /* sea */
    let g = ctx.createLinearGradient(0, HZ - 2, 0, HZ + 70); g.addColorStop(0, rgbS(mixC(PC.sea, PC.haze, 0.6))); g.addColorStop(0.35, PS.sea); g.addColorStop(1, rgbS(mixC(PC.sea, PC.far1, 0.55)));
    ctx.fillStyle = g; ctx.fillRect(-700, HZ - 1, 1400, 260);
    /* sun / moon glitter on the water */
    const sp = sunPos(t), gl = [[sp.x, PN.sunA * 0.75, PS.seaHi], [168, PN.moonA * 0.5 * (1 - stormK(t)), PS.seaHi]];
    for (const [gx, ga] of gl) { if (ga < 0.03) continue; ctx.fillStyle = PS.seaHi; for (let i = 0; i < 16; i++) { const y = HZ + 1.5 + i * i * 0.32, w = 4 + i * 2.4, a = ga * (0.45 + 0.55 * Math.sin(t * 3.4 + i * 2.1)) * (1 - i / 18); if (a < 0.03) continue; ctx.globalAlpha = a; ctx.fillRect(gx - w / 2 + Math.sin(t * 1.7 + i * 1.3) * (2 + i * 0.6), y, w, 1); } }
    ctx.globalAlpha = 1;
    /* islands with palms (right) */
    const isl = rgbS(mixC(PC.far2, PC.far1, 0.3)), dark = rgbS(mixC(PC.far1, [0, 0, 0], 0.25));
    ctx.fillStyle = isl;
    ctx.beginPath(); ctx.moveTo(84, HZ + 0.5); ctx.quadraticCurveTo(104, HZ - 9, 124, HZ + 0.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(206, HZ + 0.5); ctx.quadraticCurveTo(214, HZ - 14, 232, HZ - 16); ctx.quadraticCurveTo(250, HZ - 22, 266, HZ - 15); ctx.quadraticCurveTo(286, HZ - 12, 300, HZ + 0.5); ctx.fill();
    ctx.beginPath(); for (const [bx, by, br] of [[222, HZ - 16, 7], [236, HZ - 20, 8], [252, HZ - 21, 8], [267, HZ - 17, 7], [281, HZ - 12, 6]]) { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU); } ctx.fillStyle = dark; ctx.fill();
    ctx.beginPath(); ctx.moveTo(318, HZ + 0.5); ctx.quadraticCurveTo(326, HZ - 5, 336, HZ + 0.5); ctx.fillStyle = isl; ctx.fill();
    palm(ctx, 108, HZ - 6, 15, 0.25, dark, t); palm(ctx, 196, HZ - 1, 18, -0.15, dark, t); palm(ctx, 292, HZ - 8, 14, 0.3, dark, t);
    /* mountain range with snow (left) */
    g = ctx.createLinearGradient(0, 104, 0, HZ); g.addColorStop(0, PS.far1); g.addColorStop(1, rgbS(mixC(PC.far1, PC.haze, 0.6)));
    const M = [[-600, HZ], [-520, 146], [-470, 126], [-438, 140], [-400, 108], [-372, 124], [-340, 114], [-306, 136], [-272, 126], [-236, 150], [-190, 158], [-150, 166], [-90, 170], [-30, HZ]];
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(M[0][0], M[0][1]); for (const p of M) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PS.snow; for (const [px, py] of [[-470, 126], [-400, 108], [-340, 114], [-272, 126]]) { ctx.beginPath(); ctx.moveTo(px - 11, py + 10); ctx.lineTo(px, py); ctx.lineTo(px + 10, py + 9); ctx.lineTo(px + 6, py + 7); ctx.lineTo(px + 3, py + 10); ctx.lineTo(px - 2, py + 7); ctx.lineTo(px - 6, py + 10); ctx.closePath(); ctx.fill(); }
    /* volcano with a glowing crater and a thin plume */
    g = ctx.createLinearGradient(0, 134, 0, HZ); g.addColorStop(0, PS.far2); g.addColorStop(1, rgbS(mixC(PC.far2, PC.haze, 0.55)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-300, HZ); ctx.quadraticCurveTo(-238, 160, -218, 138); ctx.lineTo(-210, 141); ctx.lineTo(-200, 141); ctx.lineTo(-193, 138); ctx.quadraticCurveTo(-172, 160, -108, HZ); ctx.closePath(); ctx.fill();
    const lv = 0.35 + 0.65 * (1 - PN.lum);
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, S.lava, -205, 139, 16, lv * 0.8); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgbS(mixC(PC.far2, PC.haze, 0.45));
    for (let i = 0; i < 5; i++) { const k = ((t * 0.18 + i / 5) % 1), x = -205 + k * 26 + Math.sin(k * 5 + i) * 3, y = 134 - k * 40, r = 2.5 + k * 7; ctx.globalAlpha = 0.45 * (1 - k) * (1 - stormK(t)); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    /* foothills and haze */
    ctx.fillStyle = rgbS(mixC(PC.far2, PC.haze, 0.3)); ctx.beginPath(); ctx.moveTo(-640, HZ + 1);
    for (let x = -640; x <= 90; x += 16) ctx.lineTo(x, Math.min(HZ + 1, 168 + 3.5 * Math.sin(x * 0.03) + 2 * Math.sin(x * 0.071) + ss(x, -20, 90) * 10)); ctx.lineTo(90, HZ + 1); ctx.closePath(); ctx.fill();
    g = ctx.createLinearGradient(0, HZ - 36, 0, HZ + 2); g.addColorStop(0, rgbaS(PC.haze, 0)); g.addColorStop(1, rgbaS(PC.haze, 0.5)); ctx.fillStyle = g; ctx.fillRect(-700, HZ - 36, 1400, 38);
    ctx.restore();
  }
  function palm(ctx, x, y, h, lean, col, t) {
    const tx = x + lean * h, ty = y - h, sw = Math.sin(t * 1.3 + x) * 0.6;
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * h * 0.2, y - h * 0.6, tx, ty); ctx.stroke();
    ctx.lineWidth = 1.3; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.62, l = 8 + (i % 2) * 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * l * 0.6, ty + Math.sin(a) * l * 0.6 - 2, tx + Math.cos(a) * l + sw, ty + Math.sin(a) * l * 0.5 + 3.5); ctx.stroke(); }
  }

  /* ---------- mid layer: meadows, lollipop trees, a cottage, the path to the coast ---------- */
  function drawMid(ctx, t) {
    ctx.save(); layer(ctx, PMID);
    const [x0, x1] = visX(PMID, 40);
    /* back ridge */
    let g = ctx.createLinearGradient(0, 178, 0, 240); g.addColorStop(0, rgbS(mixC(PC.mid1, PC.haze, 0.25))); g.addColorStop(1, PS.mid1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 600); for (let x = x0; x <= x1 + 10; x += 10) ctx.lineTo(x, midBack(x)); ctx.lineTo(x1 + 10, 600); ctx.closePath(); ctx.fill();
    /* lollipop trees and the cottage on the ridge */
    const tc = PS.midT, tl = rgbS(mixC(PC.midT, PC.leafH, 0.35));
    for (const tx of [-420, -372, -300, -232, -196, -120, -64, -20, 30]) { const y = midBack(tx) + 2, h = 9 + hash(tx) * 6, r = 5 + hash(tx + 1) * 3.5; ctx.fillStyle = rgbS(mixC(PC.trunkD, PC.mid1, 0.4)); ctx.fillRect(tx - 0.8, y - h, 1.6, h); ctx.fillStyle = tc; ctx.beginPath(); ctx.arc(tx, y - h - r * 0.6, r, 0, TAU); ctx.fill(); ctx.fillStyle = tl; ctx.beginPath(); ctx.arc(tx + r * 0.3, y - h - r * 0.9, r * 0.45, 0, TAU); ctx.fill(); }
    cottage(ctx, -268, midBack(-268) + 3, t);
    /* front meadow */
    g = ctx.createLinearGradient(0, 200, 0, 300); g.addColorStop(0, PS.mid2); g.addColorStop(1, rgbS(mixC(PC.mid2, PC.hillB, 0.6)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 700); for (let x = x0; x <= x1 + 10; x += 10) ctx.lineTo(x, midFront(x)); ctx.lineTo(x1 + 10, 700); ctx.closePath(); ctx.fill();
    for (const tx of [-330, -250, -150, -80, 230, 290, 360]) { const y = midFront(tx) + 4, h = 12 + hash(tx) * 6, r = 7 + hash(tx + 2) * 4; ctx.fillStyle = rgbS(mixC(PC.trunkD, PC.mid2, 0.3)); ctx.fillRect(tx - 1.1, y - h, 2.2, h); ctx.fillStyle = tc; ctx.beginPath(); ctx.arc(tx, y - h - r * 0.6, r, 0, TAU); ctx.fill(); ctx.fillStyle = tl; ctx.beginPath(); ctx.arc(tx + r * 0.3, y - h - r * 0.95, r * 0.45, 0, TAU); ctx.fill(); }
    /* the path: a ribbon that narrows toward the coast */
    const L = [], Rt = [];
    for (let i = 0; i < PATH.length; i++) { const p = PATH[i], q = PATH[Math.min(PATH.length - 1, i + 1)], o = PATH[Math.max(0, i - 1)]; let dx = q.x - o.x, dy = q.y - o.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; L.push([p.x - dy * p.w / 2, p.y + dx * p.w / 2 * 0.45]); Rt.push([p.x + dy * p.w / 2, p.y - dx * p.w / 2 * 0.45]); }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let i = Rt.length - 1; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]); ctx.closePath();
    ctx.fillStyle = rgbS(mixC(PC.path, PC.mid2, 0.15)); ctx.fill();
    ctx.restore();
  }
  function cottage(ctx, x, y, t) {
    const wall = rgbS(mixC([255, 240, 220], PC.mid1, 0.45)), roof = rgbS(mixC([226, 96, 110], PC.mid1, 0.4));
    ctx.fillStyle = wall; ctx.fillRect(x - 7, y - 9, 14, 9);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 9, y - 8); ctx.lineTo(x, y - 16); ctx.lineTo(x + 9, y - 8); ctx.closePath(); ctx.fill(); ctx.fillRect(x + 3.5, y - 16, 2.4, 5);
    const lit = clamp01(1 - PN.lum * 1.3) * (1 - stormK(t) * 0.7);
    ctx.fillStyle = rgbS(mixC(mixC(PC.mid1, [60, 50, 70], 0.4), [255, 214, 120], lit)); ctx.fillRect(x - 4.5, y - 6, 3.4, 3); ctx.fillRect(x + 1.5, y - 6, 3.4, 3);
    if (lit > 0.05) { const S = sprites(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, S.amber, x, y - 4.5, 10, lit * 0.5); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = rgbS(mixC(PC.haze, [255, 255, 255], 0.3));
    for (let i = 0; i < 3; i++) { const k = ((t * 0.3 + i / 3) % 1); ctx.globalAlpha = 0.4 * (1 - k) * (1 - stormK(t)); ctx.beginPath(); ctx.arc(x + 4.7 + k * 6, y - 18 - k * 12, 1.5 + k * 2.5, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  /* ---------- the shadow: a huge hooded silhouette with two glowing eyes. Never anything recognisable. ---------- */
  const SHAPE = [[-320, 440], [-276, 340], [-232, 266], [-190, 210], [-150, 174], [-106, 148], [-74, 114], [-60, 72], [-50, 34], [-28, 9], [0, 0], [28, 9], [50, 34], [60, 72], [74, 114], [106, 148], [150, 174], [190, 210], [232, 266], [276, 340], [320, 440]];
  function shadowPath(ctx, t, grow, ph) {
    /* the outline breathes and frays like smoke; points are smoothed with quadratic midpoints */
    const pts = SHAPE.map(([px, py], i) => { const amp = 3 + py / 50 + grow * 0.3, w = Math.sin(t * 2.1 + i * 0.9 + ph) * amp + Math.sin(t * 3.7 + i * 2.3 + ph) * amp * 0.45 + grow, lean = Math.sin(t * 0.9) * 7 * (1 - py / 440); return [px + Math.sign(px) * w + lean, py + (px === 0 ? w * 0.4 - grow : 0)]; });
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + 320); ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    const lp = pts[pts.length - 1]; ctx.lineTo(lp[0], lp[1]); ctx.lineTo(lp[0], lp[1] + 320); ctx.closePath();
  }
  function drawShadow(ctx, t, fl) {
    if (t < 11.85 || t >= 14.56) return;
    const S = sprites(), rise = ss(t, 11.9, 13.25), lunge = ss(t, 14.0, 14.56);
    const cx = 150 - lunge * 110, top = lerp(420, -36, rise) + lunge * 40, sc = 1.3 + lunge * 0.8;
    ctx.save(); layer(ctx, PSHD); ctx.translate(cx, top); ctx.scale(sc, sc);
    /* smoky halo, then the solid body */
    ctx.globalAlpha = 0.32; ctx.fillStyle = '#1a1030'; shadowPath(ctx, t, 9, 1.7); ctx.fill();
    ctx.globalAlpha = 0.5; shadowPath(ctx, t, 4, 0.8); ctx.fill(); ctx.globalAlpha = 1;
    shadowPath(ctx, t, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#24183c'); g.addColorStop(0.5, '#130b22'); g.addColorStop(1, '#08050e');
    ctx.fillStyle = g; ctx.fill();
    if (fl > 0.05) { ctx.strokeStyle = 'rgba(190,170,255,' + (fl * 0.65).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke(); }
    /* a deeper darkness inside the hood, then the eyes */
    const hg = ctx.createRadialGradient(0, 78, 4, 0, 74, 44); hg.addColorStop(0, 'rgba(2,0,4,0.95)'); hg.addColorStop(0.7, 'rgba(2,0,4,0.7)'); hg.addColorStop(1, 'rgba(2,0,4,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 76, 46, 42, 0, 0, TAU); ctx.fill();
    const open = ss(t, 13.38, 13.7) * (t > 14.0 && t < 14.12 ? 0.1 : 1) * (1 - lunge * 0.35);
    if (open > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (const d of [-1, 1]) glow(ctx, S.amber, d * 19, 77, 34, open * 0.85);
      ctx.globalCompositeOperation = 'source-over';
      for (const d of [-1, 1]) {
        ctx.save(); ctx.translate(d * 19, 77); ctx.rotate(d * 0.28); ctx.scale(1, open);
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(0, -7, 11, 0); ctx.quadraticCurveTo(0, 5, -11, 0); ctx.closePath();
        const eg = ctx.createRadialGradient(0, 0, 1, 0, 0, 11); eg.addColorStop(0, '#fffbe0'); eg.addColorStop(0.5, '#ffe36a'); eg.addColorStop(1, '#ff9a2a'); ctx.fillStyle = eg; ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ---------- the near hill with grass and flowers, the big round tree ---------- */
  function drawHill(ctx, t, wind) {
    const [x0, x1] = visX(1, 20), st = 4;
    const a = Math.floor(x0 / st) * st, b = x1 + st;
    ctx.beginPath(); ctx.moveTo(a, 1400); for (let x = a; x <= b; x += st) ctx.lineTo(x, hillY(x)); ctx.lineTo(b, 1400); ctx.closePath();
    let g = ctx.createLinearGradient(0, 190, 0, 330); g.addColorStop(0, PS.hillT); g.addColorStop(1, PS.hillB); ctx.fillStyle = g; ctx.fill();
    /* light pooling on the crest toward the sun */
    const la = (PN.sunA * 0.32 + PN.moonA * 0.12) * (1 - stormK(t));
    if (la > 0.01) { g = ctx.createRadialGradient(70, 190, 10, 70, 200, 260); g.addColorStop(0, rgbaS(PC.rim, la)); g.addColorStop(1, rgbaS(PC.rim, 0)); ctx.fillStyle = g; ctx.fill(); }
    /* tufts of darker grass on the face of the hill */
    ctx.fillStyle = rgbS(mixC(PC.grass, PC.hillB, 0.45)); ctx.beginPath();
    for (const f of D.tufts) { if (f.x < x0 || f.x > x1) continue; const y = hillY(f.x) + f.dy, s = f.s, sw = (Math.sin(t * 2 + f.x) * 0.6 - wind * 1.5) * s; for (let j = -1; j <= 1; j++) { ctx.moveTo(f.x + j * 2.2 * s - 1.2 * s, y); ctx.lineTo(f.x + j * 3 * s + sw, y - (4 + (j === 0 ? 2 : 0)) * s); ctx.lineTo(f.x + j * 2.2 * s + 1.2 * s, y); } }
    ctx.fill();
    /* flowers */
    const lum = PN.lum;
    for (const f of D.flowers) {
      if (f.x < x0 || f.x > x1) continue; const y = hillY(f.x) + f.dy, s = f.s * (0.8 + f.dy / 120), sw = Math.sin(t * 2.2 + f.p) * (0.4 + wind * 1.4) - wind * 1.6;
      const c = rgbS(mixC(PC.hillB, f.c, 0.25 + 0.75 * lum)), fx = f.x + sw * s;
      ctx.strokeStyle = PS.grass; ctx.lineWidth = 0.6 * s; ctx.beginPath(); ctx.moveTo(f.x, y + 3 * s); ctx.lineTo(fx, y); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 5; i++) { const an = i * TAU / 5 + f.p; ctx.moveTo(fx + Math.cos(an) * 1.2 * s + 0.9 * s, y + Math.sin(an) * 1.2 * s); ctx.arc(fx + Math.cos(an) * 1.2 * s, y + Math.sin(an) * 1.2 * s, 0.9 * s, 0, TAU); } ctx.fill();
      ctx.fillStyle = rgbS(mixC(PC.hillB, [255, 214, 90], 0.3 + 0.7 * lum)); ctx.beginPath(); ctx.arc(fx, y, 0.7 * s, 0, TAU); ctx.fill();
    }
    /* puddles after the rain mirror the sky */
    const pa = ss(t, 17.6, 17.7);
    if (pa > 0) for (const [px, pw] of [[-62, 10], [58, 13], [-100, 7]]) { const y = hillY(px) + 9; ctx.fillStyle = rgbS(mixC(mixC(PC.skyM, PC.skyL, 0.5), PC.hillT, 0.3)); ctx.globalAlpha = 0.6 * pa; ctx.beginPath(); ctx.ellipse(px, y, pw, pw * 0.18, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgbaS(PC.skyH, 0.7); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px - pw * 0.45, y - 0.5); ctx.lineTo(px + pw * 0.1, y - 0.5); ctx.stroke(); ctx.globalAlpha = 1; }
    /* rim light on the crest, then the grass blades against the sky */
    ctx.strokeStyle = rgbaS(PC.rim, 0.55); ctx.lineWidth = 1.4; ctx.beginPath(); for (let x = Math.max(a, -280); x <= Math.min(b, 220); x += st) { if (x === Math.max(a, -280)) ctx.moveTo(x, hillY(x) + 0.6); else ctx.lineTo(x, hillY(x) + 0.6); } ctx.stroke();
    ctx.fillStyle = PS.grass; ctx.beginPath();
    const bs = cam.z < 0.8 ? 3.4 : 2.4;
    for (let x = Math.floor(x0 / bs) * bs; x < x1; x += bs) { const y = hillY(x) + 1.6, h = 2.4 + hash(x) * 3.6, sw = Math.sin(t * 2.4 + x * 0.09) * (0.5 + wind * 2.2) - wind * 3.2; ctx.moveTo(x - 1.2, y); ctx.lineTo(x + sw, y - h); ctx.lineTo(x + 1.2, y); }
    ctx.fill();
  }
  function drawTree(ctx, t, wind) {
    const bx = TREE_X, by = hillY(TREE_X) + 4, lean = Math.sin(t * 1.3) * (0.4 + wind * 2) - wind * 6;
    const cx = bx + 6 + lean, cy = 96 + Math.abs(lean) * 0.2;
    /* trunk with flared roots and two big branches */
    let g = ctx.createLinearGradient(bx - 14, 0, bx + 16, 0); g.addColorStop(0, PS.trunkD); g.addColorStop(0.65, PS.trunk); g.addColorStop(1, rgbS(mixC(PC.trunk, PC.rim, 0.25)));
    ctx.fillStyle = g; ctx.strokeStyle = rgbS(mixC(PC.trunkD, [0, 0, 0], 0.3)); ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 24, by + 3); ctx.quadraticCurveTo(bx - 10, by - 2, bx - 9, by - 28); ctx.quadraticCurveTo(bx - 9 + lean * 0.3, by - 64, bx - 5 + lean * 0.7, by - 96);
    ctx.lineTo(bx + 8 + lean * 0.7, by - 96); ctx.quadraticCurveTo(bx + 9 + lean * 0.3, by - 62, bx + 10, by - 28); ctx.quadraticCurveTo(bx + 11, by - 2, bx + 26, by + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PS.trunkD; ctx.lineCap = 'round';
    for (const [dx, ex, ey, w] of [[-1, -34, -122, 6], [1, 30, -126, 6], [0, 4, -140, 5]]) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(bx + 1 + lean * 0.5, by - 80); ctx.quadraticCurveTo(bx + dx * 10 + lean * 0.8, by - 104, bx + ex + lean, by + ey + 30); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 3, by - 10); ctx.quadraticCurveTo(bx - 4, by - 40, bx - 1, by - 70); ctx.moveTo(bx + 4, by - 20); ctx.quadraticCurveTo(bx + 4, by - 44, bx + 6, by - 60); ctx.stroke();
    /* canopy: dark rim, body, light side, blossoms, under-shadow */
    const pos = CLUMPS.map(([dx, dy, r], i) => [cx + dx + Math.sin(t * 2.1 + i * 1.7) * wind * 2.6 + lean * (0.3 - dy / 120), cy + dy + Math.cos(t * 1.7 + i) * wind * 1.5, r, dx, dy]);
    const clumps = grow => { ctx.beginPath(); for (const [x, y, r] of pos) { ctx.moveTo(x + r + grow, y); ctx.arc(x, y, r + grow, 0, TAU); } };
    clumps(2.4); ctx.fillStyle = PS.leafD; ctx.fill();
    clumps(0); ctx.fillStyle = PS.leaf; ctx.fill();
    ctx.save(); clumps(0); ctx.clip();
    /* volume: light from the upper right, shade toward the lower left and underneath */
    g = ctx.createLinearGradient(cx + 70, cy - 70, cx - 70, cy + 60); g.addColorStop(0, rgbaS(PC.leafH, 0.5)); g.addColorStop(0.45, rgbaS(PC.leaf, 0)); g.addColorStop(1, rgbaS(PC.leafD, 0.6));
    ctx.fillStyle = g; ctx.fillRect(cx - 110, cy - 90, 220, 180);
    g = ctx.createLinearGradient(0, cy + 6, 0, cy + 66); g.addColorStop(0, rgbaS(PC.leafD, 0)); g.addColorStop(1, rgbaS(PC.leafD, 0.85)); ctx.fillStyle = g; ctx.fillRect(cx - 100, cy + 6, 200, 64);
    /* each clump: a soft shade stroke at the bottom and a shine stroke on the lit side */
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgbaS(PC.leafD, 0.3); for (const [x, y, r] of pos) { ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(x, y, r * 0.88, 0.7, 2.3); ctx.stroke(); }
    ctx.strokeStyle = rgbaS(PC.leafH, 0.55); for (const [x, y, r, dx, dy] of pos) { if (dx < 0 && dy > -25) continue; ctx.lineWidth = r * 0.09; ctx.beginPath(); ctx.arc(x, y, r * 0.74, -1.85, -0.75); ctx.stroke(); }
    ctx.fillStyle = rgbS(mixC(PC.leafD, PC.bloss, 0.3 + 0.7 * PN.lum));
    ctx.beginPath(); for (let i = 0; i < 34; i++) { const an = i * 2.399, d = 18 + (i * 37 % 54), x = cx + Math.cos(an) * d * 1.1 + Math.sin(t * 2 + i) * wind, y = cy + Math.sin(an) * d * 0.85 - 8; if (y > cy + 32) continue; const r = 1.1 + (i % 3) * 0.35; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); } ctx.fill();
    ctx.restore();
  }

  /* ---------- the characters: G.draw.drawBearAt into an offscreen buffer, then lit to match the scene ---------- */
  const SIT = 3;
  const OFF = {c: null, g: null};
  function offCtx(w, h) {
    if (!OFF.c) { OFF.c = document.createElement('canvas'); OFF.c.width = 256; OFF.c.height = 256; OFF.g = OFF.c.getContext('2d'); }
    if (OFF.c.width < w || OFF.c.height < h) { OFF.c.width = Math.max(OFF.c.width, Math.ceil(w / 64) * 64); OFF.c.height = Math.max(OFF.c.height, Math.ceil(h / 64) * 64); OFF.g = OFF.c.getContext('2d'); }
    return OFF.g;
  }
  const isAdv = () => !!(G.S && G.S.bearStyle === 'abenteurer');
  function moodFor(m) { if (!m || !isAdv()) return m; return {wide: 'surprised', cool: 'normal', squint: 'determined', blink: 'normal'}[m] || m; }
  function leg(g, x, y, s, f, white, near) {
    /* sitting: the renderer has no sitting pose, so the bear is drawn lower with its legs clipped, and these legs point forward */
    const adv = isAdv(), fur = white ? '#fff8f0' : (adv ? '#b4824a' : '#b9834a'), pad = white ? (adv ? '#efe0d0' : '#efdcd0') : (adv ? '#7a4f28' : '#9a6838'), ol = white ? (adv ? '#b89a8a' : '#8a6a5a') : (adv ? '#4a2c14' : '#3a2414');
    g.save(); g.translate(x, y); g.scale(f * s, s); g.lineJoin = 'round'; g.lineWidth = 1.3 / Math.sqrt(s); g.strokeStyle = ol;
    const ox = near ? 0 : -1.8, oy = near ? 0 : -0.8;
    g.beginPath(); g.ellipse(4.0 + ox, -2.3 + oy, 3.9, 2.25, -0.05, 0, TAU); g.fillStyle = fur; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(7.7 + ox, -2.9 + oy, 1.55, 2.35, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = pad; g.beginPath(); g.ellipse(8.05 + ox, -2.35 + oy, 0.85, 1.15, 0, 0, TAU); g.fill();
    if (near) { g.beginPath(); for (const [tx, ty] of [[7.55, -4.05], [8.1, -4.3], [8.6, -3.95]]) { g.moveTo(tx + ox + 0.34, ty + oy); g.arc(tx + ox, ty + oy, 0.34, 0, TAU); } g.fill(); }
    else { g.fillStyle = 'rgba(40,20,30,0.16)'; g.beginPath(); g.ellipse(4.0 + ox, -2.3 + oy, 3.9, 2.25, -0.05, 0, TAU); g.ellipse(7.7 + ox, -2.9 + oy, 1.55, 2.35, 0, 0, TAU); g.fill(); }
    g.restore();
  }
  function bear(ctx, b, fl) {
    /* b: x, y = feet (world units of layer b.p, default 1) or screen units with b.scr; s scale, f facing, pose, mood, white, sit, rot, speed, frame, tt (anim time), tie */
    let x, y, s;
    if (b.scr) { x = b.x; y = b.y; s = b.s; } else { const P = proj(b.x, b.y, b.p || 1); x = P.x; y = P.y; s = b.s * P.z; }
    const m = ctx.getTransform(), cv = ctx.canvas, k = Math.hypot(m.a, m.b) || 1;
    const dx0 = Math.max(0, Math.floor(m.a * (x - 24 * s) + m.e)), dy0 = Math.max(0, Math.floor(m.d * (y - 34 * s) + m.f));
    const dx1 = Math.min(cv.width, Math.ceil(m.a * (x + 24 * s) + m.e)), dy1 = Math.min(cv.height, Math.ceil(m.d * (y + 4 * s) + m.f));
    const w = dx1 - dx0, h = dy1 - dy0; if (w <= 0 || h <= 0) return;
    const g = offCtx(w, h);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w, h);
    g.setTransform(m.a, m.b, m.c, m.d, m.e - dx0, m.f - dy0);
    if (b.rot) { g.translate(x, y); g.rotate(b.rot); g.translate(-x, -y); }
    const f = b.f || 1, o = {scale: s, facing: f, pose: b.pose || 'idle', mood: moodFor(b.mood), t: b.tt || 0, frame: b.frame || 0, speed: b.speed || 0, hero: 'wookie'};
    if (b.white) { o.white = true; o.bow = true; } else o.outfit = 'wiese';
    try {
      if (b.sit) {
        leg(g, x, y, s, f, b.white, false);
        g.save(); g.beginPath(); g.rect(x - 40 * s, y - 50 * s, 80 * s, 50 * s); g.clip(); G.draw.drawBearAt(g, x, y + SIT * s, o); g.restore();
        leg(g, x, y, s, f, b.white, true);
      } else G.draw.drawBearAt(g, x, y, o);
    } catch (e) {}
    if (b.tie) bowShape(g, x + 2.4 * s * f, y - 11.6 * s, s * 0.3, -0.25 * f, 0, 1);
    /* key light from the right (sun / moon), shade on the far side, a flash on top */
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    const bx = m.a * x + m.e - dx0, half = 10 * s * k, gr = g.createLinearGradient(bx - half, 0, bx + half, 0);
    gr.addColorStop(0, rgbaS(PC.tintA, PN.tA)); gr.addColorStop(0.55, rgbaS(PC.tintA, PN.tA * 0.55)); gr.addColorStop(1, rgbaS(PC.tintB, PN.tB));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (fl > 0.02) { g.fillStyle = 'rgba(214,224,255,' + (fl * 0.5).toFixed(3) + ')'; g.fillRect(0, 0, w, h); }
    g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(OFF.c, 0, 0, w, h, dx0, dy0, w, h); ctx.restore();
  }
  function shadowBlob(ctx, b) {
    if (b.scr) return; const P = proj(b.x, hillY(b.x), b.p || 1), s = b.s * P.z, lift = b.dy ? Math.max(0.3, 1 + b.dy / 14) : 1;
    ctx.fillStyle = 'rgba(10,6,20,' + (0.24 * lift).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(P.x + (b.sit ? 3 * s * (b.f || 1) : 0), P.y + 0.6 * s, (b.sit ? 11 : 8) * s * lift, 1.8 * s, 0, 0, TAU); ctx.fill();
  }
  function bowShape(g, x, y, s, rot, tails, flipX) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s * (flipX || 1), s); g.lineJoin = 'round'; g.lineCap = 'round';
    const ol = '#7a2a4c';
    if (tails !== null && tails !== undefined && tails !== 0) for (const d of [-1, 1]) { const sw = Math.sin(tails) * 0.7 * d; g.beginPath(); g.moveTo(d * 0.5, 0.6); g.quadraticCurveTo(d * 1.9 + sw, 3.4, d * 1.2 + sw, 6.8); g.lineTo(d * 2.4 + sw, 6.1); g.lineTo(d * 3.3 + sw, 7.0); g.quadraticCurveTo(d * 3.4 + sw, 3.2, d * 1.4, 0.2); g.closePath(); g.fillStyle = '#ff5c90'; g.fill(); g.strokeStyle = ol; g.lineWidth = 0.9; g.stroke(); }
    for (const d of [-1, 1]) {
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(d * 2.2, -4.8, d * 6.6, -4.6, d * 6.0, -0.6); g.bezierCurveTo(d * 5.6, 2.8, d * 2.2, 2.4, 0, 0); g.closePath();
      g.fillStyle = '#ff6f9c'; g.fill(); g.strokeStyle = ol; g.lineWidth = 0.9; g.stroke();
      g.beginPath(); g.moveTo(d * 1.3, -0.9); g.quadraticCurveTo(d * 3.3, -3.0, d * 4.8, -1.6); g.strokeStyle = 'rgba(255,226,236,0.9)'; g.lineWidth = 0.75; g.stroke();
      g.beginPath(); g.moveTo(d * 1.2, 0.6); g.quadraticCurveTo(d * 2.9, 1.3, d * 4.4, 0.7); g.strokeStyle = 'rgba(150,20,70,0.45)'; g.lineWidth = 0.6; g.stroke();
    }
    g.beginPath(); g.ellipse(0, 0, 1.6, 1.9, 0, 0, TAU); g.fillStyle = '#ffb3c6'; g.fill(); g.strokeStyle = ol; g.lineWidth = 0.9; g.stroke();
    g.restore();
  }
  function envelope(g, x, y, s, rot, fx, a) {
    g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(s * fx, s); g.lineJoin = 'round';
    rr(g, -6, -4, 12, 8, 1.3); g.fillStyle = fx < 0 ? '#ffe3ea' : '#fff3f6'; g.fill(); g.strokeStyle = '#7a3b57'; g.lineWidth = 0.9; g.stroke();
    g.beginPath(); g.moveTo(-5.6, -3.5); g.lineTo(0, 0.9); g.lineTo(5.6, -3.5); g.strokeStyle = '#d58aa4'; g.lineWidth = 0.8; g.stroke();
    heartPath(g, 0, 0.7, 1.55); g.fillStyle = '#ff4f7f'; g.fill();
    g.restore();
  }
  const hop = (t, t0, d, h) => -Math.sin(clamp01((t - t0) / d) * Math.PI) * h;
  /* who is where, doing what */
  function cast(t) {
    const L = [];
    if (t < 14.56) {
      const b = {x: PX, s: 3, f: 1, white: true, pose: 'idle', mood: 'cool', sit: true, rot: 0, tt: t + 1.3};
      if (t < 3.75) b.rot = -0.06;
      else if (t < 5.75) { b.f = -1; b.mood = 'happy'; b.rot = -0.09; }
      else if (t < 10.85) { b.rot = -0.04; b.mood = (t > 6.95 && t < 7.75) ? 'wide' : 'happy'; if (t > 8.78 && t < 9.95) b.pose = 'victory'; }
      else if (t < 11.62) { b.mood = 'wide'; }
      else { b.sit = false; b.mood = 'wide'; if (t < 11.95) { b.pose = 'jump'; b.dy = hop(t, 11.62, 0.33, 9); } else { b.pose = t > 13.45 ? 'fall' : 'sad'; b.x += Math.sin(t * 47) * 0.45 - ss(t, 14.05, 14.5) * 5; } }
      b.y = hillY(b.x) + (b.dy || 0); L.push(b);
    }
    const w = {x: WX, s: 3, f: 1, pose: 'idle', mood: 'cool', sit: true, tt: t};
    if (t < 10.85) {
      w.mood = t < 3.9 ? 'cool' : (t < 5.75 ? 'happy' : (t < 6.95 ? 'cool' : (t < 7.75 ? 'wide' : 'happy')));
      if (t > 5.75) w.rot = -0.05;
      if (t > 8.75 && t < 9.95) w.pose = 'victory';
    } else if (t < 11.62) { w.mood = 'wide'; }
    else if (t < 11.95) { w.sit = false; w.pose = 'jump'; w.mood = 'wide'; w.dy = hop(t, 11.62, 0.33, 10); }
    else if (t < 12.6) { w.sit = false; w.x = lerp(WX, WG, eio(clamp01((t - 11.95) / 0.65))); w.pose = 'run'; w.speed = 0.85; w.frame = t * 16; }
    else if (t < 14.56) { w.sit = false; w.x = WG; w.speed = 0.7; w.mood = 'wide'; if (t >= 13.45) { w.pose = 'fall'; w.x += Math.sin(t * 40) * 0.4; } }
    else if (t < 17.6) {
      w.sit = false; w.x = WG; w.speed = 0.3;
      if (t < 15.35) { w.pose = 'fall'; w.mood = 'wide'; } else if (t < 15.85) { w.f = -1; w.mood = 'wide'; } else if (t < 16.3) { w.mood = 'wide'; } else { w.f = -1; w.mood = t < 17.2 ? 'wide' : 'sad'; if (t > 17.2) w.pose = 'sad'; }
    } else if (t < 24.25) {
      w.x = EX; w.pose = 'sad'; w.mood = 'sad'; w.hold = true;
      if (t > 18.45 && t < 19.95) w.tear = (t - 18.45) / 1.5;
      if (t > 20.95 && t < 22.6) { w.pose = 'idle'; w.mood = 'wide'; } else if (t >= 22.6) { w.pose = 'idle'; w.mood = 'cool'; }
    } else {
      w.x = EX; w.sit = false; w.tie = true; w.mood = 'cool'; w.speed = 0.75;
      if (t < 24.6) { w.pose = 'jump'; w.dy = hop(t, 24.25, 0.35, 10); }
      else if (t >= 26.45) {
        w.pose = 'run'; w.speed = 1; w.frame = t * 17;
        if (t < 27.1) { const k = clamp01((t - 26.45) / 0.65); w.x = EX + 104 * k * k * 0.6 + 104 * k * 0.4; }
        else { /* the leap into the valley, then tiny on the path toward the coast */
          const a = proj(EX + 104, hillY(EX + 104), 1), land = 27.75;
          if (t < land) { const k = clamp01((t - 27.1) / (land - 27.1)), e = pathAt(0.06), bp = proj(e.x, e.y, PMID); w.scr = true; w.pose = 'jump'; w.x = lerp(a.x, bp.x, k); w.y = lerp(a.y, bp.y, k) - Math.sin(k * Math.PI) * 46 * cam.z; w.s = lerp(3 * a.z, 3 * bp.z * 0.55, k); }
          else { const k = clamp01((t - land) / 2.4), e = pathAt(lerp(0.06, 0.66, k)), bp = proj(e.x, e.y, PMID); w.scr = true; w.x = bp.x; w.y = bp.y; w.s = 3 * bp.z * 0.55 * (e.w / pathAt(0.06).w * 0.6 + 0.4); w.mid = true; w.speed = 0.9; }
        }
      }
    }
    if (!w.scr) w.y = hillY(w.x) + (w.dy || 0);
    L.push(w);
    return L;
  }

  /* ---------- near-layer extras: fireflies, petals, the heart, the falling bow, drips ---------- */
  function drawNearFx(ctx, t, wind) {
    const S = sprites();
    /* blossom petals drifting on the evening breeze */
    const pa = 1 - ss(t, 12.3, 13.2);
    if (pa > 0.01 && t < 14.56) {
      for (const p of D.petals) {
        const sp = 1 + wind * 5, u = (p.o + t * 0.035 * p.s * sp) % 1, x = TREE_X - 40 + u * 360, y = p.y + u * 40 + Math.sin(t * 1.5 + p.p) * 7, a = pa * Math.min(1, u * 6) * Math.min(1, (1 - u) * 5);
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 * p.s + p.p); ctx.scale(1, Math.abs(Math.cos(t * 2.4 + p.p)) * 0.8 + 0.2); ctx.globalAlpha = a; ctx.fillStyle = rgbS(mixC(PC.leafD, hx(p.c), 0.35 + 0.65 * PN.lum)); ctx.beginPath(); ctx.ellipse(0, 0, 2.1 * p.s, 1.3 * p.s, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    /* the heart: "Zwei Bären, ein Herz." */
    if (t > 4.12 && t < 6.0) {
      const k = t - 4.12, pop = backOut(clamp01(k / 0.45)), a = 1 - ss(t, 5.3, 6.0), x = (WX + PX) / 2 + 3 + Math.sin(k * 3) * 3, y = 140 - k * 28, s = 6.8 * pop;
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, S.pink, x, y, 30 * pop, a * 0.7); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a; heartPath(ctx, x, y, s); const g = ctx.createLinearGradient(0, y - s, 0, y + s); g.addColorStop(0, '#ffc2d2'); g.addColorStop(1, '#ff5d92'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(x - s * 0.5, y - s * 0.45, s * 0.28, s * 0.16, -0.6, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { const an = i * TAU / 6 + 0.3, d = 6 + k * 26, sa = Math.max(0, 1 - k / 0.9); if (sa <= 0) break; ctx.globalAlpha = sa * a; star4(ctx, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.8, 2.2); ctx.fillStyle = i % 2 ? '#ffd84a' : '#fff'; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    /* pink motes where Mallo was, right after the flash */
    if (t > 14.56 && t < 16.2) {
      const k = t - 14.56;
      for (const m of D.motes) { const kk = k - m.d; if (kk < 0) continue; const a = Math.max(0, 1 - kk / 1.2); const x = PX + Math.cos(m.a) * 6 + Math.sin(kk * 3 + m.a) * 4, y = hillY(PX) - 30 - kk * m.v; ctx.globalAlpha = a; star4(ctx, x, y, 2.2 * m.s); ctx.fillStyle = '#ffb8d0'; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    /* drips from the leaves at dawn */
    if (t > 17.6 && t < 24) {
      ctx.fillStyle = 'rgba(214,226,255,0.8)';
      for (const d of D.drips) { const u = ((t * 0.7 + d.o) % d.v) / d.v; const y = d.y + u * u * 90; if (y > hillY(d.x) - 2) continue; ctx.beginPath(); ctx.ellipse(d.x, y, 0.9, 1.6, 0, 0, TAU); ctx.fill(); }
    }
  }
  function bowFalling(ctx, t) {
    /* D: the bow flutters down from where the shadow was and lands at Mallo's seat; E: it is in Toffo's paws */
    if (t < 15.85 || t >= 17.6) return null;
    const land = 17.25, gx = PX - 4, gy = hillY(gx) - 2.2;
    if (t >= land) return {x: gx, y: gy, rot: 0.12, tails: 0.4};
    const k = (t - 15.85) / (land - 15.85), e = 1 - Math.pow(1 - k, 1.4);
    return {x: lerp(-34, gx, e) + Math.sin(k * TAU * 1.6) * 13 * (1 - k), y: lerp(44, gy, e), rot: Math.sin(k * TAU * 1.6 + 0.6) * 0.6 * (1 - k * 0.7), tails: t * 6};
  }
  function drawLights(ctx, t, fl) {
    /* additive light: sun bloom and rays, fireflies, crater and lamp glows are drawn where they belong */
    const S = sprites(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (PN.sunA > 0.02) {
      const sp = sunPos(t), P = proj(sp.x, sp.y, PFAR), ra = PN.rays * PN.sunA;
      glow(ctx, S.sun, P.x, P.y, 230 * P.z, 0.28 * PN.sunA);
      if (ra > 0.02) for (let i = 0; i < 7; i++) {
        const an = Math.PI * 0.62 + i * 0.27 + Math.sin(t * 0.25 + i) * 0.05, len = 320, wd = 0.045 + (i % 3) * 0.02;
        const g = ctx.createLinearGradient(P.x, P.y, P.x + Math.cos(an) * len, P.y + Math.sin(an) * len); g.addColorStop(0, 'rgba(255,226,160,' + (0.16 * ra).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,226,160,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + Math.cos(an - wd) * len, P.y + Math.sin(an - wd) * len); ctx.lineTo(P.x + Math.cos(an + wd) * len, P.y + Math.sin(an + wd) * len); ctx.closePath(); ctx.fill();
      }
    }
    const fa = PN.fire * (1 - stormK(t));
    if (fa > 0.02) for (const f of D.flies) {
      const x = f.x + Math.sin(t * 0.45 * f.s + f.p) * 16, y = f.y + Math.sin(t * 0.8 * f.s + f.p * 1.3) * 9, a = fa * (0.35 + 0.65 * Math.max(0, Math.sin(t * 2.6 * f.s + f.p)));
      const P = proj(x, y, 1); glow(ctx, PN.stars > 0.5 ? S.fly : S.gold, P.x, P.y, f.r * P.z, a); glow(ctx, S.white, P.x, P.y, 1.6 * P.z, a);
    }
    ctx.restore();
  }

  /* ---------- the letters: they blow past Toffo and settle along the path as a trail ---------- */
  function drawLetters(ctx, t) {
    if (t < 20.8) return;
    const S = sprites();
    for (const L of D.letters) {
      const k = (t - L.t0) / L.d; if (k < 0) continue;
      const end = pathAt(L.f), E = proj(end.x, end.y - 2.5, PMID);
      if (k >= 1) {
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + L.ph), s = 0.55 * E.z * (end.w / 9 + 0.35);
        ctx.globalCompositeOperation = 'lighter'; glow(ctx, S.pink, E.x, E.y, 7 * E.z + 3, 0.35 + 0.35 * tw); ctx.globalCompositeOperation = 'source-over';
        envelope(ctx, E.x, E.y, s, Math.sin(L.ph) * 0.2, 1, 1); if (tw > 0.85) { ctx.globalAlpha = (tw - 0.85) * 6; star4(ctx, E.x + 6 * s, E.y - 4 * s, 2.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
        continue;
      }
      const S0 = proj(L.x0 - 120, L.y0, 1.25), C = proj(L.cx, L.cy, 1), e = 1 - Math.pow(1 - k, 1.6);
      const x = (1 - e) * (1 - e) * S0.x + 2 * (1 - e) * e * C.x + e * e * E.x, y = (1 - e) * (1 - e) * S0.y + 2 * (1 - e) * e * C.y + e * e * E.y + Math.sin(k * 9 + L.ph) * 9 * (1 - k);
      const s = lerp(1.25 * S0.z, 0.55 * E.z * (end.w / 9 + 0.35), e), rot = Math.sin(t * 4 + L.ph) * 0.7 * (1 - k), fx = Math.cos(t * L.sp + L.ph);
      envelope(ctx, x, y, s, rot, Math.abs(fx) < 0.15 ? (fx < 0 ? -0.15 : 0.15) : fx, Math.min(1, k * 8));
    }
  }

  /* ---------- weather in screen space: rain, flying leaves ---------- */
  function drawWeather(ctx, t, wind) {
    const rain = ss(t, 11.0, 11.9) * (t < 14.56 ? 1 : 0.55) * (t < 17.6 ? 1 : 0);
    if (rain > 0.01) {
      const n = Math.floor(D.rain.length * rain), slant = 0.32 + wind * 0.12;
      for (const near of [false, true]) {
        ctx.strokeStyle = near ? 'rgba(206,214,255,0.42)' : 'rgba(170,180,230,0.26)'; ctx.lineWidth = near ? 1.1 : 0.7; ctx.beginPath();
        for (let i = 0; i < n; i++) { const d = D.rain[i]; if (d.near !== near) continue; const sp = (near ? 520 : 380) * d.v, len = (near ? 16 : 9) * d.l; const y = ((d.y * (VH + 60) + t * sp) % (VH + 60)) - 30, x = ((d.x * (SW + 120) - y * slant + t * 20) % (SW + 120) + SW + 120) % (SW + 120) - 60; ctx.moveTo(x, y); ctx.lineTo(x + len * slant, y - len); }
        ctx.stroke();
      }
    }
    const lv = ss(t, 11.0, 11.6) * (t < 14.56 ? 1 : 0);
    if (lv > 0.01) {
      for (const l of D.leaves) {
        const u = (l.o + t * 0.55 * l.v) % 1, x = SW + 40 - u * (SW + 80), y = l.y * 200 + Math.sin(t * 3 + l.p) * 18 + u * 30;
        ctx.save(); ctx.globalAlpha = lv; ctx.translate(x, y); ctx.rotate(t * 7 * l.v + l.p); ctx.scale(l.s, Math.abs(Math.sin(t * 5 + l.p)) * 0.8 + 0.2); ctx.fillStyle = l.c ? rgbS(mixC(PC.leafD, [255, 184, 204], 0.4)) : PS.leaf; ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 1.6, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
  }

  /* ---------- text: subtitles, the speech bubble, the title ---------- */
  const EN = G.lang === 'en', tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const SUBS = EN ? [
    [0.95, 5.6, 'Toffo and Mallo. Two bears, one heart.'],
    [6.05, 10.35, 'Every evening they sat on their hill and counted shooting stars.'],
    [11.05, 14.5, 'But one stormy night, a shadow came …'],
    [15.0, 17.35, '… and Mallo was gone.'],
    [18.05, 20.75, 'All that was left was her pink bow.'],
    [21.1, 23.6, 'And a trail of letters.'],
    [24.0, 26.4, "Toffo didn't hesitate for a second."],
  ] : [
    [0.95, 5.35, 'Toffo und Mallo. Zwei Bären, ein Herz.'],
    [6.05, 10.35, 'Jeden Abend saßen sie auf ihrem Hügel und zählten Sternschnuppen.'],
    [11.05, 14.35, 'Doch in einer stürmischen Nacht kam ein Schatten …'],
    [15.0, 17.35, '… und Mallo war verschwunden.'],
    [18.05, 20.75, 'Zurück blieb nur ihre rosa Schleife.'],
    [21.1, 23.6, 'Und eine Spur aus Briefen.'],
    [24.0, 26.2, 'Toffo zögerte keine Sekunde.'],
  ];
  const NARR = n => 'p/voice/' + (EN ? 'story_en' : 'story') + n + '.mp3', RESCUE = tr('Rette Mallo!', 'Rescue Mallo!');
  const wrapCache = {};
  function wrapLines(ctx, txt, max) {
    const key = txt + '|' + Math.round(max); if (wrapCache[key]) return wrapCache[key];
    let lines = [txt];
    if (ctx.measureText(txt).width > max) {
      const words = txt.split(' '); let best = null;
      for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), wmax = Math.max(ctx.measureText(a).width, ctx.measureText(b).width); if (!best || wmax < best.w) best = {w: wmax, l: [a, b]}; }
      lines = best ? best.l : lines;
    }
    return (wrapCache[key] = lines);
  }
  const BAR = 23;
  function drawSubs(ctx, t) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    const fs = SW >= 560 ? 14.5 : 13.5;
    ctx.font = '600 ' + fs + 'px "Fredoka", sans-serif';
    for (const [a, b, txt] of SUBS) {
      if (t < a || t > b) continue;
      const al = win(t, a, b, 0.3, 0.45), lines = wrapLines(ctx, txt, SW - 70), rise = (1 - ss(t, a, a + 0.4)) * 3;
      for (let i = 0; i < lines.length; i++) {
        const y = VH - 8 - (lines.length - 1 - i) * (fs + 3) + rise;
        ctx.globalAlpha = al * 0.6; ctx.strokeStyle = 'rgba(12,6,20,0.9)'; ctx.lineWidth = 3.6; ctx.strokeText(lines[i], SW / 2, y);
        ctx.globalAlpha = al; ctx.fillStyle = '#fff8f0'; ctx.fillText(lines[i], SW / 2, y);
      }
    }
    ctx.restore();
  }
  function drawBubble(ctx, t, w) {
    if (t < 26.2 || t > 27.25 || !w) return;
    const a = win(t, 26.2, 27.25, 0.12, 0.2), pop = backOut(clamp01((t - 26.2) / 0.3));
    let hx2, hy; if (w.scr) { hx2 = w.x; hy = w.y - 26 * w.s; } else { const P = proj(w.x, w.y, 1); hx2 = P.x; hy = P.y - 26 * w.s * P.z; }
    const txt = 'Here I come, Mallo!';
    ctx.save(); ctx.font = '700 11px "Fredoka", sans-serif'; const tw = ctx.measureText(txt).width + 18, th = 21;
    const bx = Math.min(SW - tw - 8, Math.max(8, hx2 - 8)), by = Math.max(BAR + 4, hy - th - 12);
    ctx.globalAlpha = a; ctx.translate(hx2, by + th); ctx.scale(pop, pop); ctx.translate(-hx2, -(by + th));
    rr(ctx, bx, by, tw, th, 10); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx2 + 2, by + th - 1); ctx.lineTo(hx2 + 4, by + th + 8); ctx.lineTo(hx2 + 12, by + th - 1); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#ff9eb0'; ctx.stroke(); ctx.fillRect(hx2 + 2.5, by + th - 3, 9, 3);
    ctx.fillStyle = '#7a3b57'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 9, by + th / 2 + 0.5);
    ctx.restore();
  }
  const TITLE = 'The Starway Home', T0 = 27.5;
  let titleCache = null;
  function titleGlyphs(ctx, k) {
    /* each letter pre-rendered once (fonts must be ready): cream rim, plum extrusion and outline, pink gradient, gloss */
    if (titleCache && titleCache.k === k) return titleCache;
    if (document.fonts && document.fonts.check && !document.fonts.check('700 48px "Fredoka"')) return null;
    const fs = 48, pad = 12, out = {k, g: [], w: 0};
    ctx.save(); ctx.font = '700 ' + fs + 'px "Fredoka", sans-serif';
    const ws = [...TITLE].map(ch => ctx.measureText(ch).width); ctx.restore();
    let x = 0;
    [...TITLE].forEach((ch, i) => {
      const w = ws[i], c = document.createElement('canvas'); c.width = Math.ceil((w + pad * 2) * k); c.height = Math.ceil((fs + pad * 2 + 6) * k);
      const g = c.getContext('2d'); g.scale(k, k); g.font = '700 ' + fs + 'px "Fredoka", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
      const cx = w / 2 + pad, by = fs + pad - 6;
      g.strokeStyle = '#fff4e0'; g.lineWidth = 12; g.strokeText(ch, cx, by + 3);
      for (let d = 6; d >= 1; d--) { g.fillStyle = d > 3 ? '#141838' : '#232a5e'; g.fillText(ch, cx, by + d); g.strokeStyle = g.fillStyle; g.lineWidth = 7; g.strokeText(ch, cx, by + d); }
      g.strokeStyle = '#2a2f6a'; g.lineWidth = 7; g.strokeText(ch, cx, by);
      /* the logo of the app icon: THE STARWAY in gold, HOME in sky blue */
      const home = i >= TITLE.lastIndexOf(' ') + 1, gr = g.createLinearGradient(0, by - fs * 0.72, 0, by);
      if (home) { gr.addColorStop(0, '#f2fbff'); gr.addColorStop(0.45, '#8fd3ff'); gr.addColorStop(1, '#3a7cff'); } else { gr.addColorStop(0, '#fff7c2'); gr.addColorStop(0.45, '#ffd84a'); gr.addColorStop(1, '#ff8a2a'); }
      g.fillStyle = gr; g.fillText(ch, cx, by);
      g.save(); g.beginPath(); g.rect(0, 0, c.width, by - fs * 0.48); g.clip(); g.fillStyle = 'rgba(255,255,255,0.42)'; g.fillText(ch, cx, by); g.restore();
      out.g.push({c, x: x + w / 2, w: w + pad * 2, h: fs + pad * 2 + 6, ax: cx, ay: by}); x += w - 1.5;
    });
    out.w = x; return (titleCache = out);
  }
  function drawTitle(ctx, t) {
    if (t < T0 - 0.05) return;
    const m = ctx.getTransform(), k = Math.max(1, Math.round(m.d * 2) / 2), TG = titleGlyphs(ctx, k), cx = SW / 2, base = 96;
    const sc = Math.min(1, (SW - 60) / ((TG && TG.w) || 330));
    ctx.save(); ctx.translate(cx, base); ctx.scale(sc, sc);
    /* soft warm halo behind the title so it reads on the bright sky */
    const ha = ss(t, T0, T0 + 0.6) * 0.5;
    if (ha > 0) { const hg = ctx.createRadialGradient(0, -6, 10, 0, -6, 190); hg.addColorStop(0, 'rgba(255,240,220,' + (0.5 * ha).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(255,240,220,0)'); ctx.fillStyle = hg; ctx.save(); ctx.scale(1, 0.42); ctx.beginPath(); ctx.arc(0, -14, 190, 0, TAU); ctx.fill(); ctx.restore(); }
    if (TG) {
      TG.g.forEach((L, i) => {
        const ti = T0 + i * 0.055, kk = clamp01((t - ti) / 0.42); if (kk <= 0) return;
        const y = -(1 - backOut(kk)) * 70 - (1 - kk) * 20, land = t - ti - 0.42, sq = land > 0 && land < 0.22 ? Math.sin(land / 0.22 * Math.PI) * 0.16 : 0;
        const bob = t > T0 + 1.4 ? Math.sin((t - T0) * 2.4 + i * 0.6) * 1.4 : 0;
        ctx.save(); ctx.globalAlpha = Math.min(1, kk * 4); ctx.translate(L.x - TG.w / 2, y + bob); ctx.scale(1 + sq, 1 - sq);
        ctx.drawImage(L.c, -L.ax, -L.ay, L.w, L.h); ctx.restore();
      });
    } else {
      ctx.font = '700 48px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.globalAlpha = ss(t, T0, T0 + 0.3); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 7; ctx.strokeText(TITLE, 0, 0); ctx.fillStyle = '#ff9eb0'; ctx.fillText(TITLE, 0, 0);
    }
    /* "Rette Mallo!" in gold */
    const sa = ss(t, T0 + 0.75, T0 + 1.05);
    if (sa > 0) {
      const pop = backOut(clamp01((t - T0 - 0.75) / 0.4)); ctx.save(); ctx.globalAlpha = sa; ctx.translate(0, 30); ctx.scale(pop, pop);
      ctx.font = '700 20px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 7; ctx.strokeText(RESCUE, 0, 2);
      ctx.fillStyle = '#5a2445'; ctx.fillText(RESCUE, 0, 2.5); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 4.5; ctx.strokeText(RESCUE, 0, 0);
      const g = ctx.createLinearGradient(0, -16, 0, 0); g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ffd84a'); g.addColorStop(1, '#f2a81e'); ctx.fillStyle = g; ctx.fillText(RESCUE, 0, 0);
      ctx.restore();
    }
    /* sparkles */
    for (let i = 0; i < 12; i++) {
      const st = T0 + 0.45 + i * 0.13, k2 = t - st; if (k2 < 0) continue;
      const ph = (k2 % 1.3) / 1.3, a = Math.sin(ph * Math.PI), an = i * 2.4, x = Math.cos(an) * (120 + (i % 3) * 24), y = -18 + Math.sin(an) * 30 + (i % 2) * 8;
      ctx.globalAlpha = a; star4(ctx, x, y, 2.5 + 3 * a * (i % 2 ? 0.6 : 1)); ctx.fillStyle = i % 3 ? '#fff' : '#ffd84a'; ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- the frame ---------- */
  function render(ctx, t, skipK) {
    SW = G.VW || 480; if (!D) build();
    palAt(t); camAt(t);
    const fl = flashAt(t), storm = stormK(t), wind = windAt(t);
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    drawSky(ctx, t, fl);
    drawSkyStuff(ctx, t, fl, storm);
    drawFar(ctx, t);
    drawMid(ctx, t);
    const L = cast(t), W = L[L.length - 1];
    if (W.mid) { bear(ctx, W, fl); }
    drawShadow(ctx, t, fl);
    ctx.save(); layer(ctx, 1);
    drawHill(ctx, t, wind); drawTree(ctx, t, wind);
    ctx.restore();
    for (const b of L) if (!b.mid && !b.scr) shadowBlob(ctx, b);
    for (const b of L) {
      if (b.mid) continue;
      bear(ctx, b, fl);
      if (b.hold) {
        const P = proj(b.x, b.y, 1), s = b.s * P.z, wob = Math.sin(t * 1.3) * 0.05;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sprites().pink, P.x + 6.5 * s, P.y - 4.4 * s, 9 * s, 0.25); ctx.restore();
        bowShape(ctx, P.x + 6.4 * s, P.y - 4.6 * s, s * 0.6, -0.3 + wob, 0.5 + Math.sin(t * 2) * 0.3, 1);
      }
      if (b.tear !== undefined) {
        /* one tear rolls down the cheek and drops */
        const P = proj(b.x, b.y, 1), s = b.s * P.z, k = b.tear, ex = P.x + 3.5 * s;
        const y = k < 0.55 ? P.y - (13.3 - 2.6 * ss(k, 0, 0.55)) * s : P.y - 10.7 * s + Math.pow((k - 0.55) / 0.45, 2) * 6.5 * s, r = 0.75 * s * Math.min(1, k * 5);
        ctx.save(); ctx.globalAlpha = 1 - ss(k, 0.85, 1); ctx.beginPath(); ctx.moveTo(ex, y - r * 1.9); ctx.quadraticCurveTo(ex + r * 1.15, y - r * 0.15, ex, y + r); ctx.quadraticCurveTo(ex - r * 1.15, y - r * 0.15, ex, y - r * 1.9); ctx.closePath();
        ctx.fillStyle = '#b4e2ff'; ctx.fill(); ctx.strokeStyle = '#4a78a8'; ctx.lineWidth = Math.max(0.6, r * 0.3); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - r * 0.3, y - r * 0.15, r * 0.3, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    ctx.save(); layer(ctx, 1);
    drawNearFx(ctx, t, wind);
    const bw = bowFalling(ctx, t);
    if (bw) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sprites().pink, bw.x, bw.y, 18, 0.5); ctx.restore(); bowShape(ctx, bw.x, bw.y, 1.25, bw.rot, bw.tails, Math.cos(t * 3) > -0.6 ? 1 : -1); }
    ctx.restore();
    drawLights(ctx, t, fl);
    drawLetters(ctx, t);
    drawWeather(ctx, t, wind);
    /* storm darkness swallowing the frame, the white flash, the dip into dawn */
    if (t > 13.9 && t < 14.56) { ctx.fillStyle = 'rgba(4,2,10,' + (0.82 * ss(t, 14.0, 14.48)).toFixed(3) + ')'; ctx.fillRect(0, 0, SW, VH); }
    if (fl > 0.02 && t < 14.4) { ctx.fillStyle = 'rgba(230,226,255,' + (fl * 0.22).toFixed(3) + ')'; ctx.fillRect(0, 0, SW, VH); }
    const wf = t >= 14.46 && t < 15.7 ? (t < 14.56 ? ss(t, 14.46, 14.56) : 1 - ss(t, 14.6, 15.7)) : 0;
    if (wf > 0) { ctx.fillStyle = 'rgba(255,252,255,' + wf.toFixed(3) + ')'; ctx.fillRect(0, 0, SW, VH); }
    ctx.globalAlpha = 1; ctx.drawImage(sprites().vig, 0, 0, SW, VH);
    drawBubble(ctx, t, W);
    drawTitle(ctx, t);
    const dip = t > 17.3 && t < 18.2 ? (t < 17.6 ? ss(t, 17.3, 17.6) : 1 - ss(t, 17.6, 18.2)) : 0;
    if (dip > 0) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,' + dip.toFixed(3) + ')'; ctx.fillRect(0, 0, SW, VH); }
    /* letterbox bars, subtitles, skip hint */
    const bar = BAR * ss(t, 0, 1.2); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(-2, -2, SW + 4, bar + 2); ctx.fillRect(-2, VH - bar, SW + 4, bar + 2);
    drawSubs(ctx, t);
    const ha = 0.5 * win(t, 1.2, 26.5, 0.8, 0.8);
    if (ha > 0.01) { ctx.globalAlpha = ha; ctx.font = '600 8.5px "Fredoka", sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff4e0'; ctx.fillText(tr('Tippen zum Überspringen  »', 'Tap to skip  »'), SW - 34, bar / 2 + 0.5); }
    /* fade in from black, fade out at the end and after skip() */
    const fade = Math.max(1 - ss(t, 0, 1.0), ss(t, DUR - 0.8, DUR), skipK);
    if (fade > 0.001) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade).toFixed(3) + ')'; ctx.fillRect(-2, -2, SW + 4, VH + 4); }
    ctx.restore();
  }

  /* ---------- sound: own bus on the shared AudioContext (so skip() can fade everything), narration, score, sfx ---------- */
  let bus = null, musBus = null, srcs = [], RUN = 0;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function au() { const a = A(); return a && a.ctx && !a.muted ? a : null; }
  function makeBus() {
    const a = au(); bus = null; musBus = null; srcs = []; if (!a) return;
    try { bus = a.ctx.createGain(); bus.gain.value = 1; bus.connect(a.master || a.ctx.destination); musBus = a.ctx.createGain(); musBus.gain.value = 1; musBus.connect(bus); } catch (e) { bus = null; musBus = null; }
  }
  function fadeBus(sec) {
    const b = bus, list = srcs, a = A(); if (!b || !a || !a.ctx) return;
    try { b.gain.cancelScheduledValues(a.ctx.currentTime); b.gain.setTargetAtTime(0.0001, a.ctx.currentTime, sec / 3); } catch (e) {}
    setTimeout(() => { for (const s of list) { try { s.stop(); } catch (e) {} } try { b.disconnect(); } catch (e) {} }, sec * 1000 + 600);
  }
  function narrate(n) {
    const a = au(); if (!a || !bus) return;
    const file = NARR(n), run = RUN, t0 = performance.now(), b = bus;
    try {
      if (!a.loadVoice) { a.playFile(file, 1); return; }
      a.loadVoice(file).then(buf => {
        if (!buf || run !== RUN || G.story.skipping || performance.now() - t0 > 900) return;   /* never start a line late over the next one */
        const s = a.ctx.createBufferSource(); s.buffer = buf; s.connect(b); s.start(); srcs.push(s);
      }).catch(() => {});
    } catch (e) {}
  }
  function bed(o) {
    /* a looping filtered noise bed (rain, wind, rumble) with its own envelope */
    const a = au(); if (!a || !bus || !a.noiseBuf) return;
    try {
      const c = a.ctx, t = c.currentTime + (o.delay || 0), s = c.createBufferSource(); s.buffer = a.noiseBuf; s.loop = true; s.playbackRate.value = o.rate || 1;
      const f = c.createBiquadFilter(); f.type = o.type; f.frequency.setValueAtTime(o.freq, t); f.Q.value = o.q || 0.7;
      if (o.sweep) for (const [dt, fr] of o.sweep) f.frequency.linearRampToValueAtTime(fr, t + dt);
      const g = c.createGain(), end = t + o.att + o.hold + o.rel; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + o.att); g.gain.setValueAtTime(o.gain, t + o.att + o.hold); g.gain.linearRampToValueAtTime(0.0001, end);
      s.connect(f).connect(g).connect(bus); s.start(t, Math.random() * 0.8); s.stop(end + 0.05); srcs.push(s);
    } catch (e) {}
  }
  const tone = (f, d, o, dest) => { const a = au(); if (a && bus) a.tone(f, d, o, dest || bus); };
  const bell = (f, d, g, dl, dest) => { const a = au(); if (a && bus) a.bell(f, d, g, dl, dest || musBus); };
  const noise = (d, o) => { const a = au(); if (a && bus) a.noise(d, o, bus); };
  function thunder(p, near) {
    bed({type: 'lowpass', freq: 700 * p + 200, sweep: [[0.25, 260], [1.8, 70]], gain: 0.42 * p, att: 0.03, hold: 0.15, rel: 2.2 * p + 0.6, rate: 0.7});
    tone(46, 1.6, {type: 'sine', slide: 30, gain: 0.32 * p, attack: 0.02});
    if (near) noise(0.35, {type: 'highpass', freq: 1800, gain: 0.22 * p});
  }
  function melody(notes, beat, gain, delay, bassNotes, barBeats) {
    let at = delay || 0; for (const [n, b] of notes) { if (n) bell(midi(n), Math.min(1.6, b * beat * 1.6), gain, at); at += b * beat; }
    if (bassNotes) bassNotes.forEach((n, i) => tone(midi(n), barBeats * beat * 1.05, {type: 'sine', gain: gain * 0.9, attack: 0.04, delay: (delay || 0) + i * barBeats * beat}, musBus));
  }
  function pad(notes, d, g, dl) { for (const n of notes) { tone(midi(n), d, {type: 'sine', gain: g, attack: d * 0.4, delay: dl || 0}, musBus); tone(midi(n) * 2.003, d, {type: 'triangle', gain: g * 0.18, attack: d * 0.45, delay: dl || 0}, musBus); } }
  const CUES = [
    [0.2, () => { pad([48, 55, 64], 3.2, 0.03); melody([[84, 2], [79, 1], [81, 2], [76, 1], [77, 2], [76, 1], [74, 3], [76, 2], [79, 1], [84, 2], [83, 1], [81, 2], [79, 1], [79, 3]], 0.3, 0.042, 0.25, [48, 45, 41, 43, 48, 52, 41, 43], 3); }],
    [0.8, () => narrate(1)],
    [4.1, () => { bell(1760, 0.5, 0.05, 0); bell(2349, 0.7, 0.045, 0.09); bell(2637, 0.9, 0.035, 0.18); }],
    [7.65, () => { pad([45, 52, 60, 64], 3.4, 0.022); melody([[76, 2], [79, 1], [84, 2], [86, 1], [88, 2], [86, 1], [84, 3]], 0.3, 0.036, 0, [45, 41, 48, 43], 3); }],
    [5.9, () => narrate(2)],
    [6.95, () => [1568, 1976, 2349, 2637].forEach((f, i) => bell(f, 0.6, 0.026, i * 0.07))],
    [8.7, () => { [1319, 1568, 1976, 2349, 2637, 3136].forEach((f, i) => bell(f, 0.8, 0.032, i * 0.06)); noise(0.9, {type: 'bandpass', freq: 3000, freqTo: 7000, q: 1.5, gain: 0.03}); }],
    [9.85, () => [2093, 2637, 3136].forEach((f, i) => bell(f, 0.5, 0.022, i * 0.06))],
    [10.3, () => { if (musBus && au()) try { musBus.gain.setTargetAtTime(0.0001, au().ctx.currentTime, 0.35); } catch (e) {} bed({type: 'bandpass', freq: 380, q: 0.8, sweep: [[1.2, 700], [2.6, 420], [4, 900], [5.5, 500]], gain: 0.085, att: 1.4, hold: 2.6, rel: 1.8}); }],
    [10.9, () => narrate(3)],
    [11.0, () => { bed({type: 'highpass', freq: 1500, gain: 0.05, att: 1.0, hold: 2.5, rel: 0.4, rate: 1.1}); bed({type: 'highpass', freq: 1500, gain: 0.03, att: 0.2, hold: 2.6, rel: 1.2, delay: 3.5, rate: 0.9}); tone(55, 3.6, {type: 'sine', gain: 0.07, attack: 1.2}); tone(58.3, 3.6, {type: 'sine', gain: 0.05, attack: 1.4}); }],
    [11.62, () => thunder(0.45, false)],
    [12.4, () => { tone(41.2, 2.4, {type: 'sawtooth', gain: 0.025, attack: 0.9}); tone(61.7, 2.4, {type: 'triangle', gain: 0.035, attack: 1.0}); }],
    [12.55, () => thunder(0.9, true)],
    [13.42, () => { thunder(0.7, false); tone(110, 1.4, {type: 'triangle', slide: 98, gain: 0.05, attack: 0.05}); tone(116.5, 1.4, {type: 'triangle', slide: 103.8, gain: 0.04, attack: 0.05}); }],
    [14.0, () => bed({type: 'bandpass', freq: 200, q: 0.6, sweep: [[0.5, 1800]], gain: 0.12, att: 0.5, hold: 0.02, rel: 0.1})],
    [14.48, () => { thunder(1, true); noise(0.9, {type: 'highpass', freq: 4000, freqTo: 1500, gain: 0.12}); }],
    [14.62, () => { tone(2637, 2.4, {type: 'sine', gain: 0.02, attack: 0.05}); bed({type: 'highpass', freq: 2000, gain: 0.018, att: 0.4, hold: 1.8, rel: 1.0}); }],
    [14.9, () => narrate(4)],
    [15.1, () => melody([[76, 2], [72, 2], [69, 4]], 0.32, 0.03, 0)],
    [15.9, () => [1319, 1175, 1047, 988, 880].forEach((f, i) => bell(f, 0.9, 0.022, i * 0.24))],
    [17.25, () => { bell(1568, 1.2, 0.03, 0); noise(0.12, {type: 'highpass', freq: 3000, gain: 0.02}); }],
    [17.9, () => { if (musBus && au()) try { musBus.gain.cancelScheduledValues(au().ctx.currentTime); musBus.gain.setTargetAtTime(1, au().ctx.currentTime, 0.1); } catch (e) {} narrate(5); }],
    [18.1, () => { pad([45, 52, 57], 3, 0.022); melody([[69, 1], [72, 1], [76, 1], [74, 2], [72, 1], [71, 2], [67, 1], [69, 3], [72, 1], [76, 1], [81, 1], [79, 2], [76, 1], [74, 3]], 0.42, 0.03, 0.1, [45, 41, 43, 45, 41, 43], 3); }],
    [18.3, () => { for (let i = 0; i < 6; i++) tone(2200 - i * 90, 0.08, {type: 'sine', slide: 1200, gain: 0.012, delay: i * 0.55 + (i % 2) * 0.17}); }],
    [20.85, () => { bed({type: 'bandpass', freq: 500, q: 0.7, sweep: [[0.8, 1500], [2.2, 700]], gain: 0.09, att: 0.5, hold: 0.8, rel: 1.6}); [1047, 1319, 1568, 2093, 2637].forEach((f, i) => bell(f, 0.9, 0.03, 0.15 + i * 0.09)); }],
    [21.6, () => [1568, 1976, 2349, 2637, 3136].forEach((f, i) => bell(f, 0.7, 0.02, i * 0.14))],
    [23.9, () => narrate(6)],
    [24.2, () => { pad([53, 57, 60, 65], 1.9, 0.026); pad([55, 59, 62, 67], 1.9, 0.026, 1.6); pad([48, 55, 64, 72], 3.4, 0.03, 3.2); }],
    [24.3, () => { tone(392, 0.22, {type: 'triangle', slide: 784, gain: 0.04}); }],
    [25.1, () => melody([[67, 1], [72, 1], [76, 1], [79, 3], [81, 1], [79, 1], [76, 1], [84, 3]], 0.26, 0.035, 0)],
    [26.2, () => { try { const a = au(); if (a && a.say) a.say('Here I come, Mallo!', {happy: true}); } catch (e) {} }],
    [26.5, () => { noise(0.5, {type: 'bandpass', freq: 600, freqTo: 2400, q: 0.9, gain: 0.06}); }],
    [27.1, () => { tone(330, 0.32, {type: 'triangle', slide: 990, slideDur: 0.25, gain: 0.06}); noise(0.6, {type: 'bandpass', freq: 400, freqTo: 3000, q: 0.8, gain: 0.05}); }],
    [27.5, () => { [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => bell(f, 1.2, 0.045, i * 0.06)); pad([48, 55, 60, 64, 67], 2.6, 0.035); tone(65.4, 1.2, {type: 'sine', gain: 0.12, attack: 0.01}); noise(1.4, {type: 'highpass', freq: 5000, gain: 0.03, delay: 0.1}); }],
    [28.25, () => { bell(1568, 0.8, 0.05, 0); bell(2093, 1.0, 0.045, 0.1); }],
    [29.3, () => fadeBus(1.0)],
  ];
  function preload() { const a = au(); if (!a || !a.loadVoice) return; try { for (let i = 1; i <= 6; i++) a.loadVoice(NARR(i)); const v = G.VOICE_FILES && G.VOICE_FILES['Here I come, Mallo!']; if (v) a.loadVoice(v); } catch (e) {} }

  /* ---------- API ---------- */
  const SKIP_FADE = 0.5;
  const story = G.story = {
    DUR, t: 0, started: false, ended: false, skipping: false, skipT: 0, done: null, fired: null,
    start(done) {
      this.t = 0; this.done = done || null; this.started = true; this.ended = false; this.skipping = false; this.skipT = 0; this.fired = new Array(CUES.length).fill(false);
      RUN++; if (bus) fadeBus(0.3); makeBus(); preload(); if (!D) build();
    },
    update() {
      if (!this.started) return;
      if (this.skipping) { this.t = Math.min(DUR, this.t + 1 / 60); this.skipT += 1 / 60; if (this.skipT >= SKIP_FADE) this.finish(); return; }
      this.t += 1 / 60; const t = this.t;
      for (let i = 0; i < CUES.length; i++) {
        if (this.fired[i] || t < CUES[i][0]) continue;
        this.fired[i] = true;
        if (t - CUES[i][0] < 0.3) { try { CUES[i][1](); } catch (e) {} }   /* sounds never fire late (e.g. when stepping fast) */
      }
      if (t >= DUR) this.finish();
    },
    finish() {
      if (!this.started) return;
      this.started = false; this.ended = true; this.t = Math.min(this.t, DUR);
      if (bus) fadeBus(this.skipping ? 0.25 : 0.9); bus = null; musBus = null;
      const d = this.done; this.done = null; if (d) { try { d(); } catch (e) { setTimeout(() => { throw e; }); } }
    },
    skip() {
      if (!this.started || this.skipping) return;
      if (this.t > DUR - SKIP_FADE) return;   /* already fading out */
      this.skipping = true; this.skipT = 0; if (bus) fadeBus(0.4);
    },
    frame(ctx) {
      const skipK = this.ended ? 1 : (this.skipping ? clamp01(this.skipT / SKIP_FADE) : 0);
      render(ctx, Math.min(this.t, DUR), skipK);
    },
  };
})();

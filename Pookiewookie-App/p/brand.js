/* The Starway Home: the publisher ident "Schokofreedo Games" (5 s) and the start screen before the first tap.
   Shot list: warm cream stage, the lights dip → one glossy chocolate drop falls and splashes (crown + flash) → the chocolate controller
   squeezes out of the splash, eyes shut "><", stretch, hop, squash, its drips wobble, the three splash drops fly to their places →
   the eyes pop open → "schokofreedo" bounces in syllable by syllable (scho-ko-free-do), the eyes follow the letters → "GAMES" tracks
   out between its two lines on the final chord → the right eye winks with a sparkle "ting" and a head tilt → gloss sweep, cocoa
   sparkles, hold, fade to cocoa. Sonic logo (Web Audio on its own bus with a small reverb): liquid bloop + splash, rubbery pop,
   droplet plips, the mallet motif A5 F5 | D6 C6 on scho-ko | free-do over an F → B♭ bass, then F add9 chord with F6 on top and a
   shimmer, the wink ting, the voice line "Schokofreedo Games!". Art: p/brand/logo.png = parts of the client logo
   (cut by tests/scratch-brand/cut.py; entries: atlas x, y, w, h, home x, y in logo source px, optional upscale). */
(function () {
  const G = window.PW = window.PW || {}, VH = 270, TAU = Math.PI * 2;
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const A = () => G.audio, VW = () => G.VW || 480;
  const clamp01 = k => Math.max(0, Math.min(1, k)), lerp = (a, b, k) => a + (b - a) * k;
  const ss = (t, a, b) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
  const outC = k => 1 - Math.pow(1 - clamp01(k), 3);
  const back = k => { k = clamp01(k); return 1 + 3.2 * Math.pow(k - 1, 3) + 2.2 * Math.pow(k - 1, 2); };
  const spring = (u, amp, w, d) => u < 0 ? 0 : amp * Math.exp(-d * u) * Math.cos(w * u);
  const PART = {G0: [301, 584, 51, 58, 685, 744], G1: [442, 584, 48, 56, 778, 745], G2: [493, 584, 53, 55, 870, 746], G3: [549, 584, 35, 53, 973, 748], G4: [355, 584, 38, 57, 1053, 745], L0: [1265, 0, 105, 144, 274, 583], L0_s: [587, 584, 41, 50, 246, 555, 4], L1: [135, 440, 106, 138, 369, 583], L10: [735, 0, 127, 195, 1244, 527], L10_s: [131, 584, 46, 63, 1216, 499, 4], L11: [0, 440, 132, 141, 1367, 583], L11_s: [631, 584, 47, 50, 1339, 555, 4], L1_s: [681, 584, 41, 49, 341, 555, 4], L2: [865, 0, 113, 190, 470, 526], L2_s: [180, 584, 43, 62, 442, 498, 4], L3: [365, 440, 114, 133, 579, 584], L3_s: [772, 584, 43, 48, 551, 556, 4], L4: [1147, 0, 115, 169, 690, 547], L4_s: [396, 584, 43, 57, 662, 519, 4], L5: [244, 440, 118, 137, 790, 581], L5_s: [725, 584, 44, 49, 762, 553, 4], L6: [981, 0, 77, 189, 906, 527], L6_s: [226, 584, 34, 62, 878, 499, 4], L7: [1061, 0, 83, 188, 968, 528], L7_s: [263, 584, 35, 61, 940, 500, 4], L8: [482, 440, 108, 133, 1041, 587], L8_s: [818, 584, 41, 48, 1013, 559, 4], L9: [593, 440, 109, 133, 1142, 587], L9_s: [862, 584, 42, 48, 1114, 559, 4], ctrl: [0, 0, 732, 437, 538, 124], ctrl_s: [705, 440, 197, 124, 510, 96, 4], dA: [1187, 440, 82, 72, 988, 198], dB: [1094, 440, 90, 86, 1148, 204], eye: [1024, 440, 67, 105, 798, 266], ln0: [1026, 584, 93, 10, 551, 772], ln1: [1122, 584, 94, 10, 1128, 772], sp0: [905, 440, 116, 115, 639, 54], sp0_s: [907, 584, 43, 43, 611, 26, 4], sp1: [85, 584, 43, 66, 778, 108], sp1_s: [998, 584, 25, 31, 750, 80, 4], sp2: [1272, 440, 112, 69, 570, 138], sp2_s: [953, 584, 42, 32, 542, 110, 4], wink: [0, 584, 82, 67, 952, 301]};
  const img = new Image(); let ready = false;
  img.onload = () => { ready = true; }; img.src = 'p/brand/logo.png';

  /* logo source px → screen: scale, source centre, screen centre y */
  const SC = 0.265, OX = 886.5, OY = 427.5, LY = 137;
  let cx = 240;
  const X = x => cx + (x - OX) * SC, Y = y => LY + (y - OY) * SC;
  const ctr = k => { const q = PART[k]; return [q[4] + q[2] * (q[6] || 1) / 2, q[5] + q[3] * (q[6] || 1) / 2]; };
  function blit(ctx, k, dx, dy) { const q = PART[k], u = q[6] || 1; ctx.drawImage(img, q[0], q[1], q[2], q[3], X(q[4]) + (dx || 0), Y(q[5]) + (dy || 0), q[2] * u * SC, q[3] * u * SC); }
  /* transform around a pivot in source px: offset (logical px), scale, rotation */
  function pivot(ctx, px, py, dx, dy, sx, sy, rot) { const x = X(px), y = Y(py); ctx.translate(x + dx, y + dy); if (rot) ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-x, -y); }
  function star4(ctx, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? r * 0.2 : (i % 4 ? r * 0.62 : r); ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); }
  function sparkle(ctx, x, y, r, rot, a) {
    if (a <= 0 || r <= 0) return; ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6); g.addColorStop(0, 'rgba(255,214,140,.7)'); g.addColorStop(0.4, 'rgba(255,190,100,.25)'); g.addColorStop(1, 'rgba(255,180,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, TAU); ctx.fill();
    ctx.rotate(rot); star4(ctx, r); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.restore();
  }

  /* ---------- timeline (s) ---------- */
  const T = {dip: 0.3, drop: 0.3, hit: 0.74, pop: 0.76, up: 0.95, land: 1.1, eyes: 1.42, notes: [1.6, 1.78, 2.02, 2.2], games: 2.55, wink: 3.0, voice: 3.1, sweep: 3.2, out: 4.4};
  const DUR = 5.0, SKIP_FADE = 0.45, LAND = 0.26, NOTE = [880, 698.46, 1174.66, 1046.5];
  const SYL = [[0, 1, 2, 3], [4, 5], [6, 7, 8, 9], [10, 11]];   /* scho-ko-free-do */
  const LT = []; SYL.forEach((g, gi) => g.forEach((i, j) => { LT[i] = T.notes[gi] - LAND + j * 0.035; }));
  const FLOOR = [905, 556], EYE_SHIFT = 161.5, MIRROR = 912.25;
  const SPL = [{k: 'sp2', d: 0.44, r: -1.4}, {k: 'sp0', d: 0.38, r: 1.1}, {k: 'sp1', d: 0.46, r: 2.2}];
  const GLITTER = [[1186, 168, 0], [612, 300, 0.3], [1238, 430, 0.62], [668, 92, 0.85], [508, 552, 0.18], [1326, 548, 0.5], [948, 552, 0.95], [735, 572, 1.12], [1446, 618, 0.36], [312, 616, 0.75], [1062, 205, 1.25], [585, 160, 0.08]];   /* glints on the chocolate */
  let parts = [], motes = [];
  for (let i = 0; i < 46; i++) motes.push({x: Math.random(), y: Math.random(), s: 0.35 + Math.random() * 1.0, v: 4 + Math.random() * 9, p: Math.random() * TAU});

  /* ---------- poses ---------- */
  function ctrlPose(t) {
    if (t < 0) return {dy: -1.4 * Math.sin(-t * 1.9), sx: 1, sy: 1, rot: 0, drip: 1};   /* start screen: gentle float */
    if (t < T.pop) return null;
    if (t < T.up) { const k = outC((t - T.pop) / (T.up - T.pop)); return {dy: -18 * k, sx: lerp(0.22, 0.8, k), sy: lerp(0.08, 1.3, k), rot: 0, drip: 1}; }
    if (t < T.land) { const k = (t - T.up) / (T.land - T.up), e = k * k; return {dy: -18 * (1 - e), sx: lerp(0.8, 0.98, e), sy: lerp(1.3, 1.06, e), rot: 0, drip: 1}; }
    const q = spring(t - T.land, 0.22, 17, 5.5), u = t - T.land, w = t - T.wink;
    return {dy: -0.75 * (1 - Math.cos(Math.max(0, t - 1.7) * 2.1)) * ss(t, 1.7, 2.4), sx: 1 + q * 0.85, sy: 1 - q, rot: w > 0 ? -0.075 * Math.exp(-4.5 * w) * Math.sin(w * 10) : 0, drip: 1 + Math.max(0, 0.32 * Math.exp(-3.6 * u) * Math.sin(u * 11 + 0.35))};
  }
  function letterPose(i, t) {
    if (t < 0) return {dy: 0, sx: 1, sy: 1, a: 1};
    const u = t - LT[i]; if (u < 0) return null;
    if (u < LAND) { const k = u / LAND, s = lerp(0.35, 1, outC(k * 1.6)), h = Math.sin(Math.PI * k); return {dy: 24 * (1 - k) - 80 * k * (1 - k), sx: s * (1 - 0.12 * h), sy: s * (1 + 0.16 * h), a: clamp01(u / 0.06)}; }
    const q = spring(u - LAND, 0.22, 18, 7); return {dy: 0, sx: 1 + 0.8 * q, sy: 1 - q, a: 1};
  }
  function splashPose(j, t) {
    const s = SPL[j]; if (t < 0) return {x: 0, y: 0, sx: 1, sy: 1, r: 0};
    const u = (t - T.hit) / s.d; if (u < 0) return null;
    const [hx, hy] = ctr(s.k), k = clamp01(u), ex = (FLOOR[0] - hx) * SC, ey = (FLOOR[1] - 30 - hy) * SC;
    const q = spring(t - T.hit - s.d, 0.2, 20, 7), sc = u < 1 ? lerp(0.3, 1, outC(k * 1.3)) : 1;
    return {x: ex * (1 - (1 - (1 - k) * (1 - k))), y: ey * (1 - outC(k)), sx: sc * (1 + q), sy: sc * (1 - q), r: s.r * (1 - outC(k))};
  }
  /* the eyes look at the letter that just landed */
  function look(t) {
    if (t < T.notes[0] - 0.2 || t > T.games + 0.3) return [0, 0];
    let x = 0; for (let i = 0; i < 12; i++) if (t > LT[i] + LAND - 0.05) x = (ctr('L' + i)[0] - OX) / 620;
    const fade = ss(t, T.notes[0] - 0.2, T.notes[0]) * (1 - ss(t, T.games, T.games + 0.3));
    return [x * 1.8 * fade, 1.3 * fade];
  }

  /* ---------- drawing ---------- */
  function face(ctx, t) {
    const [lx, ly] = look(t);
    const eye = (shift, sy) => { const [ex, ey] = ctr('eye'); ctx.save(); pivot(ctx, ex + shift, ey + 40, lx, ly, 1, sy); blit(ctx, 'eye', shift * SC, 0); ctx.restore(); };
    if (t >= 0 && t < T.eyes) {   /* squeezed shut "><" */
      blit(ctx, 'wink'); ctx.save(); ctx.translate(X(MIRROR), 0); ctx.scale(-1, 1); ctx.translate(-X(MIRROR), 0); blit(ctx, 'wink'); ctx.restore(); return;
    }
    const o = t - T.eyes, open = t < 0 ? 1 : (o < 0.16 ? lerp(0.15, 1, back(o / 0.16)) : 1);
    const blink = t < 0 ? ((-t) % 3.7 < 0.13 ? 0.12 : 1) : 1;
    eye(0, open * blink);
    const w = t - T.wink;
    if (t >= 0 && w > 0) {
      if (w < 0.07) eye(EYE_SHIFT, 1 - w / 0.07 * 0.88);
      else { const [wx, wy] = ctr('wink'), s = lerp(1.35, 1, back((w - 0.07) / 0.18)); ctx.save(); pivot(ctx, wx, wy, 0, 0, s, s); blit(ctx, 'wink'); ctx.restore(); }
    } else if (t < 0) blit(ctx, 'wink');
    else eye(EYE_SHIFT, open);
  }
  function shadows(ctx, t) {
    const P = ctrlPose(t);
    if (P) { ctx.save(); ctx.globalAlpha = clamp01(P.sy * 1.2); pivot(ctx, FLOOR[0], FLOOR[1], 2.2, 3.5 + P.dy * 0.25, P.sx, Math.min(1.1, P.sy), P.rot); blit(ctx, 'ctrl_s'); ctx.restore(); }
    for (let i = 0; i < 12; i++) {
      const L = letterPose(i, t); if (!L) continue; const q = PART['L' + i];
      ctx.save(); ctx.globalAlpha = L.a * (1 - clamp01(-L.dy / 16) * 0.6); pivot(ctx, q[4] + q[2] / 2, q[5] + q[3], 1.8, 3, L.sx, Math.min(1, L.sy)); blit(ctx, 'L' + i + '_s'); ctx.restore();
    }
    for (let j = 0; j < 3; j++) { const S = splashPose(j, t); if (!S) continue; const [hx, hy] = ctr(SPL[j].k); ctx.save(); pivot(ctx, hx, hy, S.x + 2, S.y + 3, S.sx, S.sy, S.r); blit(ctx, SPL[j].k + '_s'); ctx.restore(); }
  }
  function art(ctx, t) {
    const P = ctrlPose(t);
    if (P) {
      ctx.save(); pivot(ctx, FLOOR[0], FLOOR[1], 0, P.dy, P.sx, P.sy, P.rot); blit(ctx, 'ctrl');
      if (P.drip > 1.002) for (const k of ['dA', 'dB']) { const q = PART[k]; ctx.save(); pivot(ctx, q[4] + q[2] / 2, q[5], 0, 0, 1, P.drip); blit(ctx, k); ctx.restore(); }
      face(ctx, t); ctx.restore();
    }
    for (let i = 0; i < 12; i++) {
      const L = letterPose(i, t); if (!L) continue; const q = PART['L' + i];
      ctx.save(); ctx.globalAlpha = L.a; pivot(ctx, q[4] + q[2] / 2, q[5] + q[3], 0, L.dy, L.sx, L.sy); blit(ctx, 'L' + i); ctx.restore();
    }
    /* GAMES tracks out from the middle, the two lines draw outward */
    const gu = t < 0 ? 9 : t - (T.games - 0.14);
    if (gu > 0) {
      for (let i = 0; i < 5; i++) {
        const u = gu - i * 0.03, k = outC(u / 0.5); if (u <= 0) continue; const [gx] = ctr('G' + i);
        ctx.save(); ctx.globalAlpha = clamp01(u / 0.22); blit(ctx, 'G' + i, (888 - gx) * SC * 0.75 * (1 - k), 5 * (1 - k)); ctx.restore();
      }
      const k = outC((gu - 0.1) / 0.45);
      if (k > 0) for (const [nm, right] of [['ln0', 1], ['ln1', 0]]) {
        const q = PART[nm], w = q[2] * k, sx = right ? q[0] + q[2] - w : q[0], hx = right ? q[4] + q[2] - w : q[4];
        ctx.drawImage(img, sx, q[1], w, q[3], X(hx), Y(q[5]), w * SC, q[3] * SC);
      }
    }
    for (let j = 0; j < 3; j++) { const S = splashPose(j, t); if (!S) continue; const [hx, hy] = ctr(SPL[j].k); ctx.save(); pivot(ctx, hx, hy, S.x, S.y, S.sx, S.sy, S.r); blit(ctx, SPL[j].k); ctx.restore(); }
  }
  /* the logo as text until the art has loaded */
  function fallback(ctx, t) {
    const a = t < 0 ? 1 : ss(t, T.notes[0] - 0.2, T.notes[3]); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = '700 46px "Fredoka", sans-serif';
    const w1 = ctx.measureText('schoko').width, w2 = ctx.measureText('freedo').width, x0 = cx - (w1 + w2) / 2;
    ctx.textAlign = 'left'; ctx.fillStyle = '#4a1c0c'; ctx.fillText('schoko', x0, LY + 22); ctx.fillStyle = '#c8692a'; ctx.fillText('freedo', x0 + w1, LY + 22);
    ctx.textAlign = 'center'; ctx.font = '600 12px "Fredoka", sans-serif'; ctx.fillStyle = '#4a1c0c'; ctx.fillText('—  G A M E S  —', cx, LY + 46); ctx.restore();
  }
  /* the falling drop */
  function drop(ctx, x, y, r, len) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, -len); ctx.bezierCurveTo(r * 0.5, -len * 0.5, r, -r * 0.4, r, 0); ctx.arc(0, 0, r, 0, Math.PI); ctx.bezierCurveTo(-r, -r * 0.4, -r * 0.5, -len * 0.5, 0, -len); ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.5, r * 0.1, 0, 0, r * 1.3); g.addColorStop(0, '#9a5630'); g.addColorStop(0.55, '#5c2810'); g.addColorStop(1, '#2e1105'); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,250,240,.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.25, r * 0.16, r * 0.42, 0.25, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,190,.35)'; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.45, r * 0.32, r * 0.14, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function backdrop(ctx, W, t, now) {
    const g = ctx.createRadialGradient(cx, 112, 8, cx, 140, Math.max(W, 430) * 0.72); g.addColorStop(0, '#fff8ed'); g.addColorStop(0.42, '#f7e5cc'); g.addColorStop(1, '#dbb48b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
    const lit = t < 0 ? 1 : 0.55 + 0.45 * ss(t, T.hit - 0.05, T.hit + 0.25);
    const cg = ctx.createLinearGradient(0, 0, 0, VH); cg.addColorStop(0, 'rgba(255,255,255,' + (0.55 * lit) + ')'); cg.addColorStop(0.85, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx - 46, -2); ctx.lineTo(cx + 46, -2); ctx.lineTo(cx + 230, VH); ctx.lineTo(cx - 230, VH); ctx.closePath(); ctx.fill();
    for (const m of motes) {   /* cocoa dust drifting in the light */
      const y = ((m.y * (VH + 20) - now * m.v) % (VH + 20) + VH + 20) % (VH + 20) - 10, x = m.x * W + Math.sin(now * 0.6 + m.p) * 6;
      ctx.globalAlpha = (0.18 + 0.22 * Math.abs(Math.sin(now * 0.9 + m.p))) * (1 - Math.abs(x - cx) / (W * 0.62)); if (ctx.globalAlpha <= 0) continue;
      ctx.fillStyle = m.s > 1.0 ? '#a0663a' : '#7a4424'; ctx.beginPath(); ctx.arc(x, y, m.s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- sonic logo ---------- */
  let bus = null;
  function score(b) {
    const a = A(); if (!a || !a.ctx || a.muted) return; const c = a.ctx, t0 = c.currentTime + 0.04;
    bus = c.createGain(); bus.gain.value = 0.85; b.bus = bus;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.3; bus.connect(comp).connect(a.master);
    const rev = c.createConvolver(), n = Math.floor(c.sampleRate * 1.9), ir = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.4); }
    rev.buffer = ir; const damp = c.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 4200; const wet = c.createGain(); wet.gain.value = 0.32; rev.connect(damp).connect(wet).connect(bus);
    const out = (node, rv) => { node.connect(bus); if (rv) { const s = c.createGain(); s.gain.value = rv; node.connect(s).connect(rev); } };
    const env = (g, t, peak, att, dur, swell) => { g.gain.setValueAtTime(0.0001, t); if (swell) { g.gain.exponentialRampToValueAtTime(peak, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03); } else { g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); } };
    const osc = (f, at, dur, o = {}) => {
      const t = t0 + at, ox = c.createOscillator(), g = c.createGain(); ox.type = o.type || 'sine'; ox.frequency.setValueAtTime(f, t);
      if (o.to) ox.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur)); if (o.det) ox.detune.value = o.det;
      env(g, t, o.g || 0.1, o.att || 0.004, dur); let nd = ox.connect(g);
      if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + (o.lpT || dur)); fl.Q.value = o.q || 0.7; nd = nd.connect(fl); }
      out(nd, o.rv); ox.start(t); ox.stop(t + dur + 0.05);
    };
    const noise = (at, dur, o = {}) => {
      const t = t0 + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = a.noiseBuf; s.loop = true;
      fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1000, t); if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur); fl.Q.value = o.q || 0.8;
      env(g, t, o.g || 0.05, o.att || 0.003, dur, o.swell); out(s.connect(fl).connect(g), o.rv); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.06);
    };
    const mallet = (f, at, g) => {
      osc(f, at, 0.95, {g, att: 0.002, rv: 0.35}); osc(f * 2, at, 0.4, {g: g * 0.22, att: 0.002, rv: 0.3}); osc(f * 3.98, at, 0.11, {g: g * 0.1, att: 0.001});
      osc(f / 2, at, 0.45, {type: 'triangle', g: g * 0.3, lp: 1400}); noise(at, 0.025, {f: f * 4, q: 3, g: 0.02});
    };
    /* air before the drop, the bloop, the splash, the droplets */
    noise(T.drop, T.hit - T.drop - 0.02, {f: 900, to: 3200, q: 0.7, g: 0.028, swell: true});
    osc(250, T.hit, 0.17, {to: 840, glide: 0.07, g: 0.2, att: 0.003, rv: 0.25}); osc(110, T.hit, 0.3, {to: 46, g: 0.3});
    noise(T.hit + 0.005, 0.24, {f: 1500, to: 450, q: 0.9, g: 0.09, rv: 0.2});
    osc(520, T.hit + 0.07, 0.09, {to: 1350, glide: 0.05, g: 0.07, rv: 0.35}); osc(720, T.hit + 0.13, 0.08, {to: 1800, glide: 0.04, g: 0.045, rv: 0.35});
    /* the controller squeezes out (rubbery stretch), hops and lands with a soft squish */
    osc(140, T.pop, 0.24, {type: 'triangle', to: 430, glide: 0.19, g: 0.075, lp: 1300});
    osc(150, T.land, 0.2, {to: 66, g: 0.2}); noise(T.land, 0.12, {f: 900, to: 280, q: 1.8, g: 0.06}); osc(240, T.land + 0.02, 0.28, {type: 'triangle', to: 200, g: 0.04, lp: 900});
    SPL.forEach((s, j) => osc(1000 + j * 260, T.hit + s.d, 0.07, {to: 1900 + j * 400, glide: 0.04, g: 0.03, rv: 0.45}));
    /* the eyes pop open */
    osc(1760, T.eyes, 0.09, {g: 0.035, rv: 0.3}); osc(2637, T.eyes + 0.05, 0.13, {g: 0.03, rv: 0.4});
    /* the motif: scho-ko | free-do, bass F then B♭ */
    T.notes.forEach((at, i) => mallet(NOTE[i], at, i % 2 ? 0.105 : 0.135));
    osc(174.61, T.notes[0], 0.6, {type: 'triangle', g: 0.13, lp: 700}); osc(116.54, T.notes[2], 0.6, {type: 'triangle', g: 0.14, lp: 700});
    /* swell into the chord, then F add9 with F6 on top, sub, shimmer */
    noise(T.games - 0.3, 0.28, {type: 'highpass', f: 3500, g: 0.035, swell: true});
    const gt = T.games;
    mallet(1396.91, gt, 0.14); osc(87.31, gt, 2.2, {g: 0.2, att: 0.01}); osc(92, gt, 0.3, {to: 44, g: 0.14}); noise(gt, 0.35, {type: 'lowpass', f: 1200, to: 200, g: 0.06});
    [174.61, 261.63, 349.23, 440, 523.25, 783.99].forEach(f => { for (const det of [-7, 7]) osc(f, gt, 2.5, {type: 'sawtooth', det, g: 0.017, att: 0.03, lp: 500, lpTo: 2400, lpT: 0.3, rv: 0.5}); osc(f, gt, 2.3, {type: 'triangle', g: 0.02, att: 0.04}); });
    [2093, 2793.83, 3520, 4186].forEach((f, i) => osc(f, gt + 0.06 + i * 0.06, 1.1, {g: 0.022, att: 0.003, rv: 0.6}));
    /* the wink: "ting" + glitter, then the gloss sweep */
    const wt = T.wink + 0.07;
    osc(2793.83, wt, 1.3, {g: 0.07, att: 0.002, rv: 0.55}); osc(2793.83 * 2.76, wt, 0.35, {g: 0.012, att: 0.001}); osc(4186, wt, 0.6, {g: 0.025, rv: 0.4});
    [3520, 4186, 4699.6].forEach((f, i) => osc(f, wt + 0.07 + i * 0.045, 0.1, {g: 0.014, rv: 0.5}));
    noise(T.sweep, 0.6, {f: 2500, to: 7500, q: 1.1, g: 0.02, att: 0.25});
    /* the voice line rides on the chord tail */
    if (G.BRAND_VOICE) try { a.loadVoice(G.BRAND_VOICE).then(buf => { if (!buf || b.bus !== bus) return; const at = t0 + T.voice; if (c.currentTime > at - 0.02) return; const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = 0.9; s.connect(g).connect(bus); s.start(at); }); } catch (e) {}
  }

  /* ---------- start screen + intro ---------- */
  const STILL = /^#brand(&|$)/.test(location.hash);   /* test hash "#brand": stay on the start screen (a tap plays the intro) */
  let lay = null, lctx = null;
  function layer(kk, W) {
    const w = Math.max(1, Math.ceil(W * kk)), h = Math.max(1, Math.ceil(VH * kk)); if (!lay) { lay = document.createElement('canvas'); lctx = lay.getContext('2d'); }
    if (lay.width !== w || lay.height !== h) { lay.width = w; lay.height = h; } lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, w, h); lctx.setTransform(kk, 0, 0, kk, 0, 0); lctx.imageSmoothingQuality = 'high'; return lctx;
  }
  const brand = G.brand = {
    t: 0, done: null, fired: {}, started: false, skipT: -1, still: false, DUR,
    start(done) {
      this.done = done; this.t = 0; this.fired = {}; this.skipT = -1; parts = [];
      if (STILL && !this.still) { this.still = true; return; }
      this.started = true; this.still = false;
      try { if (this.bus) this.bus.gain.setTargetAtTime(0.0001, A().ctx.currentTime, 0.05); this.bus = null; score(this); } catch (e) {}
    },
    skip() {
      if (this.still && !this.started) { try { A().init(); } catch (e) {} this.start(this.done); return; }
      if (!this.started || this.skipT >= 0 || this.t > T.out) return;
      this.skipT = 0; this.t = Math.max(this.t, T.wink + 0.35);
      try { const c = A().ctx; if (this.bus && c) this.bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.08); } catch (e) {}
    },
    once(id, fn) { if (!this.fired[id] && this.skipT < 0) { this.fired[id] = true; try { fn(); } catch (e) {} } },
    update() {
      if (!this.started) return;
      this.t += 1 / 60; const t = this.t;
      if (this.skipT >= 0) this.skipT += 1 / 60;
      if (t > T.hit) this.once('hit', () => {
        const fx = X(FLOOR[0]), fy = Y(FLOOR[1]);
        for (let i = 0; i < 18; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.5, v = 1.6 + Math.random() * 2.6; parts.push({x: fx + Math.cos(a) * 6, y: fy - 2, vx: Math.cos(a) * v * 1.3, vy: Math.sin(a) * v, r: 0.8 + Math.random() * 1.9, life: 0.5 + Math.random() * 0.3, c: '#4e200b'}); }
      });
      for (let i = 0; i < 12; i++) if (t > LT[i] + LAND) this.once('L' + i, () => {
        const q = PART['L' + i], x = X(q[4] + q[2] / 2), y = Y(q[5] + q[3]) - 2;
        for (let k = 0; k < 3; k++) parts.push({x: x + (Math.random() - 0.5) * 18, y, vx: (Math.random() - 0.5) * 2.2, vy: -1 - Math.random() * 1.6, r: 0.6 + Math.random() * 1.0, life: 0.38, c: i < 6 ? '#4e200b' : '#c8692a'});
      });
      if (t > T.games) this.once('chord', () => {   /* a puff of cocoa glitter on the chord */
        for (let i = 0; i < 22; i++) { const x = X(300 + Math.random() * 1180), y = Y(560 + Math.random() * 230), a = Math.atan2(y - LY, x - cx); parts.push({x, y, vx: Math.cos(a) * (0.3 + Math.random() * 0.6), vy: Math.sin(a) * 0.4 - 0.25 - Math.random() * 0.3, r: 2 + Math.random() * 2.6, life: 0.6 + Math.random() * 0.5, max: 1.1, g: true}); }
      });
      for (const p of parts) { p.life -= 1 / 60; if (!p.g) p.vy += 0.16; p.x += p.vx; p.y += p.vy; }
      parts = parts.filter(p => p.life > 0);
      if ((t >= DUR || this.skipT >= SKIP_FADE) && this.done) { const d = this.done; this.done = null; this.started = false; d(); }
    },
    /* the whole logo at rest (also usable elsewhere): centre (x, y), height h in logical px */
    logo(ctx, x, y, h) { if (!ready) return; const s = h / (747 * SC); ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-cx, -LY); shadows(ctx, -1); art(ctx, -1); ctx.restore(); },
    frame(ctx, kk) {
      const W = VW(), now = performance.now() / 1000, intro = this.started, t = intro ? this.t : -1 - now;
      kk = kk || (ctx.getTransform ? ctx.getTransform().d : 1); cx = W / 2;
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      backdrop(ctx, W, t, intro ? this.t : now);
      /* global logo framing: smaller and higher on the start screen, a slow push-in, a lift on the way out */
      const fadeOut = intro ? Math.max(ss(t, T.out, DUR), this.skipT >= 0 ? clamp01(this.skipT / SKIP_FADE) : 0) : 0;
      const gs = intro ? 0.97 + 0.03 * ss(t, 0.7, 3.5) + 0.05 * fadeOut * fadeOut : 0.8 * (1 + 0.012 * Math.sin(now * 2.2)), gy = intro ? LY : 116;
      const frameLogo = c => { c.translate(cx, gy); c.scale(gs, gs); c.translate(-cx, -LY); };
      if (intro && t < 0.32) {   /* the start screen logo bows out */
        const k = ss(t, 0, 0.3), l = layer(kk, W); l.save(); l.translate(cx, 116); l.scale(0.8 - 0.1 * k, 0.8 - 0.1 * k); l.translate(-cx, -LY);
        if (ready) { shadows(l, -1); art(l, -1); } else fallback(l, -1); l.restore(); ctx.globalAlpha = 1 - k; ctx.drawImage(lay, 0, 0, W, VH); ctx.globalAlpha = 1;
      }
      if (intro && t < T.hit + 0.5) {   /* lights dip, then the drop falls */
        const dim = 0.2 * ss(t, 0.05, T.dip) * (1 - ss(t, T.hit - 0.04, T.hit + 0.1)); if (dim > 0) { ctx.fillStyle = 'rgba(70,35,15,' + dim + ')'; ctx.fillRect(0, 0, W, VH); }
        ctx.save(); frameLogo(ctx);
        if (t > T.drop && t < T.hit) {
          const k = (t - T.drop) / (T.hit - T.drop), y = lerp(-30, Y(FLOOR[1]) - 9, k * k), x = X(FLOOR[0]);
          const sg = ctx.createLinearGradient(0, y - 60 * k, 0, y); sg.addColorStop(0, 'rgba(90,40,16,0)'); sg.addColorStop(1, 'rgba(90,40,16,.22)'); ctx.fillStyle = sg; ctx.fillRect(x - 2.5, y - 60 * k, 5, 60 * k);
          drop(ctx, x, y, 9, 9 + 16 * k);
        }
        const u = t - T.hit;
        if (u > 0) {   /* splash: flash, puddle, crown ring */
          const fx = X(FLOOR[0]), fy = Y(FLOOR[1]);
          ctx.globalAlpha = 0.7 * (1 - clamp01(u / 0.35)); const fg = ctx.createRadialGradient(fx, fy - 10, 2, fx, fy - 10, 110); fg.addColorStop(0, '#fffdf8'); fg.addColorStop(1, 'rgba(255,248,235,0)'); ctx.fillStyle = fg; ctx.fillRect(fx - 110, fy - 120, 220, 220);
          const pr = 44 * outC(u / 0.12) * (1 - ss(u, 0.1, 0.36)); ctx.globalAlpha = 1;
          if (pr > 0.5) { const pg = ctx.createRadialGradient(fx - pr * 0.3, fy - 2, 1, fx, fy, pr); pg.addColorStop(0, '#7a3a18'); pg.addColorStop(1, '#3a1606'); ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(fx, fy, pr, pr * 0.2, 0, 0, TAU); ctx.fill(); }
          const cr = 6 + 50 * outC(u / 0.3); ctx.globalAlpha = 1 - clamp01(u / 0.3); ctx.strokeStyle = '#5a2a10'; ctx.lineWidth = 2.6 * (1 - clamp01(u / 0.3)) + 0.4; ctx.beginPath(); ctx.ellipse(fx, fy, cr, cr * 0.22, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      /* the logo; during a gloss sweep it is drawn into a layer that gets a light band on top */
      const sweepK = intro ? (t - T.sweep) / 0.7 : ((now % 6.5) - 1.2) / 0.9, sweep = ready && sweepK > 0 && sweepK < 1 && this.skipT < 0;
      if (ready) {
        ctx.save(); frameLogo(ctx); shadows(ctx, t); ctx.restore();
        let c = ctx; if (sweep) { c = layer(kk, W); } c.save(); frameLogo(c); art(c, t); c.restore();
        if (sweep) {
          const bx = lerp(X(150), X(1650), sweepK) + 68; c.save(); c.globalCompositeOperation = 'source-atop'; c.setTransform(kk, 0, 0, kk, 0, 0); c.transform(1, 0, -0.5, 1, 0, 0);
          for (const [o, h, p] of [[0, 24, 0.55], [-36, 7, 0.45]]) { const sg = c.createLinearGradient(bx + o - h, 0, bx + o + h, 0); sg.addColorStop(0, 'rgba(255,251,240,0)'); sg.addColorStop(0.5, 'rgba(255,251,240,' + p + ')'); sg.addColorStop(1, 'rgba(255,251,240,0)'); c.fillStyle = sg; c.fillRect(bx + o - h, -10, h * 2, VH + 20); }
          c.restore();
          ctx.drawImage(lay, 0, 0, W, VH);
        }
      } else fallback(ctx, t);
      ctx.save(); frameLogo(ctx);
      for (const p of parts) { if (p.g) { const k = Math.sin(clamp01(p.life / p.max) * Math.PI); sparkle(ctx, p.x, p.y, p.r * k, p.life * 3, k); continue; } ctx.globalAlpha = clamp01(p.life * 3); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * (1 + Math.min(1.2, Math.abs(p.vy) * 0.25)), 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,240,225,.6)'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.3, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      /* cocoa sparkles after the chord, the big wink sparkle */
      const gt = intro ? t - T.games : now % 4;
      if (ready && gt > 0) for (const [sx, sy, d] of GLITTER) { const u = (gt - d * 1.2) % 1.6; if (u < 0 || u > 0.55) continue; const k = Math.sin(u / 0.55 * Math.PI); sparkle(ctx, X(sx), Y(sy), 5 * k, u * 2.5, k); }
      const w = intro ? t - T.wink - 0.07 : -1;
      if (ready && w > 0 && w < 0.55) { const k = Math.sin(clamp01(w / 0.55) * Math.PI); sparkle(ctx, X(1056), Y(296), 15 * k, w * 2.5, 1); sparkle(ctx, X(1092), Y(250), 6 * k, -w * 4, k); sparkle(ctx, X(1030), Y(256), 4 * k, w * 5, k); }
      ctx.restore();
      /* warm vignette, prompt, fades */
      const vg = ctx.createRadialGradient(cx, VH * 0.48, VH * 0.42, cx, VH * 0.5, W * 0.72); vg.addColorStop(0, 'rgba(120,64,30,0)'); vg.addColorStop(1, 'rgba(120,64,30,.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, VH);
      if (!intro || t < 0.3) {
        const pa = intro ? 1 - ss(t, 0, 0.2) : 0.65 + 0.35 * Math.sin(now * 3.2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = pa;
        ctx.font = '700 15px "Fredoka", sans-serif'; ctx.fillStyle = '#6a3317'; ctx.fillText(tr('Tippen oder Taste drücken', 'Tap or press a key'), cx, 228);
        ctx.font = '600 9px "Fredoka", sans-serif'; ctx.fillStyle = '#9a6a48'; ctx.fillText(tr('Ton an · Handy quer halten', 'Sound on · Hold your phone sideways'), cx, 246); ctx.globalAlpha = 1;
      }
      if (fadeOut > 0) { ctx.fillStyle = 'rgba(27,15,11,' + fadeOut + ')'; ctx.fillRect(0, 0, W, VH); }
      ctx.restore();
    },
  };
})();

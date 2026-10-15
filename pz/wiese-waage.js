/* The Starway Home puzzle: "Die Lolli-Waage" (world wiese, slot 0).
   Nine identical lollipops, one is secretly heavier. Two weighings on a candy balance, then accuse one.
   Everything is drawn on one canvas; tap/drag lollis onto the pans, tap buttons on the right. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, FONT = '"Fredoka", sans-serif';
  const INK = '#3a2030', PINK = '#ff9eb0', ROSE = '#ff6f9c', PLUM = '#7a3b57', GOLD = '#ffd84a', MINT = '#9be7a5', CREAM = '#fff4e0';
  const CAP = 4, TILT = 0.2;

  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function T(c, s, x, y, px, col, o) {
    o = o || {}; c.font = (o.w || 700) + ' ' + px + 'px ' + FONT; c.textAlign = o.a || 'center'; c.textBaseline = o.b || 'middle';
    if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || px * 0.32; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function wrap(c, s, maxW, px, w) {
    c.font = (w || 600) + ' ' + px + 'px ' + FONT; const out = []; let line = '';
    for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (c.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; }
    if (line) out.push(line); return out;
  }
  function star(c, x, y, r, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); c.fillStyle = col; c.fill(); }

  /* one lollipop: (x, y) = bottom of the stick, s = scale (1 = 26 px wide head, ~50 px tall) */
  function drawLolli(c, x, y, s, num, o) {
    o = o || {}; const hr = 13 * s, hy = y - 30 * s - hr * 0.7, rot = o.rot || 0;
    c.save(); c.translate(x, y); c.rotate(rot); c.translate(-x, -y);
    if (o.glow) { const g = c.createRadialGradient(x, hy, hr * 0.5, x, hy, hr * 2.2); g.addColorStop(0, o.glow); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, hy, hr * 2.2, 0, TAU); c.fill(); }
    /* stick */
    rr(c, x - 2.2 * s, hy, 4.4 * s, y - hy, 2.2 * s); c.fillStyle = '#fffaf2'; c.fill(); c.lineWidth = 1.4 * s; c.strokeStyle = INK; c.stroke();
    c.save(); rr(c, x - 2.2 * s, hy, 4.4 * s, y - hy, 2.2 * s); c.clip(); c.strokeStyle = 'rgba(255,111,156,.55)'; c.lineWidth = 1.6 * s;
    for (let k = hy; k < y + 6 * s; k += 5 * s) { c.beginPath(); c.moveTo(x - 3 * s, k); c.lineTo(x + 3 * s, k - 3 * s); c.stroke(); } c.restore();
    /* head with swirl */
    c.beginPath(); c.arc(x, hy, hr, 0, TAU); c.fillStyle = o.tint || '#ff8db1'; c.fill();
    c.save(); c.beginPath(); c.arc(x, hy, hr, 0, TAU); c.clip();
    c.strokeStyle = '#fff2f7'; c.lineWidth = 2.4 * s; c.lineCap = 'round'; c.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.18) { const r = (a / (TAU * 2.2)) * hr * 1.08; c.lineTo(x + Math.cos(a + (o.spin || 0)) * r, hy + Math.sin(a + (o.spin || 0)) * r); }
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x - hr * 0.4, hy - hr * 0.45, hr * 0.32, hr * 0.18, -0.6, 0, TAU); c.fill();
    c.restore();
    c.beginPath(); c.arc(x, hy, hr, 0, TAU); c.lineWidth = 2 * s; c.strokeStyle = INK; c.stroke();
    /* number badge */
    if (num) {
      c.beginPath(); c.arc(x, hy, 6.6 * s, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.3 * s; c.strokeStyle = PLUM; c.stroke();
      T(c, String(num), x, hy + 0.6 * s, 9.5 * s, PLUM);
    }
    if (o.crown) { const cy = hy - hr - 2 * s; c.beginPath(); c.moveTo(x - 8 * s, cy); c.lineTo(x - 9 * s, cy - 9 * s); c.lineTo(x - 4 * s, cy - 4 * s); c.lineTo(x, cy - 11 * s); c.lineTo(x + 4 * s, cy - 4 * s); c.lineTo(x + 9 * s, cy - 9 * s); c.lineTo(x + 8 * s, cy); c.closePath(); c.fillStyle = GOLD; c.fill(); c.lineWidth = 1.4 * s; c.strokeStyle = INK; c.stroke(); }
    if (o.cross) { c.strokeStyle = '#ff3d5a'; c.lineWidth = 3.5 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - hr * 0.8, hy - hr * 0.8); c.lineTo(x + hr * 0.8, hy + hr * 0.8); c.moveTo(x + hr * 0.8, hy - hr * 0.8); c.lineTo(x - hr * 0.8, hy + hr * 0.8); c.stroke(); }
    c.restore();
    return {x: x - hr - 2, y: hy - hr - 2, w: hr * 2 + 4, h: y - hy + hr + 2};
  }

  /* the small in-level object: a candy scale on a stand */
  function station(c, x, y, t, solved) {
    c.save(); const a = solved ? -0.18 : Math.sin(t * 1.6) * 0.12;
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y, 14, 3, 0, 0, TAU); c.fill();
    rr(c, x - 11, y - 6, 22, 6, 3); c.fillStyle = ROSE; c.fill(); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke();
    rr(c, x - 2.5, y - 30, 5, 25, 2); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.save(); rr(c, x - 2.5, y - 30, 5, 25, 2); c.clip(); c.strokeStyle = ROSE; c.lineWidth = 1.8; for (let k = y - 34; k < y; k += 5) { c.beginPath(); c.moveTo(x - 4, k + 4); c.lineTo(x + 4, k); c.stroke(); } c.restore();
    const px = x, py = y - 31, L = 14, ex = Math.cos(a) * L, ey = Math.sin(a) * L;
    for (const sd of [-1, 1]) {
      const bx = px + ex * sd, by = py + ey * sd;
      c.strokeStyle = PLUM; c.lineWidth = 0.8; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - 4, by + 9); c.moveTo(bx, by); c.lineTo(bx + 4, by + 9); c.stroke();
      c.beginPath(); c.moveTo(bx - 6, by + 9); c.quadraticCurveTo(bx, by + 15, bx + 6, by + 9); c.closePath(); c.fillStyle = MINT; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(bx, by + 5, 2.6, 0, TAU); c.fillStyle = '#ff8db1'; c.fill(); c.lineWidth = 0.8; c.stroke();
    }
    c.save(); c.translate(px, py); c.rotate(a); rr(c, -L - 1, -1.6, L * 2 + 2, 3.2, 1.6); c.fillStyle = ROSE; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke(); c.restore();
    c.beginPath(); c.arc(px, py, 3, 0, TAU); c.fillStyle = GOLD; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
    if (solved) { for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; c.globalAlpha = 1 - k; star(c, x - 10 + i * 10, y - 38 - k * 10, 2.5, GOLD); } c.globalAlpha = 1; }
    else { c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); T(c, '?', x + 13, y - 38, 9, GOLD, {stroke: INK, sw: 2.5}); c.globalAlpha = 1; }
    c.restore();
  }

  function mount(root, api) {
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
    root.appendChild(cv);
    const ctx = cv.getContext('2d');
    const rng = api.rng || Math.random;
    let W = 0, H = 0, dpr = 1, Lay = null, alive = true, raf = 0, last = performance.now(), time = 0;
    const timers = [];
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };
    const S = {
      heavy: 0, lollis: [], pans: {L: [], R: []}, sel: -1, weighs: [], ang: 0, angV: 0, angT: 0, shown: false,
      busy: false, accuse: false, reveal: null, won: -1, parts: [], drag: null, auto: false, hover: null, pulse: 0,
    };
    for (let i = 0; i < 9; i++) S.lollis.push({n: i + 1, where: 'stand', x: 0, y: 0, s: 1, hop: 0, snap: true});
    const sfx = n => { try { api.sfx(n); } catch (e) {} };
    const tone = (f, d, o) => { try { if (G.audio && G.audio.tone) G.audio.tone(f, d, o); } catch (e) {} };

    function newRound(keepHeavy) {
      if (!keepHeavy) S.heavy = Math.floor(rng() * 9);
      S.pans.L = []; S.pans.R = []; S.sel = -1; S.weighs = []; S.angT = 0; S.shown = false; S.busy = false; S.accuse = false; S.reveal = null; S.drag = null;
      for (const l of S.lollis) { l.where = 'stand'; l.hop = 0.3; }
    }

    /* ---------- layout ---------- */
    function layout() {
      const w = Math.max(320, root.clientWidth), h = Math.max(200, root.clientHeight);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w !== W || h !== H || cv.width !== Math.round(w * dpr)) { W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const pad = 10, small = H < 330;
      const pw = Math.round(Math.max(200, Math.min(290, W * 0.3)));
      const ax = pad, aw = W - pw - pad * 3, px = W - pw - pad;
      const standH = Math.min(H * 0.37, 130);
      const shelfY = H - pad - 12;
      const spacing = aw / 9;
      const ss = Math.min(spacing * 0.78 / 26, (standH - 14) / 52, 2.2);
      const sh = H - standH - pad;
      const cx = ax + aw / 2, dr = Math.min(30, sh * 0.16), pivotY = pad + dr + 4;
      const Lb = Math.min(aw * 0.31, sh * 1.25, 210);
      const pwid = Lb * 0.98, depth = pwid * 0.16;
      const sl = Math.max(36, sh - (pivotY - 0) - Lb * Math.sin(TILT) - depth - 8);
      const sp = Math.min(sl * 0.78 / 50, (pwid - 14) / (CAP * 27));
      Lay = {dr, pad, small, pw, ax, aw, px, standH, shelfY, spacing, ss, sh, cx, pivotY, Lb, pwid, depth, sl, sp, baseY: pad + sh - 2};
    }
    function panPos(side, ang) {
      const L = Lay, sd = side === 'L' ? -1 : 1, a = ang === undefined ? S.ang : ang;
      const ex = L.cx + Math.cos(a) * L.Lb * sd, ey = L.pivotY + Math.sin(a) * L.Lb * sd;
      return {ex, ey, x: ex, y: ey + L.sl};
    }
    function lolliTarget(i) {
      const l = S.lollis[i], L = Lay;
      if (l.where === 'stand') return {x: L.ax + L.spacing * (i + 0.5), y: L.shelfY, s: L.ss};
      const list = S.pans[l.where], k = list.indexOf(i), n = list.length, p = panPos(l.where);
      const step = Math.min(Math.max(27 * L.sp, 36), (L.pwid - 16) / Math.max(1, n));   /* >= 36 px apart when the pan has room (phone taps) */
      return {x: p.x + (k - (n - 1) / 2) * step, y: p.y + L.depth * 0.45, s: L.sp};
    }

    /* ---------- actions ---------- */
    function msg(t, k) { try { api.msg(t, k || 'info'); } catch (e) {} }
    function burst(x, y, n, cols, sp) {
      for (let i = 0; i < n; i++) { const a = rng() * TAU, v = (0.4 + rng()) * (sp || 120); S.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0, max: 0.5 + rng() * 0.5, col: cols[i % cols.length], r: 2 + rng() * 3, star: rng() < 0.5}); }
    }
    function changed() { if (S.shown) { S.shown = false; S.angT = 0; } }
    function place(i, side) {
      const l = S.lollis[i]; if (S.busy || S.accuse) return false;
      if (l.where === side) return false;
      if (side !== 'stand' && S.pans[side].length >= CAP) { msg(tr(`Auf eine Schale passen höchstens ${CAP} Lollis.`, `A pan holds at most ${CAP} lollipops.`), 'bad'); sfx('bump'); return false; }
      if (l.where !== 'stand') S.pans[l.where].splice(S.pans[l.where].indexOf(i), 1);
      l.where = side; l.hop = 0; if (side !== 'stand') S.pans[side].push(i);
      if (S.sel >= 0) msg('', 'info');   /* drop the stale "now tap a pan" prompt */
      changed(); S.sel = -1;
      if (side === 'stand') sfx('pop'); else { tone(520 + S.pans[side].length * 90, 0.09, {type: 'triangle', gain: 0.12}); sfx('select'); }
      const tg = lolliTarget(i); burst(tg.x, tg.y - 30 * tg.s, 6, [PINK, '#fff', GOLD], 70);
      return true;
    }
    function names(list) { return list.slice().sort((a, b) => a - b).map(i => i + 1).join(' + '); }
    function weigh() {
      if (S.busy || S.accuse) return;
      if (S.weighs.length >= 2) { msg(tr('Die Waage ist gesperrt. Jetzt musst du dich entscheiden!', 'The scale is locked. Now you have to decide!'), 'bad'); sfx('bump'); return; }
      const nl = S.pans.L.length, nr = S.pans.R.length;
      if (!nl || !nr) { msg(tr('Leg erst auf beide Schalen Lollis.', 'Put lollipops on both pans first.'), 'bad'); sfx('bump'); return; }
      if (nl !== nr) { msg(tr('Leg auf beide Seiten gleich viele Lollis – sonst verrät die Waage nichts.', 'Put the same number of lollipops on each side – otherwise the scale tells you nothing.'), 'bad'); sfx('bump'); return; }
      const hl = S.pans.L.includes(S.heavy), hr = S.pans.R.includes(S.heavy);
      const res = hl ? 'L' : hr ? 'R' : '=';
      S.busy = true; S.angT = 0; S.angV += (rng() < 0.5 ? -1 : 1) * 2.2; sfx('tick');
      tone(300, 0.12, {type: 'triangle', gain: 0.08}); tone(340, 0.12, {type: 'triangle', gain: 0.08, delay: 0.18}); tone(300, 0.12, {type: 'triangle', gain: 0.08, delay: 0.36});
      later(() => {
        S.angT = res === 'L' ? -TILT : res === 'R' ? TILT : 0; S.angV += res === '=' ? 1.2 : 0; S.shown = true;
        const txt = names(S.pans.L) + tr(' gegen ', ' vs ') + names(S.pans.R) + ': ' + (res === 'L' ? tr('links schwerer', 'left is heavier') : res === 'R' ? tr('rechts schwerer', 'right is heavier') : tr('gleich schwer', 'balanced'));
        S.weighs.push({txt, res});
        sfx(res === '=' ? 'bell' : 'thud');
        const p = res === '=' ? {x: Lay.cx, y: Lay.pivotY} : panPos(res, S.angT);
        burst(p.x, p.y, 12, [GOLD, '#fff', PINK], 110);
        S.busy = false;
        if (S.weighs.length >= 2) { msg(tr('Zweimal gewogen – die Waage ist jetzt gesperrt. Wer ist der Schwere?', 'Weighed twice – the scale is locked now. Which one is the heavy one?'), 'info'); S.pulse = 1; }
        else msg(res === '=' ? tr('Gleich schwer! Was heißt das für die übrigen Lollis?', 'Balanced! What does that tell you about the other lollipops?') : res === 'L' ? tr('Die linke Schale sinkt nach unten!', 'The left pan sinks down!') : tr('Die rechte Schale sinkt nach unten!', 'The right pan sinks down!'), 'info');
        kick();
      }, S.auto ? 380 : 850);
    }
    function toggleAccuse() {
      if (S.busy || S.won >= 0 || S.reveal) return;
      S.accuse = !S.accuse; S.sel = -1; sfx('select');
      msg(S.accuse ? tr('Tippe auf den Lolli, der schwerer ist. Du hast nur einen Versuch!', 'Tap the lollipop that is heavier. You only get one try!') : '', 'info');
    }
    function accuse(i) {
      if (!S.accuse || S.busy) return;
      S.accuse = false; S.busy = true;
      const l = S.lollis[i], tg = lolliTarget(i);
      if (i === S.heavy) {
        S.won = i; l.hop = 0; sfx('star'); burst(tg.x, tg.y - 40 * tg.s, 30, [GOLD, '#fff', PINK, MINT], 200);
        msg(tr(`Lolli Nr. ${i + 1} ist der Schwere! Schlau gewogen!`, `Lollipop #${i + 1} is the heavy one! Clever weighing!`), 'good');
        later(() => { burst(tg.x, tg.y - 40 * tg.s, 24, [GOLD, '#fff', ROSE], 240); api.solved(); }, 650);
      } else {
        S.reveal = {wrong: i, heavy: S.heavy};
        api.wrong(tr(`Nr. ${i + 1} war federleicht! Der Schwere war Nr. ${S.heavy + 1}. Neue Runde – neuer heimlicher Schwerer.`, `#${i + 1} was light as a feather! The heavy one was #${S.heavy + 1}. New round – a new secret heavy one.`));
        later(() => { for (const ll of S.lollis) { const p = lolliTarget(S.lollis.indexOf(ll)); burst(p.x, p.y - 30 * p.s, 3, [PINK, '#fff'], 60); } newRound(false); sfx('appear'); kick(); }, 2200);
      }
    }
    function resetPans() {
      if (S.busy || S.accuse) return;
      if (!S.pans.L.length && !S.pans.R.length) return;
      for (const side of ['L', 'R']) for (const i of S.pans[side].slice()) { S.lollis[i].where = 'stand'; S.lollis[i].hop = 0; }
      S.pans.L = []; S.pans.R = []; changed(); sfx('pop');
    }

    /* ---------- drawing ---------- */
    let hits = [];
    function button(x, y, w, h, label, col, fn, o) {
      o = o || {}; const dis = !!o.disabled, hov = S.hover && S.hover.id === o.id;
      const k = o.pulse ? 1 + Math.sin(time * 6) * 0.035 : 1;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-x - w / 2, -y - h / 2);
      rr(ctx, x, y + 3, w, h, h / 2); ctx.fillStyle = dis ? 'rgba(0,0,0,.18)' : (o.dark || PLUM); ctx.fill();
      rr(ctx, x, y + (hov && !dis ? 1 : 0), w, h, h / 2); ctx.fillStyle = dis ? 'rgba(255,255,255,.14)' : col; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = dis ? 'rgba(255,255,255,.2)' : INK; ctx.stroke();
      T(ctx, label, x + w / 2, y + h / 2 + 1 + (hov && !dis ? 1 : 0), Math.min(15, h * 0.42), dis ? 'rgba(255,255,255,.45)' : (o.ink || '#fff'), {stroke: dis || o.ink ? null : 'rgba(58,32,48,.55)', sw: 3});
      ctx.restore();
      if (!dis && fn) hits.push({x, y, w, h, fn, id: o.id, cursor: 'pointer'});
    }
    function drawScale() {
      const L = Lay, cx = L.cx, py = L.pivotY;
      /* soft spotlight */
      const g = ctx.createRadialGradient(cx, py + L.sh * 0.4, 10, cx, py + L.sh * 0.4, L.aw * 0.55); g.addColorStop(0, 'rgba(255,214,231,.20)'); g.addColorStop(1, 'rgba(255,214,231,0)');
      ctx.fillStyle = g; ctx.fillRect(L.ax, 0, L.aw, L.sh + L.pad);
      /* base + candy cane pillar */
      const by = L.baseY, bw = Math.min(110, L.Lb * 0.7);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx, by + 2, bw * 0.6, 6, 0, 0, TAU); ctx.fill();
      rr(ctx, cx - bw / 2, by - 14, bw, 14, 7); ctx.fillStyle = ROSE; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
      rr(ctx, cx - bw / 2 + 6, by - 12, bw - 12, 4, 2); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      const pwid = 12; rr(ctx, cx - pwid / 2, py, pwid, by - 14 - py, 6); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.save(); rr(ctx, cx - pwid / 2, py, pwid, by - 14 - py, 6); ctx.clip(); ctx.strokeStyle = '#ff4d7e'; ctx.lineWidth = 4.5;
      for (let k = py - 20; k < by + 10; k += 12) { ctx.beginPath(); ctx.moveTo(cx - 10, k + 9); ctx.lineTo(cx + 10, k - 3); ctx.stroke(); } ctx.restore();
      rr(ctx, cx - pwid / 2, py, pwid, by - 14 - py, 6); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
      /* dial behind the pivot shows the tilt */
      const dr = L.dr;
      ctx.beginPath(); ctx.arc(cx, py + 4, dr, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,244,224,.85)'; ctx.stroke();
      for (let k = -2; k <= 2; k++) { const a = -Math.PI / 2 + k * 0.25; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (dr - 4), py + 4 + Math.sin(a) * (dr - 4)); ctx.lineTo(cx + Math.cos(a) * (dr + 3), py + 4 + Math.sin(a) * (dr + 3)); ctx.lineWidth = k ? 1.5 : 2.5; ctx.strokeStyle = k ? PLUM : ROSE; ctx.stroke(); }
      ctx.save(); ctx.translate(cx, py + 4); ctx.rotate(S.ang * 1.6); ctx.beginPath(); ctx.moveTo(-2.5, 0); ctx.lineTo(0, -dr + 2); ctx.lineTo(2.5, 0); ctx.closePath(); ctx.fillStyle = ROSE; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
      /* pans (strings, then lollis, then bowl front) */
      for (const side of ['L', 'R']) {
        const p = panPos(side), half = L.pwid / 2;
        const hot = (S.sel >= 0 || S.drag) && !S.accuse && S.lollis[S.sel >= 0 ? S.sel : S.drag.i] && hoverPan === side;
        ctx.strokeStyle = PLUM; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(p.ex, p.ey); ctx.lineTo(p.x - half + 6, p.y); ctx.moveTo(p.ex, p.ey); ctx.lineTo(p.x + half - 6, p.y); ctx.moveTo(p.ex, p.ey); ctx.lineTo(p.x, p.y - 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.ex, p.ey, 4, 0, TAU); ctx.fillStyle = GOLD; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
        /* back rim */
        ctx.beginPath(); ctx.ellipse(p.x, p.y, half, L.depth * 0.32, 0, 0, TAU); ctx.fillStyle = '#5fbf86'; ctx.fill();
        for (const i of S.pans[side]) drawLolliAt(i);
        /* bowl front */
        ctx.beginPath(); ctx.moveTo(p.x - half, p.y); ctx.quadraticCurveTo(p.x - half + 4, p.y + L.depth * 1.15, p.x, p.y + L.depth * 1.15); ctx.quadraticCurveTo(p.x + half - 4, p.y + L.depth * 1.15, p.x + half, p.y); ctx.ellipse(p.x, p.y, half, L.depth * 0.32, 0, 0, Math.PI, false); ctx.closePath();
        const bg = ctx.createLinearGradient(0, p.y, 0, p.y + L.depth); bg.addColorStop(0, '#b8f3c1'); bg.addColorStop(1, '#6fcf8c'); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(p.x - half * 0.45, p.y + L.depth * 0.45, half * 0.22, L.depth * 0.12, -0.15, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
        if (hot) { ctx.beginPath(); ctx.ellipse(p.x, p.y + L.depth * 0.3, half + 8, L.depth + 10, 0, 0, TAU); ctx.strokeStyle = 'rgba(255,216,74,' + (0.6 + 0.3 * Math.sin(time * 8)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); }
        else if ((S.sel >= 0) && !S.accuse && S.pans[side].length < CAP) { ctx.beginPath(); ctx.ellipse(p.x, p.y + L.depth * 0.3, half + 6, L.depth + 8, 0, 0, TAU); ctx.strokeStyle = 'rgba(255,216,74,.45)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]); }
        T(ctx, side === 'L' ? tr('links', 'left') : tr('rechts', 'right'), p.x, p.y + L.depth * 1.15 + 9, 11, 'rgba(255,244,224,.75)', {w: 600});
      }
      /* beam on top */
      ctx.save(); ctx.translate(cx, py); ctx.rotate(S.ang);
      rr(ctx, -L.Lb - 6, -5, L.Lb * 2 + 12, 10, 5); ctx.fillStyle = ROSE; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
      rr(ctx, -L.Lb, -3.5, L.Lb * 2, 3, 1.5); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();
      for (let k = -3; k <= 3; k++) if (k) { ctx.beginPath(); ctx.arc(k * L.Lb / 3.6, 0, 1.6, 0, TAU); ctx.fillStyle = '#ffd1e0'; ctx.fill(); }
      ctx.restore();
      /* heart pivot */
      ctx.save(); ctx.translate(cx, py - 2); const hs = 1.15;
      ctx.beginPath(); ctx.moveTo(0, 9 * hs); ctx.bezierCurveTo(-13 * hs, 0, -8 * hs, -11 * hs, 0, -5 * hs); ctx.bezierCurveTo(8 * hs, -11 * hs, 13 * hs, 0, 0, 9 * hs); ctx.fillStyle = GOLD; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(-3.5, -3, 2, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
      ctx.restore();
    }
    let hoverPan = null;
    function lolliOpts(i) {
      const l = S.lollis[i], o = {};
      if (S.sel === i) o.glow = 'rgba(255,216,74,.85)';
      if (S.accuse) o.rot = Math.sin(time * 9 + i) * 0.08;
      if (S.reveal) { if (S.reveal.heavy === i) { o.glow = 'rgba(255,216,74,.9)'; o.crown = true; } if (S.reveal.wrong === i) o.cross = true; }
      if (S.won === i) { o.glow = 'rgba(255,240,150,.95)'; o.crown = true; o.spin = time * 4; }
      return o;
    }
    function drawLolliAt(i) {
      const l = S.lollis[i];
      if (S.drag && S.drag.i === i && S.drag.moved) return;
      let y = l.y; const hopK = Math.min(1, l.hop / 0.35);
      y -= Math.sin(hopK * Math.PI) * 10 * l.s * (l.hop < 0.35 ? 1 : 0);
      if (S.sel === i) y -= 8 * l.s + Math.sin(time * 6) * 2;
      if (S.won === i) y -= Math.abs(Math.sin(time * 7)) * 14;
      if (S.accuse) y -= Math.abs(Math.sin(time * 5 + i * 0.7)) * 3;
      const box = drawLolli(ctx, l.x, y, l.s, l.n, lolliOpts(i));
      const hw = l.where === 'stand' ? box.w : Math.max(box.w, Math.min(36, (Lay.pwid - 16) / Math.max(1, S.pans[l.where].length)));   /* small pan lollis: tap area = their slot */
      hits.push({x: l.x - hw / 2, y: box.y, w: hw, h: box.h + 4, lolli: i, cursor: 'pointer'});
    }
    function drawStand() {
      const L = Lay, y = L.shelfY;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(ctx, L.ax + 4, y + 4, L.aw - 8, 12, 6); ctx.fill();
      rr(ctx, L.ax, y - 4, L.aw, 14, 7); ctx.fillStyle = '#c98657'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
      rr(ctx, L.ax + 6, y - 2, L.aw - 12, 4, 2); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
      /* scalloped icing */
      ctx.fillStyle = PINK; const n = Math.round(L.aw / 18);
      for (let k = 0; k < n; k++) { const x = L.ax + (k + 0.5) * L.aw / n; ctx.beginPath(); ctx.arc(x, y + 9, L.aw / n / 2, 0, Math.PI); ctx.fill(); }
      for (let i = 0; i < 9; i++) { const x = L.ax + L.spacing * (i + 0.5); ctx.beginPath(); ctx.ellipse(x, y - 3, 5, 2, 0, 0, TAU); ctx.fillStyle = '#7a4a2a'; ctx.fill(); }
      for (let i = 0; i < 9; i++) if (S.lollis[i].where === 'stand') drawLolliAt(i);
    }
    function drawPanel() {
      const L = Lay, x = L.px, w = L.pw, top = L.pad, small = L.small;
      const bh = small ? Math.round(Math.max(28, Math.min(34, (H - L.pad * 2) * 0.15))) : 40, gap = small ? 6 : 9;
      const btnTop = H - L.pad - (bh * 3 + gap * 2) - 2;
      /* log card */
      const ch = btnTop - top - gap;
      rr(ctx, x, top, w, ch, 14); ctx.fillStyle = 'rgba(255,244,224,.95)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      rr(ctx, x, top, w, small ? 24 : 30, 14); ctx.fillStyle = PINK; ctx.fill(); ctx.stroke();
      T(ctx, tr('Wiege-Buch', 'Weighing Log'), x + w / 2, top + (small ? 12 : 15), small ? 13 : 15, PLUM);
      let yy = top + (small ? 32 : 42);
      for (let k = 0; k < 2; k++) {
        const e = S.weighs[k], px = small ? 11 : 12;
        ctx.beginPath(); ctx.arc(x + 16, yy + 7, 9, 0, TAU); ctx.fillStyle = e ? (e.res === '=' ? MINT : GOLD) : 'rgba(122,59,87,.15)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = e ? INK : 'rgba(122,59,87,.35)'; ctx.stroke();
        T(ctx, String(k + 1), x + 16, yy + 8, 11, e ? INK : 'rgba(122,59,87,.6)');
        const lines = wrap(ctx, e ? e.txt : (k === S.weighs.length ? tr('noch frei …', 'not used yet …') : '—'), w - 40, px, e ? 600 : 500);
        lines.forEach((ln, j) => T(ctx, ln, x + 30, yy + 7 + j * (px + 3), px, e ? INK : 'rgba(122,59,87,.55)', {a: 'left', w: e ? 600 : 500}));
        yy += Math.max(20, lines.length * (px + 3) + 8);
      }
      const rules = [tr('Gleich viele Lollis auf jede Schale', 'Same number on each pan'), tr(`Höchstens ${CAP} pro Schale`, `At most ${CAP} per pan`), tr('Antippen: Lolli → Schale (oder ziehen)', 'Tap: lollipop → pan (or drag)')];
      if (!small && yy + rules.length * 18 + 40 < top + ch) {
        yy += 4; ctx.strokeStyle = 'rgba(122,59,87,.2)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x + 12, yy); ctx.lineTo(x + w - 12, yy); ctx.stroke(); ctx.setLineDash([]); yy += 14;
        for (const r of rules) { star(ctx, x + 18, yy, 4.5, ROSE); T(ctx, r, x + 30, yy + 1, 11.5, PLUM, {a: 'left', w: 500}); yy += 18; }
      }
      if (yy + 18 < top + ch) {
        const tip = S.weighs.length >= 2 ? tr('Gesperrt. Wer ist der Schwere?', 'Locked. Which one is heavy?') : (S.sel >= 0 ? tr('Jetzt eine Schale antippen!', 'Now tap a pan!') : tr('Tippe einen Lolli an und dann eine Schale.', 'Tap a lollipop, then a pan.'));
        const lines = wrap(ctx, tip, w - 24, small ? 10.5 : 11.5, 500);
        const ly = Math.max(yy + 4, top + ch - 8 - lines.length * 14);
        lines.forEach((ln, j) => T(ctx, ln, x + w / 2, ly + j * 14 + 6, small ? 10.5 : 11.5, PLUM, {w: 500}));
      }
      const left = 2 - S.weighs.length, locked = left <= 0;
      button(x, btnTop, w, bh, locked ? tr('Waage gesperrt', 'Scale locked') : tr('Wiegen', 'Weigh') + ' (' + S.weighs.length + '/2)', MINT, weigh, {id: 'w', disabled: locked || S.busy || S.accuse || S.reveal || S.won >= 0, ink: INK, dark: '#3f8f57'});
      button(x, btnTop + bh + gap, w, bh, S.accuse ? tr('Abbrechen', 'Cancel') : tr('Der Schwere ist …', 'The heavy one is …'), S.accuse ? '#b46a8c' : ROSE, toggleAccuse, {id: 'a', disabled: S.busy || !!S.reveal || S.won >= 0, pulse: locked && !S.accuse});
      button(x, btnTop + (bh + gap) * 2, w, bh, tr('Alle Lollis zurück', 'All lollipops back'), 'rgba(255,255,255,.18)', resetPans, {id: 'r', disabled: S.busy || S.accuse || (!S.pans.L.length && !S.pans.R.length), dark: 'rgba(0,0,0,.25)'});
    }
    function draw() {
      if (!Lay) layout();
      hits = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      /* meadow backdrop */
      const L = Lay, bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#5a3a66'); bg.addColorStop(1, '#3e2747');
      rr(ctx, L.ax - 4, 4, L.aw + 8, H - 8, 14); ctx.fillStyle = bg; ctx.fill();
      ctx.save(); rr(ctx, L.ax - 4, 4, L.aw + 8, H - 8, 14); ctx.clip();
      ctx.fillStyle = 'rgba(155,231,165,.12)'; ctx.beginPath(); ctx.ellipse(L.ax + L.aw * 0.2, H + 20, L.aw * 0.45, 70, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(L.ax + L.aw * 0.85, H + 30, L.aw * 0.4, 80, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 14; k++) { const x = L.ax + ((k * 97.3) % L.aw), y = 14 + ((k * 53.1) % (H * 0.55)); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(time * 1.5 + k); star(ctx, x, y, 2 + (k % 3), '#ffe9f1'); } ctx.globalAlpha = 1;
      drawScale();
      drawStand();
      if (S.accuse) {
        /* small banner just above the lolli heads on the shelf, so it never covers the pans */
        const label = tr('Tippe auf den schweren Lolli!', 'Tap the heavy lollipop!'), fz = L.small ? 12.5 : 14; ctx.font = '700 ' + fz + 'px ' + FONT;
        const bh = L.small ? 24 : 28, bw = Math.min(L.aw - 20, ctx.measureText(label).width + 30), bx = L.cx - bw / 2;
        const by = L.shelfY - 52 * L.ss - bh - 6 + Math.sin(time * 4) * 2;
        rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = 'rgba(255,111,156,.95)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
        T(ctx, label, L.cx, by + bh / 2 + 1, fz, '#fff', {stroke: 'rgba(58,32,48,.5)', sw: 3});
      }
      ctx.restore();
      /* dragged lolli on top */
      if (S.drag && S.drag.moved) { const l = S.lollis[S.drag.i]; drawLolli(ctx, S.drag.x, S.drag.y + 30 * Math.max(l.s, Lay.sp), Math.max(l.s, Lay.sp) * 1.08, l.n, {glow: 'rgba(255,216,74,.6)', rot: Math.sin(time * 10) * 0.06}); }
      drawPanel();
      /* particles */
      for (const p of S.parts) { const a = 1 - p.life / p.max; ctx.globalAlpha = Math.max(0, a); if (p.star) star(ctx, p.x, p.y, p.r * 1.4, p.col); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fillStyle = p.col; ctx.fill(); } }
      ctx.globalAlpha = 1;
    }
    function step(dt) {
      time += dt;
      /* beam spring */
      S.angV += ((S.angT - S.ang) * 70 - S.angV * 7.5) * dt; S.ang += S.angV * dt;
      if (Math.abs(S.ang) > 0.45) { S.ang = Math.sign(S.ang) * 0.45; S.angV = 0; }
      for (let i = 0; i < 9; i++) {
        const l = S.lollis[i], tg = lolliTarget(i);
        if (l.snap) { l.x = tg.x; l.y = tg.y; l.s = tg.s; l.snap = false; continue; }
        const k = 1 - Math.exp(-dt * 13);
        l.x += (tg.x - l.x) * k; l.y += (tg.y - l.y) * k; l.s += (tg.s - l.s) * k; l.hop += dt;
      }
      for (const p of S.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 0.98; }
      S.parts = S.parts.filter(p => p.life < p.max);
    }
    function kick() { draw(); }
    function loop(now) {
      if (!alive) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      step(dt); draw(); raf = requestAnimationFrame(loop);
    }

    /* ---------- input ---------- */
    function pos(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height)}; }
    function hitAt(p) { for (let k = hits.length - 1; k >= 0; k--) { const h = hits[k]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
    function panAt(p) {
      for (const side of ['L', 'R']) { const q = panPos(side), half = Lay.pwid / 2 + 14; if (p.x > q.x - half && p.x < q.x + half && p.y > q.ey - 6 && p.y < q.y + Lay.depth * 1.3 + 14) return side; }
      return null;
    }
    function onDown(e) {
      if (S.auto) return;
      const p = pos(e), h = hitAt(p);
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      if (h && h.fn) { h.fn(); kick(); return; }
      if (h && h.lolli !== undefined) {
        if (S.accuse) { accuse(h.lolli); kick(); return; }
        if (S.busy || S.reveal || S.won >= 0) return;
        S.drag = {i: h.lolli, x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false}; kick(); return;
      }
      const side = panAt(p);
      if (side && S.sel >= 0) { place(S.sel, side); kick(); return; }
      if (S.sel >= 0) { S.sel = -1; kick(); }
    }
    function onMove(e) {
      const p = pos(e);
      if (S.drag) {
        S.drag.x = p.x; S.drag.y = p.y;
        if (!S.drag.moved && Math.hypot(p.x - S.drag.x0, p.y - S.drag.y0) > 8) { S.drag.moved = true; S.sel = -1; sfx('select'); }
        hoverPan = S.drag.moved ? panAt(p) : null; kick(); return;
      }
      const h = hitAt(p), id = h ? (h.id || ('l' + h.lolli)) : null;
      hoverPan = S.sel >= 0 ? panAt(p) : null;
      cv.style.cursor = h || (hoverPan && S.sel >= 0) ? 'pointer' : 'default';
      if ((S.hover && S.hover.id) !== id) { S.hover = h ? {id} : null; kick(); }
    }
    function onUp(e) {
      const d = S.drag; if (!d) return;
      S.drag = null; hoverPan = null;
      const l = S.lollis[d.i];
      if (d.moved) {
        const side = panAt(pos(e));
        if (side) place(d.i, side);
        else if (l.where !== 'stand' && pos(e).y > Lay.shelfY - Lay.standH) place(d.i, 'stand');
        else { l.x = d.x; l.y = d.y + 30 * l.s; sfx('bump'); }
      } else if (l.where !== 'stand' && S.sel >= 0 && S.sel !== d.i) place(S.sel, l.where);   /* a lolli is waiting: the tap meant "this pan" */
      else if (l.where !== 'stand') place(d.i, 'stand');
      else { S.sel = S.sel === d.i ? -1 : d.i; sfx('select'); l.hop = 0; if (S.sel >= 0) msg(tr(`Lolli Nr. ${d.i + 1} – jetzt tippe auf eine Schale.`, `Lollipop #${d.i + 1} – now tap a pan.`), 'info'); }
      kick();
    }
    function onKey(e) {
      if (S.auto) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) { if (S.accuse) accuse(n - 1); else { S.sel = S.sel === n - 1 ? -1 : n - 1; sfx('select'); } kick(); }
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && S.sel >= 0) { place(S.sel, e.key === 'ArrowLeft' ? 'L' : 'R'); kick(); }
      else if (e.key === 'Enter') { weigh(); kick(); }
    }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { layout(); for (const l of S.lollis) l.snap = true; step(0); draw(); }) : null;
    if (ro) ro.observe(root);

    newRound(false);
    layout(); for (const l of S.lollis) l.snap = true; step(0); draw();
    raf = requestAnimationFrame(loop);

    const handle = {
      destroy() { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (ro) ro.disconnect(); window.removeEventListener('keydown', onKey); },
      autoSolve() {
        if (S.won >= 0 || S.auto) return;
        if (S.busy || S.reveal) { later(() => handle.autoSolve(), 200); return; }
        S.auto = true; const h = S.heavy;
        newRound(true); S.heavy = h; msg(tr('So geht’s: 3 gegen 3, dann 1 gegen 1 …', 'Here’s how: 3 vs 3, then 1 vs 1 …'), 'info'); kick();
        let t = 120; const at = (ms, fn) => { t += ms; later(() => { fn(); kick(); }, t); };
        [0, 1, 2].forEach(i => at(70, () => place(i, 'L')));
        [3, 4, 5].forEach(i => at(70, () => place(i, 'R')));
        at(120, weigh);
        at(520, () => {
          const r = S.weighs[0].res, grp = r === 'L' ? [0, 1, 2] : r === 'R' ? [3, 4, 5] : [6, 7, 8];
          resetPans(); S.grp = grp;
        });
        at(90, () => place(S.grp[0], 'L'));
        at(70, () => place(S.grp[1], 'R'));
        at(110, weigh);
        at(520, () => {
          const r = S.weighs[1].res, g = S.grp, ans = r === 'L' ? g[0] : r === 'R' ? g[1] : g[2];
          S.accuse = true; accuse(ans);
        });
      },
    };
    return handle;
  }

  const DEF = {
    id: 'wiese-waage', world: 'wiese', slot: 0,
    title: tr('Die Lolli-Waage', 'The Lollipop Scale'),
    intro: tr('Neun gleiche Lollis – einer ist heimlich schwerer! Du darfst nur ZWEIMAL wiegen, dann tippe „Der Schwere ist …“ und zeig auf ihn. Ein Versuch pro Runde!', 'Nine identical lollipops – one is secretly heavier! You may weigh only TWICE, then tap "The heavy one is …" and point at it. One try per round!'),
    letter: tr('Drei Gruppen, Toffo! Wer immer nur zwei vergleicht, vergisst die dritte.', 'Three groups, Toffo! If you only ever compare two, you forget the third.'),
    hint: tr('Teile die neun Lollis in drei Dreiergruppen. Wiege 3 gegen 3: Sinkt eine Seite, steckt der Schwere dort – bleibt die Waage gerade, ist er in der dritten Gruppe. Aus dieser Gruppe wiegst du dann 1 gegen 1 und denkst genauso.', 'Split the nine lollipops into three groups of three. Weigh 3 against 3: if one side sinks, the heavy one is there – if the scale stays level, it is in the third group. From that group, weigh 1 against 1 and think the same way.'),
    station, mount,
  };
  if (G.PZ) G.PZ.register(DEF);
  else window.addEventListener('DOMContentLoaded', () => { if (G.PZ) G.PZ.register(DEF); });
})();

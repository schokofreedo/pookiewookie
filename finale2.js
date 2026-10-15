/* The Starway Home finale, part 2 (world 'finale'):
   G.modes.ranch  - level 3 "Ranch": the gun is locked in the barn safe (puzzle 'finale-tresor'), then a run-and-gun showdown against
                    the chocolate mafia (limousine waves, cover that wears down, five named bosses, Der Pate with two phases).
   G.modes.cinema - level 4 "Zuhause": the ending film (sunset hug, seaplane flight, snowy city, cozy apartment, "Ende", credits).
   Both are self-contained: own physics, enemies, rendering, HUD and (for the film) their own synthesized music. */
(function () {
  const G = window.PW = window.PW || {};
  G.modes = G.modes || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const VH = 270, TAU = Math.PI * 2, DT = 1 / 60;
  const VW = () => G.VW || 480;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const sstep = (t, a, b) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hash = (i, s) => { let h = Math.imul((i | 0) + 0x9e37, 2654435761) ^ Math.imul((s | 0) + 7, 1597334677); h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const OL = '#2a1508';

  /* ---------- audio (always guarded) ---------- */
  function sfx(n, a) { try { const A = G.audio; if (A && A.sfx && A.sfx[n]) A.sfx[n](a); } catch (e) {} }
  function tone(f, d, o) { try { if (G.audio && G.audio.tone) G.audio.tone(f, d, o || {}); } catch (e) {} }
  function noise(d, o) { try { if (G.audio && G.audio.noise) G.audio.noise(d, o || {}); } catch (e) {} }
  function bell(f, d, g, dl) { try { if (G.audio && G.audio.bell) G.audio.bell(f, d, g, dl || 0); } catch (e) {} }
  function setBoss(on) { try { if (G.audio && G.audio.setBoss) G.audio.setBoss(on); } catch (e) {} }
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- drawing helpers ---------- */
  const font = (ctx, px, w) => { ctx.font = (w || 700) + ' ' + px + 'px "Fredoka", sans-serif'; ctx.textBaseline = 'middle'; };
  function outlined(ctx, t, x, y, px, col, align, ol, w) { font(ctx, px, w); ctx.textAlign = align || 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.32; ctx.strokeStyle = ol || 'rgba(42,21,40,.9)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fsr(ctx, fill, stroke, lw) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function circ(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); fsr(ctx, fill, stroke, lw); }
  function ell(ctx, x, y, rx, ry, rot, fill, stroke, lw) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); fsr(ctx, fill, stroke, lw); }
  function heartPath(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + 4 * s); ctx.bezierCurveTo(x - 8 * s, y - 2 * s, x - 4 * s, y - 8 * s, x, y - 4 * s); ctx.bezierCurveTo(x + 4 * s, y - 8 * s, x + 8 * s, y - 2 * s, x, y + 4 * s); ctx.closePath(); }
  function starPath(ctx, x, y, r1, r2, n, rot) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (rot || -Math.PI / 2) + i * Math.PI / n, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function glow(ctx, x, y, r, col, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
  function bear(ctx, x, y, o) { ctx.save(); try { if (G.draw && G.draw.drawBearAt) G.draw.drawBearAt(ctx, x, y, o); } catch (e) {} ctx.restore(); }
  function bubble(ctx, x, y, text, maxW, px, lo, hi) {
    px = px || 8; font(ctx, px, 600); const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
    if (cur) lines.push(cur);
    const lh = px * 1.25, bw = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + 12, bh = lines.length * lh + 8;
    const bx = clamp(x - bw / 2, lo == null ? 4 : lo, (hi == null ? VW() - 4 : hi) - bw), by = y - bh - 8;
    ctx.save(); ctx.shadowColor = 'rgba(42,21,40,.25)'; ctx.shadowOffsetY = 2;
    rr(ctx, bx, by, bw, bh, 7); fsr(ctx, '#fff', '#ff9eb0', 1.5); ctx.restore();
    ctx.beginPath(); ctx.moveTo(clamp(x, bx + 8, bx + bw - 8) - 4, by + bh - 0.5); ctx.lineTo(clamp(x, bx + 8, bx + bw - 8) + 4, by + bh - 0.5); ctx.lineTo(x, by + bh + 6); ctx.closePath(); fsr(ctx, '#fff'); ctx.strokeStyle = '#ff9eb0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(clamp(x, bx + 8, bx + bw - 8) - 4, by + bh); ctx.lineTo(x, by + bh + 6); ctx.lineTo(clamp(x, bx + 8, bx + bw - 8) + 4, by + bh); ctx.stroke();
    ctx.fillStyle = '#7a3b57'; ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 4 + lh * (i + 0.5)));
  }

  /* ======================================================================================================== RANCH */
  const GY = 228, AX = 780, SAFE_X = 505, MAXHP = 5;
  const BOSSES = {
    pralino: {name: 'Don Pralino', hp: 24, sub: tr('Blitzschnelle Pistolen-Salven – duck dich hinter die Deckung!', 'Lightning-fast pistol volleys – duck behind cover!'), spot: 'crate', fur: '#6a3a20', band: '#ff6f9c', sc: 0.82, gun: 'pistol'},
    trueffel: {name: tr('Big Trüffel', 'Big Truffle'), hp: 28, sub: tr('Wirft Dynamit! Lauf weg, geh in Deckung oder schieß es in der Luft ab.', 'Throws dynamite! Run, take cover or shoot it out of the air.'), spot: 'door', fur: '#4a2a18', band: '#ffd84a', sc: 0.9, wide: 1.4, gun: 'dyn'},
    luigi: {name: 'Lorenzo Nougat', hp: 30, sub: tr('Schrotflinte! Er wechselt ständig seine Deckung.', 'Shotgun! He keeps switching cover.'), spot: 'barrel', fur: '#b07a4a', band: '#2f9e5b', sc: 0.84, gun: 'shotgun'},
    marzipan: {name: 'Madame Marzipan', hp: 32, sub: tr('Zwei Pistolen und eine flinke Rolle!', 'Two pistols and a speedy roll!'), spot: 'crate', fur: '#f3c9a8', band: '#ff9eb0', sc: 0.8, gun: 'dual'},
    pate: {name: tr('Der Pate', 'The Chocfather'), hp: 48, sub: tr('Der Boss der Schoko-Mafia will Mallos Kakao-Rezept! MG auf dem Dach: ducken oder drüberspringen.', "The Choco Mafia boss wants Mallo's cocoa recipe! Roof gun: duck or jump over."), spot: 'roof', fur: '#a4a2b0', band: '#fff4e0', sc: 0.92, gun: 'mg'},
  };
  const BOSS_ORDER = ['pralino', 'trueffel', 'luigi', 'marzipan', 'pate'];
  const MOOK = {fur: '#8a5a3a', band: '#c23a3a', sc: 0.76, hp: 4, gun: 'pistol'};
  const STAGES = [
    {boss: null, mooks: ['crate', 'door']},
    {boss: 'pralino', mooks: ['door']},
    {boss: 'trueffel', mooks: ['crate']},
    {boss: 'luigi', mooks: ['door']},
    {boss: 'marzipan', mooks: ['door']},
    {boss: 'pate', mooks: ['crate', 'barrel']},
  ];
  const COVERS = [{lx: 42, w: 30, h: 21, kind: 'hay'}, {lx: 106, w: 34, h: 22, kind: 'fence'}, {lx: 170, w: 40, h: 18, kind: 'trough'}, {lx: 234, w: 22, h: 24, kind: 'barrel'}];

  /* ---------- props ---------- */
  function drawHay(ctx, x, y, w, h, dmg) {
    rr(ctx, x - w / 2, y - h, w, h, 4); fsr(ctx, '#f2c45a', OL, 1.2);
    ctx.strokeStyle = 'rgba(160,110,30,.55)'; ctx.lineWidth = 0.8; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, y - h + i * h / 5); ctx.lineTo(x + w / 2 - 3, y - h + i * h / 5 + (i % 2 ? 1 : -1)); ctx.stroke(); }
    ctx.fillStyle = '#a0522d'; ctx.fillRect(x - w / 4 - 1, y - h, 2, h); ctx.fillRect(x + w / 4 - 1, y - h, 2, h);
    ctx.fillStyle = 'rgba(255,240,170,.6)'; ctx.fillRect(x - w / 2 + 3, y - h + 1.5, w - 6, 1.5);
    if (dmg > 0.3) { ctx.strokeStyle = '#f2c45a'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const sx = x - w / 2 + 2 + hash(i, w) * (w - 4); ctx.beginPath(); ctx.moveTo(sx, y - h + 1); ctx.lineTo(sx + (hash(i, 3) - 0.5) * 6, y - h - 2 - hash(i, 9) * 3); ctx.stroke(); } }
  }
  function drawBarrel(ctx, x, y, w, h, dmg, dark) {
    rr(ctx, x - w / 2, y - h, w, h, 4); fsr(ctx, dark ? '#5a4a52' : '#b0703a', OL, 1.2);
    ctx.fillStyle = dark ? '#3a2e36' : '#8a5428'; for (let i = 1; i < 4; i++) ctx.fillRect(x - w / 2 + i * w / 4 - 0.5, y - h + 2, 1, h - 4);
    ctx.fillStyle = dark ? '#8a8a96' : '#6a6a78'; ctx.fillRect(x - w / 2, y - h + 3, w, 2.2); ctx.fillRect(x - w / 2, y - 5, w, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - w / 2 + 2, y - h + 2, 2, h - 4);
    if (dark) { circ(ctx, x, y - h / 2, 4, '#c8423a'); outlined(ctx, '☠', x, y - h / 2 + 0.5, 5, '#fff', 'center', 'rgba(0,0,0,0)'); }
    if (dmg > 0) for (let i = 0; i < Math.floor(dmg * 7); i++) circ(ctx, x - w / 2 + 3 + hash(i, 5) * (w - 6), y - h + 4 + hash(i, 6) * (h - 8), 1.1, '#2a1508');
  }
  function drawCrate(ctx, x, y, w, h) {
    rr(ctx, x - w / 2, y - h, w, h, 2); fsr(ctx, '#c08a4a', OL, 1.2);
    ctx.strokeStyle = '#7a5028'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - w / 2 + 2, y - h + 2); ctx.lineTo(x + w / 2 - 2, y - 2); ctx.moveTo(x + w / 2 - 2, y - h + 2); ctx.lineTo(x - w / 2 + 2, y - 2); ctx.stroke();
    rr(ctx, x - 8, y - h / 2 - 3.5, 16, 7, 2); fsr(ctx, '#fff4e0'); outlined(ctx, tr('SCHOKO', 'CHOCO'), x, y - h / 2, 3.6, '#7a3b57', 'center', 'rgba(0,0,0,0)', 700);
  }
  function drawFence(ctx, x, y, w, h, frac) {
    const n = 4, pw = w / n - 1, left = Math.ceil(n * frac);
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - w / 2, y - h * 0.75, w, 3); ctx.fillRect(x - w / 2, y - h * 0.35, w, 3);
    for (let i = 0; i < n; i++) { if (i >= left && i !== 0) continue; const px = x - w / 2 + i * (pw + 1.3); const ph = h - (i % 2) * 1.5; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y - ph + 2); ctx.lineTo(px + pw / 2, y - ph); ctx.lineTo(px + pw, y - ph + 2); ctx.lineTo(px + pw, y); ctx.closePath(); fsr(ctx, i % 2 ? '#c88a52' : '#d89a5e', OL, 1); }
  }
  function drawTrough(ctx, x, y, w, h, frac, t) {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w / 2 - 4, y); ctx.lineTo(x - w / 2 + 4, y); ctx.closePath(); fsr(ctx, '#9a6a3a', OL, 1.2);
    ctx.fillStyle = '#6fc3ee'; ctx.fillRect(x - w / 2 + 2, y - h + 1.5, w - 4, 2.5); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - w / 2 + 6 + Math.sin(t * 2) * 3, y - h + 2, 6, 0.8);
    ctx.fillStyle = '#7a5028'; ctx.fillRect(x - w / 2 + 1, y - h * 0.5, w - 2, 1.4);
    if (frac < 0.95) { ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 1.1; const n = Math.min(4, Math.ceil((1 - frac) * 5)); for (let i = 0; i < n; i++) { const sx = x - w / 2 + 6 + i * (w - 12) / 3, sy = y - h * 0.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - 3, sy + 1, sx - 4 - (i % 2) * 2, y); ctx.stroke(); } }
  }
  function drawCactus(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rr(ctx, -5, -34, 10, 34, 5); fsr(ctx, '#4aa04a', OL, 1.2); rr(ctx, -15, -24, 7, 14, 3.5); fsr(ctx, '#4aa04a', OL, 1.2); rr(ctx, -12, -13, 9, 5, 2.5); fsr(ctx, '#4aa04a');
    rr(ctx, 8, -28, 7, 12, 3.5); fsr(ctx, '#4aa04a', OL, 1.2); rr(ctx, 3, -19, 9, 5, 2.5); fsr(ctx, '#4aa04a');
    ctx.strokeStyle = 'rgba(30,90,30,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(0, -2); ctx.stroke();
    circ(ctx, 0, -35, 3, '#ff6f9c', OL, 0.8); circ(ctx, 0, -35, 1.2, '#ffd84a');
    ctx.restore();
  }
  function drawWindmill(ctx, x, y, s, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col || '#8a6a6a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-2, -60); ctx.moveTo(10, 0); ctx.lineTo(2, -60); ctx.moveTo(-8, -15); ctx.lineTo(8, -15); ctx.moveTo(-6, -32); ctx.lineTo(6, -32); ctx.moveTo(-9, -6); ctx.lineTo(7, -24); ctx.stroke();
    ctx.save(); ctx.translate(0, -62); ctx.rotate(t * 0.9); for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.fillStyle = col || '#8a6a6a'; ctx.fillRect(2, -1.2, 15, 2.4); } circ(ctx, 0, 0, 3, col || '#8a6a6a'); ctx.restore();
    ctx.fillStyle = col || '#8a6a6a'; ctx.beginPath(); ctx.moveTo(2, -64); ctx.lineTo(22, -66); ctx.lineTo(22, -58); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* the mafia: cartoon gangster bears facing left */
  function drawMob(ctx, x, fy, o) {
    const sc = o.sc || 0.76, wide = o.wide || 1, sq = o.sq == null ? 1 : o.sq, t = o.t || 0;
    ctx.save(); ctx.translate(x, fy);
    if (o.spin) { ctx.translate(0, -16 * sc); ctx.rotate(o.spin); ctx.translate(0, 16 * sc); }
    ctx.scale(-sc, sc * sq); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const fl = o.flash > 0, fur = fl ? '#fff' : o.fur, suit = fl ? '#fff' : (o.kind === 'pate' ? '#26222e' : '#1e1b26'), ol = '#140c14';
    if (o.roll) { ctx.translate(0, -10); ctx.rotate(o.roll); circ(ctx, 0, 0, 10, suit, ol, 1.3); circ(ctx, 4, -3, 5, fur, ol, 1); ctx.fillStyle = '#ff9eb0'; ctx.fillRect(-8, 2, 16, 3); ctx.restore(); return; }
    /* legs + shoes */
    const step = o.run ? Math.sin(t * 16) * 3 : 0;
    rr(ctx, -5 + step * 0.4, -9, 4, 9, 2); fsr(ctx, suit, ol, 1); rr(ctx, 1 - step * 0.4, -9, 4, 9, 2); fsr(ctx, suit, ol, 1);
    ell(ctx, -2.5 + step * 0.5, -0.8, 3.6, 1.8, 0, '#3a2a2a', ol, 0.8); ell(ctx, 3.5 - step * 0.5, -0.8, 3.6, 1.8, 0, '#3a2a2a', ol, 0.8);
    if (o.kind === 'marzipan') { ctx.beginPath(); ctx.moveTo(-7.5, -16); ctx.lineTo(7.5, -16); ctx.lineTo(9, -5); ctx.lineTo(-9, -5); ctx.closePath(); fsr(ctx, fl ? '#fff' : '#3a1a3a', ol, 1); }
    /* back arm */
    const aim = o.aim || 0;
    ctx.save(); ctx.translate(-2, -17); ctx.rotate(o.throwA != null ? -o.throwA : (o.gun === 'dual' ? -aim - 0.15 : 0.5)); rr(ctx, -2, -1, 4, 9, 2); fsr(ctx, suit, ol, 1); circ(ctx, 0, 8.5, 2.2, fur, ol, 0.8);
    if (o.gun === 'dual') { ctx.save(); ctx.translate(0, 9); ctx.rotate(-Math.PI / 2); drawPistol(ctx, o.fire2); ctx.restore(); }
    if (o.throwA != null && o.holdDyn) { ctx.save(); ctx.translate(0, 10); drawDynStick(ctx, 0, 0, 0.6, t); ctx.restore(); }
    ctx.restore();
    /* torso */
    ctx.save(); ctx.scale(wide, 1);
    rr(ctx, -7, -22, 14, 14, 5); fsr(ctx, suit, ol, 1.2);
    ctx.beginPath(); ctx.moveTo(-2.4, -22); ctx.lineTo(2.4, -22); ctx.lineTo(0, -15); ctx.closePath(); fsr(ctx, fl ? '#fff' : '#f4f0ea');
    ctx.beginPath(); ctx.moveTo(-1, -21); ctx.lineTo(1, -21); ctx.lineTo(1.2, -14.5); ctx.lineTo(0, -13); ctx.lineTo(-1.2, -14.5); ctx.closePath(); fsr(ctx, fl ? '#fff' : (o.kind === 'pate' ? '#1e1b26' : '#d8282e'));
    if (o.kind === 'pate') { circ(ctx, -4.2, -18.5, 1.8, '#e0283a', ol, 0.5); circ(ctx, -4.6, -17, 0.8, '#3a9a4a'); }
    if (o.kind === 'pralino') { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, -20, 4, 0.2, Math.PI - 0.2); ctx.stroke(); }
    if (o.kind === 'marzipan') { for (let i = 0; i < 7; i++) circ(ctx, -5 + i * 1.7, -21 + Math.sin(i) * 0.6, 1.9, fl ? '#fff' : '#ff9eb0'); for (let i = 0; i < 5; i++) circ(ctx, -2.4 + i * 1.2, -18.5 + Math.abs(i - 2) * -0.4, 0.6, '#fff'); }
    ctx.restore();
    /* head */
    const hy = -29;
    circ(ctx, -4.6, hy - 6.2, 2.3, fur, ol, 0.9); circ(ctx, 4.4, hy - 6.2, 2.3, fur, ol, 0.9);
    circ(ctx, 0, hy, 7.6, fur, ol, 1.2);
    ell(ctx, 3, hy + 2.6, 4, 3, 0, fl ? '#fff' : shadeHex(o.fur, 0.35)); ell(ctx, 5.6, hy + 1.3, 1.5, 1.1, 0, '#2a1508');
    /* sunglasses */
    rr(ctx, -1.6, hy - 2.8, 4.4, 3.2, 1.3); fsr(ctx, '#111'); rr(ctx, 3.4, hy - 2.8, 4.2, 3.2, 1.3); fsr(ctx, '#111'); ctx.fillStyle = '#111'; ctx.fillRect(2.6, hy - 2.1, 1, 0.8); ctx.fillRect(-6, hy - 2.2, 4.6, 0.8);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(-0.6, hy - 2.2, 1.6, 0.6); ctx.fillRect(4.3, hy - 2.2, 1.6, 0.6);
    if (o.kind === 'marzipan') { ctx.strokeStyle = '#111'; ctx.lineWidth = 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(5.5 + i, hy - 2.8); ctx.lineTo(5.8 + i * 1.3, hy - 4.2); ctx.stroke(); } ell(ctx, 4.2, hy + 4.3, 1.6, 0.9, 0, '#e0283a'); }
    else if (o.kind === 'luigi') { ctx.beginPath(); ctx.moveTo(1, hy + 3.4); ctx.quadraticCurveTo(4.5, hy + 1.6, 8.2, hy + 3.8); ctx.quadraticCurveTo(4.5, hy + 5.2, 1, hy + 3.4); fsr(ctx, '#2a1508'); }
    else if (o.kind === 'pate') { ctx.beginPath(); ctx.moveTo(1, hy + 3.4); ctx.quadraticCurveTo(4.5, hy + 2, 8, hy + 4.6); ctx.quadraticCurveTo(4.5, hy + 4.6, 1, hy + 3.4); fsr(ctx, '#f4f0ea', ol, 0.5); ctx.fillStyle = '#f4f0ea'; ctx.fillRect(-1, hy - 4.6, 4, 1); ctx.fillRect(3.6, hy - 4.6, 4, 1); }
    else if (o.kind === 'pralino') { ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(2.4, hy + 3.6); ctx.lineTo(7.8, hy + 3.1); ctx.stroke(); }
    else { ctx.strokeStyle = '#2a1508'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(2.5, hy + 4.6); ctx.quadraticCurveTo(4, hy + 5.4, 5.6, hy + 4.2); ctx.stroke(); }
    /* hat */
    if (o.hat !== false) drawFedora(ctx, 0.4, hy - 6.4, o.kind, fl);
    /* front arm + weapon */
    ctx.save(); ctx.translate(1.5, -18);
    if (o.throwA != null) { ctx.rotate(-o.throwA); rr(ctx, -2, -1, 4, 9, 2); fsr(ctx, suit, ol, 1); circ(ctx, 0, 8.5, 2.2, fur, ol, 0.8); if (o.holdDyn) { ctx.translate(0, 10); drawDynStick(ctx, 0, 0, 0.7, t); } }
    else {
      ctx.rotate(-Math.PI / 2 - aim); rr(ctx, -2, -1, 4, 9, 2); fsr(ctx, suit, ol, 1); circ(ctx, 0, 8.5, 2.2, fur, ol, 0.8);
      ctx.translate(0, 9); ctx.rotate(-Math.PI / 2);
      if (o.gun === 'shotgun') drawShotgun(ctx, o.fire); else if (o.gun !== 'dyn' && o.gun !== 'mg') drawPistol(ctx, o.fire);
    }
    ctx.restore();
    ctx.restore();
  }
  function shadeHex(h, k) { const n = parseInt(h.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.round(r + (255 - r) * k); g = Math.round(g + (255 - g) * k); b = Math.round(b + (255 - b) * k); return 'rgb(' + r + ',' + g + ',' + b + ')'; }
  function drawFedora(ctx, x, y, kind, fl) {
    const band = fl ? '#fff' : ({pralino: '#ff6f9c', trueffel: '#ffd84a', luigi: '#2f9e5b', marzipan: '#ff9eb0', pate: '#f4f0ea'}[kind] || '#c23a3a');
    const body = fl ? '#fff' : (kind === 'pate' ? '#2e2a36' : kind === 'marzipan' ? '#c25a7a' : '#1a1720');
    if (kind === 'trueffel') { ell(ctx, x, y + 0.4, 7.5, 1.6, 0, body, '#140c14', 0.8); ctx.beginPath(); ctx.arc(x, y, 5, Math.PI, 0); ctx.closePath(); fsr(ctx, body, '#140c14', 1); ctx.fillStyle = band; ctx.fillRect(x - 5, y - 1.6, 10, 1.4); return; }
    ell(ctx, x, y + 0.6, 10.5, 2.2, -0.05, body, '#140c14', 0.9);
    ctx.beginPath(); ctx.moveTo(x - 6.4, y + 0.4); ctx.lineTo(x - 5.4, y - 6.4); ctx.quadraticCurveTo(x, y - 8.4, x + 5.4, y - 6.4); ctx.lineTo(x + 6.4, y + 0.4); ctx.closePath(); fsr(ctx, body, '#140c14', 1);
    ctx.beginPath(); ctx.moveTo(x - 3, y - 7.3); ctx.quadraticCurveTo(x, y - 5.4, x + 3, y - 7.3); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = band; ctx.fillRect(x - 6.2, y - 1.9, 12.4, 1.9);
    if (kind === 'marzipan') { circ(ctx, x + 4, y - 2.5, 2.2, fl ? '#fff' : '#fff4e0', '#c25a7a', 0.6); circ(ctx, x + 4, y - 2.5, 0.9, '#ffd84a'); }
  }
  function drawPistol(ctx, fire) {
    rr(ctx, -1, -1.8, 9, 3.2, 1); fsr(ctx, '#2a2a33', '#000', 0.6); rr(ctx, -0.5, 0.8, 3, 4, 1); fsr(ctx, '#5a3a22');
    if (fire > 0) { starPath(ctx, 10.5, -0.2, 4.5, 1.6, 6, fire * 3); fsr(ctx, '#ffe94a'); circ(ctx, 10, -0.2, 1.4, '#fff'); }
  }
  function drawShotgun(ctx, fire) {
    rr(ctx, -6, -1.5, 8, 3.4, 1.4); fsr(ctx, '#8a5428', '#000', 0.6); rr(ctx, 1, -2, 16, 2.6, 1); fsr(ctx, '#2a2a33', '#000', 0.6); rr(ctx, 5, 0.6, 7, 2, 1); fsr(ctx, '#6a4020');
    if (fire > 0) { starPath(ctx, 20, -0.6, 7, 2.4, 7, fire * 3); fsr(ctx, '#ffe94a'); circ(ctx, 19, -0.6, 2, '#fff'); }
  }
  function drawDynStick(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); rr(ctx, -2.5, -6, 5, 12, 1.5); fsr(ctx, '#e0383a', '#5a0a10', 0.9); ctx.fillStyle = '#ffd84a'; ctx.fillRect(-2.5, -2, 5, 1.4);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(2, -8, 1.5, -10); ctx.stroke();
    if (Math.sin(t * 40) > -0.3) { starPath(ctx, 1.5, -10.5, 2.6, 1, 5, t * 9); fsr(ctx, '#ffe94a'); }
    ctx.restore();
  }
  /* Toffo's cartoon tommy gun: origin = grip hand, pointing +x */
  function drawTommy(ctx, x, y, ang, face, recoil, flash, sc) {
    ctx.save(); ctx.translate(x, y); ctx.scale(face * (sc || 0.85), sc || 0.85); ctx.rotate(ang); ctx.translate(-recoil, 0); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-15, -1.5); ctx.lineTo(-5, -2.2); ctx.lineTo(-5, 1.8); ctx.lineTo(-13, 4.6); ctx.quadraticCurveTo(-16, 4, -15, -1.5); fsr(ctx, '#b06a32', OL, 1);
    rr(ctx, -2.8, 1, 3, 5.4, 1.2); fsr(ctx, '#9a5a2a', OL, 0.9);
    rr(ctx, -6, -2.8, 15, 5, 1.6); fsr(ctx, '#3a3a48', OL, 1); ctx.fillStyle = '#6a6a7e'; ctx.fillRect(-4, -2.1, 11, 1);
    circ(ctx, 3.2, 4.6, 4.3, '#2a2a34', OL, 1); circ(ctx, 3.2, 4.6, 2.6, null, '#6a6a7e', 0.8); circ(ctx, 2.2, 3.6, 0.9, 'rgba(255,255,255,.55)');
    rr(ctx, 9, -2.1, 11, 3.4, 1); fsr(ctx, '#3a3a48', OL, 1); ctx.fillStyle = '#6a6a7e'; for (let i = 0; i < 4; i++) ctx.fillRect(10.5 + i * 2.2, -2.1, 0.9, 3.4);
    rr(ctx, 10, 1, 2.6, 4.6, 1.2); fsr(ctx, '#b06a32', OL, 0.9); ctx.fillStyle = '#2a2a34'; ctx.fillRect(18.5, -3.4, 1.2, 1.4);
    if (flash > 0) { starPath(ctx, 24, -0.4, 6 + flash * 3, 2.2, 7, flash * 5); fsr(ctx, '#ffe94a'); starPath(ctx, 23, -0.4, 3, 1.2, 5, flash * 2); fsr(ctx, '#fff'); }
    ctx.restore();
  }
  function drawLimo(ctx, c, t) {
    const x = c.x, y = GY + (c.rock ? Math.sin(t * 18) * 0.8 : 0) + (c.bob || 0);
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
    ell(ctx, 65, -1, 70, 4, 0, 'rgba(60,30,20,.25)');
    /* body */
    ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(0, -15); ctx.quadraticCurveTo(2, -20, 10, -20); ctx.lineTo(30, -21); ctx.lineTo(38, -37); ctx.lineTo(98, -37); ctx.lineTo(106, -22); ctx.lineTo(124, -21); ctx.quadraticCurveTo(130, -20, 130, -14); ctx.lineTo(129, -6); ctx.closePath();
    const g = ctx.createLinearGradient(0, -37, 0, -6); g.addColorStop(0, '#4a4458'); g.addColorStop(0.45, '#1e1b26'); g.addColorStop(1, '#0e0c14'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#05040a'; ctx.lineWidth = 1.3; ctx.stroke();
    /* windows */
    ctx.fillStyle = '#2a3a5a'; ctx.beginPath(); ctx.moveTo(40, -34.5); ctx.lineTo(66, -34.5); ctx.lineTo(66, -23); ctx.lineTo(34, -23); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(69, -34.5); ctx.lineTo(96, -34.5); ctx.lineTo(102, -23); ctx.lineTo(69, -23); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,210,255,.35)'; ctx.beginPath(); ctx.moveTo(44, -34); ctx.lineTo(50, -34); ctx.lineTo(44, -24); ctx.lineTo(38, -24); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(76, -34); ctx.lineTo(80, -34); ctx.lineTo(74, -24); ctx.lineTo(70, -24); ctx.closePath(); ctx.fill();
    if (c.cracks) for (let i = 0; i < c.cracks; i++) { const cx = 42 + hash(i, 77) * 56, cy = -31 + hash(i, 78) * 6; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(k * 1.7 + i) * 3, cy + Math.sin(k * 1.7 + i) * 3); } ctx.stroke(); }
    /* chrome, lights, ornament */
    ctx.fillStyle = '#cfd3dc'; rr(ctx, -2, -10, 10, 4, 2); ctx.fill(); rr(ctx, 122, -10, 10, 4, 2); ctx.fill(); ctx.fillRect(8, -14, 116, 1.2);
    circ(ctx, 4, -15, 2.4, '#ffe9a0', '#05040a', 0.8); ctx.fillStyle = '#e0283a'; ctx.fillRect(127, -18, 2.4, 4);
    circ(ctx, 12, -22, 1.8, '#ffd84a', '#7a5a10', 0.6);
    /* wheels */
    for (const wx of [22, 106]) { circ(ctx, wx, -6, 7.4, '#141218', '#000', 1); circ(ctx, wx, -6, 4.4, '#f4f0ea'); circ(ctx, wx, -6, 2.6, '#9a9aa6'); ctx.save(); ctx.translate(wx, -6); ctx.rotate(c.wheel || 0); ctx.fillStyle = '#5a5a66'; ctx.fillRect(-0.5, -2.6, 1, 5.2); ctx.restore(); }
    /* bullet holes */
    if (c.holes) for (const h of c.holes) { circ(ctx, h[0], h[1], 1.1, '#000'); circ(ctx, h[0] - 0.4, h[1] - 0.4, 0.4, 'rgba(255,255,255,.6)'); }
    ctx.restore();
  }
  function drawDoor(ctx, c) { /* the open rear door swings towards the camera: a cover panel */
    if (!(c.door > 0)) return; const x = c.x + 37, w = 20 * c.door, y = GY;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x + 20, y - 7); ctx.lineTo(x + 20 - w, y - 4); ctx.lineTo(x + 20 - w, y - 31); ctx.lineTo(x + 20, y - 36); ctx.closePath();
    ctx.fillStyle = '#26222e'; ctx.fill(); ctx.strokeStyle = '#05040a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#2a3a5a'; ctx.beginPath(); ctx.moveTo(x + 18, y - 34); ctx.lineTo(x + 22 - w, y - 30); ctx.lineTo(x + 22 - w, y - 23); ctx.lineTo(x + 18, y - 25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#cfd3dc'; ctx.fillRect(x + 21 - w, y - 19, 3, 1.4);
    if (c.doorHoles) for (const h of c.doorHoles) circ(ctx, x + 20 - w * h[0], y - 7 - h[1], 1, '#000');
    ctx.restore();
  }

  const ranch = {
    R: null,
    cp: null,   /* checkpoint: after a death the retry starts at the showdown stage where Toffo fell (kept on the module between start() calls) */
    start(opts) {
      const touch = !!(opts.isTouch || (G.input && G.input.touchMode));
      const lo = opts.loadout || {}, maxHp = MAXHP + (lo.fat ? 1 : 0) + (lo.shield ? 1 : 0);
      /* use the checkpoint only for the immediate retry after a death (the game removed exactly one life), never after a game over */
      const cp = this.cp, lives = G.S && G.S.lives; this.cp = null;
      const resume = cp && Date.now() - cp.at < 20 * 60e3 && (lives == null || cp.lives == null || lives === cp.lives - 1) ? cp : null;
      const R = this.R = {
        opts, touch, t: 0, rt: 0, fr: 0, phase: 'explore', camX: 0, shake: 0, slowT: 0, over: false, maxHp, fireGap: lo.laser >= 3 ? 4.5 : (lo.laser === 2 ? 5 : 6),
        p: {x: 64, y: GY, vx: 0, vy: 0, on: true, jumps: 0, face: 1, crouch: false, hp: maxHp, inv: 0, gun: false, ammo: 50, reload: 0, fireT: 0, burst: 0, recoil: 0, flash: 0, aim: 0, anim: 0, deadT: 0, minX: 12},
        plats: [{x0: 176, x1: 216, y: GY - 15}, {x0: 284, x1: 314, y: GY - 16}, {x0: 316, x1: 346, y: GY - 16}, {x0: 300, x1: 330, y: GY - 32}, {x0: 574, x1: 622, y: GY - 62}, {x0: 548, x1: 572, y: GY - 20}, {x0: 548, x1: 566, y: GY - 40}],
        coins: [], covers: [], pb: [], eb: [], dyn: [], parts: [], hats: [], hearts: [], enemies: [],
        safe: 'locked', safeT: 0, gunFly: null, stage: -1, sst: 'none', sT: 0, car: null, ebar: null, bossesDown: 0, bossRef: null,
        score: 0, money: 0, hint: null, drops: [], repairT: 0, say: null, fightT: 0, hurtCount: 0, reinT: 6, pookie: null, hugT: 0, botT: 0, botJ: 0,
      };
      for (const [x, y] of [[196, GY - 30], [300, GY - 50], [315, GY - 56], [330, GY - 50], [584, GY - 76], [598, GY - 80], [612, GY - 76], [400, GY - 40], [420, GY - 46], [440, GY - 40]]) R.coins.push({x, y, got: false});
      for (const c of COVERS) R.covers.push({x: AX + c.lx, w: c.w, h: c.h, kind: c.kind, hp: 36, max: 36, pop: 0, hit: 0});
      if (resume) {
        /* straight back into the showdown: gun in hand, camera at the arena, the stage where Toffo fell */
        const s = clamp(resume.stage | 0, 0, STAGES.length - 1), p = R.p;
        p.gun = true; p.x = AX + 70; R.safe = 'open'; R.camX = AX; R.fightT = resume.fightT || 0; R.score = resume.score || 0;
        R.bossesDown = Math.max(0, s - 1); this.startFight(R, s, true);
        const who = STAGES[s].boss ? BOSSES[STAGES[s].boss].name : tr('die Handlanger', 'the henchmen');
        try { opts.banner(tr('Weiter geht’s!', 'Back in action!'), 2.4, 'Checkpoint: ' + who); } catch (e) {}
        try { opts.speak("I'm coming, Mallo!"); } catch (e) {}
        return;
      }
      R.say = {text: tr('Toffo! Der Pate und seine Schoko-Mafia haben uns gefunden – sie wollen mein Kakao-Rezept! Die Tommy Gun liegt im Tresor in der Scheune!', 'Toffo! The Chocfather and his Choco Mafia found us – they want my cocoa recipe! The Tommy Gun is in the safe in the barn!'), t: 8};
      try { opts.banner('Ranch', 2.6, tr('Hol die Tommy Gun aus dem Tresor in der Scheune!', 'Get the Tommy Gun from the safe in the barn!')); } catch (e) {}
      try { opts.speak('Mallo!'); } catch (e) {}
    },
    debugWin() { const R = this.R; if (!R || R.over) return; this.finish('clear'); },
    finish(res) {
      const R = this.R; if (!R || R.over) return; R.over = true; setBoss(false);
      this.cp = null;
      if (res === 'dead' && R.p.gun && R.phase !== 'explore' && R.stage >= 0) {
        /* remember the stage; a stage whose boss (or whose henchmen, in stage 0) is already beaten counts as done */
        let s = R.stage; if (s >= 1 && R.bossesDown >= s) s++; else if (s === 0 && (R.sst === 'leave' || !R.car)) s++;
        this.cp = {stage: Math.min(s, STAGES.length - 1), fightT: R.fightT, score: R.score, lives: G.S && G.S.lives, at: Date.now()};
      }
      const info = {score: R.score, money: R.money, stars: [true, R.p.hp >= 3, R.fightT < 200], final: true};
      try { R.opts.done(res, res === 'clear' ? info : undefined); } catch (e) {}
    },
    pay(R, n, x, y) { R.money += n; try { R.opts.money(n); } catch (e) {} if (x != null) R.parts.push({type: 'text', x, y, vx: 0, vy: -0.5, life: 1.1, max: 1.1, text: '+' + n, col: '#ffd84a'}); },
    input(R) {
      const I = G.input || {};
      if (R.opts.autoplay) return this.bot(R);
      if (R.phase === 'hug') return this.hugWalk(R);
      const lock = R.phase === 'slowmo' || R.phase === 'dead' || R.safe === 'opening';
      if (lock) return {};
      const upE = !!(I.up && !R.prevUp); R.prevUp = !!I.up;
      return {left: !!I.left, right: !!I.right, down: !!I.down, downEdge: !!I.downEdge, jump: !!(I.jump || I.up), jumpEdge: !!(I.jumpEdge || upE), fire: !R.touch && !!I.run, fireEdge: !!I.runEdge};
    },
    bot(R) {
      const p = R.p, o = {}; R.botT += DT;
      if (R.phase === 'hug') return this.hugWalk(R);
      if (R.phase === 'slowmo' || R.phase === 'dead' || R.safe === 'opening') return o;
      let tx;
      if (!p.gun) { tx = SAFE_X; if (Math.abs(p.x - SAFE_X) < 6 && p.on) { if (R.safe !== 'opening' && R.safe !== 'open' && (R.fr % 40 === 0)) { o.down = true; o.downEdge = true; } return o; } }
      else if (R.phase === 'explore') tx = AX + 90;
      else { tx = AX + 172 + Math.sin(R.botT * 0.7) * 30; o.fire = true; if (R.fr % 150 === 0) o.jumpEdge = o.jump = true; }
      if (p.x < tx - 4) o.right = true; else if (p.x > tx + 4) o.left = true;
      if (!p.gun && (R.fr % 50 === 0) && p.x < SAFE_X - 40 && p.x > 250 && p.x < 360) { o.jumpEdge = o.jump = true; }
      return o;
    },
    fitWidth(R) {
      const VWn = VW(); if (R.lastW == null) R.lastW = VWn;
      if (VWn !== R.lastW) { const dx = VWn - R.lastW; R.lastW = VWn; if (R.phase !== 'explore') { if (R.ebar) R.ebar.x += dx; if (R.car) { R.car.x += dx; R.car.tx += dx; } for (const e of R.enemies) e.x += dx; for (const d of R.dyn) d.x += dx; } }
    },
    hugWalk(R) { const p = R.p, tx = AX + 146; if (!R.pookie || R.pookie.st === 'hug') return {}; if (p.x < tx - 2) return {right: true}; if (p.x > tx + 2) return {left: true}; return {}; },
    update() {
      const R = this.R; if (!R || R.over) return;
      R.rt += DT; R.fr++;
      /* update only runs again once the puzzle overlay is gone: closed without solving -> the safe is locked again */
      if (R.safe === 'puzzle') R.safe = 'locked';
      let k = 1; if (R.slowT > 0) { R.slowT -= DT; k = 0.25; }
      R.t += DT * k;
      const inp = this.input(R), p = R.p;
      /* the screen width can change (phone rotation, window resize): keep the mafia's side glued to the right edge */
      this.fitWidth(R);
      if (R.say) { R.say.t -= DT; if (R.say.t <= 0) R.say = null; }
      if (R.hint) { R.hint.t -= DT; if (R.hint.t <= 0) R.hint = null; }
      this.player(R, inp, k);
      this.safeUpdate(R, inp);
      if (R.phase === 'fight') { R.fightT += DT; this.stageUpdate(R, k); }
      for (const e of R.enemies) this.enemyUpdate(R, e, k);
      R.enemies = R.enemies.filter(e => !e.gone);
      this.projectiles(R, k);
      this.misc(R, k);
      /* camera */
      const W = VW();
      if (R.phase === 'explore') { const tg = clamp(p.x - W * 0.42, 0, AX); R.camX += (tg - R.camX) * 0.12; }
      else R.camX += (AX - R.camX) * 0.06;
      if (R.shake > 0) R.shake = Math.max(0, R.shake - 0.4);
      /* end sequences */
      if (R.phase === 'slowmo' && R.slowT <= 0) {
        R.phase = 'hug'; R.hugT = 0; R.pookie = {x: R.camX - 24, st: 'run'};
        try { R.opts.banner(tr('Der Pate ist besiegt!', 'Chocfather defeated!'), 3, tr('Das Kakao-Rezept bleibt geheim – Mallo kommt!', 'The cocoa recipe stays secret – here comes Mallo!')); } catch (e) {}
        sfx('rescue');
      }
      if (R.phase === 'hug') {
        R.hugT += DT; const pk = R.pookie, target = p.x - 19;
        if (pk.st === 'run') { pk.x = Math.min(pk.x + 2.3, target); if (pk.x >= target - 0.5 && p.on && Math.abs(p.x - (AX + 146)) < 3 && Math.abs(p.vx) < 0.4) { pk.x = target; pk.st = 'hug'; pk.t = 0; sfx('heart'); try { R.opts.speak('Mallo!'); } catch (e) {} } }
        else { pk.t += DT; if (R.fr % 14 === 0) R.parts.push({type: 'heart', x: p.x - 6 + rnd(-8, 8), y: p.y - 28, vx: rnd(-0.2, 0.2), vy: -0.6, life: 1.6, max: 1.6, r: rnd(0.6, 1)}); if (pk.t > 4.2) this.finish('clear'); }
        if (pk.x > p.x - 60 || pk.st === 'hug') p.face = -1;
      }
      if (R.phase === 'dead') { p.deadT += DT; if (p.deadT > 1.9) this.finish('dead'); }
    },
    player(R, inp, k) {
      const p = R.p, W = VW();
      if (R.phase === 'dead') { p.vy += 0.3 * k; p.y = Math.min(GY, p.y + p.vy * k); return; }
      p.crouch = !!(inp.down && p.on && p.gun && R.phase === 'fight');
      const dir = p.crouch ? 0 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      p.vx += (dir * 1.9 - p.vx) * (p.on ? 0.25 : 0.12) * k;
      if (dir) p.face = dir;
      if (inp.jumpEdge) {
        if (p.on) { p.vy = -5.4; p.on = false; p.jumps = 1; sfx('jump'); }
        else if (p.jumps < 2) { p.vy = -4.9; p.jumps = 2; sfx('doubleJump'); R.parts.push({type: 'ring', x: p.x, y: p.y, life: 0.35, max: 0.35, r: 10}); }
      }
      if (!inp.jump && p.vy < -2) p.vy += 0.25 * k;
      const py = p.y; p.vy = Math.min(6.5, p.vy + 0.28 * k); p.x += p.vx * k; p.y += p.vy * k;
      /* bounds */
      let minX = 10, maxX = AX + W - 30;
      if (R.phase === 'explore') { maxX = p.gun ? AX + 120 : 700; if (!p.gun && p.x > 690 && !R.hint) R.hint = {text: tr('Erst die Tommy Gun aus dem Tresor holen! (Scheune, ▼)', 'Get the Tommy Gun from the safe first! (barn, ▼)'), t: 2.5}; }
      else { minX = AX + 10; maxX = (R.ebar ? R.ebar.x : AX + W - 170) - 34; }
      p.x = clamp(p.x, minX, maxX);
      /* landing: ground, one-way platforms, cover tops */
      p.on = false;
      if (p.vy >= 0) {
        const tops = R.phase === 'explore' ? R.plats : [];
        for (const pl of tops) if (p.x > pl.x0 - 3 && p.x < pl.x1 + 3 && py <= pl.y + 0.5 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.on = true; }
        for (const c of R.covers) { if (c.hp <= 0) continue; const top = GY - coverH(c); if (Math.abs(p.x - c.x) < c.w / 2 + 2 && py <= top + 0.5 && p.y >= top) { p.y = top; p.vy = 0; p.on = true; } }
        if (p.y >= GY) { p.y = GY; p.vy = 0; p.on = true; }
      }
      if (p.on) p.jumps = 0;
      p.anim += Math.abs(p.vx) * 0.22 * k + 0.02;
      if (p.inv > 0) p.inv -= DT * k;
      /* the gun */
      if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - 0.5 * k); if (p.flash > 0) p.flash -= DT * k;
      if (!p.gun) return;
      if (p.reload > 0) { p.reload -= DT * k * (p.crouch ? 2 : 1); if (p.reload <= 0) { p.ammo = 50; sfx('cannonLoad'); } }
      if (inp.fireEdge) p.burst = 0.5;
      if (p.burst > 0) p.burst -= DT * k;
      const want = (inp.fire || p.burst > 0) && !p.crouch && R.phase !== 'hug' && R.phase !== 'slowmo';
      /* aim assist: the closest visible target on the right */
      let ta = 0; const gx = p.x + 5, gy = p.y - 11;
      if (R.phase === 'fight' || R.phase === 'slowmo') {
        let best = null, bd = 1e9;
        for (const e of R.enemies) { if (e.st === 'die' || e.st === 'ride' || e.e < 0.4) continue; const r = eRect(e); if (r.top >= e.ct - 3) continue; const ty = Math.min(r.top + 7, (e.ct + r.top) / 2), d = Math.abs(e.x - gx) + Math.abs(ty - gy) * 0.5; if (e.x > gx + 10 && d < bd) { bd = d; best = [e.x, ty]; } }
        for (const d of R.dyn) if (d.st === 'fly' && d.x > gx + 10 && d.x - gx < 170 && d.y < GY - 8) { const dd = (d.x - gx) * 0.6; if (dd < bd) { bd = dd; best = [d.x + d.vx * 6, d.y + d.vy * 6]; } }
        if (best) ta = clamp(Math.atan2(best[1] - gy, best[0] - gx), -0.9, 0.45);
      }
      if (want) p.face = 1;
      p.aim += (ta * (p.face > 0 ? 1 : 0) - p.aim) * 0.3 * k;
      p.fireT -= k;
      if (want && p.reload <= 0 && p.fireT <= 0) {
        p.fireT = R.fireGap; p.ammo--; p.recoil = 2.2; p.flash = 0.06;
        const a = p.aim + rnd(-0.03, 0.03), mx = gx + p.face * Math.cos(p.aim) * 17, my = gy + Math.sin(p.aim) * 17;
        R.pb.push({x: mx, y: my, vx: p.face * Math.cos(a) * 8.5, vy: Math.sin(a) * 8.5, life: 1.4});
        R.parts.push({type: 'shell', x: gx, y: gy - 2, vx: -p.face * rnd(0.6, 1.4), vy: rnd(-2.6, -1.6), life: 0.7, max: 0.7, rot: 0});
        noise(0.06, {type: 'bandpass', freq: 1700 + Math.random() * 300, q: 0.9, gain: 0.08}); tone(170, 0.07, {type: 'square', slide: 70, gain: 0.04});
        if (p.ammo <= 0) { p.reload = 1.1; sfx('jetEmpty'); }
      }
    },
    safeUpdate(R, inp) {
      const p = R.p;
      if (R.safe !== 'open' && R.safe !== 'opening' && inp.downEdge && Math.abs(p.x - SAFE_X) < 20 && p.on) {
        let solved = false; try { solved = R.opts.isSolved && R.opts.isSolved('finale-tresor'); } catch (e) {}
        if (solved || !R.opts.openPuzzle) this.openSafe(R);
        else { R.safe = 'puzzle'; try { R.opts.openPuzzle('finale-tresor', () => this.openSafe(R)); } catch (e) { this.openSafe(R); } }
      }
      if (R.safe === 'opening') {
        R.safeT += DT;
        if (R.safeT > 1.0 && !R.gunFly) { R.gunFly = {x: SAFE_X, y: GY - 16, t: 0}; sfx('appear'); }
        if (R.gunFly) { const g = R.gunFly; g.t += DT; const tx = p.x + 5, ty = p.y - 11; if (g.t < 0.6) g.y -= 0.6; else { g.x += (tx - g.x) * 0.22; g.y += (ty - g.y) * 0.22; } if (g.t > 1.15) this.grabGun(R); }
      }
    },
    openSafe(R) {
      if (R.safe === 'opening' || R.safe === 'open') return; R.safe = 'opening'; R.safeT = 0; sfx('gate');
      for (let i = 0; i < 14; i++) R.parts.push({type: 'star', x: SAFE_X + rnd(-12, 12), y: GY - rnd(6, 30), vx: rnd(-1, 1), vy: rnd(-1.6, -0.3), life: 0.9, max: 0.9, r: rnd(2, 3.5), col: i % 2 ? '#ffd84a' : '#fff'});
    },
    grabGun(R) {
      R.safe = 'open'; R.gunFly = null; const p = R.p; p.gun = true; p.ammo = 50; sfx('powerup');
      try { R.opts.banner('Tommy Gun!', 2.6, R.touch ? tr('B = Feuerstoß · ▼ halten = in Deckung gehen', 'B = burst · hold ▼ = take cover') : tr('B (Shift/X) halten = Dauerfeuer · ▼ hinter Deckung = verstecken', 'Hold B (Shift/X) = rapid fire · ▼ behind cover = hide')); } catch (e) {}
      try { R.opts.speak("Let's go!"); } catch (e) {}
      R.hint = {text: tr('Die Mafia kommt! Lauf nach rechts →', 'The mafia is coming! Run to the right →'), t: 4};
      for (let i = 0; i < 16; i++) R.parts.push({type: 'star', x: p.x + rnd(-10, 10), y: p.y - rnd(4, 26), vx: rnd(-1.4, 1.4), vy: rnd(-2, -0.4), life: 0.8, max: 0.8, r: rnd(2, 3.4), col: '#ffd84a'});
    },
    /* ---------- the showdown ---------- */
    startFight(R, from, quiet) {
      R.phase = 'fight'; R.stage = (from || 0) - 1; R.p.minX = AX + 10; R.ebar = {x: AX + VW() - 176, w: 20, h: 26, dents: 0};
      setBoss(true);
      if (!quiet) try { R.opts.banner('Showdown!', 2.4, R.touch ? tr('B = Feuerstoß · ▼ halten = Deckung', 'B = burst · hold ▼ = cover') : tr('B halten = Dauerfeuer · ▼ hinter Heu, Zaun, Trog oder Fass = Deckung', 'Hold B = rapid fire · ▼ behind hay, fence, trough or barrel = cover')); } catch (e) {}
      R.coverHintT = quiet ? 0 : 9; this.nextStage(R);
    },
    nextStage(R) {
      R.stage++; const st = STAGES[R.stage]; if (!st) return;
      const W = VW(); R.sst = 'arrive'; R.sT = 0; R.reinT = 6;
      R.car = {x: AX + W + 40, tx: AX + W - 150, st: 'arrive', door: 0, holes: [], doorHoles: [], cracks: 0, wheel: 0, bob: 0, rock: false, pate: st.boss === 'pate'};
      R.ebar.x = AX + W - 176;
      R.queue = st.mooks.map(s => ({kind: 'mook', spot: s}));
      if (st.boss && st.boss !== 'pate') R.queue.push({kind: st.boss, spot: BOSSES[st.boss].spot});
      if (st.boss === 'pate') { const e = this.mkEnemy(R, 'pate', 'roof'); e.st = 'ride'; R.enemies.push(e); R.bossRef = e; }
      noise(1.2, {type: 'lowpass', freq: 300, freqTo: 900, gain: 0.12}); tone(90, 1.2, {type: 'sawtooth', slide: 140, gain: 0.04});
      if (R.stage > 0) for (const c of R.covers) if (c.hp < c.max) { c.hp = c.max; c.pop = 1; }
      if (R.stage > 0 && R.covers.some(c => c.pop > 0)) sfx('appear');
    },
    mkEnemy(R, kind, spot) {
      const b = BOSSES[kind], c = R.car;
      const e = {kind, boss: !!b, spot, x: c.x + 47, y: GY, st: 'out', tm: 0, e: 1, hp: b ? b.hp : MOOK.hp, max: b ? b.hp : MOOK.hp, flash: 0, hat: true, fire: 0, fire2: 0, shots: 0, aim: 0, spin: 0, dieT: 0, ct: GY, name: b ? b.name : '', sc: (b || MOOK).sc, wide: (b && b.wide) || 1, fur: (b || MOOK).fur, gun: (b || MOOK).gun, t: Math.random() * 3, alt: 0, phase2: false, sweep: 0, hopT: 0.5};
      if (kind === 'pate') { e.x = c.x + 66; e.y = GY - 37; e.e = 1; }
      return e;
    },
    spots(R) { const c = R.car, bx = R.ebar.x; return {barrel: {x: bx, top: GY - 26, lift: 11}, crate: {x: c.x + 12, top: GY - 22, lift: 11}, door: {x: c.x + 47, top: GY - 31, lift: 16}}; },
    stageUpdate(R, k) {
      const c = R.car, st = STAGES[R.stage]; if (!c) { R.sT += DT; if (R.sT > 0.9 && R.stage < STAGES.length - 1) this.nextStage(R); return; }
      R.sT += DT * k; c.wheel += (c.st === 'park' ? 0 : 0.4) * k;
      if (R.coverHintT > 0) R.coverHintT -= DT;
      if (c.st === 'arrive') {
        const d = c.tx - c.x; c.x += Math.max(-7, d * 0.05) * k; c.wheel -= 0.2;
        if (R.fr % 3 === 0) R.parts.push({type: 'dust', x: c.x + 125, y: GY - 2, vx: rnd(0.4, 1.2), vy: rnd(-0.6, -0.1), life: 0.7, max: 0.7, r: rnd(3, 6)});
        if (Math.abs(d) < 0.6) { c.x = c.tx; c.st = 'park'; c.bob = 2; sfx('thud'); noise(0.35, {type: 'bandpass', freq: 2200, freqTo: 900, q: 2, gain: 0.08}); R.qT = 0.4; for (let i = 0; i < 8; i++) R.parts.push({type: 'dust', x: c.x + rnd(0, 130), y: GY - 2, vx: rnd(-1, 1), vy: rnd(-0.8, -0.2), life: 0.8, max: 0.8, r: rnd(3, 7)}); }
        if (R.bossRef && R.bossRef.st === 'ride') R.bossRef.x = c.x + 66;
      } else if (c.st === 'park') {
        if (c.bob > 0) c.bob = Math.max(0, c.bob - 0.15 * k);
        if (c.door < 1) c.door = Math.min(1, c.door + 0.08 * k);
        if (R.queue && R.queue.length) { R.qT -= DT * k; if (R.qT <= 0) { const q = R.queue.shift(); const e = this.mkEnemy(R, q.kind, q.spot); R.enemies.push(e); if (e.boss) { R.bossRef = e; this.bossIntro(R, e); } R.qT = 0.45; sfx('pop'); } }
        else if (R.sst === 'arrive') {
          R.sst = 'fight';
          if (R.bossRef && R.bossRef.kind === 'pate' && R.bossRef.st === 'ride') { R.bossRef.st = 'hide'; R.bossRef.tm = 1.2; this.bossIntro(R, R.bossRef); }
          if (!st.boss) try { R.opts.banner(tr('Die Mafia kommt!', 'The mafia is here!'), 2, tr('Zwei Handlanger – schieß, wenn sie auftauchen!', 'Two henchmen – shoot when they pop up!')); } catch (e) {}
        }
        /* reinforcements for the godfather */
        if (st.boss === 'pate' && R.sst === 'fight' && R.bossRef && R.bossRef.st !== 'die') {
          R.reinT -= DT * k;
          const mooks = R.enemies.filter(e => e.kind === 'mook' && e.st !== 'die');
          if (R.reinT <= 0 && mooks.length < 2) { const sp = this.spots(R), used = mooks.map(m => m.spot); const free = ['crate', 'barrel', 'door'].filter(s => !used.includes(s)); if (free.length) { R.enemies.push(this.mkEnemy(R, 'mook', free[0])); R.hint = {text: tr('Verstärkung!', 'Backup!'), t: 1.4}; sfx('pop'); } R.reinT = R.bossRef.phase2 ? 5.5 : 7; void sp; }
        }
        /* stage cleared? */
        if (R.sst === 'fight') {
          const bossDead = st.boss ? !(R.bossRef && R.bossRef.st !== 'die' && !R.bossRef.gone) : false;
          const alive = R.enemies.filter(e => e.st !== 'die');
          if (st.boss && bossDead && alive.length) for (const e of alive) if (e.st !== 'flee') { e.st = 'flee'; }
          if ((st.boss && bossDead) || (!st.boss && !alive.length)) {
            if (!alive.length && !R.enemies.length && st.boss !== 'pate') { R.sst = 'leave'; c.st = 'leave'; R.sT = 0; noise(0.8, {type: 'lowpass', freq: 400, freqTo: 1200, gain: 0.1}); }
          }
        }
      } else if (c.st === 'leave') {
        c.door = Math.max(0, c.door - 0.1 * k); c.vx = (c.vx || 0) + 0.18 * k; c.x += c.vx * k;
        if (R.fr % 3 === 0) R.parts.push({type: 'dust', x: c.x + 2, y: GY - 2, vx: rnd(-1.2, -0.3), vy: rnd(-0.6, -0.1), life: 0.7, max: 0.7, r: rnd(3, 6)});
        if (c.x > AX + VW() + 60) { R.car = null; R.sT = 0; R.bossRef = null; }
      }
    },
    bossIntro(R, e) { const b = BOSSES[e.kind]; try { R.opts.banner(b.name, 2.4, b.sub); } catch (er) {} sfx('bossHit'); },
    enemyUpdate(R, e, k) {
      const p = R.p, c = R.car;
      e.t += DT * k; if (e.hopT > 0) e.hopT -= DT * k; if (e.flashCd > 0) e.flashCd -= DT * k; if (e.flash > 0) e.flash -= DT * k; if (e.fire > 0) e.fire -= DT * k * 6; if (e.fire2 > 0) e.fire2 -= DT * k * 6;
      if (e.st === 'die') { e.dieT += DT * k; e.spin += 0.32 * k; e.y += (e.kind === 'pate' ? 1.2 : -0.5) * k; if (e.kind === 'pate') e.x += 0.6 * k; if (e.dieT > 0.7) { this.puff(R, e.x, e.y - 14); e.gone = true; } return; }
      if (!c) { e.gone = true; return; }
      const sp = this.spots(R), spot = sp[e.spot];
      if (e.kind === 'pate') { this.pateUpdate(R, e, k); return; }
      const atSpot = spot && Math.abs(e.x - spot.x) < 3;
      e.ct = atSpot ? spot.top : GY; e.lift = atSpot ? spot.lift : 0;
      const exposed = !(e.st === 'hide' || e.st === 'lower');
      e.e += ((exposed ? 1 : 0) - e.e) * Math.min(1, 0.22 * k);
      e.tm -= DT * k;
      /* aim the arm at Toffo */
      const r = eRect(e), mx = e.x - 8, my = r.top + 11 * e.sc;
      e.aim = clamp(Math.atan2((p.y - 14) - my, mx - p.x), -0.5, 0.7) * -1;
      const run = (to, spd) => { const d = to - e.x; e.x += clamp(d, -spd * k, spd * k); e.run = Math.abs(d) > 0.5; return Math.abs(d) < 0.6; };
      e.run = false; e.roll = 0;
      switch (e.st) {
        case 'out': if (run(spot.x, 1.8)) { e.st = 'hide'; e.tm = e.boss ? 0.6 : rnd(0.5, 1.4); } break;
        case 'move': if (run(spot.x, e.kind === 'marzipan' ? 2.6 : 1.9)) { e.st = 'hide'; e.tm = 0.4; } if (e.kind === 'marzipan') { e.rollA = (e.rollA || 0) - 0.35 * k; e.roll = 1; } break;
        case 'flee': if (run(c.x + 47, 2.4)) { e.gone = true; R.parts.push({type: 'dust', x: e.x, y: GY - 8, vx: 0, vy: -0.4, life: 0.5, max: 0.5, r: 6}); } break;
        case 'hide': if (e.tm <= 0) { e.st = 'rise'; e.tm = 0.22; } break;
        case 'rise': if (e.tm <= 0) { e.st = 'aim'; e.tm = ({mook: 0.55, pralino: 0.35, trueffel: 0.4, luigi: 0.5, marzipan: 0.3})[e.kind] || 0.5; } break;
        case 'aim': if (e.tm <= 0) { e.st = 'fire'; e.tm = 0; e.shots = ({mook: Math.random() < 0.5 ? 1 : 2, pralino: 6, trueffel: e.hp < e.max / 2 ? 2 : 1, luigi: 2, marzipan: 8})[e.kind] || 1; e.alt = 0; } break;
        case 'fire':
          if (e.tm <= 0 && e.shots > 0) {
            e.shots--; e.alt++;
            if (e.kind === 'trueffel') { this.throwDyn(R, e.x - 6, r.top + 4); e.tm = 0.55; e.throwT = 0.35; }
            else if (e.kind === 'luigi') { for (let i = -2; i <= 2; i++) this.eShoot(R, e, 3.3, i * 0.11 + rnd(-0.03, 0.03), 'pellet'); e.fire = 1; e.tm = 0.7; sfx('cannon'); R.shake = Math.max(R.shake, 2); }
            else if (e.kind === 'marzipan') { this.eShoot(R, e, 3.6, rnd(-0.06, 0.06)); if (e.alt % 2) e.fire = 1; else e.fire2 = 1; e.tm = 0.13; }
            else if (e.kind === 'pralino') { this.eShoot(R, e, 3.8, rnd(-0.05, 0.05)); e.fire = 1; e.tm = e.shots === 3 ? 0.42 : 0.1; }
            else { this.eShoot(R, e, 3.2, rnd(-0.04, 0.04)); e.fire = 1; e.tm = 0.22; }
          } else if (e.tm <= 0) { e.st = 'lower'; e.tm = 0.25; }
          break;
        case 'lower':
          if (e.tm <= 0) {
            e.st = 'hide'; e.tm = e.boss ? ({pralino: 1.0, trueffel: 1.5, luigi: 1.2, marzipan: 0.8})[e.kind] : rnd(1.3, 2.6);
            if (e.kind === 'luigi' && Math.random() < 0.65) { e.spot = e.spot === 'barrel' ? 'crate' : 'barrel'; e.st = 'move'; }
            if (e.kind === 'marzipan') { e.spot = e.spot === 'crate' ? 'barrel' : 'crate'; e.st = 'move'; }
          }
          break;
      }
      if (e.throwT > 0) e.throwT -= DT * k;
    },
    pateUpdate(R, e, k) {
      const p = R.p, c = R.car; e.x = c.x + 66 + (e.phase2 ? Math.sin(R.t * 2) * 6 : 0); e.y = GY - 37 + (c.rock ? Math.sin(R.t * 18) * 0.8 : 0);
      e.ct = e.y - 17; e.lift = 0;
      if (e.st === 'ride') { e.e = 1; return; }
      const exposed = e.st !== 'hide';
      e.e += ((exposed ? 1 : 0) - e.e) * Math.min(1, 0.18 * k);
      e.tm -= DT * k;
      const mx = e.x - 26, my = e.y - 19;
      if (!e.phase2 && e.hp <= e.max / 2) { e.phase2 = true; c.rock = true; try { R.opts.banner(tr('Der Pate wird wütend!', 'Chocfather gets mad!'), 2.2, tr('Phase 2: schnelleres MG und Dynamit!', 'Phase 2: faster gun and dynamite!')); } catch (er) {} this.resupply(R, true); sfx('bossHit'); R.shake = 6; e.st = 'hide'; e.tm = 0.8; }
      switch (e.st) {
        case 'hide': if (e.tm <= 0) { e.st = 'aim'; e.tm = e.phase2 ? 0.55 : 0.75; e.wx = p.x; } break;
        case 'aim': e.wx += (p.x - e.wx) * 0.05 * k; e.sweep = 0; if (e.tm <= 0) { e.st = 'sweep'; e.dur = e.phase2 ? 2.2 : 1.9; e.tm = e.dur; e.fireN = 0; } break;
        case 'sweep': {
          const s = 1 - e.tm / e.dur; e.sweep = e.phase2 ? (s < 0.5 ? s * 2 : 2 - s * 2) : s;
          e.fireN += k; if (e.fireN >= (e.phase2 ? 3 : 4)) { e.fireN = 0; const a = this.pateAngle(e); R.eb.push({x: mx, y: my, vx: Math.cos(a) * 4.6, vy: Math.sin(a) * 4.6, r: 2, kind: 'mg'}); e.fire = 1; noise(0.05, {type: 'bandpass', freq: 1200, q: 1, gain: 0.07}); }
          if (e.tm <= 0) { e.st = 'cool'; e.tm = e.phase2 ? 1.1 : 1.4; if (!R.coolHint) { R.coolHint = true; R.hint = {text: tr('Das MG ist heiß gelaufen – jetzt feuern!', 'His gun overheated – fire now!'), t: 2}; } }
          break;
        }
        case 'cool': if (R.fr % 5 === 0) R.parts.push({type: 'cocoa', x: e.x - 30 + rnd(-3, 3), y: e.y - 22, vx: rnd(-0.3, 0.3), vy: -0.7, life: 0.8, max: 0.8, r: rnd(2, 4), col: 'rgba(240,240,240,.8)'}); if (e.tm <= 0) { if (e.phase2) { e.st = 'throw'; e.tm = 0.5; e.throwT = 0.4; this.throwDyn(R, e.x - 8, e.y - 26); } else { e.st = 'hide'; e.tm = 1.5; } } break;
        case 'throw': if (e.tm <= 0) { e.st = 'hide'; e.tm = 1.0; } break;
      }
      if (e.throwT > 0) e.throwT -= DT * k;
    },
    pateAngle(e) { const mx = e.x - 26, my = e.y - 19, top = Math.atan2((GY - 44) - my, (e.wx - 14) - mx), bot = Math.atan2((GY - 1) - my, (e.wx - 24) - mx); return lerp(top, bot, e.sweep); },
    eShoot(R, e, spd, da, kind) {
      const p = R.p, r = eRect(e), mx = e.x - 10, my = r.top + 10 * e.sc;
      const tx = p.x, ty = p.y - (p.crouch ? 6 : 17);
      const a = Math.atan2(ty - my, tx - mx) + (da || 0);
      R.eb.push({x: mx, y: my, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: kind === 'pellet' ? 1.6 : 2.2, kind: kind || 'b'});
      if (kind !== 'pellet') { noise(0.05, {type: 'bandpass', freq: 2600, q: 1.4, gain: 0.06}); tone(420, 0.05, {type: 'square', slide: 200, gain: 0.03}); }
    },
    throwDyn(R, x, y) {
      const p = R.p, tx = p.x + rnd(-26, 34), T = 64, g = 0.12;
      R.dyn.push({x, y, vx: (tx - x) / T, vy: (GY - y - 0.5 * g * T * T) / T, st: 'fly', t: 0, rot: 0});
      sfx('throwIt');
    },
    hurt(R, n) {
      const p = R.p; if (R.opts.autoplay || p.inv > 0 || R.phase === 'dead' || R.phase === 'hug' || R.phase === 'slowmo') return false;
      p.hp -= n || 1; p.inv = 1.3; R.shake = 5; R.hurtCount++; sfx('hurt'); p.vy = Math.min(p.vy, -1.5);
      for (let i = 0; i < 6; i++) R.parts.push({type: 'star', x: p.x + rnd(-6, 6), y: p.y - 14 + rnd(-6, 6), vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 0.5), life: 0.5, max: 0.5, r: 2.2, col: '#ffd84a'});
      if (p.hp <= 0) { p.hp = 0; R.phase = 'dead'; p.deadT = 0; sfx('die'); setBoss(false); try { R.opts.speak('Oh no... Mallo...'); } catch (e) {} }
      return true;
    },
    kill(R, e) {
      e.st = 'die'; e.dieT = 0; e.e = 1; const r = eRect(e);
      R.hats.push({x: e.x, y: r.top + 2, vx: rnd(-1.7, 0.5), vy: -rnd(3.2, 4.4), rot: 0, vr: rnd(0.15, 0.3), kind: e.kind, t: 0, landed: false});
      if (e.boss) {
        R.bossesDown++; R.score += 2000; this.pay(R, 25, e.x, r.top - 10); sfx('bossDown'); R.shake = 7;
        R.hearts.push({x: e.x - 20, y: r.top, vx: -1.6, vy: -3, t: 0});
        if (e.kind === 'pate') this.pateDown(R, e);
      } else {
        R.score += 150; this.pay(R, 3, e.x, r.top - 6); sfx('stomp');
        if (R.p.hp < R.maxHp && Math.random() < 0.4) R.hearts.push({x: e.x - 10, y: r.top, vx: -1.4, vy: -2.6, t: 0});
      }
    },
    pateDown(R, e) {
      if (R.phase === 'dead') { R.p.hp = 1; R.p.deadT = 0; R.p.inv = 2; }   /* his last bullet felled the godfather: that still counts */
      R.phase = 'slowmo'; R.slowT = 2.6; setBoss(false);
      const hat = R.hats[R.hats.length - 1]; hat.keep = true; hat.pate = true; const T = 80, g = 0.15, tx = R.p.x + 26; hat.vx = (tx - hat.x) / T; hat.vy = (GY - hat.y - 0.5 * g * T * T) / T; hat.g = g;
      for (const o of R.enemies) if (o !== e && o.st !== 'die') this.kill(R, o);
      for (const b of R.eb) R.parts.push({type: 'star', x: b.x, y: b.y, vx: 0, vy: -0.3, life: 0.6, max: 0.6, r: 2, col: '#ffd84a'}); R.eb = [];
      for (const d of R.dyn) this.puff(R, d.x, d.y - 4); R.dyn = [];
    },
    puff(R, x, y) {
      for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), s = rnd(0.4, 1.8); R.parts.push({type: 'cocoa', x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, life: rnd(0.6, 1), max: 1, r: rnd(3, 7), col: ['#8a5a3a', '#6a3f24', '#a87850', '#c89a70'][i % 4]}); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; R.parts.push({type: 'star', x, y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 - 0.4, life: 0.8, max: 0.8, r: 2.6, col: i % 2 ? '#ffd84a' : '#fff4e0'}); }
      sfx('pop'); noise(0.3, {type: 'lowpass', freq: 900, freqTo: 200, gain: 0.12});
    },
    explode(R, d, air) {
      const p = R.p; d.gone = true; sfx(air ? 'smallBoom' : 'boom'); R.shake = air ? 3 : 7;
      for (let i = 0; i < 16; i++) { const a = rnd(0, TAU), s = rnd(0.6, 2.6); R.parts.push({type: 'fire', x: d.x, y: d.y - 3, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.8, life: rnd(0.4, 0.8), max: 0.8, r: rnd(3, 6), col: ['#ff7a2a', '#ffd84a', '#ff4a3a'][i % 3]}); }
      R.parts.push({type: 'ring', x: d.x, y: d.y - 3, life: 0.4, max: 0.4, r: 36});
      for (let i = 0; i < 6; i++) R.parts.push({type: 'cocoa', x: d.x + rnd(-10, 10), y: d.y - rnd(0, 12), vx: rnd(-0.6, 0.6), vy: rnd(-1, -0.3), life: 1.1, max: 1.1, r: rnd(5, 9), col: 'rgba(90,70,70,.8)'});
      for (const c of R.covers) if (c.hp > 0 && Math.abs(c.x - d.x) < 40 && !air) { c.hp = Math.max(0, c.hp - 12); c.hit = 0.2; this.chips(R, c, 6); }
      const dx = p.x - d.x, dy = (p.y - 10) - d.y, dist = Math.hypot(dx, dy);
      if (dist < (air ? 26 : 40)) {
        const shielded = p.crouch && R.covers.some(c => c.hp > 0 && ((c.x > p.x - 3 && c.x < d.x) || (c.x < p.x + 3 && c.x > d.x)) && Math.abs(c.x - d.x) > 4);
        if (shielded) { R.hint = {text: tr('Puh! Die Deckung hat dich geschützt!', 'Phew! Your cover kept you safe!'), t: 1.6}; }
        else if (this.hurt(R, 1)) { p.vx += Math.sign(dx || 1) * 2.5; p.vy = -3.5; p.on = false; }
      }
    },
    resupply(R, all) {
      R.repairT = 0; let n = 0;
      for (const c of R.covers) { if (c.incoming || (all ? c.hp >= c.max * 0.75 : c.hp > 0)) continue; c.incoming = true; n++; const x0 = R.camX - 10 - n * 12, y0 = GY - 90, T = 46 + n * 6; R.drops.push({c, x: x0, y: y0, vx: (c.x - x0) / T, vy: (GY - 10 - y0 - 0.5 * 0.2 * T * T) / T, rot: 0}); }
      if (n) { R.hint = {text: tr('Mallo wirft dir neue Heuballen zu!', 'Mallo throws you new hay bales!'), t: 2.2}; sfx('throwIt'); }
    },
    chips(R, c, n) {
      const col = {hay: '#f2c45a', fence: '#c88a52', trough: '#8fd3ff', barrel: '#b0703a'}[c.kind];
      for (let i = 0; i < n; i++) R.parts.push({type: 'chip', x: c.x + rnd(-c.w / 2, c.w / 2), y: GY - coverH(c) + rnd(0, 6), vx: rnd(-1.2, 1.2), vy: rnd(-2.4, -0.8), life: 0.6, max: 0.6, r: rnd(1, 2), col, rot: rnd(0, 3)});
    },
    projectiles(R, k) {
      const p = R.p, c = R.car, W = VW();
      /* Toffo's bullets */
      for (const b of R.pb) {
        b.x += b.vx * k; b.y += b.vy * k; b.life -= DT * k;
        if (b.life <= 0 || b.x > R.camX + W + 20 || b.x < R.camX - 20 || b.y < -20) { b.gone = true; continue; }
        if (b.y >= GY) { b.gone = true; R.parts.push({type: 'dust', x: b.x, y: GY - 1, vx: 0, vy: -0.4, life: 0.35, max: 0.35, r: 2.5}); continue; }
        let hit = false;
        for (const e of R.enemies) {
          if (e.st === 'die' || e.st === 'ride') continue; const r = eRect(e);
          if (b.x > e.x - r.hw && b.x < e.x + r.hw && b.y > r.top && b.y < r.bot && b.y < e.ct) {
            e.hp--; if (!(e.flashCd > 0)) { e.flash = 0.06; e.flashCd = 0.18; } hit = true; R.score += 10;
            R.parts.push({type: 'spark', x: b.x, y: b.y, vx: -1, vy: -0.5, life: 0.18, max: 0.18, r: 4, col: '#fff'});
            if (e.boss) { if (R.fr % 5 === 0) sfx('bossHit'); } else sfx('pop');
            if (e.hp <= 0) this.kill(R, e);
            break;
          }
        }
        if (!hit) for (const d of R.dyn) if (d.st === 'fly' && Math.abs(b.x - d.x) < 7 && Math.abs(b.y - d.y) < 8) { this.explode(R, d, true); R.score += 50; hit = true; R.hint = {text: tr('Dynamit abgeschossen!', 'Dynamite shot down!'), t: 1.2}; break; }
        if (!hit) { const blk = this.blocker(R, b.x, b.y); if (blk) { hit = true; R.parts.push({type: 'spark', x: b.x, y: b.y, vx: -rnd(0.5, 1.5), vy: -rnd(0.2, 1.5), life: 0.2, max: 0.2, r: 3, col: '#ffe94a'}); if (Math.random() < 0.3) tone(1800 + Math.random() * 600, 0.05, {type: 'triangle', gain: 0.03});
          if (blk === 'car' && c && c.holes.length < 26 && Math.random() < 0.5) { c.holes.push([b.x - c.x, b.y - GY]); if (b.y < GY - 22 && c.cracks < 8 && Math.random() < 0.3) c.cracks++; }
          if (blk === 'door' && c && c.doorHoles.length < 10 && Math.random() < 0.5) c.doorHoles.push([rnd(0.2, 0.8), rnd(2, 22)]); } }
        if (hit) b.gone = true;
      }
      R.pb = R.pb.filter(b => !b.gone);
      /* enemy bullets */
      for (const b of R.eb) {
        b.x += b.vx * k; b.y += b.vy * k;
        if (b.x < R.camX - 20 || b.x > R.camX + W + 20 || b.y > GY) { if (b.y > GY) R.parts.push({type: 'dust', x: b.x, y: GY - 1, vx: 0, vy: -0.4, life: 0.35, max: 0.35, r: 2.5}); b.gone = true; continue; }
        for (const cv of R.covers) { if (cv.hp <= 0) continue; const top = GY - coverH(cv); if (b.x > cv.x - cv.w / 2 && b.x < cv.x + cv.w / 2 && b.y > top) { cv.hp = Math.max(0, cv.hp - (b.kind === 'mg' ? 0.6 : 1)); cv.hit = 0.12; b.gone = true; this.chips(R, cv, 2); if (Math.random() < 0.4) tone(cv.kind === 'trough' ? 900 : 300, 0.05, {type: 'triangle', gain: 0.04}); if (cv.hp <= 0) { sfx('crumble'); this.chips(R, cv, 10); } break; } }
        if (b.gone) continue;
        const h = p.crouch ? 11 : 22;
        if (R.phase !== 'dead' && b.x > p.x - 6 && b.x < p.x + 6 && b.y > p.y - h && b.y < p.y) { if (this.hurt(R, 1) || R.opts.autoplay) b.gone = true; }
      }
      R.eb = R.eb.filter(b => !b.gone);
      /* dynamite */
      for (const d of R.dyn) {
        d.t += DT * k;
        if (d.st === 'fly') {
          const py = d.y; d.vy += 0.12 * k; d.x += d.vx * k; d.y += d.vy * k; d.rot += 0.25 * k;
          for (const cv of R.covers) { if (cv.hp <= 0) continue; const top = GY - coverH(cv); if (Math.abs(d.x - cv.x) < cv.w / 2 && py <= top && d.y >= top) { d.y = top; d.st = 'fuse'; d.fuse = 0.75; d.vx = 0; } }
          if (d.st === 'fly' && d.y >= GY - 2) { d.y = GY - 2; d.st = 'fuse'; d.fuse = 0.8; d.vx *= 0.2; sfx('bump'); }
        } else { d.x += d.vx * k; d.vx *= 0.9; d.fuse -= DT * k; if (R.fr % 4 === 0) R.parts.push({type: 'spark', x: d.x + 1.5, y: d.y - 9, vx: rnd(-0.6, 0.6), vy: rnd(-1.2, -0.3), life: 0.25, max: 0.25, r: 1.6, col: '#ffe94a'}); if (d.fuse <= 0) this.explode(R, d, false); }
      }
      R.dyn = R.dyn.filter(d => !d.gone);
    },
    blocker(R, x, y) {
      const c = R.car;
      if (R.ebar && R.phase !== 'explore' && x > R.ebar.x - 10 && x < R.ebar.x + 10 && y > GY - 26) return 'barrel';
      if (!c) return null; const lx = x - c.x;
      if (c.door > 0.5 && lx > 37 && lx < 57 && y > GY - 33 && y < GY - 4) return 'door';
      if (lx > 1 && lx < 23 && y > GY - 22 && c.st === 'park') return 'crate';
      if (c.pate && R.bossRef && R.bossRef.kind === 'pate' && R.bossRef.st !== 'die') { const px = R.bossRef.x; if (x > px - 21 && x < px - 13 && y > R.bossRef.y - 19 && y < R.bossRef.y) return 'plate'; }
      if ((lx > 0 && lx < 30 && y > GY - 20) || (lx >= 30 && lx < 104 && y > GY - 37) || (lx >= 104 && lx < 130 && y > GY - 22)) return 'car';
      return null;
    },
    misc(R, k) {
      const p = R.p;
      /* coins (explore) */
      for (const co of R.coins) if (!co.got && Math.abs(co.x - p.x) < 9 && Math.abs(co.y - (p.y - 11)) < 14) { co.got = true; R.score += 50; this.pay(R, 1, co.x, co.y - 6); sfx('coin'); }
      /* fight trigger */
      if (R.phase === 'explore' && p.gun && p.x > AX + 40) this.startFight(R);
      /* hearts */
      for (const h of R.hearts) {
        h.t += DT * k; if (!h.on) { h.vy += 0.15 * k; h.x += h.vx * k; h.y += h.vy * k; h.x = clamp(h.x, AX + 16, (R.ebar ? R.ebar.x : AX + 300) - 30); if (h.y >= GY - 6) { h.y = GY - 6; h.on = true; } }
        if (h.t > 14) h.gone = true;
        if (Math.abs(h.x - p.x) < 11 && Math.abs(h.y - (p.y - 10)) < 16 && R.phase !== 'dead') { h.gone = true; if (p.hp < R.maxHp) p.hp++; R.score += 100; sfx('heart'); R.parts.push({type: 'text', x: h.x, y: h.y - 10, vx: 0, vy: -0.5, life: 1, max: 1, text: '+♥', col: '#ff6f9c'}); }
      }
      R.hearts = R.hearts.filter(h => !h.gone);
      /* hats */
      for (const h of R.hats) { h.t += DT * k; if (!h.landed) { h.vy += (h.g || 0.2) * k; h.x += h.vx * k; h.y += h.vy * k; h.rot += h.vr * k; if (h.y >= GY - 1) { h.y = GY - 1; h.landed = true; h.rot = 0; sfx(h.pate ? 'thud' : 'bump'); if (h.pate) for (let i = 0; i < 8; i++) R.parts.push({type: 'dust', x: h.x + rnd(-8, 8), y: GY - 2, vx: rnd(-1, 1), vy: rnd(-0.6, -0.1), life: 0.6, max: 0.6, r: rnd(2, 5)}); } } if (h.landed && !h.keep && h.t > 12) h.gone = true; }
      R.hats = R.hats.filter(h => !h.gone);
      /* Mallo throws new hay bales when the cover is shot to pieces */
      if (R.phase === 'fight') {
        const broken = R.covers.filter(c => c.hp <= 0 && !c.incoming).length;
        if (broken >= 2) { R.repairT += DT * k; if (R.repairT > 4) this.resupply(R, false); } else R.repairT = 0;
      }
      for (const d of R.drops) { d.vy += 0.2 * k; d.x += d.vx * k; d.y += d.vy * k; d.rot += 0.12 * k; if (d.y >= GY - 10) { d.gone = true; d.c.incoming = false; d.c.hp = Math.max(d.c.hp, d.c.max * 0.75); d.c.pop = 1; sfx('thud'); for (let i = 0; i < 8; i++) R.parts.push({type: 'chip', x: d.c.x + rnd(-12, 12), y: GY - 12, vx: rnd(-1.4, 1.4), vy: rnd(-2.4, -0.8), life: 0.6, max: 0.6, r: rnd(1, 2), col: '#f2c45a', rot: 0}); } }
      R.drops = R.drops.filter(d => !d.gone);
      /* covers */
      for (const c of R.covers) { if (c.pop > 0) c.pop = Math.max(0, c.pop - 0.05); if (c.hit > 0) c.hit -= DT; }
      /* particles */
      for (const q of R.parts) { q.life -= DT * k; q.x += (q.vx || 0) * k; q.y += (q.vy || 0) * k; if (q.type === 'shell' || q.type === 'chip') { q.vy += 0.18 * k; if (q.y > GY - 1) { q.y = GY - 1; q.vy *= -0.4; q.vx *= 0.6; } q.rot = (q.rot || 0) + 0.4 * k; } if (q.type === 'cocoa' || q.type === 'dust') { q.vx *= 0.95; q.vy *= 0.95; } if (q.type === 'fire') q.vy -= 0.03 * k; }
      R.parts = R.parts.filter(q => q.life > 0); if (R.parts.length > 420) R.parts.splice(0, R.parts.length - 420);
    },

    /* ---------- rendering ---------- */
    frame(ctx) {
      const R = this.R, W = VW(); if (!R) { ctx.fillStyle = '#ffcf8a'; ctx.fillRect(0, 0, W, VH); return; }
      this.fitWidth(R);
      const cam = Math.round(R.camX * 2) / 2, t = R.t, p = R.p;
      const hz = R.pookie && R.pookie.st === 'hug' ? sstep(R.pookie.t, 0, 1.6) : 0;
      ctx.save();
      if (hz > 0) { const fx = p.x - 9 - cam, fy = p.y - 16, z = 1 + hz * 0.9; ctx.translate(lerp(fx, W / 2, hz), lerp(fy, VH * 0.58, hz)); ctx.scale(z, z); ctx.translate(-fx, -fy); }
      this.drawBack(ctx, R, cam, W);
      ctx.save();
      if (R.shake > 0) ctx.translate((Math.random() - 0.5) * R.shake, (Math.random() - 0.5) * R.shake);
      ctx.translate(-cam, 0);
      this.drawWorld(ctx, R, cam, W);
      /* car, mafia, their cover */
      const c = R.car;
      if (c) drawLimo(ctx, c, t);
      for (const e of R.enemies) if (e.st !== 'die' && e.kind !== 'pate') this.drawEnemy(ctx, R, e);
      if (R.ebar && R.phase !== 'explore') drawBarrel(ctx, R.ebar.x, GY, 20, 26, 0, true);
      if (c && c.st === 'park') drawCrate(ctx, c.x + 12, GY, 22, 22);
      if (c) drawDoor(ctx, c);
      for (const e of R.enemies) if (e.st !== 'die' && e.kind === 'pate') this.drawPate(ctx, R, e);
      /* pickups */
      for (const h of R.hearts) { if (h.t > 11 && Math.floor(h.t * 8) % 2) continue; ctx.save(); ctx.translate(h.x, h.y + (h.on ? Math.sin(h.t * 4) * 1.5 : 0)); heartPath(ctx, 0, 0, 0.9); fsr(ctx, '#ff6f9c', '#7a1a3a', 1); circ(ctx, -2.2, -2.5, 1.1, 'rgba(255,255,255,.8)'); ctx.restore(); }
      for (const co of R.coins) if (!co.got) { const sx = Math.abs(Math.cos(R.rt * 4 + co.x)); ctx.save(); ctx.translate(co.x, co.y + Math.sin(R.rt * 3 + co.x) * 1.5); ctx.scale(Math.max(0.25, sx), 1); circ(ctx, 0, 0, 4.4, '#ffd84a', '#a0741a', 1); ctx.fillStyle = '#a0741a'; ctx.fillRect(-0.6, -2.4, 1.2, 4.8); ctx.restore(); }
      /* Toffo (+ Mallo at the end) */
      this.drawToffo(ctx, R);
      if (R.pookie) { const pk = R.pookie, hugging = pk.st === 'hug'; ctx.save(); if (hugging && pk.t > 1.1) { ctx.translate(pk.x, GY); ctx.rotate(0.14); ctx.translate(-pk.x, -GY); } bear(ctx, pk.x, GY, {scale: 1.05, facing: 1, frame: R.rt * 12, t: R.rt, pose: hugging ? (pk.t < 1.1 ? 'victory' : 'idle') : 'run', speed: 0.9, white: true, bow: true, mood: hugging ? 'happy' : 'wide'}); ctx.restore(); if (hugging && pk.t > 1.3) { ctx.globalAlpha = Math.min(1, (pk.t - 1.3) * 3); bubble(ctx, pk.x - 4, GY - 30, tr('Mein Held!', 'My hero!'), 80, 6, -1e9, 1e9); ctx.globalAlpha = 1; } }
      /* player cover (in front) */
      for (const cv of R.covers) this.drawCover(ctx, R, cv);
      for (const d of R.drops) { ctx.save(); ctx.translate(d.x, d.y + 8); ctx.rotate(d.rot); drawHay(ctx, 0, 8, 20, 14, 0); ctx.restore(); }
      /* flying hats, dying mafiosi */
      for (const e of R.enemies) if (e.st === 'die') { if (e.kind === 'pate') this.drawPate(ctx, R, e); else this.drawEnemy(ctx, R, e); }
      for (const h of R.hats) { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.scale(h.pate ? 1 : 0.8, h.pate ? 1 : 0.8); drawFedora(ctx, 0, 0, h.kind, false); ctx.restore(); }
      /* bullets, dynamite */
      for (const b of R.pb) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); rr(ctx, -7, -1.2, 9, 2.4, 1.2); fsr(ctx, 'rgba(255,200,60,.55)'); rr(ctx, -1, -1.4, 4, 2.8, 1.4); fsr(ctx, '#ffe94a'); ctx.restore(); }
      for (const b of R.eb) { circ(ctx, b.x - b.vx * 1.4, b.y - b.vy * 1.4, b.r * 0.8, 'rgba(255,90,60,.4)'); circ(ctx, b.x, b.y, b.r, b.kind === 'mg' ? '#ff4a3a' : '#ff6a2a', '#5a0a10', 0.7); circ(ctx, b.x - 0.5, b.y - 0.5, b.r * 0.4, '#fff'); }
      for (const d of R.dyn) {
        if (d.st === 'fuse') { const a = 0.25 + 0.25 * Math.sin(R.rt * 20); ell(ctx, d.x, GY - 1, 40, 6, 0, 'rgba(255,60,40,' + a + ')'); ctx.strokeStyle = 'rgba(255,60,40,.8)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(d.x, GY - 1, 40, 6, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        ctx.save(); ctx.translate(d.x, d.y - 5); ctx.rotate(d.st === 'fly' ? d.rot : 0.2); drawDynStick(ctx, 0, 0, 0.9, R.rt); ctx.restore();
      }
      this.drawParts(ctx, R);
      /* world-space prompts */
      this.drawPrompts(ctx, R);
      ctx.restore();
      ctx.restore();
      this.drawHud(ctx, R, W);
      if (R.phase === 'slowmo') { ctx.fillStyle = 'rgba(255,230,180,' + (0.12 + 0.05 * Math.sin(R.rt * 6)) + ')'; ctx.fillRect(0, 0, W, VH); const g = ctx.createRadialGradient(W / 2, VH / 2, 80, W / 2, VH / 2, W * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,20,10,.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH); }
      if (R.phase === 'dead') { ctx.fillStyle = 'rgba(30,10,20,' + sstep(p.deadT, 0.6, 1.8) * 0.8 + ')'; ctx.fillRect(0, 0, W, VH); }
      if (R.phase === 'hug' && R.pookie && R.pookie.st === 'hug') { const a = sstep(R.pookie.t, 2.6, 4.2); if (a > 0) { ctx.fillStyle = 'rgba(255,240,220,' + a + ')'; ctx.fillRect(0, 0, W, VH); } }
    },
    drawBack(ctx, R, cam, W) {
      const g = ctx.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, '#7cc0ea'); g.addColorStop(0.45, '#bfe0ea'); g.addColorStop(0.75, '#ffe1a8'); g.addColorStop(1, '#ffc27a'); ctx.fillStyle = g; ctx.fillRect(-W, -VH, W * 3, VH * 3);
      const sx = W * 0.8 - cam * 0.03, sy = 78; glow(ctx, sx, sy, 90, 'rgba(255,240,170,.75)'); circ(ctx, sx, sy, 22, '#fff2b0'); circ(ctx, sx, sy, 17, '#fff8d8');
      /* clouds */
      for (let i = 0; i < 5; i++) { const x = ((i * 170 - cam * 0.08 + R.rt * 4) % (W + 200) + W + 200) % (W + 200) - 100, y = 34 + (i % 3) * 22; ctx.fillStyle = 'rgba(255,255,255,.85)'; ell(ctx, x, y, 24, 7); ctx.fill(); ell(ctx, x + 12, y - 5, 13, 8); ctx.fill(); ell(ctx, x - 10, y - 3, 10, 6); ctx.fill(); }
      /* far mesas */
      ctx.fillStyle = '#e0a07e'; ctx.beginPath(); ctx.moveTo(-W / 2, GY);
      for (let x = -W / 2; x <= W * 1.5; x += 20) { const wx = x + cam * 0.12, h = 46 + Math.round(hash(Math.floor(wx / 120), 1) * 3) * 14 + (hash(Math.floor(wx / 120), 2) > 0.6 ? 0 : -18); ctx.lineTo(x - ((wx % 20) + 20) % 20, GY - 60 - h * 0.6); }
      ctx.lineTo(W * 1.5, GY); ctx.closePath(); ctx.fill();
      /* rolling hills */
      ctx.fillStyle = '#d7c26a'; ctx.beginPath(); ctx.moveTo(-W / 2, GY); for (let x = -W / 2; x <= W * 1.5; x += 10) { const wx = x + cam * 0.35; ctx.lineTo(x, GY - 34 - Math.sin(wx * 0.012) * 10 - Math.sin(wx * 0.031) * 5); } ctx.lineTo(W * 1.5, GY); ctx.closePath(); ctx.fill();
      /* windmills + water tower on the mid layer */
      for (const mx of [220, 760, 1180]) { const x = mx - cam * 0.5; if (x > -60 && x < W + 60) drawWindmill(ctx, x, GY - 30, 0.8, R.rt + mx, '#9a7a6a'); }
      { const x = 520 - cam * 0.5; if (x > -60 && x < W + 60) { ctx.fillStyle = '#b08a7a'; ctx.fillRect(x - 12, GY - 70, 2, 40); ctx.fillRect(x + 10, GY - 70, 2, 40); rr(ctx, x - 16, GY - 92, 32, 24, 6); fsr(ctx, '#c49a8a'); ctx.beginPath(); ctx.moveTo(x - 18, GY - 92); ctx.lineTo(x, GY - 104); ctx.lineTo(x + 18, GY - 92); fsr(ctx, '#b06a5a'); } }
      /* back fence */
      ctx.strokeStyle = '#b8865a'; ctx.lineWidth = 2; const off = ((cam * 0.8) % 34 + 34) % 34;
      ctx.beginPath(); ctx.moveTo(-W / 2, GY - 18); ctx.lineTo(W * 1.5, GY - 18); ctx.moveTo(-W / 2, GY - 10); ctx.lineTo(W * 1.5, GY - 10); ctx.stroke();
      ctx.fillStyle = '#a0704a'; for (let x = -off - 34 * 8; x < W + 34; x += 34) ctx.fillRect(x, GY - 24, 4, 24);
      /* ground */
      ctx.fillStyle = '#8cc456'; ctx.fillRect(-W / 2, GY - 3, W * 2, 6); ctx.fillStyle = '#d9a86a'; ctx.fillRect(-W / 2, GY + 2, W * 2, VH - GY); ctx.fillStyle = '#c8945a'; ctx.fillRect(-W / 2, GY + 16, W * 2, VH - GY - 16);
      ctx.fillStyle = '#b07e4a'; for (let i = 0; i < 26; i++) { const x = ((i * 53 - cam) % (W + 40) + W + 40) % (W + 40) - 20; ell(ctx, x, GY + 9 + (i % 3) * 9, 3 + (i % 2) * 2, 1.2); ctx.fill(); }
      ctx.fillStyle = '#6aa840'; for (let i = 0; i < 30; i++) { const x = ((i * 41 - cam) % (W + 40) + W + 40) % (W + 40) - 20; ctx.beginPath(); ctx.moveTo(x - 3, GY + 1); ctx.lineTo(x - 1, GY - 4); ctx.lineTo(x, GY + 1); ctx.lineTo(x + 2, GY - 5); ctx.lineTo(x + 3, GY + 1); ctx.fill(); }
    },
    drawWorld(ctx, R, cam, W) {
      const t = R.rt, vis = (x0, x1) => x1 > cam - 10 && x0 < cam + W + 10;
      /* farmhouse with Mallo at the window */
      if (vis(0, 170)) {
        ctx.fillStyle = '#e8d0a8'; ctx.fillRect(14, GY - 82, 140, 82); ctx.strokeStyle = 'rgba(160,120,80,.4)'; ctx.lineWidth = 1; for (let y = GY - 76; y < GY; y += 7) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(154, y); ctx.stroke(); }
        ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.strokeRect(14, GY - 82, 140, 82);
        ctx.beginPath(); ctx.moveTo(4, GY - 80); ctx.lineTo(84, GY - 124); ctx.lineTo(164, GY - 80); ctx.closePath(); fsr(ctx, '#c0473c', OL, 1.4); ctx.fillStyle = '#a03a30'; for (let i = 0; i < 4; i++) ctx.fillRect(20 + i * 34, GY - 92 + Math.abs(i - 1.5) * -4, 22, 2);
        ctx.fillStyle = '#9a4a3a'; ctx.fillRect(122, GY - 120, 12, 26); ctx.strokeRect(122, GY - 120, 12, 26);
        for (let i = 0; i < 3; i++) { const sy = GY - 124 - ((t * 10 + i * 12) % 36); circ(ctx, 128 + Math.sin(t + i) * 3, sy, 4 + ((t * 10 + i * 12) % 36) / 8, 'rgba(255,255,255,' + (0.6 - ((t * 10 + i * 12) % 36) / 60) + ')'); }
        /* window with Mallo */
        const wx = 96, wy = GY - 70;
        rr(ctx, wx - 19, wy - 3, 38, 32, 4); fsr(ctx, '#fff4e0', OL, 1.4);
        ctx.save(); rr(ctx, wx - 16, wy, 32, 26, 3); ctx.clip(); const wg = ctx.createLinearGradient(0, wy, 0, wy + 26); wg.addColorStop(0, '#ffe2a8'); wg.addColorStop(1, '#f0b878'); ctx.fillStyle = wg; ctx.fillRect(wx - 16, wy, 32, 26);
        const cheer = R.say != null || (R.phase === 'fight' && R.bossesDown > 0 && R.car && R.car.st === 'leave');
        if (R.phase !== 'hug') bear(ctx, wx + 1, wy + 37, {scale: 1.35, facing: R.p.x > wx ? 1 : -1, t, frame: t * 8, pose: cheer ? 'victory' : 'idle', white: true, bow: true});
        ctx.restore();
        ctx.fillStyle = '#ff9eb0'; ctx.beginPath(); ctx.moveTo(wx - 17, wy - 1); ctx.quadraticCurveTo(wx - 9, wy + 8, wx - 13, wy + 26); ctx.lineTo(wx - 17, wy + 26); ctx.closePath(); fsr(ctx, '#ff9eb0', '#c25a7a', 0.8); ctx.beginPath(); ctx.moveTo(wx + 17, wy - 1); ctx.quadraticCurveTo(wx + 9, wy + 8, wx + 13, wy + 26); ctx.lineTo(wx + 17, wy + 26); ctx.closePath(); fsr(ctx, '#ff9eb0', '#c25a7a', 0.8);
        rr(ctx, wx - 21, wy + 27, 42, 6, 2); fsr(ctx, '#8a5a30', OL, 1); for (let i = 0; i < 6; i++) circ(ctx, wx - 16 + i * 6.4, wy + 26, 2.5, ['#ff6f9c', '#ffd84a', '#fff', '#ff9eb0', '#9be7a5', '#ff6f9c'][i], 'rgba(90,30,50,.5)', 0.5);
        /* door + porch */
        rr(ctx, 30, GY - 46, 24, 46, 3); fsr(ctx, '#a0603a', OL, 1.3); circ(ctx, 49, GY - 22, 1.6, '#ffd84a'); rr(ctx, 35, GY - 40, 14, 10, 2); fsr(ctx, '#ffe9b8');
        ctx.fillStyle = '#8a5a30'; ctx.fillRect(10, GY - 52, 150, 4); ctx.fillRect(16, GY - 50, 3, 50); ctx.fillRect(150, GY - 50, 3, 50);
        ctx.fillStyle = '#c08a52'; ctx.fillRect(10, GY - 6, 150, 6);
      }
      /* trough, cactus, hay pyramid */
      if (vis(170, 360)) {
        drawTrough(ctx, 196, GY, 40, 15, 1, t); drawCactus(ctx, 252, GY, 0.95);
        drawHay(ctx, 299, GY, 30, 16, 0); drawHay(ctx, 331, GY, 30, 16, 0); drawHay(ctx, 315, GY - 16, 30, 16, 0);
      }
      if (vis(360, 420)) { ctx.fillStyle = '#8a5a30'; for (let i = 0; i < 3; i++) ctx.fillRect(366 + i * 18, GY - 20, 3, 20); ctx.fillRect(362, GY - 16, 46, 2.5); ctx.fillRect(362, GY - 8, 46, 2.5); }
      /* red barn with the safe */
      if (vis(420, 670)) {
        ctx.fillStyle = '#c8423a'; ctx.fillRect(430, GY - 92, 220, 92);
        ctx.strokeStyle = 'rgba(120,30,25,.35)'; ctx.lineWidth = 1; for (let x = 436; x < 650; x += 8) { ctx.beginPath(); ctx.moveTo(x, GY - 92); ctx.lineTo(x, GY); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(422, GY - 90); ctx.lineTo(450, GY - 128); ctx.lineTo(540, GY - 146); ctx.lineTo(630, GY - 128); ctx.lineTo(658, GY - 90); ctx.closePath(); fsr(ctx, '#8a3a34', OL, 1.4);
        ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(424, GY - 90); ctx.lineTo(450, GY - 127); ctx.lineTo(540, GY - 145); ctx.lineTo(630, GY - 127); ctx.lineTo(656, GY - 90); ctx.stroke();
        ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.strokeRect(430, GY - 92, 220, 92);
        /* hayloft door */
        rr(ctx, 524, GY - 128, 32, 26, 2); fsr(ctx, '#5a2a22', '#fff4e0', 2); ctx.fillStyle = '#f2c45a'; ell(ctx, 540, GY - 104, 14, 5); ctx.fill();
        /* open interior */
        ctx.fillStyle = '#5a2a22'; ctx.fillRect(464, GY - 80, 160, 80); ctx.fillStyle = 'rgba(255,200,120,.12)'; ctx.beginPath(); ctx.moveTo(464, GY - 80); ctx.lineTo(520, GY - 80); ctx.lineTo(480, GY); ctx.lineTo(464, GY); ctx.fill();
        ctx.fillStyle = '#f2c45a'; ell(ctx, 476, GY, 14, 8); ctx.fill(); ell(ctx, 612, GY, 16, 10); ctx.fill(); ctx.fillStyle = '#d8a83a'; ell(ctx, 612, GY - 2, 10, 5); ctx.fill();
        /* loft, ladder, crates */
        ctx.fillStyle = '#8a5a30'; ctx.fillRect(574, GY - 62, 50, 5); ctx.fillStyle = '#f2c45a'; ell(ctx, 600, GY - 63, 22, 6); ctx.fill();
        ctx.strokeStyle = '#a0703a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(586, GY); ctx.lineTo(582, GY - 62); ctx.moveTo(596, GY); ctx.lineTo(592, GY - 62); ctx.stroke(); ctx.lineWidth = 1.4; for (let y = GY - 8; y > GY - 60; y -= 8) { ctx.beginPath(); ctx.moveTo(585, y); ctx.lineTo(595, y); ctx.stroke(); }
        drawCrate(ctx, 560, GY, 24, 20); drawCrate(ctx, 557, GY - 20, 18, 20);
        /* big doors swung open */
        for (const [x0, x1] of [[434, 464], [624, 646]]) { ctx.fillStyle = '#d24a40'; ctx.fillRect(x0, GY - 80, x1 - x0, 80); ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, GY - 79, x1 - x0 - 2, 78); ctx.beginPath(); ctx.moveTo(x0 + 1, GY - 79); ctx.lineTo(x1 - 1, GY - 1); ctx.moveTo(x1 - 1, GY - 79); ctx.lineTo(x0 + 1, GY - 1); ctx.stroke(); }
        ctx.fillStyle = '#fff4e0'; ctx.fillRect(462, GY - 82, 164, 3);
        /* the safe */
        this.drawSafe(ctx, R);
      }
      /* the ranch sign at the arena */
      if (vis(690, 760)) { ctx.fillStyle = '#8a5a30'; ctx.fillRect(706, GY - 46, 4, 46); ctx.fillRect(744, GY - 46, 4, 46); rr(ctx, 700, GY - 56, 54, 18, 3); fsr(ctx, '#d89a5e', OL, 1.2); outlined(ctx, tr('Schoko-Ranch', 'Choco Ranch'), 727, GY - 47, 7, '#fff4e0', 'center', '#7a3b57'); }
      if (vis(AX + 280, AX + 640)) drawCactus(ctx, AX + VW() - 14, GY, 0.7);
    },
    drawSafe(ctx, R) {
      const x = SAFE_X, y = GY, open = R.safe === 'opening' || R.safe === 'open', k = R.safe === 'opening' ? sstep(R.safeT, 0, 0.6) : (R.safe === 'open' ? 1 : 0);
      ell(ctx, x, y, 17, 3, 0, 'rgba(0,0,0,.3)');
      rr(ctx, x - 15, y - 32, 30, 32, 3); fsr(ctx, '#4a5a5e', OL, 1.4); rr(ctx, x - 12, y - 29, 24, 26, 2); fsr(ctx, open ? '#1a1416' : '#5a6c70');
      if (open) { if (!R.p.gun && !R.gunFly) { glow(ctx, x, y - 16, 20, 'rgba(255,230,120,.8)'); drawTommy(ctx, x - 6, y - 16, 0, 1, 0, 0, 0.6); } ctx.save(); ctx.translate(x - 12, y - 29); ctx.scale(1 - k * 1.6, 1); rr(ctx, 0, 0, 24, 26, 2); fsr(ctx, '#6a7c80', OL, 1.2); ctx.restore(); }
      else { circ(ctx, x, y - 16, 6.5, '#c8ccd4', OL, 1.2); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + R.rt * (R.safe === 'puzzle' ? 3 : 0); ctx.fillStyle = OL; ctx.fillRect(x + Math.cos(a) * 4.8 - 0.4, y - 16 + Math.sin(a) * 4.8 - 0.4, 0.8, 0.8); } circ(ctx, x, y - 16, 2, '#ffd84a', OL, 0.8); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 7, y - 22, 2.4, 12); }
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 14, y - 34, 28, 2);
    },
    drawCover(ctx, R, c) {
      const fr = c.hp / c.max, h = coverH(c), s = 1 + c.pop * 0.3;
      ctx.save(); ctx.translate(c.x, GY); ctx.scale(s, 2 - s > 0.6 ? (c.pop > 0 ? 1 + Math.sin(c.pop * 9) * 0.1 : 1) : 1); if (c.hit > 0) ctx.translate(Math.sin(R.rt * 90) * 1, 0);
      if (c.hp <= 0) { ctx.fillStyle = {hay: '#e0b04a', fence: '#a0703a', trough: '#8a5a30', barrel: '#8a5428'}[c.kind]; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(-c.w / 2 + 4 + i * (c.w - 8) / 4, -2); ctx.rotate(hash(i, c.w) - 0.5); ctx.fillRect(-4, -1.5, 8, 3); ctx.restore(); } ctx.restore(); return; }
      if (c.kind === 'hay') drawHay(ctx, 0, 0, c.w, h, 1 - fr);
      else if (c.kind === 'fence') drawFence(ctx, 0, 0, c.w, h, fr);
      else if (c.kind === 'trough') drawTrough(ctx, 0, 0, c.w, h, fr, R.rt);
      else drawBarrel(ctx, 0, 0, c.w, h, 1 - fr, false);
      ctx.restore();
    },
    drawEnemy(ctx, R, e) {
      const sq = e.kind === 'pate' ? 1 : 0.6 + 0.4 * e.e, fy = e.y - (e.lift || 0) * e.e - (e.hopT > 0 && e.st === 'out' ? Math.sin(e.hopT / 0.5 * Math.PI) * 12 : 0);
      const throwing = e.throwT > 0;
      drawMob(ctx, e.x, fy, {kind: e.kind, sc: e.sc, wide: e.wide, fur: e.fur, sq: e.st === 'die' ? 1 : sq, t: e.t, flash: e.flash, spin: e.spin, hat: e.st !== 'die', aim: e.aim, gun: e.gun, fire: e.fire, fire2: e.fire2, run: e.run, roll: e.roll ? e.rollA : 0, throwA: e.gun === 'dyn' ? (throwing ? 2.6 - e.throwT * 4 : (e.st === 'aim' || e.st === 'rise' ? 2.6 : 0.3)) : null, holdDyn: e.gun === 'dyn' && (e.st === 'aim' || e.st === 'rise')});
      if (e.st === 'aim' && e.e > 0.6) { const r = eRect(e), a = 0.6 + 0.4 * Math.sin(R.rt * 24); outlined(ctx, '!', e.x, r.top - 7, 10, 'rgba(255,80,60,' + a + ')', 'center', '#fff'); }
    },
    drawPate(ctx, R, e) {
      const sq = e.st === 'die' ? 1 : 0.5 + 0.5 * e.e;
      if (e.st !== 'die') {
        /* tripod MG */
        const a = (e.st === 'sweep' || e.st === 'aim' || e.st === 'cool') ? (e.st === 'aim' ? this.pateAngle(Object.assign({}, e, {sweep: 0})) : this.pateAngle(e)) : 0.25;
        ctx.save(); ctx.translate(e.x - 12, e.y - 15 + (1 - e.e) * 4); ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, 14); ctx.moveTo(0, 0); ctx.lineTo(5, 14); ctx.stroke();
        ctx.rotate(Math.PI + a); rr(ctx, -4, -2.6, 12, 5.2, 2); fsr(ctx, '#3a3a48', '#000', 0.8); rr(ctx, 8, -1.4, 13, 2.8, 1); fsr(ctx, '#2a2a33'); ctx.fillStyle = '#6a6a7e'; for (let i = 0; i < 4; i++) ctx.fillRect(9 + i * 3, -1.4, 1, 2.8);
        ctx.fillStyle = '#c8a040'; for (let i = 0; i < 5; i++) ctx.fillRect(-2 + i * 1.6, 2.6, 1, 3 + (i % 2));
        if (e.fire > 0) { starPath(ctx, 24, 0, 6, 2.2, 7, R.rt * 30); fsr(ctx, '#ffe94a'); circ(ctx, 23, 0, 2, '#fff'); }
        ctx.restore();
        if (e.st === 'aim') { const aa = this.pateAngle(Object.assign({}, e, {sweep: 0})), mx = e.x - 26, my = e.y - 19; ctx.strokeStyle = 'rgba(255,40,40,' + (0.35 + 0.3 * Math.sin(R.rt * 30)) + ')'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(aa) * 400, my + Math.sin(aa) * 400); ctx.stroke(); ctx.setLineDash([]); }
      }
      drawMob(ctx, e.x, e.y, {kind: 'pate', sc: e.sc, fur: e.fur, sq, t: e.t, flash: e.flash, spin: e.spin, hat: e.st !== 'die', aim: 0.2, gun: 'mg', throwA: e.throwT > 0 ? 2.6 - e.throwT * 4 : null, holdDyn: false});
      if (e.st !== 'die') { /* steel plate */ ctx.save(); ctx.translate(e.x - 17, e.y); rr(ctx, -4, -19, 8, 19, 2); fsr(ctx, '#7a7a8a', '#1a1a22', 1.2); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-2.5, -17, 1.4, 15); circ(ctx, 0, -15, 0.9, '#3a3a48'); circ(ctx, 0, -4, 0.9, '#3a3a48'); ctx.restore(); }
      if (e.st === 'ride' && R.car && R.car.st === 'arrive') { /* waving the hat: nothing extra */ }
    },
    drawToffo(ctx, R) {
      const p = R.p; if (p.inv > 0 && Math.floor(p.inv * 12) % 2 && R.phase !== 'dead') ctx.globalAlpha = 0.45;
      let pose = !p.on ? (p.vy < 0 ? 'jump' : 'fall') : (Math.abs(p.vx) > 0.3 ? 'run' : 'idle');
      if (R.phase === 'dead') pose = 'dead';
      if (R.phase === 'hug' && R.pookie && R.pookie.st === 'hug') pose = R.pookie.t < 1.1 ? 'victory' : 'idle';
      const sc = 1.1;
      ctx.save();
      if (R.phase === 'hug' && R.pookie && R.pookie.st === 'hug' && R.pookie.t > 1.1) { ctx.translate(p.x, p.y); ctx.rotate(-0.12); ctx.translate(-p.x, -p.y); }
      bear(ctx, p.x, p.y, {scale: sc, facing: p.face, frame: p.anim, t: R.rt, pose, speed: Math.min(1, Math.abs(p.vx) / 1.9), sx: p.crouch ? 1.1 : 1, sy: p.crouch ? 0.72 : 1, vy: p.vy, deadT: p.deadT, mood: R.phase === 'hug' && R.pookie && R.pookie.st === 'hug' ? 'happy' : undefined});
      ctx.restore();
      if (p.gun && R.phase !== 'dead' && !(R.phase === 'hug' && R.pookie && R.pookie.st === 'hug')) {
        const gx = p.x + p.face * 5, gy = p.y - (p.crouch ? 7 : 11);
        drawTommy(ctx, gx, gy, p.crouch ? -0.9 : p.aim * (p.face > 0 ? 1 : -1) * p.face, p.face, p.recoil, p.flash > 0 ? 1 : 0, 0.85);
      }
      ctx.globalAlpha = 1;
      if (p.crouch && R.covers.some(c => c.hp > 0 && Math.abs(c.x - p.x) < c.w / 2 + 4)) { ctx.save(); ctx.globalAlpha = 0.85; ctx.translate(p.x, p.y - 30); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(5, -3); ctx.lineTo(4, 2); ctx.lineTo(0, 5); ctx.lineTo(-4, 2); ctx.lineTo(-5, -3); ctx.closePath(); fsr(ctx, '#9be7a5', '#2a6a3a', 1); ctx.restore(); }
    },
    drawParts(ctx, R) {
      for (const q of R.parts) {
        const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = q.type === 'text' ? Math.min(1, a * 2) : a;
        if (q.type === 'star') { starPath(ctx, q.x, q.y, q.r, q.r * 0.45, 5, R.rt * 4); fsr(ctx, q.col); }
        else if (q.type === 'cocoa') circ(ctx, q.x, q.y, q.r * (1.6 - a * 0.6), q.col);
        else if (q.type === 'dust') circ(ctx, q.x, q.y, q.r * (1.5 - a * 0.5), 'rgba(230,200,160,.8)');
        else if (q.type === 'fire') circ(ctx, q.x, q.y, q.r * a + 1, q.col);
        else if (q.type === 'ring') { ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1 - a) + 3, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (q.type === 'spark') { starPath(ctx, q.x, q.y, q.r, q.r * 0.35, 4, R.rt * 9); fsr(ctx, q.col); }
        else if (q.type === 'shell') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = '#e8b83a'; ctx.fillRect(-1.4, -0.7, 2.8, 1.4); ctx.restore(); }
        else if (q.type === 'chip') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.col; ctx.fillRect(-q.r, -q.r * 0.5, q.r * 2, q.r); ctx.restore(); }
        else if (q.type === 'heart') { heartPath(ctx, q.x, q.y, q.r); fsr(ctx, '#ff6f9c'); }
        else if (q.type === 'text') outlined(ctx, q.text, q.x, q.y, 8, q.col);
      }
      ctx.globalAlpha = 1;
    },
    drawPrompts(ctx, R) {
      const p = R.p, t = R.rt;
      if (R.say && R.camX < 60) { const a = Math.min(1, R.say.t * 2, (60 - R.camX) / 30); ctx.globalAlpha = a; bubble(ctx, 96, GY - 78, R.say.text, 150, 7.5, R.camX + 4, R.camX + VW() - 4); ctx.globalAlpha = 1; }
      if (!p.gun && R.safe !== 'opening') {
        const near = Math.abs(p.x - SAFE_X) < 20, by = GY - 48 + Math.sin(t * 5) * 2.5;
        if (near) { rr(ctx, SAFE_X - 30, by - 9, 60, 16, 8); fsr(ctx, 'rgba(74,34,58,.9)', '#ffd84a', 1.2); outlined(ctx, tr('▼ Tresor öffnen', '▼ Open safe'), SAFE_X, by - 1, 7, '#fff', 'center', 'rgba(0,0,0,0)', 700); }
        else { outlined(ctx, '▼', SAFE_X, by, 12, '#ffd84a'); outlined(ctx, tr('Tresor', 'Safe'), SAFE_X, by - 12, 7, '#fff'); }
      }
      if (p.gun && R.phase === 'explore') { const x = R.camX + VW() - 30 + Math.sin(t * 6) * 4; outlined(ctx, '➜', x, GY - 76, 16, '#ffd84a'); }
      if (R.phase === 'fight' && R.coverHintT > 0 && R.stage === 0) { const c = R.covers.reduce((a, b) => (Math.abs(b.x - p.x) < Math.abs(a.x - p.x) ? b : a)); const y = GY - coverH(c) - 34 + Math.sin(t * 6) * 2; outlined(ctx, tr('▼ Deckung', '▼ Cover'), c.x, y, 7, '#9be7a5'); }
    },
    drawHud(ctx, R, W) {
      const p = R.p;
      for (let i = 0; i < R.maxHp; i++) { ctx.save(); ctx.translate(14 + i * 15, 14); const pul = i === p.hp - 1 && p.hp <= 2 ? 1 + Math.sin(R.rt * 10) * 0.12 : 1; ctx.scale(pul, pul); heartPath(ctx, 0, 0, 1.05); fsr(ctx, i < p.hp ? '#ff6f9c' : 'rgba(255,255,255,.35)', '#5a1a3a', 1.1); if (i < p.hp) circ(ctx, -2.5, -2.6, 1.2, 'rgba(255,255,255,.75)'); ctx.restore(); }
      if (p.gun) {
        ctx.save(); ctx.translate(14, 32); circ(ctx, 0, 0, 6, '#2a2a34', '#fff4e0', 1.2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 5, -Math.PI / 2, -Math.PI / 2 + TAU * (p.reload > 0 ? 1 - p.reload / 1.1 : p.ammo / 50)); ctx.closePath(); fsr(ctx, p.reload > 0 ? '#ff9eb0' : '#ffd84a'); ctx.restore();
        outlined(ctx, p.reload > 0 ? tr('Nachladen…', 'Reloading…') : String(p.ammo), 24, 32.5, 8, p.reload > 0 ? '#ff9eb0' : '#fff', 'left');
      }
      outlined(ctx, String(R.score).padStart(6, '0'), W - 10, 13, 9, '#ffd84a', 'right');
      outlined(ctx, '● ' + (G.fmt ? G.fmt(R.money) : R.money), W - 10, 25, 8, '#fff4e0', 'right');
      /* five fedoras: bosses beaten */
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(W - 80 + i * 15, 40); ctx.scale(0.62, 0.62); ctx.globalAlpha = i < R.bossesDown ? 0.35 : 1; drawFedora(ctx, 0, 0, BOSS_ORDER[i], false); ctx.globalAlpha = 1; if (i < R.bossesDown) { ctx.strokeStyle = '#ff6f9c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, 2); ctx.moveTo(7, -8); ctx.lineTo(-7, 2); ctx.stroke(); } ctx.restore(); }
      const b = R.bossRef;
      if (b && b.boss && b.st !== 'die' && !b.gone && R.phase === 'fight') {
        const bw = Math.min(170, W - 320), x = W / 2 - bw / 2, y = VH - 18;
        rr(ctx, x - 2, y - 2, bw + 4, 10, 5); fsr(ctx, 'rgba(42,21,40,.8)'); rr(ctx, x, y, Math.max(6, bw * b.hp / b.max), 6, 3); fsr(ctx, b.phase2 ? '#ff4a3a' : '#ff6f9c');
        if (b.kind === 'pate') { ctx.fillStyle = '#fff'; ctx.fillRect(x + bw / 2 - 0.5, y - 1, 1, 8); }
        outlined(ctx, b.name + '  ·  Boss ' + (BOSS_ORDER.indexOf(b.kind) + 1) + '/5', W / 2, y - 8, 8, '#fff');
      }
      if (R.hint) { const a = Math.min(1, R.hint.t * 3); ctx.globalAlpha = a; outlined(ctx, R.hint.text, W / 2, 66, 9, '#fff4e0'); ctx.globalAlpha = 1; }
    },
  };
  function coverH(c) { return c.hp <= 0 ? 0 : c.h * (0.72 + 0.28 * c.hp / c.max); }
  function eRect(e) {
    const H = (e.kind === 'trueffel' ? 34 : e.kind === 'pate' ? 36 : 31) * (e.sc / 0.8);
    const sq = e.kind === 'pate' ? 0.5 + 0.5 * e.e : 0.6 + 0.4 * e.e, fy = e.y - (e.lift || 0) * e.e;
    return {top: fy - H * sq, bot: fy, hw: 7 * (e.wide || 1) * (e.sc / 0.8)};
  }
  G.modes.ranch = ranch;
  ranch.art = {drawMob, drawLimo, drawTommy, drawFedora, drawDoor};

  /* ======================================================================================================== CINEMA */
  const XF = 1.3;
  const SCENES = [
    {s: 0, cap: tr('Endlich wieder zusammen.', 'Together again at last.')},
    {s: 11, cap: tr('Ab nach Hause!', 'Off we go, home!')},
    {s: 17, cap: tr('Über den Wolken …', 'Above the clouds …')},
    {s: 23, cap: tr('… über das Mondmeer.', '… over the moonlit sea.')},
    {s: 29.5, cap: tr('Die Stadt der Lichter.', 'The city of lights.')},
    {s: 35, cap: tr('Es fängt an zu schneien …', 'It starts to snow …')},
    {s: 44, cap: tr('Zuhause. Mit dem süßesten Kakao der Welt.', 'Home. With the sweetest cocoa in the world.')},
    {s: 60, cap: ''},
  ];
  const END = 80;
  let buf = null, bctx = null;
  function getBuf(ctx) { const c = ctx.canvas; if (!buf) { buf = document.createElement('canvas'); bctx = buf.getContext('2d'); } if (buf.width !== c.width || buf.height !== c.height) { buf.width = c.width; buf.height = c.height; } return bctx; }

  function drawPlane(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt || 0); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const ol = '#3a2030';
    /* floats */
    ctx.strokeStyle = ol; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-12, 13); ctx.moveTo(10, 6); ctx.lineTo(12, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, 13); ctx.lineTo(22, 13); ctx.quadraticCurveTo(28, 13, 27, 16); ctx.quadraticCurveTo(24, 18.5, 18, 18.5); ctx.lineTo(-20, 18.5); ctx.quadraticCurveTo(-23, 18.5, -22, 13); fsr(ctx, '#fff4e0', ol, 1);
    ctx.fillStyle = '#e2483d'; ctx.fillRect(-20, 15.4, 42, 1.2);
    /* tail */
    ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(-38, -4); ctx.lineTo(-38, 1); ctx.lineTo(-22, 6); ctx.closePath(); fsr(ctx, '#e2483d', ol, 1);
    ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-38, -19); ctx.lineTo(-32, -19); ctx.lineTo(-22, -6); ctx.closePath(); fsr(ctx, '#e2483d', ol, 1); ctx.fillStyle = '#fff4e0'; ctx.fillRect(-37, -18, 5, 2.5);
    ell(ctx, -34, -1, 7, 2, 0, '#c23a30', ol, 0.9);
    /* fuselage */
    rr(ctx, -24, -9, 50, 16, 8); fsr(ctx, '#e2483d', ol, 1.2); ctx.fillStyle = '#fff4e0'; ctx.fillRect(-23, 1, 48, 2.4);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(ctx, -18, -8, 36, 3, 1.5); ctx.fill();
    /* windows with the bears */
    for (const [wx, white] of [[8, false], [-7, true]]) {
      circ(ctx, wx, -2.5, 5, '#8fd3ff', ol, 1);
      ctx.save(); ctx.beginPath(); ctx.arc(wx, -2.5, 4.4, 0, TAU); ctx.clip(); ctx.fillStyle = '#ffe9b8'; ctx.fillRect(wx - 5, -8, 10, 11);
      bear(ctx, wx - 0.3, 9.6, {scale: 0.62, facing: 1, t, frame: t * 8, pose: 'idle', white, bow: white, outfit: white ? undefined : 'himmel'});
      ctx.restore(); circ(ctx, wx - 2, -4.5, 1, 'rgba(255,255,255,.7)');
    }
    if (o.wave) { const wv = Math.sin(t * 9) * 2; circ(ctx, -12 + wv * 0.3, -9.5 + Math.abs(wv) * 0.2, 1.8, '#fff8f0', '#8a6a5a', 0.6); circ(ctx, 13 + wv * 0.3, -9.5, 1.8, '#b9834a', '#3a2414', 0.6); }
    /* nose + propeller */
    ctx.beginPath(); ctx.moveTo(24, -7); ctx.quadraticCurveTo(32, -3, 32, -1); ctx.quadraticCurveTo(32, 2, 24, 5); ctx.closePath(); fsr(ctx, '#fff4e0', ol, 1);
    ell(ctx, 33.5, -1, 1.8, 12, 0, 'rgba(255,255,255,.35)'); ctx.strokeStyle = 'rgba(60,40,50,.6)'; ctx.lineWidth = 1.2; const pa = t * 40; ctx.beginPath(); ctx.moveTo(33.5, -1 + Math.sin(pa) * 11); ctx.lineTo(33.5, -1 - Math.sin(pa) * 11); ctx.stroke(); circ(ctx, 33.5, -1, 1.8, '#ffd84a', ol, 0.8);
    /* high wing */
    rr(ctx, -14, -15, 30, 5, 2.5); fsr(ctx, '#e2483d', ol, 1.1); ctx.fillStyle = '#fff4e0'; ctx.fillRect(10, -14.5, 4, 4);
    ctx.strokeStyle = ol; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-2, -8); ctx.moveTo(8, -10); ctx.lineTo(4, -8); ctx.stroke();
    /* blinking lights */
    if (o.light !== false) { const on = Math.sin(t * 5) > 0.3; circ(ctx, 15, -12.5, 1.3, on ? '#ff4a5a' : '#7a2a30'); circ(ctx, -38, -19, 1.1, Math.sin(t * 5 + 2) > 0.3 ? '#fff' : '#9a9aa6'); if (on && o.lightGlow) glow(ctx, 15, -12.5, 14, 'rgba(255,80,90,.8)'); }
    ctx.restore();
  }
  function snow(ctx, t, x0, y0, w, h, n, seed, wind) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const sp = 10 + hash(i, seed) * 16, r = 0.6 + hash(i, seed + 1) * 1.3;
      const yy = ((hash(i, seed + 2) * h + t * sp) % h + h) % h, xx = ((hash(i, seed + 3) * w + Math.sin(t * 0.8 + i) * 6 + t * (wind || 4)) % w + w) % w;
      ctx.globalAlpha = 0.55 + 0.45 * hash(i, seed + 4); ctx.beginPath(); ctx.arc(x0 + xx, y0 + yy, r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function stars(ctx, t, W, h, n, seed) { for (let i = 0; i < n; i++) { const x = hash(i, seed) * W, y = hash(i, seed + 1) * h, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.8 + hash(i, 4) * 2) + i)); ctx.globalAlpha = tw; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, hash(i, 9) > 0.85 ? 1.6 : 1, hash(i, 9) > 0.85 ? 1.6 : 1); } ctx.globalAlpha = 1; }
  function floatHearts(ctx, t, x, y, n, spread, rate) {
    for (let i = 0; i < n; i++) { const ph = (t * rate + i / n) % 1, hx = x + Math.sin(ph * 6 + i * 2.1) * spread * 0.4 + (hash(i, 31) - 0.5) * spread, hy = y - ph * 70; ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9; heartPath(ctx, hx, hy, 0.7 + hash(i, 32) * 0.6); fsr(ctx, i % 3 ? '#ff6f9c' : '#ff9eb0'); }
    ctx.globalAlpha = 1;
  }
  function buildings(ctx, W, baseY, seed, cols, t, scroll) {
    let x = -((scroll || 0) % 60) - 60, i = 0;
    while (x < W + 60) {
      const id = i + Math.floor((scroll || 0) / 60) * 0, bw = 26 + hash(id, seed) * 34, bh = 40 + hash(id, seed + 1) * 90;
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(x, baseY - bh, bw, bh);
      if (hash(id, seed + 2) > 0.7) { ctx.fillRect(x + bw / 2 - 1, baseY - bh - 10, 2, 10); if (Math.sin(t * 3 + i) > 0) circ(ctx, x + bw / 2, baseY - bh - 11, 1.4, '#ff4a5a'); }
      for (let wy = baseY - bh + 6; wy < baseY - 6; wy += 8) for (let wx = x + 4; wx < x + bw - 4; wx += 7) { const h = hash(Math.floor(wx * 3 + wy * 7), seed + 3); if (h > 0.55) { ctx.fillStyle = h > 0.85 ? '#ffe9a0' : (h > 0.7 ? '#ffd27a' : '#ffb85a'); ctx.globalAlpha = 0.85; ctx.fillRect(wx, wy, 3, 4); ctx.globalAlpha = 1; } }
      x += bw + 2; i++;
    }
  }
  function lantern(ctx, x, y, t, i) {
    ctx.fillStyle = '#2a2030'; ctx.fillRect(x - 1.5, y, 3, 92); ctx.fillRect(x - 5, y + 90, 10, 3);
    ctx.beginPath(); ctx.moveTo(x - 7, y - 2); ctx.lineTo(x + 7, y - 2); ctx.lineTo(x + 4, y - 10); ctx.lineTo(x - 4, y - 10); ctx.closePath(); fsr(ctx, '#2a2030');
    const fl = 0.9 + 0.1 * Math.sin(t * 13 + i * 3);
    glow(ctx, x, y + 6, 60 * fl, 'rgba(255,190,90,.45)'); rr(ctx, x - 5, y - 2, 10, 14, 2); fsr(ctx, '#ffe2a0', '#2a2030', 1.2); circ(ctx, x, y + 5, 2.6, '#fff8e0');
    ctx.fillStyle = '#fff'; ell(ctx, x, y - 10.5, 5, 1.6); ctx.fill();
  }

  /* scene painters: (ctx, local time, W, scene time span) */
  const PAINT = [
    /* 1: sunset over the ranch, the two bears hug */
    function (ctx, lt, W) {
      const z = 1 + 0.14 * sstep(lt, 0, 12), cx = W / 2, gy = 206;
      ctx.save(); ctx.translate(cx, 190); ctx.scale(z, z); ctx.translate(-cx, -190 + lt * 0.4);
      const g = ctx.createLinearGradient(0, -20, 0, gy); g.addColorStop(0, '#3b2466'); g.addColorStop(0.35, '#9a4282'); g.addColorStop(0.62, '#f07a5a'); g.addColorStop(0.82, '#ffb46a'); g.addColorStop(1, '#ffdc8e'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, VH + 120);
      stars(ctx, lt, W, 60, 24, 3);
      const sy = 152 + lt * 1.8; glow(ctx, cx + 70, sy, 140, 'rgba(255,200,120,.75)'); circ(ctx, cx + 70, sy, 30, '#ffe69a'); circ(ctx, cx + 70, sy, 24, '#fff2c0');
      ctx.fillStyle = 'rgba(255,170,150,.55)'; for (let i = 0; i < 4; i++) { ell(ctx, (i * 140 + lt * 3) % (W + 160) - 60, 70 + i * 22, 60, 3.5); ctx.fill(); }
      ctx.fillStyle = '#9a4a72'; ctx.beginPath(); ctx.moveTo(-60, gy); for (let x = -60; x <= W + 60; x += 12) ctx.lineTo(x, 168 - (hash(Math.floor((x + 600) / 70), 5) > 0.5 ? 18 : 6) - Math.sin(x * 0.02) * 4); ctx.lineTo(W + 60, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a2e5a'; ctx.beginPath(); ctx.moveTo(-60, gy); for (let x = -60; x <= W + 60; x += 8) ctx.lineTo(x, 186 - Math.sin(x * 0.015 + 1) * 8); ctx.lineTo(W + 60, gy); ctx.closePath(); ctx.fill();
      /* barn + windmill silhouettes */
      ctx.fillStyle = '#3a1a3a'; const bx = W * 0.14; ctx.fillRect(bx, 150, 56, 42); ctx.beginPath(); ctx.moveTo(bx - 4, 152); ctx.lineTo(bx + 8, 136); ctx.lineTo(bx + 28, 128); ctx.lineTo(bx + 48, 136); ctx.lineTo(bx + 60, 152); ctx.fill(); ctx.fillStyle = '#ffcf7a'; ctx.fillRect(bx + 22, 160, 10, 9);
      drawWindmill(ctx, W * 0.86, 194, 1, lt * 0.6, '#3a1a3a');
      ctx.fillStyle = '#2e1a35'; ctx.beginPath(); ctx.moveTo(-60, VH + 60); ctx.lineTo(-60, gy + 6); ctx.quadraticCurveTo(cx, gy - 14, W + 60, gy + 8); ctx.lineTo(W + 60, VH + 60); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2e1a35'; for (let i = 0; i < 8; i++) { const x = 20 + i * 34; if (x > cx - 70 && x < cx + 70) continue; ctx.fillRect(x, gy - 18 + Math.abs(x - cx) * 0.05, 3, 22); } ctx.fillRect(10, gy - 12, cx - 80, 2); ctx.fillRect(cx + 74, gy - 10, W, 2);
      /* fireflies */
      for (let i = 0; i < 14; i++) { const fx = (hash(i, 61) * W + Math.sin(lt * 0.7 + i) * 14), fy = 150 + hash(i, 62) * 50 + Math.cos(lt + i * 2) * 6; ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(lt * 2 + i)); circ(ctx, fx, fy, 1.3, '#fff2a0'); } ctx.globalAlpha = 1;
      /* the bears */
      const by = gy - 6; glow(ctx, cx, by - 24, 70, 'rgba(255,190,140,.55)');
      const runK = sstep(lt, 0.3, 2.6), wX = lerp(cx - 100, cx - 21, runK), pX = lerp(cx + 100, cx + 21, runK);
      const pose = lt < 2.6 ? 'run' : (lt < 4.4 ? 'victory' : 'idle'), lean = sstep(lt, 4.4, 5.4) * 0.2;
      ctx.save(); ctx.translate(wX, by); ctx.rotate(lean); bear(ctx, 0, 0, {scale: 2.5, facing: 1, frame: lt * 10, t: lt, pose, speed: 0.55, outfit: 'wiese', mood: lt > 2.6 ? 'happy' : undefined}); ctx.restore();
      ctx.save(); ctx.translate(pX, by); ctx.rotate(-lean); bear(ctx, 0, 0, {scale: 2.4, facing: -1, frame: lt * 10 + 1, t: lt + 0.3, pose, speed: 0.55, white: true, bow: true, mood: lt > 2.6 ? 'happy' : 'wide'}); ctx.restore();
      if (lt > 2.6) { floatHearts(ctx, lt, cx, by - 60, 9, 60, 0.32); const k = sstep(lt, 2.6, 3.2) * (1 + Math.sin(lt * 4) * 0.06); if (k > 0) { ctx.save(); ctx.translate(cx, by - 74); ctx.scale(k * 2.4, k * 2.4); heartPath(ctx, 0, 0, 1); fsr(ctx, '#ff6f9c', '#fff', 0.8); ctx.restore(); } }
      ctx.restore();
    },
    /* 2: the seaplane takes off from the ranch lake */
    function (ctx, lt, W) {
      const k = sstep(lt, 1.8, 6.5), px = lerp(W * 0.18, W * 0.55, sstep(lt, 0, 4)) , py = 196 - k * 86, cam = lt * 30;
      const g = ctx.createLinearGradient(0, 0, 0, 190); g.addColorStop(0, '#5a3a8a'); g.addColorStop(0.5, '#d86a7a'); g.addColorStop(1, '#ffc27a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      glow(ctx, W * 0.75, 160, 120, 'rgba(255,190,110,.7)'); circ(ctx, W * 0.75, 162, 18, '#ffe69a');
      ctx.fillStyle = '#8a4a7a'; ctx.beginPath(); ctx.moveTo(0, 192); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 170 - Math.sin((x + cam * 0.2) * 0.02) * 10 - Math.sin((x + cam * 0.2) * 0.05) * 4); ctx.lineTo(W, 192); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a2e5a'; const bx = 40 - cam * 0.5; ctx.fillRect(bx, 166, 40, 26); ctx.beginPath(); ctx.moveTo(bx - 3, 168); ctx.lineTo(bx + 20, 152); ctx.lineTo(bx + 43, 168); ctx.fill(); drawWindmill(ctx, bx + 80, 192, 0.6, lt, '#5a2e5a');
      const wg = ctx.createLinearGradient(0, 192, 0, VH); wg.addColorStop(0, '#e88a7a'); wg.addColorStop(1, '#5a3a7a'); ctx.fillStyle = wg; ctx.fillRect(0, 192, W, VH - 192);
      ctx.fillStyle = 'rgba(255,220,160,.5)'; for (let i = 0; i < 26; i++) { const x = ((hash(i, 41) * W - cam * 0.8) % W + W) % W, y = 196 + hash(i, 42) * 70; ctx.fillRect(x, y, 6 + hash(i, 43) * 16, 1); }
      /* mirror image in the lake (mirrored about the waterline y = 196, so it sinks away as the plane climbs) */
      const tilt = -k * 0.22 + Math.sin(lt * 2) * 0.02;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 192, W, VH - 192); ctx.clip(); ctx.globalAlpha = 0.35 * (1 - k * 0.7); ctx.translate(0, 392); ctx.scale(1, -1); drawPlane(ctx, px, py, 1.5, lt, {tilt, light: false}); ctx.restore();
      if (k < 0.6) for (let i = 0; i < 12; i++) { const ph = (lt * 3 + i / 12) % 1, sx = px - 30 - ph * 40, sy = 222 - Math.sin(ph * Math.PI) * 10; ctx.globalAlpha = (1 - ph) * (1 - k / 0.6) * 0.9; circ(ctx, sx, sy, 2 + ph * 3, '#fff'); } ctx.globalAlpha = 1;
      drawPlane(ctx, px, py, 1.5, lt, {tilt, wave: true});
    },
    /* 3: above the dusk clouds */
    function (ctx, lt, W) {
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#20184a'); g.addColorStop(0.45, '#6a3f8a'); g.addColorStop(0.75, '#e8869a'); g.addColorStop(1, '#ffc08a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      stars(ctx, lt, W, 90, 40, 11);
      circ(ctx, W * 0.2, 50, 9, '#fff4d8'); circ(ctx, W * 0.2 + 4, 47, 8, '#3a2a6a');
      for (let layer = 0; layer < 3; layer++) {
        const y = 170 + layer * 28, spd = 14 + layer * 18, cols = ['#c98ab0', '#e8a6b8', '#ffd0c8'];
        for (let i = 0; i < 14; i++) { const x = ((i * 64 - lt * spd + hash(i, layer) * 30) % (W + 120) + W + 120) % (W + 120) - 60; ctx.fillStyle = cols[layer]; ell(ctx, x, y + hash(i, layer + 5) * 8, 36, 16); ctx.fill(); ell(ctx, x + 20, y - 8, 22, 14); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, x + 14, y - 14, 12, 5); ctx.fill(); }
        if (layer === 0) drawPlane(ctx, W * 0.42 + Math.sin(lt * 0.6) * 18, 112 + Math.sin(lt * 1.3) * 5, 1.9, lt + 10, {tilt: Math.sin(lt * 1.3 + 1) * 0.05, wave: lt > 2});
      }
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const y = 80 + i * 14, x = ((W - (lt * 160 + i * 90)) % (W + 80) + W + 80) % (W + 80) - 40; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y); ctx.stroke(); }
    },
    /* 4: moonlit sea */
    function (ctx, lt, W) {
      const g = ctx.createLinearGradient(0, 0, 0, 178); g.addColorStop(0, '#070b26'); g.addColorStop(0.6, '#16245a'); g.addColorStop(1, '#2c427e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      stars(ctx, lt, W, 170, 90, 21);
      const mx = W * 0.62, my = 82; glow(ctx, mx, my, 110, 'rgba(200,220,255,.45)'); circ(ctx, mx, my, 32, '#f4f2e0'); ctx.fillStyle = 'rgba(180,180,170,.35)'; circ(ctx, mx - 9, my - 6, 6); ctx.fill(); circ(ctx, mx + 10, my + 8, 4.5); ctx.fill(); circ(ctx, mx + 4, my - 14, 3); ctx.fill();
      const sg = ctx.createLinearGradient(0, 178, 0, VH); sg.addColorStop(0, '#1d2f64'); sg.addColorStop(1, '#0a1230'); ctx.fillStyle = sg; ctx.fillRect(0, 178, W, VH - 178);
      for (let i = 0; i < 60; i++) { const y = 180 + Math.pow(hash(i, 51), 1.4) * 90, spread = 6 + (y - 178) * 0.5, x = mx + (hash(i, 52) - 0.5) * spread * 2 + Math.sin(lt * 2 + i) * 3; ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(lt * 3 + i * 1.7)); ctx.fillStyle = '#f4f2d0'; ctx.fillRect(x, y, 4 + (y - 178) * 0.1, 1); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(120,150,220,.25)'; for (let i = 0; i < 20; i++) { const x = ((hash(i, 53) * W - lt * 6) % W + W) % W; ctx.fillRect(x, 182 + hash(i, 54) * 80, 18, 1); }
      const px = lerp(-50, W + 50, lt / 7.2), py = 96 + Math.sin(lt * 1.1) * 6;
      drawPlane(ctx, px, py, 0.95, lt + 20, {tilt: Math.sin(lt * 1.1 + 1) * 0.04, lightGlow: true});
    },
    /* 5: the city at night, landing in the harbour */
    function (ctx, lt, W) {
      const g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#0e1236'); g.addColorStop(1, '#3a3a6e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      stars(ctx, lt, W, 80, 30, 31); circ(ctx, W * 0.85, 40, 12, '#f4f2e0');
      buildings(ctx, W, 196, 71, ['#1c1a40', '#22204a', '#262452'], lt, 0);
      buildings(ctx, W, 200, 81, ['#2e2a5a', '#34306a', '#2a2856'], lt, 30);
      const wg = ctx.createLinearGradient(0, 200, 0, VH); wg.addColorStop(0, '#2a2a5e'); wg.addColorStop(1, '#0e1030'); ctx.fillStyle = wg; ctx.fillRect(0, 200, W, VH - 200);
      for (let i = 0; i < 70; i++) { const x = hash(i, 91) * W, y = 202 + hash(i, 92) * 64; ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(lt * 2 + i)); ctx.fillStyle = hash(i, 93) > 0.5 ? '#ffd27a' : '#ffb85a'; ctx.fillRect(x + Math.sin(lt * 2 + y) * 2, y, 1.4, 4 + hash(i, 94) * 6); } ctx.globalAlpha = 1;
      const k = sstep(lt, 0, 3.6), px = lerp(-30, W * 0.55, sstep(lt, 0, 4.6)), py = lerp(120, 208, k);
      if (lt > 3.4 && lt < 5.5) for (let i = 0; i < 16; i++) { const ph = (lt * 2.6 + i / 16) % 1; ctx.globalAlpha = (1 - ph) * (1 - sstep(lt, 4.6, 5.5)); circ(ctx, px - 20 - ph * 34, 230 - Math.sin(ph * Math.PI) * 12, 1.6 + ph * 3, '#fff'); } ctx.globalAlpha = 1;
      drawPlane(ctx, px, py, 1.25, lt + 30, {tilt: (1 - k) * 0.12, wave: lt > 4.5, lightGlow: true});
      snow(ctx, lt, 0, 0, W, VH, Math.floor(sstep(lt, 2.5, 6) * 30), 3, -6);
    },
    /* 6: hand in hand along the lantern street, snow begins */
    function (ctx, lt, W) {
      const cam = lt * 24;
      const g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#141838'); g.addColorStop(1, '#3a3060'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      buildings(ctx, W, 120, 101, ['#24224e'], lt, 0);
      /* facades */
      const lamps = [], fac = ['#7a3a3a', '#5a4a6a', '#6a4a3a', '#4a5a6a', '#7a5a4a'], signs = tr('Café|Bücher|Blumen|Bäckerei|Kakao', 'Café|Books|Flowers|Bakery|Cocoa').split('|');
      for (let i = -1; i < 8; i++) {
        const id = i + Math.floor(cam / 110), x = id * 110 - cam;
        if (x > W + 20 || x < -130) continue;
        ctx.fillStyle = fac[((id % 5) + 5) % 5]; ctx.fillRect(x, 60, 108, 150); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 104, 60, 4, 150);
        for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const lit = hash(id * 7 + r * 3 + c, 5) > 0.35; rr(ctx, x + 10 + c * 32, 72 + r * 34, 22, 24, 3); fsr(ctx, lit ? '#ffd88a' : '#2a2440', '#2a1a28', 1); if (lit) { ctx.fillStyle = 'rgba(255,140,80,.35)'; ctx.fillRect(x + 10 + c * 32, 72 + r * 34 + 16, 22, 8); } ctx.fillStyle = '#2a1a28'; ctx.fillRect(x + 20.5 + c * 32, 72 + r * 34, 1, 24); }
        rr(ctx, x + 8, 150, 92, 48, 4); fsr(ctx, '#ffcf80', '#2a1a28', 1.4); ctx.fillStyle = 'rgba(255,240,200,.5)'; ctx.fillRect(x + 12, 154, 84, 3);
        ctx.fillStyle = '#c23a3a'; ctx.beginPath(); ctx.moveTo(x + 4, 142); ctx.lineTo(x + 104, 142); ctx.lineTo(x + 100, 150); ctx.lineTo(x + 8, 150); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff4e0'; for (let s = 0; s < 6; s++) ctx.fillRect(x + 10 + s * 16, 142, 8, 8);
        outlined(ctx, signs[((id % 5) + 5) % 5], x + 54, 134, 9, '#ffd84a', 'center', '#2a1a28');
        glow(ctx, x + 54, 175, 80, 'rgba(255,190,110,.25)');
        if (id % 2 === 0) lamps.push([x + 109, id]);
      }
      /* street */
      ctx.fillStyle = '#4a3a4a'; ctx.fillRect(0, 210, W, 8); ctx.fillStyle = '#3a2e40'; ctx.fillRect(0, 218, W, VH - 218);
      ctx.fillStyle = '#54445a'; for (let r = 0; r < 4; r++) for (let i = -1; i < W / 16 + 2; i++) { const x = i * 16 - (cam % 16) + (r % 2) * 8; ell(ctx, x, 224 + r * 12, 7, 4); ctx.fill(); }
      const sn = sstep(lt, 3, 8); if (sn > 0) { ctx.fillStyle = 'rgba(255,255,255,' + sn * 0.8 + ')'; ctx.fillRect(0, 209, W, 3); }
      for (const [x, id] of lamps) if (x > -30 && x < W + 30) lantern(ctx, x, 118, lt, id);
      /* the bears, hand in hand */
      const bx = W * 0.45, by = 214;
      bear(ctx, bx - 16, by, {scale: 2, facing: 1, frame: lt * 7, t: lt, pose: 'run', speed: 0.22, outfit: 'schnee', mood: 'wide'});
      bear(ctx, bx + 13, by, {scale: 1.9, facing: 1, frame: lt * 7 + Math.PI, t: lt + 0.4, pose: 'run', speed: 0.22, white: true, bow: true, mood: 'happy'});
      ctx.strokeStyle = '#b9834a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 8, by - 16); ctx.quadraticCurveTo(bx - 2, by - 12, bx + 3, by - 15); ctx.stroke(); circ(ctx, bx - 1.5, by - 13.5, 2.6, '#fff8f0', '#8a6a5a', 0.8);
      if (lt > 6) floatHearts(ctx, lt, bx, by - 50, 4, 30, 0.25);
      snow(ctx, lt, 0, 0, W, VH, Math.floor(10 + sn * 110), 7, 6);
    },
    /* 7: the cozy apartment */
    function (ctx, lt, W) {
      const z = 1 + 0.32 * sstep(lt, 0, 15), cx = W / 2, cy = 178;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
      const wg = ctx.createLinearGradient(0, 0, 0, 220); wg.addColorStop(0, '#5a3030'); wg.addColorStop(1, '#8a4a3a'); ctx.fillStyle = wg; ctx.fillRect(-40, -40, W + 80, 260);
      ctx.fillStyle = 'rgba(255,220,180,.06)'; for (let x = -40; x < W + 40; x += 14) ctx.fillRect(x, -40, 6, 260);
      /* big window with snowy city */
      const wx0 = cx - 92, wy0 = 34, ww = 184, wh = 112;
      ctx.save(); rr(ctx, wx0, wy0, ww, wh, 4); ctx.clip();
      const sg = ctx.createLinearGradient(0, wy0, 0, wy0 + wh); sg.addColorStop(0, '#141a40'); sg.addColorStop(1, '#3a3a70'); ctx.fillStyle = sg; ctx.fillRect(wx0, wy0, ww, wh);
      stars(ctx, lt, W, wy0 + 40, 30, 41); circ(ctx, wx0 + ww - 30, wy0 + 22, 9, '#f4f2e0');
      ctx.save(); ctx.translate(wx0 - 20, 0); buildings(ctx, ww + 40, wy0 + wh + 6, 121, ['#1a1a3e', '#222250'], lt, 0); ctx.restore();
      snow(ctx, lt, wx0, wy0, ww, wh, 70, 13, 5);
      ctx.restore();
      ctx.strokeStyle = '#f4e8d8'; ctx.lineWidth = 4; rr(ctx, wx0, wy0, ww, wh, 4); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, wy0); ctx.lineTo(cx, wy0 + wh); ctx.moveTo(wx0, wy0 + wh * 0.45); ctx.lineTo(wx0 + ww, wy0 + wh * 0.45); ctx.stroke();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { ell(ctx, wx0 + 8 + i * 15, wy0 + wh - 1, 9, 3.5); ctx.fill(); }
      rr(ctx, wx0 - 8, wy0 + wh, ww + 16, 6, 2); fsr(ctx, '#e8d8c8', '#5a3a30', 1);
      /* curtains */
      for (const s of [-1, 1]) { const x = s < 0 ? wx0 - 24 : wx0 + ww + 2; ctx.fillStyle = '#d87a8a'; ctx.beginPath(); ctx.moveTo(x, wy0 - 8); ctx.lineTo(x + 22, wy0 - 8); ctx.quadraticCurveTo(x + 11 - s * 8, wy0 + 60, x + 22, wy0 + wh + 26); ctx.lineTo(x, wy0 + wh + 26); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + 7, wy0 - 8, 3, wh + 34); }
      ctx.fillStyle = '#8a5a3a'; ctx.fillRect(wx0 - 30, wy0 - 11, ww + 60, 3);
      /* fairy lights */
      ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 0.8; ctx.beginPath(); const fx0 = -10, fx1 = W + 10; for (let i = 0; i <= 40; i++) { const x = lerp(fx0, fx1, i / 40), y = 16 + Math.sin(i / 40 * Math.PI * 3) * 6 + Math.sin(i / 40 * Math.PI) * 6; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      for (let i = 1; i < 40; i += 2) { const x = lerp(fx0, fx1, i / 40), y = 16 + Math.sin(i / 40 * Math.PI * 3) * 6 + Math.sin(i / 40 * Math.PI) * 6 + 2.5, col = ['#ffd84a', '#ff9eb0', '#9be7a5', '#8fd3ff'][(i >> 1) % 4], tw = 0.55 + 0.45 * Math.sin(lt * 2.4 + i * 1.3); glow(ctx, x, y, 9, col, tw * 0.6); circ(ctx, x, y, 1.8, col); }
      /* fireplace (left) */
      const fx = Math.max(16, cx - 200), fy = 214;
      rr(ctx, fx, fy - 76, 86, 76, 3); fsr(ctx, '#b07a6a', '#3a2020', 1.4); ctx.strokeStyle = 'rgba(80,40,30,.35)'; ctx.lineWidth = 1; for (let y = fy - 70; y < fy; y += 9) { ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + 86, y); ctx.stroke(); }
      rr(ctx, fx - 6, fy - 82, 98, 8, 2); fsr(ctx, '#8a5a3a', '#3a2020', 1.2);
      rr(ctx, fx + 16, fy - 52, 54, 52, 20); fsr(ctx, '#1a0e10');
      glow(ctx, fx + 43, fy - 14, 140, 'rgba(255,150,60,.35)');
      for (let i = 0; i < 5; i++) { const f = Math.sin(lt * (7 + i) + i * 2) * 3, h = 22 + i % 3 * 6 + f; ctx.beginPath(); const bx = fx + 26 + i * 8.5; ctx.moveTo(bx - 7, fy - 6); ctx.quadraticCurveTo(bx - 6, fy - 6 - h * 0.6, bx + f * 0.4, fy - 6 - h); ctx.quadraticCurveTo(bx + 6, fy - 6 - h * 0.5, bx + 7, fy - 6); ctx.closePath(); fsr(ctx, i % 2 ? '#ff8a3a' : '#ffb84a'); }
      for (let i = 0; i < 4; i++) { const bx = fx + 30 + i * 9; ctx.beginPath(); ctx.moveTo(bx - 4, fy - 6); ctx.quadraticCurveTo(bx, fy - 20 - Math.sin(lt * 9 + i) * 3, bx + 4, fy - 6); fsr(ctx, '#ffe9a0'); }
      rr(ctx, fx + 22, fy - 8, 42, 5, 2.5); fsr(ctx, '#6a3a20'); rr(ctx, fx + 28, fy - 11, 32, 5, 2.5); fsr(ctx, '#7a4a2a');
      for (let i = 0; i < 6; i++) { const ph = (lt * 0.8 + i / 6) % 1; ctx.globalAlpha = 1 - ph; circ(ctx, fx + 36 + Math.sin(i * 3 + lt * 2) * 10, fy - 20 - ph * 40, 0.9, '#ffd84a'); } ctx.globalAlpha = 1;
      ctx.fillStyle = '#c23a3a'; rr(ctx, fx + 8, fy - 74, 9, 14, 3); ctx.fill(); rr(ctx, fx + 70, fy - 74, 9, 14, 3); ctx.fill();
      /* bookshelf (right) */
      const sx = Math.min(W - 102, cx + 118), sy0 = 70;
      rr(ctx, sx, sy0, 86, 144, 3); fsr(ctx, '#7a4a2a', '#3a2020', 1.4);
      for (let r = 0; r < 4; r++) { const y = sy0 + 8 + r * 34; ctx.fillStyle = '#4a2a18'; ctx.fillRect(sx + 5, y, 76, 28); let x = sx + 6; let j = 0; while (x < sx + 78) { const bw = 5 + hash(r * 20 + j, 8) * 5, bh = 18 + hash(r * 20 + j, 9) * 9; if (x + bw > sx + 80) break; ctx.fillStyle = ['#c23a3a', '#4a7ad8', '#ffd84a', '#2f9e5b', '#ff9eb0', '#8a5ac8', '#fff4e0'][Math.floor(hash(r * 20 + j, 10) * 7)]; ctx.fillRect(x, y + 28 - bh, bw - 1, bh); x += bw; j++; } ctx.fillStyle = '#8a5a3a'; ctx.fillRect(sx + 3, y + 28, 80, 3); }
      /* plants */
      const plant = (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38 + Math.sin(lt * 0.8 + i) * 0.04; ctx.save(); ctx.rotate(a); ell(ctx, 13, 0, 12, 5, 0, i % 2 ? '#3a9a4a' : '#4aae5a', '#1e5a2a', 0.8); ctx.restore(); } rr(ctx, -9, -2, 18, 16, 3); fsr(ctx, '#d87a5a', '#5a2a1a', 1); ctx.restore(); };
      plant(sx + 20, sy0 - 12, 0.7); plant(cx + 104, 200, 1.1);
      /* floor + rug */
      ctx.fillStyle = '#6a3a22'; ctx.fillRect(-40, 214, W + 80, 80); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; for (let x = -40; x < W + 40; x += 30) { ctx.beginPath(); ctx.moveTo(x, 214); ctx.lineTo(x - 20, VH + 30); ctx.stroke(); }
      ell(ctx, cx, 238, 120, 18, 0, '#c25a6a'); ell(ctx, cx, 238, 104, 14, 0, null, '#ffd0a0', 1.5);
      /* floor lamp */
      const lx = cx - 116; ctx.fillStyle = '#3a2a2a'; ctx.fillRect(lx - 1, 112, 2, 102); ell(ctx, lx, 214, 9, 2.5, 0, '#3a2a2a'); glow(ctx, lx, 110, 90, 'rgba(255,210,140,.45)'); ctx.beginPath(); ctx.moveTo(lx - 12, 112); ctx.lineTo(lx + 12, 112); ctx.lineTo(lx + 8, 96); ctx.lineTo(lx - 8, 96); ctx.closePath(); fsr(ctx, '#ffe2b0', '#8a5a3a', 1);
      /* sofa */
      rr(ctx, cx - 82, 150, 164, 46, 18); fsr(ctx, '#d87a8a', '#5a2a3a', 1.4);
      rr(ctx, cx - 76, 156, 74, 34, 14); fsr(ctx, '#e48a98'); rr(ctx, cx + 2, 156, 74, 34, 14); fsr(ctx, '#e48a98');
      rr(ctx, cx - 92, 176, 184, 32, 12); fsr(ctx, '#d87a8a', '#5a2a3a', 1.4);
      rr(ctx, cx - 98, 166, 22, 44, 11); fsr(ctx, '#c86a7a', '#5a2a3a', 1.4); rr(ctx, cx + 76, 166, 22, 44, 11); fsr(ctx, '#c86a7a', '#5a2a3a', 1.4);
      ctx.fillStyle = '#5a2a1a'; ctx.fillRect(cx - 84, 208, 5, 6); ctx.fillRect(cx + 79, 208, 5, 6);
      /* cushion */
      ctx.save(); ctx.translate(cx + 56, 172); ctx.rotate(0.2); rr(ctx, -12, -10, 24, 20, 7); fsr(ctx, '#ffd84a', '#7a5a10', 1); heartPath(ctx, 0, 1, 0.8); fsr(ctx, '#ff6f9c'); ctx.restore();
      /* the bears snuggling */
      const by = 202, lean = 0.26 + Math.sin(lt * 0.8) * 0.02;
      ctx.save(); ctx.translate(cx - 22, by); ctx.rotate(0.12); bear(ctx, 0, 0, {scale: 2.6, facing: 1, frame: 0, t: lt, pose: 'idle', outfit: 'wiese', mood: lt > 4 ? 'happy' : undefined}); ctx.restore();
      ctx.save(); ctx.translate(cx + 22, by); ctx.rotate(-lean); bear(ctx, 0, 0, {scale: 2.45, facing: -1, frame: 0, t: lt + 1.3, pose: 'idle', white: true, bow: true, mood: 'happy'}); ctx.restore();
      /* knitted blanket */
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 44, 184); ctx.quadraticCurveTo(cx, 176, cx + 44, 183); ctx.quadraticCurveTo(cx + 52, 198, cx + 50, 214); ctx.lineTo(cx - 52, 214); ctx.quadraticCurveTo(cx - 54, 198, cx - 44, 184); ctx.closePath();
      ctx.fillStyle = '#fff4e0'; ctx.fill(); ctx.clip();
      const rows = ['#e8483d', '#fff4e0', '#9be7a5', '#fff4e0', '#ffd84a', '#fff4e0'];
      for (let r = 0; r < 8; r++) { ctx.fillStyle = rows[r % rows.length]; ctx.beginPath(); const y = 176 + r * 5; ctx.moveTo(cx - 60, y + 5); for (let x = cx - 60; x <= cx + 60; x += 5) { ctx.lineTo(x + 2.5, y); ctx.lineTo(x + 5, y + 5); } ctx.lineTo(cx + 60, y + 10); ctx.lineTo(cx - 60, y + 10); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 0.6; for (let x = cx - 60; x < cx + 60; x += 3) { ctx.beginPath(); ctx.moveTo(x, 172); ctx.lineTo(x + 1.5, 216); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 44, 184); ctx.quadraticCurveTo(cx, 176, cx + 44, 183); ctx.stroke();
      for (let i = 0; i < 8; i++) { ctx.fillStyle = '#e8483d'; ctx.fillRect(cx - 48 + i * 13.5, 213, 2, 6); }
      /* paws on the blanket */
      circ(ctx, cx - 9, 182, 3.6, '#b9834a', '#3a2414', 1); circ(ctx, cx + 3, 181, 3.4, '#fff8f0', '#8a6a5a', 1);
      /* coffee table with two cocoa mugs */
      rr(ctx, cx - 44, 214, 88, 8, 3); fsr(ctx, '#8a5a3a', '#3a2020', 1.2); ctx.fillStyle = '#6a3a22'; ctx.fillRect(cx - 38, 222, 5, 18); ctx.fillRect(cx + 33, 222, 5, 18);
      for (const [mx, col] of [[cx - 16, '#ff9eb0'], [cx + 14, '#8fd3ff']]) {
        rr(ctx, mx - 7, 200, 14, 14, 3); fsr(ctx, col, '#3a2030', 1.1); ctx.beginPath(); ctx.arc(mx + 7, 207, 3.4, -1.3, 1.3); ctx.strokeStyle = '#3a2030'; ctx.lineWidth = 1.6; ctx.stroke();
        ell(ctx, mx, 201, 6, 1.6, 0, '#6a3a20'); circ(ctx, mx - 2, 200.5, 1.4, '#fff'); circ(ctx, mx + 2, 200, 1.2, '#fff');
        heartPath(ctx, mx, 208, 0.45); fsr(ctx, '#fff');
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; for (let s = 0; s < 2; s++) { ctx.beginPath(); for (let y = 0; y < 22; y++) { const xx = mx - 2 + s * 4 + Math.sin(y * 0.35 + lt * 3 + s) * 2.4; if (y) ctx.lineTo(xx, 197 - y); else ctx.moveTo(xx, 197); } ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1; }
      }
      floatHearts(ctx, lt, cx, 150, 7, 44, 0.22);
      ctx.restore();
      /* warm vignette */
      const v = ctx.createRadialGradient(cx, 150, 60, cx, 150, W * 0.75); v.addColorStop(0, 'rgba(255,170,90,0)'); v.addColorStop(1, 'rgba(40,10,20,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, VH);
    },
    /* 8: "Ende" + rolling credits */
    function (ctx, lt, W) {
      const g = ctx.createRadialGradient(W / 2, VH / 2, 20, W / 2, VH / 2, W * 0.7); g.addColorStop(0, '#5a2a4a'); g.addColorStop(1, '#1e0e1e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      stars(ctx, lt, W, VH, 60, 51);
      floatHearts(ctx, lt, W * 0.2, VH, 6, 80, 0.12); floatHearts(ctx, lt + 3, W * 0.8, VH, 6, 80, 0.12);
      const ea = sstep(lt, 0.3, 1.6) * (1 - sstep(lt, 5.4, 6.6));
      if (ea > 0) {
        ctx.globalAlpha = ea; const pul = 1 + Math.sin(lt * 3) * 0.06;
        ctx.save(); ctx.translate(W / 2, VH / 2 - 34); ctx.scale(2.6 * pul, 2.6 * pul); heartPath(ctx, 0, 0, 1); fsr(ctx, '#ff6f9c', '#fff', 0.6); ctx.restore();
        outlined(ctx, tr('Ende', 'The End'), W / 2, VH / 2 + 18, 46, '#ffd84a', 'center', '#7a3b57');
        ctx.globalAlpha = 1;
      }
      /* rolling credits: they roll up from below and come to rest centred, all four lines on screen */
      const lines = [['The Starway Home', 30, '#ffd84a', null, 0], [tr('Ein Spiel von Schokofreedo Games', 'A game by Schokofreedo Games'), 13, '#fff4e0', null, 30], ['Toffo & Mallo', 18, '#ff9eb0', 'bears', 74], [tr('Danke fürs Spielen', 'Thanks for playing'), 20, '#ffd84a', 'heart', 120]];
      const ct = lt - 6.2; if (ct > 0) {
        const span = lines[lines.length - 1][4], restY = VH / 2 - span / 2 - 4, y = Math.max(restY, VH + 24 - ct * 34);
        for (const [txt, px, col, extra, dy] of lines) {
          const ly = y + dy; if (ly > VH + 30) continue;
          outlined(ctx, txt, W / 2, ly, px, col, 'center', '#3a1a2e');
          if (extra === 'heart') { font(ctx, px); const w = ctx.measureText(txt).width; ctx.save(); ctx.translate(W / 2 + w / 2 + 14, ly); ctx.scale(1.4, 1.4); heartPath(ctx, 0, 0, 1); fsr(ctx, '#ff6f9c', '#fff', 0.6); ctx.restore(); }
          if (extra === 'bears') { font(ctx, px); const w = ctx.measureText(txt).width; bear(ctx, W / 2 - w / 2 - 20, ly + 12, {scale: 1.2, facing: 1, t: lt, pose: 'victory', frame: lt * 8}); bear(ctx, W / 2 + w / 2 + 20, ly + 12, {scale: 1.15, facing: -1, t: lt + 0.4, pose: 'victory', frame: lt * 8, white: true, bow: true}); }
        }
      }
    },
  ];

  /* the ending music: a gentle music box over warm pads (I - vi - IV - V ... in C) */
  const PROG = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 59, 62, 67], [48, 60, 64, 67], [40, 55, 59, 64], [41, 57, 60, 65], [43, 55, 62, 65]];
  const MEL = [[[0, 76, 1], [1, 74, 0.5], [1.5, 72, 0.5], [2, 74, 1], [3, 76, 1]], [[0, 76, 1.5], [1.5, 79, 0.5], [2, 76, 2]], [[0, 77, 1], [1, 76, 0.5], [1.5, 74, 0.5], [2, 72, 1], [3, 69, 1]], [[0, 71, 2], [2, 74, 2]],
    [[0, 72, 1], [1, 76, 1], [2, 79, 1.5], [3.5, 77, 0.5]], [[0, 76, 2], [2, 71, 2]], [[0, 72, 1], [1, 74, 0.5], [1.5, 76, 0.5], [2, 77, 1], [3, 74, 1]], [[0, 74, 2], [2, 79, 2]]];
  const BEAT = 60 / 68, BAR = BEAT * 4;
  function playBar(i, delay) {
    const ch = PROG[i % 8], last = i >= 21;
    tone(midi(ch[0]), BAR * 1.05, {type: 'sine', gain: 0.07, attack: 0.08, delay});
    for (let n = 1; n < 4; n++) tone(midi(ch[n]), BAR * 1.1, {type: 'triangle', gain: 0.018, attack: 0.7, delay});
    if (last) { bell(midi(ch[1] + 12), 3, 0.05, delay); bell(midi(84), 3.5, 0.04, delay + 0.4); return; }
    for (let s = 0; s < 8; s++) { const nn = ch[1 + (s % 3)] + (s >= 4 ? 12 : 0); bell(midi(nn), 0.6, 0.022, delay + s * BEAT / 2); }
    if (i >= 2) for (const [b, nn, d] of MEL[i % 8]) bell(midi(nn), d * BEAT * 1.4, 0.05, delay + b * BEAT);
  }

  const cinema = {
    C: null,
    start(opts) {
      this.end();
      const C = this.C = {opts, t: 0, done: false, nextBar: 0.3, bar: 0, crackT: 0, skip: false};
      try { if (G.audio && G.audio.stopMusic) G.audio.stopMusic(); } catch (e) {}
      setBoss(false);
      /* Enter also skips, but not the Enter that resumes the game from its pause menu (no update ran while paused) */
      const now = () => (window.performance && performance.now ? performance.now() : Date.now());
      C.now = now; C.lastUpd = now();
      C.key = e => { if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && C.t > 3 && now() - C.lastUpd < 120) C.skip = true; };
      try { window.addEventListener('keydown', C.key); } catch (e) {}
    },
    end() { const C = this.C; if (C && C.key) try { window.removeEventListener('keydown', C.key); } catch (e) {} },
    finish() { const C = this.C; if (!C || C.done) return; C.done = true; this.end(); try { C.opts.done('clear', {score: 0, money: 0, stars: [true, true, true], final: true}); } catch (e) {} },
    debugWin() { this.finish(); },
    update() {
      const C = this.C; if (!C || C.done) return;
      C.t += DT; const I = G.input || {}; C.lastUpd = C.now();
      if (C.t > 3 && (I.jumpEdge || I.jumpKeyEdge || C.skip)) { sfx('select'); this.finish(); return; }
      if (C.t >= C.nextBar && C.bar < 22) { playBar(C.bar, Math.max(0, C.nextBar - C.t)); C.bar++; C.nextBar += BAR; }
      /* ambience: crackling fire in the apartment, a soft whoosh at take-off */
      const s7 = SCENES[6].s;
      if (C.t > s7 && C.t < SCENES[7].s + 1) { C.crackT -= DT; if (C.crackT <= 0) { C.crackT = 0.08 + Math.random() * 0.3; noise(0.03 + Math.random() * 0.04, {type: 'highpass', freq: 1800 + Math.random() * 2000, gain: 0.015 + Math.random() * 0.02}); } }
      if (!C.whoosh && C.t > SCENES[1].s + 1.5) { C.whoosh = true; noise(2.5, {type: 'bandpass', freq: 300, freqTo: 900, q: 0.7, gain: 0.04}); }
      if (C.t >= END) this.finish();
    },
    frame(ctx) {
      const C = this.C, W = VW(); const t = C ? C.t : 0;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, VH);
      /* active scenes: base + incoming crossfade */
      let i = 0; for (let j = 0; j < SCENES.length; j++) if (t >= SCENES[j].s) i = j;
      const base = (i > 0 && t < SCENES[i].s + XF) ? i - 1 : i, over = base !== i ? i : -1;
      try { PAINT[base](ctx, t - SCENES[base].s, W); } catch (e) { console.log('MODE_ERROR cinema scene ' + base + ' ' + e.message); }
      if (over >= 0) {
        const a = sstep(t, SCENES[over].s, SCENES[over].s + XF);
        try { const b = getBuf(ctx); b.setTransform(ctx.getTransform()); b.clearRect(-10, -10, W + 20, VH + 20); PAINT[over](b, t - SCENES[over].s, W); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(buf, 0, 0); ctx.restore(); }
        catch (e) { ctx.save(); ctx.globalAlpha = a; PAINT[over](ctx, t - SCENES[over].s, W); ctx.restore(); }
      }
      /* fade in from black, fade out at the very end */
      const fin = 1 - sstep(t, 0, 1.4), fout = sstep(t, END - 1.4, END); if (fin + fout > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, fin + fout) + ')'; ctx.fillRect(0, 0, W, VH); }
      /* letterbox + captions */
      const lb = 24 * sstep(t, 0, 1.6); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, VH - lb, W, lb);
      const cap = SCENES[i].cap, ca = sstep(t - SCENES[i].s, 0.8, 1.8) * (1 - sstep(t - SCENES[i].s, (i + 1 < SCENES.length ? SCENES[i + 1].s - SCENES[i].s : 99) - 1.2, (i + 1 < SCENES.length ? SCENES[i + 1].s - SCENES[i].s : 99) - 0.2));
      if (cap && ca > 0) { ctx.globalAlpha = ca; font(ctx, 9, 500); ctx.textAlign = 'center'; ctx.fillStyle = '#fff4e0'; ctx.fillText(cap, W / 2, VH - 12); ctx.globalAlpha = 1; }
      if (t > 3 && t < END - 1) { ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 3); font(ctx, 7, 600); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(C && C.opts && !C.opts.isTouch ? tr('A (Leertaste) = überspringen', 'A (Space) = skip') : tr('A = überspringen', 'A = skip'), W - 10, 12); ctx.globalAlpha = 1; }
    },
  };
  G.modes.cinema = cinema;
  cinema.art = {drawPlane, PAINT};
})();

/* The Starway Home: extra art for the newer worlds, used by fx.js before draw.js draws an entity.
   Schokoladenland: gummy bears (walker), winged bonbons (flyer), spiky hazelnuts (spiky) and the Kakao-Drache (boss). */
(function () {
  const G = window.PW = window.PW || {}, TAU = Math.PI * 2;
  const OL = '#2a1508';
  function circle(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
  function fs(c, fill, stroke, lw) { c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  const GUMMI = ['#ff4a6a', '#5fcf6a', '#ffd84a', '#ff9a2a', '#b06aff'];

  function gummy(c, e, fr) {
    const col = GUMMI[(e.seedCol = e.seedCol === undefined ? Math.floor(Math.random() * GUMMI.length) : e.seedCol)], x = e.x + 7, y = e.y + 14, step = Math.sin((e.anim || 0) * 6), f = (e.vx || -1) > 0 ? 1 : -1;
    c.save(); c.translate(x, y); c.scale(f, 1); c.globalAlpha = 0.92;
    ell(c, -3, -1 + Math.max(0, step), 2.4, 1.8); fs(c, col, OL, 0.9); ell(c, 3, -1 + Math.max(0, -step), 2.4, 1.8); fs(c, col, OL, 0.9);
    ell(c, 0, -6, 5.2, 5.4); fs(c, col, OL, 1);
    ell(c, -4.8, -7, 1.8, 2.6, 0.4); fs(c, col, OL, 0.9); ell(c, 4.8, -7 + step * 0.6, 1.8, 2.6, -0.4); fs(c, col, OL, 0.9);
    ell(c, 0, -13, 4.6, 4.2); fs(c, col, OL, 1);
    circle(c, -3.6, -16.4, 1.7, col); c.strokeStyle = OL; c.lineWidth = 0.9; c.stroke(); circle(c, 3.6, -16.4, 1.7, col); c.stroke();
    c.globalAlpha = 1; ell(c, -1.6, -15, 1.4, 0.9, -0.4); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); ell(c, -2, -8, 1.3, 2.2, 0.2); c.fill();
    circle(c, -1.6, -13.4, 0.9, OL); circle(c, 1.8, -13.4, 0.9, OL); c.strokeStyle = OL; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-2.6, -15.4); c.lineTo(-0.8, -14.8); c.moveTo(2.8, -15.4); c.lineTo(1, -14.8); c.stroke();
    c.beginPath(); c.arc(0, -11.2, 1.4, 0.1, Math.PI - 0.1); c.stroke();
    c.restore();
  }
  function bonbon(c, e, fr) {
    const x = e.x + 7, y = e.y + 6, w = Math.sin((e.anim || 0) * 12), f = (e.vx || -1) > 0 ? 1 : -1;
    c.save(); c.translate(x, y); c.scale(f, 1);
    /* wings */
    c.fillStyle = 'rgba(255,255,255,.85)'; ell(c, -3, -5 - w * 2, 3.5, 2 + w, -0.6); c.fill(); ell(c, 3, -5 - w * 2, 3.5, 2 + w, 0.6); c.fill();
    /* twisted wrapper ends */
    c.beginPath(); c.moveTo(-6, 0); c.lineTo(-11, -3.5); c.lineTo(-10, 0); c.lineTo(-11, 3.5); c.closePath(); fs(c, '#ff9eb0', OL, 0.9);
    c.beginPath(); c.moveTo(6, 0); c.lineTo(11, -3.5); c.lineTo(10, 0); c.lineTo(11, 3.5); c.closePath(); fs(c, '#ff9eb0', OL, 0.9);
    ell(c, 0, 0, 6.5, 5); fs(c, '#ff6f9c', OL, 1); c.save(); c.clip(); c.strokeStyle = '#fff'; c.lineWidth = 1.6; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 3.4 - 3, -6); c.lineTo(k * 3.4 + 3, 6); c.stroke(); } c.restore();
    ell(c, 0, 0, 6.5, 5); c.strokeStyle = OL; c.lineWidth = 1; c.stroke();
    circle(c, 2.2, -0.8, 1.6, '#fff'); circle(c, 2.6, -0.6, 0.8, OL);
    c.restore();
  }
  function nut(c, e, fr) {
    const x = e.x + 7, y = e.y + 8, roll = (e.x || 0) * 0.12;
    c.save(); c.translate(x, y); c.rotate(roll);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; c.beginPath(); c.moveTo(Math.cos(a - 0.22) * 6, Math.sin(a - 0.22) * 6); c.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); c.lineTo(Math.cos(a + 0.22) * 6, Math.sin(a + 0.22) * 6); c.closePath(); fs(c, '#3a1a0c', OL, 0.8); }
    c.beginPath(); c.arc(0, 0, 6.6, 0, TAU); fs(c, '#a8643a', OL, 1);
    c.beginPath(); c.arc(0, -2.5, 4.2, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = '#6a3a1e'; c.lineWidth = 1.4; c.stroke();
    c.restore();
    /* angry face does not roll */
    circle(c, x - 2.2, y + 0.4, 1, OL); circle(c, x + 2.2, y + 0.4, 1, OL); c.strokeStyle = OL; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - 3.6, y - 1.6); c.lineTo(x - 1.2, y - 0.8); c.moveTo(x + 3.6, y - 1.6); c.lineTo(x + 1.2, y - 0.8); c.moveTo(x - 1.6, y + 3); c.lineTo(x + 1.6, y + 3); c.stroke();
  }
  /* the Kakao-Drache: a chubby chocolate dragon with a cream belly, wafer horns, sprinkles and a crown */
  function dragon(c, e, fr) {
    const fl = e.flash > 0 && Math.floor(e.flash * 20) % 2 === 0, f = e.dir || -1, flap = Math.sin(fr * 0.25), x = e.x + 15, y = e.y + 16;
    const body = fl ? '#fff' : '#7a4425', dark = fl ? '#fff' : '#4a2210', belly = fl ? '#fff' : '#fff1dc';
    c.save(); c.translate(x, y); c.scale(f, 1);
    if (!e.alive) { const t = Math.max(0, e.dieT || 0); c.rotate(t * 3); c.scale(Math.max(0.1, 1 - t * 0.8), Math.max(0.1, 1 - t * 0.8)); }
    /* tail */
    c.beginPath(); c.moveTo(-10, 6); c.quadraticCurveTo(-24, 10 + flap * 2, -27, 0); c.lineTo(-23, 1); c.quadraticCurveTo(-21, 6, -9, 1); c.closePath(); fs(c, body, OL, 1.2);
    c.beginPath(); c.moveTo(-27, 0); c.lineTo(-32, -4); c.lineTo(-30, 3); c.closePath(); fs(c, '#ff6f9c', OL, 1);
    /* back wing */
    c.save(); c.translate(-2, -8); c.rotate(-0.6 - flap * 0.5); c.beginPath(); c.moveTo(0, 0); c.lineTo(-6, -18); c.quadraticCurveTo(4, -16, 12, -10); c.quadraticCurveTo(6, -6, 8, -2); c.closePath(); fs(c, fl ? '#fff' : '#a8643a', OL, 1); c.restore();
    /* body and belly */
    ell(c, 0, 4, 14, 12); fs(c, body, OL, 1.4);
    ell(c, 3, 7, 8, 8); c.fillStyle = belly; c.fill(); c.strokeStyle = 'rgba(122,59,30,.5)'; c.lineWidth = 0.8; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-3, 3 + k * 4); c.quadraticCurveTo(3, 5 + k * 4, 9, 3 + k * 4); c.stroke(); }
    /* sprinkles on the back */
    const SPR = ['#ff6f9c', '#9be7a5', '#ffd84a', '#8fd3ff']; for (let k = 0; k < 6; k++) { c.save(); c.translate(-9 + k * 3, -5 + (k % 2) * 3); c.rotate(k); c.fillStyle = SPR[k % 4]; c.fillRect(-1.6, -0.6, 3.2, 1.2); c.restore(); }
    /* legs */
    ell(c, -6, 15, 4, 3); fs(c, dark, OL, 1); ell(c, 7, 15, 4, 3); fs(c, dark, OL, 1);
    /* head */
    ell(c, 12, -10, 10, 9); fs(c, body, OL, 1.4);
    ell(c, 19, -6, 6, 4.4); fs(c, body, OL, 1.2); circle(c, 21, -7.5, 0.9, OL); circle(c, 24, -7, 0.9, OL);
    /* wafer horns */
    for (const hx of [6, 13]) { c.save(); c.translate(hx, -17); c.rotate(-0.5); c.beginPath(); c.rect(-1.6, -7, 3.2, 8); fs(c, '#e8b878', OL, 0.9); c.strokeStyle = '#b07a3a'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-1.6, -4); c.lineTo(1.6, -2.5); c.stroke(); c.restore(); }
    /* crown */
    c.beginPath(); c.moveTo(4, -18); c.lineTo(5, -24); c.lineTo(8, -20); c.lineTo(11, -26); c.lineTo(14, -20); c.lineTo(17, -24); c.lineTo(18, -18); c.closePath(); fs(c, '#ffd84a', '#a0741a', 1); circle(c, 11, -21, 1.2, '#ff6f9c');
    /* eye: angry when charging, otherwise smug */
    circle(c, 13, -11, 3.6, '#fff'); c.strokeStyle = OL; c.lineWidth = 1; c.stroke(); circle(c, 14, -10.5, 1.8, OL); circle(c, 13.4, -11.4, 0.6, '#fff');
    c.strokeStyle = OL; c.lineWidth = 1.6; c.beginPath(); c.moveTo(9, -16); c.lineTo(16, e.charge > 0 ? -13 : -15); c.stroke();
    /* mouth: open and glowing while it charges its breath */
    if (e.charge > 0 || e.burst > 0) { ell(c, 22, -3, 4, 2.6); fs(c, '#3a0a10', OL, 1); circle(c, 23, -3, 1.6, '#ffd24a'); }
    else { c.beginPath(); c.moveTo(15, -3.5); c.quadraticCurveTo(19, -1.5, 23, -3.5); c.strokeStyle = OL; c.lineWidth = 1; c.stroke(); }
    /* front wing */
    c.save(); c.translate(2, -6); c.rotate(-0.3 + flap * 0.6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-4, -20); c.quadraticCurveTo(8, -18, 16, -11); c.quadraticCurveTo(9, -7, 11, -2); c.closePath(); fs(c, fl ? '#fff' : '#c07a4a', OL, 1.2);
    c.strokeStyle = 'rgba(42,21,8,.5)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(5, -16); c.moveTo(0, 0); c.lineTo(11, -11); c.stroke(); c.restore();
    c.restore();
  }
  /* the chocolate waterfall: a flowing curtain behind the tiles, from the cliff edge down to the pool */
  function waterfallWorld(c, wf, cam, camY, fr, VW) {
    const x0 = wf.x0, x1 = wf.x1, top = wf.top - 6, bot = wf.bottom + 12;
    if (x1 < cam - 20 || x0 > cam + VW + 20) return;
    const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#4a2210'); g.addColorStop(0.25, '#7a4425'); g.addColorStop(0.5, '#8a5030'); g.addColorStop(0.75, '#7a4425'); g.addColorStop(1, '#4a2210');
    c.fillStyle = g; c.fillRect(x0 + 6, top, x1 - x0 - 12, bot - top);
    /* streaks flowing down */
    c.strokeStyle = 'rgba(255,230,200,.22)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const x = x0 + 12 + i * (x1 - x0 - 24) / 13, off = (fr * (3 + (i % 3)) + i * 37) % 60; for (let y = top - 60 + off; y < bot; y += 60) { if (y + 26 < camY - 40 || y > camY + 300) continue; c.beginPath(); c.moveTo(x, Math.max(top, y)); c.lineTo(x + Math.sin(y * 0.05) * 1.5, Math.min(bot, y + 26)); c.stroke(); } }
    /* the lip at the top: a foamy cream edge */
    c.fillStyle = '#fff1dc'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x0 + 10 + i * (x1 - x0 - 20) / 8, top + 2 + Math.sin(fr * 0.1 + i) * 1.2, 5, 0, TAU); c.fill(); }
    /* splash foam at the pool */
    c.fillStyle = 'rgba(255,241,220,.85)'; for (let i = 0; i < 12; i++) { const px = x0 + 10 + i * (x1 - x0 - 20) / 11, h = 4 + Math.abs(Math.sin(fr * 0.15 + i * 1.7)) * 7; c.beginPath(); c.ellipse(px, bot - 12, 6, h, 0, 0, TAU); c.fill(); }
    /* drops flying off */
    c.fillStyle = '#5a2e14'; for (let i = 0; i < 10; i++) { const t = ((fr * 0.7 + i * 23) % 80) / 80, px = (i % 2 ? x0 + 4 : x1 - 4) + (i % 2 ? -1 : 1) * t * 22, py = top + 20 + i * 40 + t * 30; if (py > camY - 20 && py < camY + 300) { c.beginPath(); c.arc(px, py, 1.8, 0, TAU); c.fill(); } }
  }
  /* chocolate cave interior (replaces the generic underground backdrop in Schokoladenland) */
  function schokoUnder(c, W, cam, camY, fr, d, VW) {
    c.globalAlpha = d; const g = c.createLinearGradient(0, 0, 0, 270); g.addColorStop(0, '#5a2e14'); g.addColorStop(1, '#2e1408'); c.fillStyle = g; c.fillRect(0, 0, VW, 270);
    for (let i = 0; i < 8; i++) { const x = ((i * 113 - cam * 0.3) % (VW + 120) + VW + 120) % (VW + 120) - 60, y = ((i * 71 - camY * 0.3) % 390 + 390) % 390 - 60; c.fillStyle = '#3a1a0c'; c.beginPath(); c.ellipse(x, y, 30 + (i % 3) * 10, 60, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,241,220,.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 20, y - 30); for (let k = 0; k < 6; k++) c.lineTo(x - 20 + (k + 1) * 7, y - 30 + (k % 2 ? -5 : 4)); c.stroke(); }
    c.globalAlpha = 1; return true;
  }
  /* parachute pickup and the open canopy */
  function chutePack(c, e, fr) { const x = e.x + 7, y = e.y + 8 + Math.sin(fr * 0.1) * 1.5; c.beginPath(); c.arc(x, y - 2, 7, Math.PI, 0); c.closePath(); fs(c, '#ff6f9c', OL, 1); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 2, y - 2); c.lineTo(x, y - 9); c.lineTo(x + 2, y - 2); c.closePath(); c.fill(); c.beginPath(); c.rect(x - 4, y, 8, 6); fs(c, '#8a5a2b', OL, 1); c.strokeStyle = OL; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - 6, y - 2); c.lineTo(x - 3, y); c.moveTo(x + 6, y - 2); c.lineTo(x + 3, y); c.stroke(); }
  function canopy(c, p, fr) {
    const k = p.chuteOpen || 0; if (k <= 0) return;
    const cx = p.x + p.w / 2 + Math.sin(fr * 0.08) * 1.5, top = p.y - 22 - 10 * k, w = 10 + 16 * k;
    c.strokeStyle = 'rgba(42,21,8,.7)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx - w, top + 6); c.lineTo(p.x + 2, p.y + 4); c.moveTo(cx + w, top + 6); c.lineTo(p.x + p.w - 2, p.y + 4); c.moveTo(cx, top); c.lineTo(cx, p.y + 2); c.stroke();
    c.beginPath(); c.moveTo(cx - w, top + 6); c.quadraticCurveTo(cx - w, top - 12 * k, cx, top - 12 * k); c.quadraticCurveTo(cx + w, top - 12 * k, cx + w, top + 6); c.quadraticCurveTo(cx, top + 1, cx - w, top + 6); c.closePath(); fs(c, '#ff6f9c', OL, 1.2);
    c.save(); c.clip(); c.fillStyle = '#fff'; for (let i = -2; i <= 2; i += 2) { c.beginPath(); c.moveTo(cx + i * w / 5, top + 6); c.lineTo(cx + (i + 1) * w / 5, top - 14 * k); c.lineTo(cx + (i + 2) * w / 5, top + 6); c.closePath(); c.globalAlpha = 0.85; c.fill(); } c.restore(); c.globalAlpha = 1;
  }
  G.art = Object.assign(G.art || {}, {
    world(c, lv, cam, camY, fr, VW) { if (lv.waterfall) waterfallWorld(c, lv.waterfall, cam, camY, fr, VW); },
    under(c, W, cam, camY, fr, d, VW) { if (W.key === 'schoko') return schokoUnder(c, W, cam, camY, fr, d, VW); return false; },
    canopy,
    /* returns true when it drew the entity */
    ent(ctx, e, fr) {
      const W = G.L && G.L.world; if (!W) return false;
      if (e.kind === 'chute') { chutePack(ctx, e, fr); return true; }
      if (W.key === 'schoko') {
        if (e.kind === 'boss') { dragon(ctx, e, fr); return true; }
        if (!e.alive) return false;
        if (e.kind === 'walker' && e.look === 'gummi') { gummy(ctx, e, fr); return true; }
        if (e.kind === 'flyer' && e.look === 'bonbon') { bonbon(ctx, e, fr); return true; }
        if (e.kind === 'spiky' && e.look === 'nuss') { nut(ctx, e, fr); return true; }
      }
      return false;
    },
  });
})();

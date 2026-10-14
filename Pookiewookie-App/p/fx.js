/* Pookiewookie: gadget visuals. Icons, the capsule block and roulette, honey shots, flying hearts, the honey cannon,
   what Wookie wears per gadget, the Honigzeit tint, the pipe flash and the gadget HUD slot. draw.js calls these hooks. */
(function () {
  const G = window.PW = window.PW || {}, T = 16, VH = 270;
  const S = () => G.S, P = () => G.P, L = () => G.L, E = () => G.eng;
  const TAU = Math.PI * 2;
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circle(ctx, x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
  function starPath(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); }
  function heartPath(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.9); ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.0, x, y - s * 0.35); ctx.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.3, y - s * 0.1, x, y + s * 0.9); ctx.closePath(); }
  const font = (ctx, px) => { ctx.font = 'bold ' + px + 'px "Fredoka", sans-serif'; ctx.textBaseline = 'middle'; };

  /* gadget icons, drawn centred at (x, y) with radius r */
  function icon(ctx, id, x, y, r, fr) {
    ctx.save(); ctx.translate(x, y); const k = r / 7; ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(60,30,40,.55)';
    if (id === 'star') { starPath(ctx, 0, 0.5, 7); ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.stroke(); circle(ctx, -2, -1.5, 1, '#fff'); }
    else if (id === 'jet') { rr(ctx, -4.5, -6, 9, 10, 3); ctx.fillStyle = '#ff9a2a'; ctx.fill(); ctx.stroke(); rr(ctx, -2.5, -4, 5, 4, 1.5); ctx.fillStyle = '#ffe9a8'; ctx.fill(); const f = 1 + Math.sin((fr || 0) * 0.6) * 0.3; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(0, 4 + 4 * f); ctx.lineTo(3, 4); ctx.closePath(); ctx.fillStyle = '#ff6a2a'; ctx.fill(); ctx.beginPath(); ctx.moveTo(-1.5, 4); ctx.lineTo(0, 4 + 2.2 * f); ctx.lineTo(1.5, 4); ctx.closePath(); ctx.fillStyle = '#ffe94a'; ctx.fill(); }
    else if (id === 'boots') { rr(ctx, -5, -6, 6, 9, 2); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.stroke(); rr(ctx, -5, 0, 10, 4, 2); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(4, 7); ctx.moveTo(-4, 7); ctx.lineTo(4, 5); ctx.stroke(); rr(ctx, -5, 0, 10, 2, 1); ctx.fillStyle = '#fff'; ctx.fill(); }
    else if (id === 'claws') { circle(ctx, 0, 1.5, 4.5, '#9be7a5'); ctx.beginPath(); ctx.arc(0, 1.5, 4.5, 0, TAU); ctx.stroke(); for (let i = -1; i <= 1; i++) { circle(ctx, i * 3.2, -3.5, 1.7, '#9be7a5'); ctx.beginPath(); ctx.moveTo(i * 3.2 - 1, -4.5); ctx.lineTo(i * 3.2, -7.5); ctx.lineTo(i * 3.2 + 1, -4.5); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); } circle(ctx, 0, 2, 2, '#5fcf6a'); }
    else if (id === 'sling') { rr(ctx, -5, -3, 10, 9, 3); ctx.fillStyle = '#f5c242'; ctx.fill(); ctx.stroke(); rr(ctx, -4, -6, 8, 3.5, 1.5); ctx.fillStyle = '#e3a92a'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1, 2); ctx.bezierCurveTo(4, 5, 5, 8, 2.5, 9.5); ctx.bezierCurveTo(0.5, 8.5, 0, 5, 1, 2); ctx.fillStyle = '#ffd84a'; ctx.fill(); circle(ctx, -2.5, 0.5, 1, '#fff6d0'); }
    else if (id === 'magnet') { ctx.lineWidth = 4; ctx.strokeStyle = '#e0457b'; ctx.beginPath(); ctx.arc(0, -1, 4.5, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4.5, -1); ctx.lineTo(-4.5, 4); ctx.moveTo(4.5, -1); ctx.lineTo(4.5, 4); ctx.stroke(); ctx.strokeStyle = '#8fd3ff'; ctx.beginPath(); ctx.moveTo(-4.5, 3); ctx.lineTo(-4.5, 6); ctx.moveTo(4.5, 3); ctx.lineTo(4.5, 6); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,30,40,.55)'; ctx.beginPath(); ctx.arc(0, -1, 6.6, Math.PI, 0); ctx.lineTo(6.6, 6.5); ctx.lineTo(2.4, 6.5); ctx.lineTo(2.4, -1); ctx.arc(0, -1, 2.4, 0, Math.PI, true); ctx.lineTo(-2.4, 6.5); ctx.lineTo(-6.6, 6.5); ctx.closePath(); ctx.stroke(); }
    else if (id === 'bubble') { ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fillStyle = 'rgba(143,211,255,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.arc(-2, -2, 2.5, Math.PI * 0.9, Math.PI * 1.6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else if (id === 'honey') { circle(ctx, 0, 0.5, 6.5, '#e3a92a'); ctx.beginPath(); ctx.arc(0, 0.5, 6.5, 0, TAU); ctx.stroke(); circle(ctx, 0, 0.5, 5, '#ffe9a8'); ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; const a = ((fr || 0) * 0.05) % TAU; ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.lineTo(Math.cos(a) * 3.5, 0.5 + Math.sin(a) * 3.5); ctx.moveTo(0, 0.5); ctx.lineTo(Math.cos(a * 0.08 - 1.2) * 2.3, 0.5 + Math.sin(a * 0.08 - 1.2) * 2.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-2, -6.5); ctx.bezierCurveTo(-2, -9.5, 2, -9.5, 2, -6.5); ctx.fillStyle = '#e3a92a'; ctx.fill(); }
    ctx.restore();
  }

  const fx = G.fx = {
    icon,
    tile(ctx, ch, cx, cy, x, y, fr) {
      if (ch >= '1' && ch <= '4' && G.hub) return G.hub.tile(ctx, ch, cx, cy, x, y, fr);
      const pz = L() && L().puzzle;
      if (ch === '@') {
        /* bell block: stone block with a golden bell; lights up when rung */
        const idx = pz ? pz.bells.indexOf(cx) : 0, lit = pz ? pz.lit[Math.max(0, idx)] : 0, col = ['#ff6f9c', '#8fd3ff', '#9be7a5', '#ffd84a'][Math.max(0, idx) % 4];
        rr(ctx, x + 0.5, y + 0.5, 15, 15, 3); ctx.fillStyle = '#5a4a6a'; ctx.fill(); ctx.strokeStyle = '#2a1a3a'; ctx.lineWidth = 1; ctx.stroke();
        if (lit > 0) { ctx.beginPath(); ctx.arc(x + 8, y + 8, 12 + lit * 6, 0, TAU); ctx.fillStyle = col + '66'; ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(x + 4, y + 11); ctx.quadraticCurveTo(x + 4, y + 4, x + 8, y + 3.5); ctx.quadraticCurveTo(x + 12, y + 4, x + 12, y + 11); ctx.closePath(); ctx.fillStyle = lit > 0 ? '#fff6c0' : '#ffd84a'; ctx.fill(); ctx.strokeStyle = '#a0741a'; ctx.stroke();
        ctx.fillStyle = '#a0741a'; ctx.fillRect(x + 3, y + 11, 10, 1.5); circle(ctx, x + 8, y + 13, 1.3, '#a0741a'); circle(ctx, x + 8, y + 2.5, 1.2, col);
        return true;
      }
      if (ch === '^') {
        /* hint board: the ring order as coloured dots, or a music stone for melody rooms */
        ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 7, y + 6, 2, 10);
        rr(ctx, x - 4, y - 6, 24, 13, 3); ctx.fillStyle = '#fff1dc'; ctx.fill(); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1; ctx.stroke();
        if (pz && pz.kind === 'sign') { pz.order.forEach((b, i) => { circle(ctx, x + 1 + i * 5.5, y + 0.5, 2, ['#ff6f9c', '#8fd3ff', '#9be7a5', '#ffd84a'][b]); }); }
        else { font(ctx, 9); ctx.textAlign = 'center'; ctx.fillStyle = '#7a3b57'; ctx.fillText('♪', x + 8, y + 1); }
        return true;
      }
      if (ch === '$') {
        /* chocolate coin, spinning */
        const sx = Math.abs(Math.cos(fr * 0.08 + cx)); ctx.save(); ctx.translate(x + 8, y + 8 + Math.sin(fr * 0.1) * 1.5); ctx.scale(Math.max(0.15, sx), 1);
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fillStyle = '#3a1c0c'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, TAU); ctx.fillStyle = '#5a2e14'; ctx.fill();
        font(ctx, 8); ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84a'; ctx.fillText('S', 0, 0.5); ctx.restore();
        if ((fr >> 2) % 4 === 0) { starPath(ctx, x + 13, y + 2, 2); ctx.fillStyle = '#fff'; ctx.fill(); }
        return true;
      }
      if (ch === '&' || ch === 'z') {
        if (ch === '&') { /* purple puzzle pipe rim */ const left = E().tileAt(cx - 1, cy) !== '&'; rr(ctx, x + (left ? 0 : -1), y, 17, 16, 2); ctx.fillStyle = '#8a5cff'; ctx.fill(); ctx.fillStyle = '#c9a0ff'; ctx.fillRect(x, y, 16, 3); ctx.fillStyle = '#5a36b0'; ctx.fillRect(x, y + 13, 16, 3); if (left) { ctx.fillStyle = '#c9a0ff'; ctx.fillRect(x, y, 2, 16); } if (!left) { font(ctx, 9); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('?', x - 0, y - 7 + Math.sin(fr * 0.1) * 1.5); } return true; }
        /* puzzle gate: violet bars */
        ctx.fillStyle = '#2a1a4a'; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = '#8a66c8'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 2 + i * 5, y, 2.5, 16); ctx.fillStyle = '#c9a0ff'; ctx.fillRect(x, y + 7, 16, 2); return true;
      }
      if (ch === 'Y') {
        /* mailbox with a letter: Pookie writes to Wookie */
        ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 7, y + 4, 2, 12);
        rr(ctx, x + 1, y - 6, 14, 11, 4); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1; ctx.stroke();
        rr(ctx, x + 3, y - 3, 10, 6, 1.5); ctx.fillStyle = '#fff1dc'; ctx.fill(); ctx.strokeStyle = '#b06a85'; ctx.beginPath(); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x + 8, y + 1); ctx.lineTo(x + 13, y - 3); ctx.stroke();
        if (!(G.hub && G.hub.letterRead)) { heartPath(ctx, x + 14, y - 8 + Math.sin(fr * 0.15) * 1.5, 2.5); ctx.fillStyle = '#ff6f9c'; ctx.fill(); }
        return true;
      }
      if (ch !== 'g') return false;
      /* gadget capsule: a pastel gift block with a ribbon and a twinkling star */
      const bob = Math.sin(fr * 0.1 + cx) * 0.8;
      rr(ctx, x + 0.5, y + 0.5, 15, 15, 3.5); ctx.fillStyle = '#c9b8f0'; ctx.fill(); ctx.strokeStyle = '#6f55b8'; ctx.lineWidth = 1; ctx.stroke();
      rr(ctx, x + 1.5, y + 1.5, 13, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      ctx.fillStyle = '#ff6f9c'; ctx.fillRect(x + 6.5, y + 1, 3, 14); ctx.fillRect(x + 1, y + 6.5, 14, 3);
      ctx.beginPath(); ctx.arc(x + 5.5, y + 4.5, 2.2, 0, TAU); ctx.arc(x + 10.5, y + 4.5, 2.2, 0, TAU); ctx.fillStyle = '#ff6f9c'; ctx.fill();
      starPath(ctx, x + 8, y + 10.5 + bob, 3); ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.strokeStyle = '#e3a92a'; ctx.lineWidth = 0.8; ctx.stroke();
      if ((fr >> 3) % 4 === 0) { circle(ctx, x + 13, y + 3, 1.2, '#fff'); }
      return true;
    },
    ent(ctx, e, fr) {
      const x = e.x, y = e.y;
      if (e.kind === 'roulette') {
        const id = G.GADGET_IDS[e.idx % G.GADGET_IDS.length], sx = Math.max(0.15, Math.abs(Math.cos(e.t * 18)));
        ctx.save(); ctx.translate(x + 7, y + 7); ctx.scale(sx, 1);
        rr(ctx, -8, -8, 16, 16, 4); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = G.GADGETS[id].col; ctx.lineWidth = 1.5; ctx.stroke();
        icon(ctx, id, 0, 0, 5.5, fr); ctx.restore();
        for (let i = 0; i < 3; i++) { const a = e.t * 6 + i * TAU / 3; circle(ctx, x + 7 + Math.cos(a) * 12, y + 7 + Math.sin(a) * 6, 1.3, '#ffd84a'); }
        return true;
      }
      if (e.kind === 'gadget') {
        const d = G.GADGETS[e.id], pulse = 1 + Math.sin(fr * 0.15) * 0.08, bob = e.onGround ? Math.sin(e.anim * 2) * 1.5 : 0;
        ctx.beginPath(); ctx.ellipse(x + 7, y + 15, 6, 2, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fill();
        ctx.save(); ctx.translate(x + 7, y + 7 - Math.abs(bob)); ctx.scale(pulse, pulse);
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fillStyle = d.col + '33'; ctx.fill();
        rr(ctx, -8, -8, 16, 16, 4); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.strokeStyle = d.col; ctx.lineWidth = 1.5; ctx.stroke();
        icon(ctx, e.id, 0, 0, 5.5, fr); ctx.restore();
        if ((fr >> 2) % 3 === 0) { starPath(ctx, x + 15, y - 2 + Math.sin(fr * 0.2) * 2, 2); ctx.fillStyle = '#fff'; ctx.fill(); }
        return true;
      }
      if (e.kind === 'honeyshot') {
        for (let i = 1; i <= 3; i++) circle(ctx, x + 4 - Math.sign(e.vx) * i * 4, y + 4 + Math.sin(e.anim + i) * 1.2, 2.2 - i * 0.5, 'rgba(245,194,66,' + (0.5 - i * 0.12) + ')');
        circle(ctx, x + 4, y + 4, 4.2, '#e3a92a'); circle(ctx, x + 4, y + 4, 3.3, '#f5c242'); circle(ctx, x + 2.8, y + 2.8, 1.2, '#fff6d0');
        return true;
      }
      if (e.kind === 'choco') {
        /* a drawn chocolate segment; thins out and drips as it melts */
        const k = Math.min(1, e.t / 1.5), h = 3 + 2 * k;
        rr(ctx, e.x - 1, e.y, e.w + 2, h, 2); ctx.fillStyle = '#5a2e14'; ctx.fill(); ctx.fillStyle = 'rgba(255,220,180,.35)'; ctx.fillRect(e.x, e.y + 0.8, e.w, 1.2);
        if (k < 1 && (fr + Math.floor(e.anim * 10)) % 20 < 8) { ctx.beginPath(); ctx.arc(e.x + 4, e.y + h + 2 + (1 - k) * 4, 1.3, 0, TAU); ctx.fillStyle = '#5a2e14'; ctx.fill(); }
        return true;
      }
      if (e.kind === 'heartfly') { heartPath(ctx, x + 4, y + 4, 4); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = '#e0457b'; ctx.lineWidth = 0.8; ctx.stroke(); circle(ctx, x + 2.5, y + 2.5, 0.9, '#fff'); return true; }
      if (e.kind === 'cannon') {
        const loaded = P().cannon === e, wob = loaded ? Math.sin(fr * 1.5) * 1.2 : 0, rec = e.fireT > 0 ? e.fireT * 6 : 0;
        ctx.save(); ctx.translate(x + 9, y + 14);
        /* wheels and pot base */
        circle(ctx, -5, 4, 4, '#5a3a1a'); circle(ctx, -5, 4, 2, '#d9a066'); circle(ctx, 5, 4, 4, '#5a3a1a'); circle(ctx, 5, 4, 2, '#d9a066');
        rr(ctx, -8, -6, 16, 10, 4); ctx.fillStyle = '#f5c242'; ctx.fill(); ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 1; ctx.stroke();
        rr(ctx, -6, -4, 12, 3, 1.5); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
        /* barrel aimed up-right */
        ctx.rotate(-0.6); ctx.translate(-rec, 0);
        rr(ctx, -3, -8, 22, 10, 3); ctx.fillStyle = '#6b4a2a'; ctx.fill(); ctx.stroke();
        rr(ctx, -3, -8, 22, 4, 2); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
        ctx.fillStyle = '#e3a92a'; ctx.fillRect(2, -9, 2.5, 12); ctx.fillRect(12, -9, 2.5, 12);
        circle(ctx, 19, -3, 5, '#3a2a1a'); circle(ctx, 19, -3, 3.2, loaded ? '#b07c44' : '#1a1008');
        if (loaded) { circle(ctx, 19 + wob * 0.3, -3, 2, '#2a1b12'); }
        if (e.fireT > 0) { ctx.globalAlpha = e.fireT * 2; starPath(ctx, 24, -3, 7 + rec); ctx.fillStyle = '#ffe94a'; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.restore();
        /* fuse */
        const fz = loaded ? 1 : 0; circle(ctx, x + 2, y - 2 + wob, 1.2 + fz, loaded && (fr >> 1) % 2 ? '#ffe94a' : '#ff6a2a');
        return true;
      }
      return false;
    },
    palette(p, fr) {
      if (p.gadget !== 'star') { if (S().costume === 'gold') return {fur: '#f0c040', dark: '#b8860b', belly: '#fff2b0', ear: '#ffe9a8', outline: '#6b4a00'}; return null; }
      const h = (fr * 14) % 360;
      return {fur: `hsl(${h},95%,68%)`, dark: `hsl(${h},70%,48%)`, belly: `hsl(${(h + 40) % 360},100%,88%)`, ear: `hsl(${(h + 300) % 360},100%,80%)`, outline: `hsl(${h},60%,30%)`};
    },
    playerBack(ctx, p, fr) {
      if (p.hidden || p.dead) return;
      const cx = p.x + 6, by = p.y + (p.big ? 12 : 6), f = p.facing;
      if (p.gadget === 'jet') {
        ctx.save(); ctx.translate(cx - f * 6, by);
        rr(ctx, -4, -5, 8, 12, 3); ctx.fillStyle = '#ff9a2a'; ctx.fill(); ctx.strokeStyle = '#7a3b1a'; ctx.lineWidth = 1; ctx.stroke();
        rr(ctx, -2.5, -3, 5, 4, 1.5); ctx.fillStyle = '#ffe9a8'; ctx.fill();
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-1.5, 7, 3, 2);
        if (p.jetting) { const fl = 1 + Math.sin(fr * 0.9) * 0.3; ctx.beginPath(); ctx.moveTo(-3, 9); ctx.lineTo(0, 9 + 7 * fl); ctx.lineTo(3, 9); ctx.closePath(); ctx.fillStyle = '#ff6a2a'; ctx.fill(); ctx.beginPath(); ctx.moveTo(-1.5, 9); ctx.lineTo(0, 9 + 3.5 * fl); ctx.lineTo(1.5, 9); ctx.closePath(); ctx.fillStyle = '#ffe94a'; ctx.fill(); }
        ctx.restore();
      } else if (p.gadget === 'magnet') { ctx.save(); ctx.translate(cx - f * 5, by + 1); ctx.rotate(f * 0.3); icon(ctx, 'magnet', 0, 0, 4.5, fr); ctx.restore(); }
      else if (p.gadget === 'sling') { ctx.save(); ctx.translate(cx - f * 6, by + 1); icon(ctx, 'sling', 0, 0, 4.5, fr); ctx.restore(); }
    },
    playerFront(ctx, p, fr) {
      if (p.hidden || p.dead) return;
      const cx = p.x + 6, cy = p.y + p.h / 2, f = p.facing, leg = p.onGround && Math.abs(p.vx) > 0.1 ? Math.sin(p.anim) * 1.5 : 0;
      if (p.gadget === 'boots') { ctx.fillStyle = '#ff6f9c'; ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 0.8; rr(ctx, p.x + 1, p.y + p.h - 3 + leg, 5, 3.5, 1.5); ctx.fill(); ctx.stroke(); rr(ctx, p.x + 6, p.y + p.h - 3 - leg, 5, 3.5, 1.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(p.x + 1.5, p.y + p.h - 2.5 + leg, 4, 1); ctx.fillRect(p.x + 6.5, p.y + p.h - 2.5 - leg, 4, 1); }
      else if (p.gadget === 'claws') { ctx.fillStyle = '#9be7a5'; ctx.strokeStyle = '#2f7a4e'; ctx.lineWidth = 0.6; for (const sx of [p.x - 1, p.x + p.w - 3]) { for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx + i * 1.6, cy + 2); ctx.lineTo(sx + i * 1.6 + 0.8, cy + 5.5); ctx.lineTo(sx + i * 1.6 + 1.6, cy + 2); ctx.closePath(); ctx.fill(); ctx.stroke(); } } }
      else if (p.gadget === 'bubble') { const r = (p.big ? 17 : 13) + Math.sin(fr * 0.12) * 0.8; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = 'rgba(143,211,255,.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.35, Math.PI * 0.95, Math.PI * 1.55); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke(); }
      if (p.gadget === 'star') { const a = fr * 0.2; for (let i = 0; i < 3; i++) { const an = a + i * TAU / 3; starPath(ctx, cx + Math.cos(an) * 11, cy + Math.sin(an) * 7, 2); ctx.fillStyle = i ? '#fff' : '#ffd84a'; ctx.fill(); } }
      if (p.launch > 0) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(p.x - 4 - i * 5, cy - 4 + i * 4); ctx.lineTo(p.x - 12 - i * 6, cy - 4 + i * 4); ctx.stroke(); } }
      if (p.wallSlide) { for (let i = 0; i < 2; i++) circle(ctx, p.x + (p.wallDir > 0 ? p.w + 1 : -1), p.y + p.h - 2 - i * 4 - (fr % 4), 1, 'rgba(255,255,255,.7)'); }
    },
    particle(ctx, q, fr) {
      if (q.kind === 'spark') { const a = Math.max(0, Math.min(1, q.t / 0.5)); ctx.globalAlpha = a; starPath(ctx, q.x, q.y, 2.2); ctx.fillStyle = q.col || '#ffd84a'; ctx.fill(); ctx.globalAlpha = 1; return true; }
      if (q.kind === 'flame') { const a = Math.max(0, q.t / 0.35); ctx.globalAlpha = a; circle(ctx, q.x, q.y, 1.5 + (1 - a) * 2.5, a > 0.5 ? '#ffe94a' : '#ff6a2a'); ctx.globalAlpha = 1; return true; }
      if (q.kind === 'ring') { const k = 1 - q.t / 0.35; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(q.x, q.y, 6 + k * 34, 2 + k * 6, 0, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; return true; }
      return false;
    },
    overlay(ctx, fr) {
      const s = S();
      if (s.honey > 0) {
        const a = Math.min(1, s.honey / 1.5) * 0.2; ctx.fillStyle = 'rgba(255,186,60,' + a + ')'; ctx.fillRect(0, 0, G.VW, VH);
        ctx.fillStyle = 'rgba(227,169,42,' + a * 3 + ')';
        for (let i = 0; i < 9; i++) { const x = i * 56 + 20, len = 10 + ((fr * 0.3 + i * 37) % 60); ctx.beginPath(); ctx.moveTo(x - 5, 0); ctx.lineTo(x + 5, 0); ctx.lineTo(x + 3, len); ctx.arc(x, len, 3, 0, Math.PI); ctx.lineTo(x - 3, len); ctx.closePath(); ctx.fill(); }
      }
      if (s.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + s.flash + ')'; ctx.fillRect(0, 0, G.VW, VH); }
    },
    hud(ctx, fr) {
      if (S().mode === 'hub' && G.hub) { G.hub.hud(ctx, fr); return; }
      const p = P(), h = G.gad ? G.gad.hud() : null;
      if (h) {
        const x = 386, y = 24;   /* top right, under the clock: the corner buttons of the page sit over the bottom right */
        rr(ctx, x, y, 88, 36, 10); ctx.fillStyle = 'rgba(74,34,58,.72)'; ctx.fill(); ctx.strokeStyle = h.col; ctx.lineWidth = 1.5; ctx.stroke();
        rr(ctx, x + 5, y + 5, 26, 26, 7); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
        icon(ctx, h.id, x + 18, y + 18, 8, fr);
        font(ctx, 8.5); ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(h.name, x + 36, y + 11);
        if (h.frac !== null) { rr(ctx, x + 36, y + 20, 46, 7, 3.5); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); if (h.frac > 0) { rr(ctx, x + 36, y + 20, Math.max(7, 46 * Math.max(0, Math.min(1, h.frac))), 7, 3.5); ctx.fillStyle = h.frac < 0.25 && (fr >> 3) % 2 ? '#ff6f9c' : h.col; ctx.fill(); } }
        else { font(ctx, 7); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(h.id === 'sling' ? 'Shift/X: schießen' : (h.id === 'claws' ? 'Wand + Springen' : (h.id === 'bubble' ? '1 Treffer frei' : (h.id === 'boots' ? 'Riesensprünge' : 'zieht Herzen an'))), x + 36, y + 24); }
      }
      if (p.combo > 1 && !p.onGround) { font(ctx, 11); ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#7a3b57'; ctx.lineJoin = 'round'; const t = 'Combo ×' + p.combo; ctx.strokeText(t, G.VW / 2, 60); ctx.fillStyle = p.combo >= 8 ? '#ffd84a' : '#fff'; ctx.fillText(t, G.VW / 2, 60); }
    },
  };
})();

/* Pookiewookie puzzle: "Die vier Höhlenfische" (world unterwasser, slot 1).
   Einstein-style logic grid: four caves, each fish has a colour, a favourite food and a pattern. Two handcrafted clue sets,
   both verified for a unique solution by brute force at load time. Canvas for the caves and fish, DOM for the clue list. */
(function () {
  const G = window.PW = window.PW || {};
  const TAU = Math.PI * 2, FONT = '"Fredoka", sans-serif';
  const INK = '#2a2440', PINK = '#ff9eb0', ROSE = '#ff6f9c', GOLD = '#ffd84a', MINT = '#9be7a5', CREAM = '#fff4e0';

  const ATTR = {
    c: {label: 'Farbe', vals: ['Rot', 'Gelb', 'Blau', 'Grün']},
    f: {label: 'Futter', vals: ['Plankton', 'Krill', 'Algen', 'Muscheln']},
    p: {label: 'Muster', vals: ['gestreift', 'gepunktet', 'gefleckt', 'einfarbig']},
  };
  const KEYS = ['c', 'f', 'p'];
  const FISHCOL = [['#ff5f6d', '#c9374a'], ['#ffd84a', '#d69a1c'], ['#5aa9ff', '#2f6fc9'], ['#5fd38a', '#2f9a5b']];
  /* clue = [type, a1, v1, a2, v2, (a3, v3)] ; type at: [at, a, v, cave] ; edge: [edge, a, v] */
  const VARIANTS = [
    {sol: {c: [1, 0, 3, 2], f: [2, 1, 3, 0], p: [1, 3, 0, 2]}, clues: [
      [['at', 'c', 2, 3], 'Der <b class="k2">blaue</b> Fisch wohnt in Höhle 4, ganz rechts.'],
      [['dleft', 'f', 1, 'c', 3], 'Der <b>Krillfresser</b> wohnt direkt links neben dem <b class="k3">grünen</b> Fisch.'],
      [['same', 'p', 0, 'f', 3], 'Der <b>gestreifte</b> Fisch knackt <b>Muscheln</b>.'],
      [['edge', 'c', 1], 'Der <b class="k1">gelbe</b> Fisch wohnt ganz außen – in Höhle 1 oder Höhle 4.'],
      [['leftof', 'p', 0, 'p', 2], 'Der <b>gefleckte</b> Fisch wohnt irgendwo rechts vom <b>gestreiften</b>.'],
      [['same', 'c', 0, 'p', 3], 'Der <b class="k0">rote</b> Fisch ist <b>einfarbig</b>.'],
      [['next', 'f', 0, 'f', 3], 'Der <b>Planktonfresser</b> wohnt neben dem <b>Muschelknacker</b>.'],
      [['leftof', 'f', 2, 'c', 0], 'Der <b>Algenfresser</b> wohnt irgendwo links vom <b class="k0">roten</b> Fisch.'],
    ]},
    {sol: {c: [3, 2, 1, 0], f: [3, 0, 1, 2], p: [2, 0, 3, 1]}, clues: [
      [['at', 'f', 1, 2], 'Der <b>Krillfresser</b> wohnt in Höhle 3.'],
      [['between', 'f', 1, 'c', 0, 'f', 3], 'Der <b>Krillfresser</b> wohnt irgendwo zwischen dem <b class="k0">roten</b> Fisch und dem <b>Muschelknacker</b>.'],
      [['same', 'f', 2, 'c', 0], 'Der <b>Algenfresser</b> ist <b class="k0">rot</b>.'],
      [['leftof', 'c', 3, 'f', 0], 'Der <b class="k3">grüne</b> Fisch wohnt irgendwo links vom <b>Planktonfresser</b>.'],
      [['dleft', 'c', 3, 'p', 0], 'Der <b class="k3">grüne</b> Fisch wohnt direkt links neben dem <b>gestreiften</b>.'],
      [['next', 'f', 1, 'p', 1], 'Der <b>Krillfresser</b> wohnt neben dem <b>gepunkteten</b> Fisch.'],
      [['diff', 'c', 2, 'f', 1], 'Der <b class="k2">blaue</b> Fisch mag keinen <b>Krill</b>.'],
      [['next', 'p', 3, 'p', 1], 'Der <b>einfarbige</b> Fisch wohnt neben dem <b>gepunkteten</b>.'],
    ]},
  ];
  const posOf = (s, a, v) => s[a].indexOf(v);
  function clueOk(cl, s) {
    const t = cl[0], A = () => posOf(s, cl[1], cl[2]), B = () => posOf(s, cl[3], cl[4]);
    switch (t) {
      case 'at': return A() === cl[3];
      case 'same': return A() === B();
      case 'diff': return A() !== B();
      case 'leftof': return A() < B();
      case 'dleft': return A() + 1 === B();
      case 'next': return Math.abs(A() - B()) === 1;
      case 'notnext': return Math.abs(A() - B()) !== 1;
      case 'edge': return A() === 0 || A() === 3;
      case 'between': { const a = A(), b = B(), c = posOf(s, cl[5], cl[6]); return a > Math.min(b, c) && a < Math.max(b, c); }
    }
    return false;
  }
  const PERMS = (() => { const out = []; const rec = (arr, rest) => { if (!rest.length) { out.push(arr); return; } rest.forEach((x, i) => rec(arr.concat(x), rest.filter((_, j) => j !== i))); }; rec([], [0, 1, 2, 3]); return out; })();
  function countSolutions(clues) {
    let n = 0, found = null;
    for (const c of PERMS) for (const f of PERMS) for (const p of PERMS) { const s = {c, f, p}; if (clues.every(cl => clueOk(cl[0], s))) { n++; found = s; } }
    return {n, found};
  }
  /* verify both variants once at load */
  VARIANTS.forEach((v, i) => {
    const r = countSolutions(v.clues);
    v.ok = r.n === 1 && KEYS.every(k => r.found[k].join() === v.sol[k].join());
    console.log('PZ_FISH variant ' + (i + 1) + ': ' + r.n + ' solution(s)' + (v.ok ? ' ok' : ' MISMATCH'));
  });

  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function T(c, s, x, y, px, col, o) {
    o = o || {}; c.font = (o.w || 700) + ' ' + px + 'px ' + FONT; c.textAlign = o.a || 'center'; c.textBaseline = 'middle';
    if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || px * 0.3; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function star(c, x, y, r, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fillStyle = col; c.fill(); }

  /* ---------- art ---------- */
  function fishPath(c, x, y, s) { c.beginPath(); c.ellipse(x, y, s, s * 0.62, 0, 0, TAU); }
  function patternFill(c, x, y, s, pat, dark) {
    c.fillStyle = dark;
    if (pat === 0) { c.fillStyle = 'rgba(255,255,255,.75)'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.ellipse(x + k * s * 0.42, y, s * 0.1, s * 0.7, 0.12, 0, TAU); c.fill(); } c.fillStyle = dark; for (let k = -1; k <= 1; k++) { c.beginPath(); c.ellipse(x + k * s * 0.42 + s * 0.12, y, s * 0.05, s * 0.7, 0.12, 0, TAU); c.fill(); } }
    else if (pat === 1) { c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) { const px = x + i * s * 0.36 + (j % 2 ? s * 0.18 : 0), py = y + j * s * 0.32; c.beginPath(); c.arc(px, py, s * 0.09, 0, TAU); c.fill(); } }
    else if (pat === 2) { const B = [[-0.45, -0.18, 0.24, 0.15, 0.5], [0.05, 0.22, 0.2, 0.13, -0.3], [0.35, -0.25, 0.16, 0.12, 0.9], [-0.1, -0.35, 0.12, 0.08, 0.2], [0.55, 0.15, 0.1, 0.09, 0]]; for (const b of B) { c.beginPath(); c.ellipse(x + b[0] * s, y + b[1] * s, b[2] * s, b[3] * s, b[4], 0, TAU); c.fill(); } }
    else if (pat === 3) { c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(x, y + s * 0.25, s * 0.7, s * 0.25, 0, 0, TAU); c.fill(); }
  }
  /* fish: col -1 = unknown (ghost), pat -1 = unknown */
  function drawFish(c, x, y, s, col, pat, face, t, o) {
    o = o || {};
    const base = col >= 0 ? FISHCOL[col][0] : 'rgba(220,235,255,.28)', dark = col >= 0 ? FISHCOL[col][1] : 'rgba(255,255,255,.25)';
    const wig = Math.sin(t * 9) * 0.25;
    c.save(); c.translate(x, y); c.scale(face, 1); c.translate(-x, -y);
    const line = col >= 0 ? INK : 'rgba(255,255,255,.55)';
    /* tail */
    c.beginPath(); c.moveTo(x - s * 0.85, y); c.lineTo(x - s * 1.5, y - s * (0.55 + wig)); c.quadraticCurveTo(x - s * 1.25, y, x - s * 1.5, y + s * (0.55 - wig)); c.closePath();
    c.fillStyle = dark; c.fill(); c.lineWidth = Math.max(1.5, s * 0.09); c.strokeStyle = line; c.lineJoin = 'round'; c.stroke();
    /* top fin */
    c.beginPath(); c.moveTo(x - s * 0.35, y - s * 0.5); c.quadraticCurveTo(x - s * 0.1, y - s * 1.05, x + s * 0.35, y - s * 0.55); c.closePath(); c.fillStyle = dark; c.fill(); c.stroke();
    /* body */
    fishPath(c, x, y, s); c.fillStyle = base; c.fill();
    if (pat >= 0) { c.save(); fishPath(c, x, y, s); c.clip(); if (col < 0) c.globalAlpha = 0.45; patternFill(c, x, y, s, pat, col >= 0 ? dark : 'rgba(255,255,255,.6)'); c.restore(); }
    fishPath(c, x, y, s); c.lineWidth = Math.max(1.5, s * 0.09); c.strokeStyle = line; if (col < 0) c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
    /* side fin (not on the ghost, it would hide the question mark) */
    if (col >= 0) { c.beginPath(); c.ellipse(x - s * 0.05, y + s * 0.18, s * 0.28, s * 0.14, 0.5 + wig * 0.6, 0, TAU); c.fillStyle = dark; c.fill(); c.lineWidth = Math.max(1, s * 0.06); c.stroke(); }
    /* face */
    if (col >= 0) {
      c.beginPath(); c.arc(x + s * 0.52, y - s * 0.12, s * 0.2, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = Math.max(1, s * 0.06); c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(x + s * 0.56, y - s * 0.1, s * 0.11, 0, TAU); c.fillStyle = INK; c.fill();
      c.beginPath(); c.arc(x + s * 0.6, y - s * 0.15, s * 0.04, 0, TAU); c.fillStyle = '#fff'; c.fill();
      c.beginPath(); if (o.happy) c.arc(x + s * 0.72, y + s * 0.15, s * 0.12, 0.2, Math.PI - 0.2); else c.arc(x + s * 0.8, y + s * 0.18, s * 0.07, Math.PI * 0.6, Math.PI * 1.4); c.lineWidth = Math.max(1, s * 0.06); c.stroke();
      c.beginPath(); c.ellipse(x + s * 0.35, y + s * 0.12, s * 0.09, s * 0.05, 0, 0, TAU); c.fillStyle = 'rgba(255,120,150,.6)'; c.fill();
    }
    c.restore();
    if (col < 0) T(c, '?', x, y + s * 0.06, s * 0.95, 'rgba(255,255,255,.85)', {stroke: 'rgba(13,26,51,.55)', sw: s * 0.16});
    else if (pat < 0) T(c, '?', x - face * s * 0.12, y + s * 0.04, s * 0.7, 'rgba(255,255,255,.9)', {stroke: 'rgba(42,36,64,.45)', sw: s * 0.12});
  }
  function drawFood(c, f, x, y, s, t) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    if (f === 0) { /* plankton: glowing dots */
      const g = c.createRadialGradient(x, y - s * 0.4, 1, x, y - s * 0.4, s * 1.1); g.addColorStop(0, 'rgba(160,255,220,.55)'); g.addColorStop(1, 'rgba(160,255,220,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - s * 0.4, s * 1.1, 0, TAU); c.fill();
      const P = [[0, -0.5, 0.2], [-0.45, -0.25, 0.15], [0.42, -0.3, 0.17], [-0.2, -0.85, 0.13], [0.25, -0.8, 0.12], [0.05, -0.15, 0.12], [-0.6, -0.65, 0.1], [0.6, -0.7, 0.09]];
      P.forEach((p, i) => { c.beginPath(); c.arc(x + p[0] * s + Math.sin(t * 2 + i) * s * 0.05, y + p[1] * s + Math.cos(t * 2.3 + i) * s * 0.05, p[2] * s, 0, TAU); c.fillStyle = i % 2 ? '#8ff5d0' : '#d4fff0'; c.fill(); c.lineWidth = Math.max(0.8, s * 0.05); c.strokeStyle = '#1d6e5c'; c.stroke(); });
    } else if (f === 1) { /* krill */
      c.beginPath(); c.arc(x, y - s * 0.4, s * 0.5, Math.PI * 0.95, Math.PI * 2.15); c.lineWidth = s * 0.36; c.strokeStyle = INK; c.stroke(); c.lineWidth = s * 0.26; c.strokeStyle = '#ff8f9e'; c.stroke();
      c.lineWidth = Math.max(1, s * 0.06); c.strokeStyle = '#c9506a'; for (let k = 0; k < 4; k++) { const a = Math.PI * (1.1 + k * 0.25); c.beginPath(); c.moveTo(x + Math.cos(a) * s * 0.36, y - s * 0.4 + Math.sin(a) * s * 0.36); c.lineTo(x + Math.cos(a) * s * 0.64, y - s * 0.4 + Math.sin(a) * s * 0.64); c.stroke(); }
      c.beginPath(); c.arc(x + s * 0.5, y - s * 0.22, s * 0.07, 0, TAU); c.fillStyle = INK; c.fill();
      c.beginPath(); c.moveTo(x + s * 0.55, y - s * 0.25); c.quadraticCurveTo(x + s * 0.9, y - s * 0.6, x + s * 0.8, y - s * 1.0); c.lineWidth = Math.max(0.8, s * 0.04); c.strokeStyle = '#c9506a'; c.stroke();
    } else if (f === 2) { /* algae */
      const cols = ['#3fae6a', '#5fd38a', '#2e8a55'];
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * s * 0.3, y); for (let j = 1; j <= 6; j++) { const yy = y - j * s * 0.2 * (k ? 0.85 : 1.1); c.lineTo(x + k * s * 0.3 + Math.sin(t * 2 + j * 0.9 + k) * s * 0.12, yy); } c.lineWidth = s * 0.26; c.strokeStyle = INK; c.stroke(); c.lineWidth = s * 0.16; c.strokeStyle = cols[k + 1]; c.stroke(); }
    } else if (f === 3) { /* scallop shell */
      c.beginPath(); c.moveTo(x, y - s * 0.05); for (let k = 0; k <= 8; k++) { const a = Math.PI * (1.1 + k * 0.1), r = s * (0.62 + (k % 2) * 0.06); c.lineTo(x + Math.cos(a) * r, y - s * 0.1 + Math.sin(a) * r); } c.closePath();
      c.fillStyle = '#f7c9e0'; c.fill(); c.lineWidth = Math.max(1, s * 0.08); c.strokeStyle = INK; c.stroke();
      c.lineWidth = Math.max(0.8, s * 0.05); c.strokeStyle = '#c4789d'; for (let k = 1; k < 8; k++) { const a = Math.PI * (1.1 + k * 0.1); c.beginPath(); c.moveTo(x, y - s * 0.08); c.lineTo(x + Math.cos(a) * s * 0.55, y - s * 0.1 + Math.sin(a) * s * 0.55); c.stroke(); }
      rr(c, x - s * 0.17, y - s * 0.12, s * 0.34, s * 0.16, s * 0.05); c.fillStyle = '#e9a8c8'; c.fill(); c.lineWidth = Math.max(1, s * 0.06); c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(x + s * 0.32, y - s * 0.02, s * 0.12, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.stroke();
    }
    c.restore();
  }
  function drawPatternSwatch(c, x, y, r, pat) {
    c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#ffb46a'; c.fill(); c.clip(); patternFill(c, x, y, r * 1.15, pat, '#b85e1a'); c.restore();
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
  }
  function drawIcon(c, key, v, x, y, r, t) {
    if (key === 'c') { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = FISHCOL[v][0]; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill(); }
    else if (key === 'f') drawFood(c, v, x, y + r * 0.85, r * 1.35, t || 0);
    else drawPatternSwatch(c, x, y, r, v);
  }

  /* in-level station: a sunken stone shrine with four little cave holes */
  function station(c, x, y, t, solved) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y, 17, 3, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(x - 16, y); c.lineTo(x - 15, y - 22); c.quadraticCurveTo(x, y - 40, x + 15, y - 22); c.lineTo(x + 16, y); c.closePath();
    c.fillStyle = '#7d8fa6'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(x - 6, y - 26, 6, 3, -0.4, 0, TAU); c.fill();
    for (let i = 0; i < 4; i++) {
      const hx = x - 10.5 + i * 7, hy = y - 9;
      c.beginPath(); c.arc(hx, hy, 2.8, Math.PI, 0); c.lineTo(hx + 2.8, hy + 4); c.lineTo(hx - 2.8, hy + 4); c.closePath(); c.fillStyle = '#1a2440'; c.fill();
      if (solved || (Math.floor(t * 1.5) % 4) === i) { c.beginPath(); c.arc(hx, hy + 1.5, 1.5, 0, TAU); c.fillStyle = FISHCOL[i][0]; c.fill(); }
    }
    c.fillStyle = '#4fae74'; for (const sx of [-15, 13]) { c.beginPath(); c.moveTo(x + sx, y); c.quadraticCurveTo(x + sx - 3 + Math.sin(t * 2 + sx) * 2, y - 8, x + sx + 1, y - 14); c.quadraticCurveTo(x + sx + 2, y - 8, x + sx + 3, y); c.fill(); }
    c.beginPath(); c.arc(x, y - 27, 3.2, 0, TAU); c.fillStyle = solved ? GOLD : '#b7c6d8'; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
    for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; c.globalAlpha = 1 - k; c.beginPath(); c.arc(x + 6 + Math.sin(k * 8 + i) * 2, y - 30 - k * 14, 1.4 + i * 0.4, 0, TAU); c.strokeStyle = '#cfefff'; c.lineWidth = 0.8; c.stroke(); }
    c.globalAlpha = 1; c.restore();
  }

  const CSS = `
.pz-uf-clues{position:absolute;display:flex;flex-direction:column;background:rgba(255,244,224,.96);border:3px solid #2a2440;border-radius:14px;overflow:hidden;color:#3a2a50}
.pz-uf-clues h3{margin:0;padding:5px 10px;background:#8fd3ff;border-bottom:3px solid #2a2440;font:700 14px/1.2 "Fredoka",sans-serif;color:#1d3b66;display:flex;justify-content:space-between;align-items:center}
.pz-uf-clues h3 small{font-weight:500;font-size:10.5px;color:#2f5a8a}
.pz-uf-list{flex:1 1 auto;overflow-y:auto;padding:4px 6px;touch-action:pan-y;-webkit-overflow-scrolling:touch}
.pz-uf-list div{display:flex;gap:7px;align-items:flex-start;padding:5px 6px;margin:2px 0;border-radius:9px;font:500 13px/1.28 "Fredoka",sans-serif;cursor:pointer;transition:background .2s,opacity .2s,transform .15s}
.pz-uf-list div:hover{background:rgba(143,211,255,.25)}
.pz-uf-list div i{flex:0 0 auto;font-style:normal;width:19px;height:19px;border-radius:50%;background:#2a2440;color:#fff;font:700 11px/19px "Fredoka",sans-serif;text-align:center}
.pz-uf-list div.done{opacity:.42}.pz-uf-list div.done span{text-decoration:line-through;text-decoration-thickness:2px}
.pz-uf-list div.bad{background:rgba(255,95,109,.28);box-shadow:inset 0 0 0 2px #ff5f6d;animation:pzufbad .5s}
.pz-uf-list div.bad i{background:#e0384c}
.pz-uf-list div.good{background:rgba(95,211,138,.45);transition:none}.pz-uf-list div.good i{background:#25904f}
@keyframes pzufbad{30%{transform:translateX(-4px)}60%{transform:translateX(4px)}}
.pz-uf-list b{font-weight:700;color:#4a2a6a}.pz-uf-list b.k0{color:#d93a4c}.pz-uf-list b.k1{color:#c08a00}.pz-uf-list b.k2{color:#2f6fc9}.pz-uf-list b.k3{color:#25904f}
.pz-uf-btns{display:flex;gap:6px;padding:6px;border-top:2px dashed rgba(42,36,64,.2)}
.pz-uf-btns button{flex:1 1 auto;min-height:36px;border:2.5px solid #2a2440;border-radius:999px;font:700 14px/1 "Fredoka",sans-serif;cursor:pointer;box-shadow:0 3px 0 #2a2440;padding:0 10px}
.pz-uf-btns button:active{transform:translateY(2px);box-shadow:0 1px 0 #2a2440}
.pz-uf-go{background:#ff6f9c;color:#fff}.pz-uf-reset{background:#fff;color:#2a2440;flex:0 0 auto!important}
.pz-uf-small .pz-uf-list div{font-size:11.5px;padding:3px 5px;gap:5px}.pz-uf-small .pz-uf-clues h3{font-size:12px;padding:3px 8px}
.pz-uf-small .pz-uf-btns{padding:4px;gap:4px}.pz-uf-small .pz-uf-btns button{min-height:34px;font-size:13px}
.pz-uf-clues p.more{position:absolute;right:8px;margin:0;width:20px;height:20px;border-radius:50%;background:#2a2440;color:#fff;font:700 12px/20px "Fredoka",sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s;animation:pzufmore 1.2s ease-in-out infinite}
.pz-uf-list.has-more{-webkit-mask-image:linear-gradient(#000 calc(100% - 30px),rgba(0,0,0,.35));mask-image:linear-gradient(#000 calc(100% - 30px),rgba(0,0,0,.35))}
.pz-uf-clues.has-more p.more{opacity:.9}
@keyframes pzufmore{50%{transform:translateY(-3px)}}
`;

  function mount(root, api) {
    const rng = api.rng || Math.random;
    const okVars = VARIANTS.filter(v => v.ok);
    const V = (okVars.length ? okVars : VARIANTS)[Math.floor(rng() * (okVars.length || VARIANTS.length))];
    const style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);
    const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
    root.appendChild(cv);
    const ctx = cv.getContext('2d');
    const panel = document.createElement('div'); panel.className = 'pz-uf-clues';
    panel.innerHTML = '<h3>Hinweise <small>antippen = abhaken</small></h3><div class="pz-uf-list"></div><div class="pz-uf-btns"><button type="button" class="pz-uf-reset">Leeren</button><button type="button" class="pz-uf-go">Prüfen</button></div>';
    root.appendChild(panel);
    const list = panel.querySelector('.pz-uf-list');
    const rows = V.clues.map((cl, i) => { const d = document.createElement('div'); d.innerHTML = '<i>' + (i + 1) + '</i><span>' + cl[1] + '</span>'; list.appendChild(d); d.addEventListener('click', () => { d.classList.toggle('done'); sfx(d.classList.contains('done') ? 'tick' : 'select'); }); return d; });
    const more = document.createElement('p'); more.className = 'more'; more.textContent = '▾'; more.title = 'weiter runter scrollen'; panel.appendChild(more);
    const btnBar = panel.querySelector('.pz-uf-btns');
    const moreCheck = () => { const m = list.scrollTop + list.clientHeight < list.scrollHeight - 6; list.classList.toggle('has-more', m); panel.classList.toggle('has-more', m); more.style.bottom = (btnBar.offsetHeight + 6) + 'px'; };
    list.addEventListener('scroll', moreCheck, {passive: true});

    let W = 0, H = 0, dpr = 1, Lay = null, alive = true, raf = 0, last = performance.now(), time = 0, hits = [];
    const timers = [];
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); };
    const sfx = n => { try { api.sfx(n); } catch (e) {} };
    const tone = (f, d, o) => { try { if (G.audio && G.audio.tone) G.audio.tone(f, d, o); } catch (e) {} };
    const S = {grid: {c: [-1, -1, -1, -1], f: [-1, -1, -1, -1], p: [-1, -1, -1, -1]}, pick: null, won: false, busy: false, parts: [], pop: [0, 0, 0, 0], hover: null, auto: false};
    const fish = [0, 1, 2, 3].map(i => ({x: 0.5, dir: i % 2 ? -1 : 1, ph: i * 1.7, sp: 0.18 + i * 0.03}));

    function layout() {
      const w = Math.max(320, root.clientWidth), h = Math.max(180, root.clientHeight);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w !== W || h !== H || cv.width !== Math.round(w * dpr)) { W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const small = H < 300, pad = 8;
      const clueW = Math.round(Math.max(240, Math.min(345, W * 0.37)));
      const leftW = W - clueW - pad * 3, colW = leftW / 4;
      const chipH = small ? Math.max(28, Math.min(34, (H - 2 * pad) * 0.13)) : 36, gap = small ? 4 : 5;
      const chipsH = chipH * 3 + gap * 2, caveH = H - pad * 2 - chipsH - 6;
      Lay = {small, pad, clueW, leftW, colW, chipH, gap, chipsH, caveH, caveTop: pad, chipTop: pad + caveH + 6};
      root.classList.toggle('pz-uf-small', small);
      panel.style.left = (W - clueW - pad) + 'px'; panel.style.top = pad + 'px'; panel.style.width = clueW + 'px'; panel.style.height = (H - pad * 2) + 'px';
      moreCheck();
    }
    const colX = i => Lay.pad + Lay.colW * i;

    function clearMarks() { rows.forEach(r => r.classList.remove('bad', 'good')); }
    function setVal(i, key, v) {
      const g = S.grid[key], old = g[i];
      if (v >= 0) { const j = g.indexOf(v); if (j >= 0 && j !== i) { g[j] = old; S.pop[j] = 1; } }
      g[i] = v; S.pop[i] = 1; clearMarks();
      if (v >= 0) { tone(440 + v * 110 + i * 30, 0.09, {type: 'sine', gain: 0.12}); burstAt(colX(i) + Lay.colW / 2, Lay.caveTop + Lay.caveH * 0.5, 6, ['#cfefff', '#fff', GOLD]); }
      else sfx('pop');
    }
    function burstAt(x, y, n, cols) { for (let k = 0; k < n; k++) { const a = rng() * TAU, v = 30 + rng() * 90; S.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: 0.6 + rng() * 0.5, col: cols[k % cols.length], r: 1.5 + rng() * 2.5, bubble: rng() < 0.5}); } }
    function full() { return KEYS.every(k => S.grid[k].every(v => v >= 0)); }
    function check() {
      if (S.won || S.busy) return;
      S.pick = null;
      if (!full()) { api.msg('Gib erst jedem Fisch Farbe, Futter und Muster – dann prüfe.', 'bad'); sfx('bump'); draw(); return; }
      const bad = []; V.clues.forEach((cl, i) => { if (!clueOk(cl[0], S.grid)) bad.push(i); });
      clearMarks(); void list.offsetWidth;
      if (!bad.length) { win(); return; }
      bad.forEach(i => rows[i].classList.add('bad'));
      if (rows[bad[0]]) rows[bad[0]].scrollIntoView({block: 'nearest', behavior: 'smooth'});
      api.wrong(bad.length === 1 ? 'Ein Hinweis stimmt noch nicht – er leuchtet rot.' : bad.length + ' Hinweise stimmen noch nicht – sie leuchten rot.');
    }
    function win() {
      S.won = true; rows.forEach(r => { r.classList.remove('done', 'bad'); r.classList.add('good'); });
      sfx('star');
      for (let i = 0; i < 4; i++) { later(() => { tone(523 * Math.pow(1.26, i), 0.18, {type: 'triangle', gain: 0.14}); burstAt(colX(i) + Lay.colW / 2, Lay.caveTop + Lay.caveH * 0.45, 16, [GOLD, '#fff', '#cfefff', PINK]); draw(); }, i * 150); }
      later(() => api.solved(), 900);
    }
    function reset() { if (S.won || S.busy) return; KEYS.forEach(k => { S.grid[k] = [-1, -1, -1, -1]; }); S.pick = null; clearMarks(); rows.forEach(r => r.classList.remove('done')); sfx('bubblePop'); draw(); }
    panel.querySelector('.pz-uf-go').addEventListener('click', () => { if (!S.auto) check(); });
    panel.querySelector('.pz-uf-reset').addEventListener('click', () => { if (!S.auto) reset(); });

    /* ---------- drawing ---------- */
    function drawBg() {
      const L = Lay, w = L.leftW + L.pad * 2;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a6fa8'); g.addColorStop(0.55, '#1b4a7c'); g.addColorStop(1, '#122f55');
      rr(ctx, 2, 2, w - 4, H - 4, 14); ctx.fillStyle = g; ctx.fill();
      ctx.save(); rr(ctx, 2, 2, w - 4, H - 4, 14); ctx.clip();
      /* light rays */
      for (let k = 0; k < 5; k++) { const x = w * (0.1 + k * 0.22) + Math.sin(time * 0.4 + k) * 20; ctx.beginPath(); ctx.moveTo(x - 14, 0); ctx.lineTo(x + 14, 0); ctx.lineTo(x + 70, H); ctx.lineTo(x + 20, H); ctx.closePath(); ctx.fillStyle = 'rgba(200,240,255,' + (0.05 + 0.03 * Math.sin(time + k)) + ')'; ctx.fill(); }
      /* sand */
      ctx.fillStyle = '#d9b77a'; ctx.beginPath(); ctx.moveTo(0, L.chipTop - 4); for (let x = 0; x <= w; x += 20) ctx.lineTo(x, L.chipTop - 8 + Math.sin(x * 0.05) * 3); ctx.lineTo(w, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(122,80,40,.25)'; ctx.fillRect(0, L.chipTop - 2, w, H);
      /* ambient bubbles */
      for (let k = 0; k < 12; k++) { const bx = (k * 73.7) % w, by = H - ((time * (14 + k * 2) + k * 40) % (H + 20)); ctx.beginPath(); ctx.arc(bx + Math.sin(time * 2 + k) * 3, by, 1.5 + (k % 3), 0, TAU); ctx.strokeStyle = 'rgba(220,245,255,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
    }
    function drawCave(i) {
      const L = Lay, x = colX(i) + 4, w = L.colW - 8, y = L.caveTop + 4, h = L.caveH - 8;
      /* rock */
      ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.35); ctx.quadraticCurveTo(x + 2, y, x + w * 0.5, y); ctx.quadraticCurveTo(x + w - 2, y, x + w, y + h * 0.35); ctx.lineTo(x + w, y + h); ctx.closePath();
      ctx.fillStyle = '#5f6f8c'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(x + w * 0.28, y + h * 0.13, w * 0.18, h * 0.05, -0.3, 0, TAU); ctx.fill();
      /* hole */
      const hx = x + w * 0.11, hw = w * 0.78, hy = y + h * 0.2, hh = h * 0.8 - 2;
      ctx.beginPath(); ctx.moveTo(hx, hy + hh); ctx.lineTo(hx, hy + hw * 0.45); ctx.arc(hx + hw / 2, hy + hw * 0.45, hw / 2, Math.PI, 0); ctx.lineTo(hx + hw, hy + hh); ctx.closePath();
      const g = ctx.createLinearGradient(0, hy, 0, hy + hh); g.addColorStop(0, '#0d1a33'); g.addColorStop(1, '#1d3558'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.save(); ctx.clip();
      const glow = ctx.createRadialGradient(hx + hw / 2, hy + hh * 0.55, 2, hx + hw / 2, hy + hh * 0.55, hw * 0.7); glow.addColorStop(0, 'rgba(120,200,255,.22)'); glow.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = glow; ctx.fillRect(hx, hy, hw, hh);
      /* sand floor inside */
      ctx.fillStyle = '#b8955c'; ctx.beginPath(); ctx.ellipse(hx + hw / 2, hy + hh + 2, hw * 0.6, hh * 0.13, 0, 0, TAU); ctx.fill();
      const fv = S.grid.f[i], cv2 = S.grid.c[i], pv = S.grid.p[i], fs = Math.min(hw * 0.25, hh * 0.19);
      if (fv >= 0) drawFood(ctx, fv, hx + hw * 0.76, hy + hh - 3, fs, time + i);
      /* fish */
      const fsz = Math.min(hw * 0.25, hh * 0.19) * (1 + S.pop[i] * 0.25);
      const fx = hx + hw * 0.18 + fsz * 1.2 + fish[i].x * Math.max(0, hw - fsz * 2.9 - hw * 0.18);
      let fy = hy + hh * 0.5 + Math.sin(time * 2 + fish[i].ph) * hh * 0.06;
      if (S.won) fy -= Math.abs(Math.sin(time * 6 + i)) * hh * 0.12;
      drawFish(ctx, fx, fy, fsz, cv2, pv, fish[i].dir, time + fish[i].ph, {happy: S.won});
      ctx.restore();
      /* plaque */
      const pw = Math.min(w * 0.7, 76), ph = L.small ? 16 : 19;
      rr(ctx, x + w / 2 - pw / 2, y - 2, pw, ph, 7); ctx.fillStyle = CREAM; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      T(ctx, 'Höhle ' + (i + 1), x + w / 2, y - 2 + ph / 2 + 1, L.small ? 10.5 : 12, '#2a2440');
    }
    function chipRect(i, k) { const L = Lay; return {x: colX(i) + 3, y: L.chipTop + k * (L.chipH + L.gap), w: L.colW - 6, h: L.chipH}; }
    function drawChip(i, k) {
      const key = KEYS[k], v = S.grid[key][i], r = chipRect(i, k), open = S.pick && S.pick.i === i && S.pick.k === k, hov = S.hover === 'c' + i + k;
      rr(ctx, r.x, r.y + 2, r.w, r.h, 10); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
      rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fillStyle = open ? '#fff6c8' : v >= 0 ? CREAM : (hov ? 'rgba(40,80,140,.7)' : 'rgba(25,55,105,.55)'); ctx.fill();
      ctx.lineWidth = open ? 3 : 2; ctx.strokeStyle = open ? GOLD : v >= 0 ? INK : 'rgba(255,255,255,.55)'; if (v < 0) ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      const ir = Math.min(r.h * 0.3, 11), px = Lay.small ? 11 : 12.5;
      if (v >= 0) {
        drawIcon(ctx, key, v, r.x + 8 + ir, r.y + r.h / 2, ir, time);
        ctx.font = '600 ' + px + 'px ' + FONT; let label = ATTR[key].vals[v]; const maxW = r.w - ir * 2 - 16; let fs = px; while (ctx.measureText(label).width > maxW && fs > 8) { fs -= 0.5; ctx.font = '600 ' + fs + 'px ' + FONT; }
        T(ctx, label, r.x + 12 + ir * 2, r.y + r.h / 2 + 1, fs, INK, {a: 'left', w: 600});
      } else T(ctx, ATTR[key].label + ' ?', r.x + r.w / 2, r.y + r.h / 2 + 1, px, 'rgba(255,255,255,.85)', {w: 600});
      hits.push({x: r.x, y: r.y, w: r.w, h: r.h, id: 'c' + i + k, fn: () => { S.pick = open ? null : {i, k}; sfx('select'); }});
    }
    function drawPicker() {
      if (!S.pick) return;
      const {i, k} = S.pick, key = KEYS[k], r = chipRect(i, k), L = Lay;
      const bs = L.small ? 40 : 46, n = 5, pw = bs * n + 6 * (n + 1), ph = bs + 12 + (L.small ? 0 : 14);
      let px = r.x + r.w / 2 - pw / 2; px = Math.max(L.pad, Math.min(L.pad + L.leftW - pw, px));
      let py = r.y - ph - 6; if (py < 4) py = r.y + r.h + 6;
      /* catch-all to close */
      hits.push({x: 0, y: 0, w: L.leftW + L.pad * 2, h: H, fn: () => { S.pick = null; }});
      rr(ctx, px, py + 3, pw, ph, 14); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      rr(ctx, px, py, pw, ph, 14); ctx.fillStyle = CREAM; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      /* little arrow */
      const ax = r.x + r.w / 2, up = py < r.y; ctx.beginPath(); if (up) { ctx.moveTo(ax - 8, py + ph); ctx.lineTo(ax, py + ph + 7); ctx.lineTo(ax + 8, py + ph); } else { ctx.moveTo(ax - 8, py); ctx.lineTo(ax, py - 7); ctx.lineTo(ax + 8, py); } ctx.fillStyle = CREAM; ctx.fill(); ctx.stroke();
      for (let v = -1; v < 4; v++) {
        const bx = px + 6 + (v + 1) * (bs + 6), by = py + 6, cur = S.grid[key][i] === v, used = v >= 0 ? S.grid[key].indexOf(v) : -1, hov = S.hover === 'p' + v;
        rr(ctx, bx, by, bs, bs, 10); ctx.fillStyle = cur ? '#ffe58a' : hov ? '#e8f6ff' : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = cur ? '#c08a00' : 'rgba(42,36,64,.35)'; ctx.stroke();
        if (v < 0) T(ctx, '✕', bx + bs / 2, by + bs / 2 + 1, bs * 0.4, '#b0899c');
        else drawIcon(ctx, key, v, bx + bs / 2, by + bs / 2 - (L.small ? 0 : 2), bs * 0.28, time);
        if (used >= 0 && used !== i) { ctx.beginPath(); ctx.arc(bx + bs - 6, by + 6, 7, 0, TAU); ctx.fillStyle = '#5f6f8c'; ctx.fill(); T(ctx, String(used + 1), bx + bs - 6, by + 6.5, 9, '#fff'); }
        if (!L.small) T(ctx, v < 0 ? 'leer' : ATTR[key].vals[v], bx + bs / 2, by + bs + 7, 9.5, '#5a4a6a', {w: 600});
        hits.push({x: bx, y: by, w: bs, h: bs + (L.small ? 0 : 12), id: 'p' + v, fn: () => { setVal(i, key, v); S.pick = null; }});
      }
    }
    function draw() {
      if (!Lay) layout();
      hits = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      drawBg();
      for (let i = 0; i < 4; i++) drawCave(i);
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) drawChip(i, k);
      for (const p of S.parts) { const a = Math.max(0, 1 - p.life / p.max); ctx.globalAlpha = a; if (p.bubble) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1, 0, TAU); ctx.strokeStyle = p.col; ctx.lineWidth = 1.2; ctx.stroke(); } else star(ctx, p.x, p.y, p.r * 1.5, p.col); }
      ctx.globalAlpha = 1;
      drawPicker();
    }
    function step(dt) {
      time += dt;
      for (let i = 0; i < 4; i++) {
        const f = fish[i]; f.x += f.dir * f.sp * dt; if (f.x > 1) { f.x = 1; f.dir = -1; } if (f.x < 0) { f.x = 0; f.dir = 1; }
        S.pop[i] = Math.max(0, S.pop[i] - dt * 3.5);
      }
      for (const p of S.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.bubble) p.vy -= 60 * dt; else p.vy += 120 * dt; }
      S.parts = S.parts.filter(p => p.life < p.max);
    }
    function loop(now) { if (!alive) return; const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; step(dt); draw(); raf = requestAnimationFrame(loop); }

    function pos(e) { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height)}; }
    function hitAt(p) { for (let k = hits.length - 1; k >= 0; k--) { const h = hits[k]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
    function onDown(e) { if (S.auto || S.won) return; const h = hitAt(pos(e)); if (h) { h.fn(); draw(); } else if (S.pick) { S.pick = null; draw(); } }
    function onMove(e) { const h = hitAt(pos(e)), id = h && h.id ? h.id : null; cv.style.cursor = h && h.id ? 'pointer' : 'default'; if (id !== S.hover) { S.hover = id; draw(); } }
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { layout(); draw(); }) : null; if (ro) ro.observe(root);

    layout(); draw();
    raf = requestAnimationFrame(loop);
    return {
      destroy() { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (ro) ro.disconnect(); },
      _fill(g) { KEYS.forEach(k => { S.grid[k] = g[k].slice(); }); draw(); },
      _check: () => check(),
      _pick(i, k) { S.pick = {i, k}; draw(); },
      autoSolve() {
        if (S.won) return; S.auto = true; S.pick = null; clearMarks();
        let t = 0; for (let i = 0; i < 4; i++) for (const k of KEYS) { const v = V.sol[k][i]; later(() => { if (S.grid[k][i] !== v) setVal(i, k, v); draw(); }, t += 70); }
        later(() => { S.auto = false; check(); S.auto = true; }, t + 250);
      },
    };
  }

  const DEF = {
    id: 'unterwasser-fische', world: 'unterwasser', slot: 1,
    title: 'Die vier Höhlenfische',
    intro: 'In jeder Höhle wohnt ein Fisch – mit eigener Farbe, eigenem Futter und eigenem Muster, keins kommt doppelt vor. Finde mit den Hinweisen heraus, wer wo wohnt. „Neben“ heißt: direkt daneben.',
    letter: 'Fang mit dem Hinweis an, der nur eine einzige Höhle erlaubt. Von dort schwimmst du von Hinweis zu Hinweis – und wenn zwei Wege möglich sind, probier einen aus, bis er sich verheddert.',
    hint: 'Setz zuerst den Hinweis mit der festen Höhlennummer ein. Suche dann Hinweise, die zwei Dinge fest verbinden („ist“, „direkt links neben“) – meist gibt es nur zwei Möglichkeiten. Spiel beide im Kopf durch: eine davon widerspricht einem anderen Hinweis.',
    station, mount,
  };
  if (G.PZ) G.PZ.register(DEF);
  else window.addEventListener('DOMContentLoaded', () => { if (G.PZ) G.PZ.register(DEF); });
})();

/* Pookiewookie puzzle: "Die Schatzkarte des Papageis" (Kokosinsel, slot 0).
   A hand-drawn 8x8 island map (north up) with palms on the beach and in the forest, two huts, rocks, a well, a shipwreck and a lagoon.
   The parrot's six instructions lead to exactly one cell; the player taps it (tap = mark, tap again or "Hier graben!" = dig).
   Wrong digs leave a sand hole. The path is checked in code at mount (see walk()). */
(function () {
  const G = window.PW = window.PW || {};
  const TAU = Math.PI * 2, N = 8;
  const TERRAIN = [
    '~~ssss~~',
    '~sggggs~',
    'ssggggss',
    'sggglggs',
    'sggglggs',
    'ssgggggs',
    '~ssgggs~',
    '~~ssss~~',
  ];
  /* landmarks: [col, row, kind] */
  const MARKS = [
    [2, 1, 'hutRed'], [6, 5, 'hutBlue'], [2, 3, 'well'],
    [5, 6, 'rock'], [1, 2, 'rock'], [6, 2, 'rock'],
    [3, 0, 'palm'], [7, 4, 'palm'], [3, 7, 'palm'],
    [2, 5, 'palm'], [6, 3, 'palm'], [4, 6, 'palm'],
    [7, 6, 'wreck'],
  ];
  const TREASURE = [1, 5];
  const STEPS = [
    'Start an der Hütte mit dem <b>roten</b> Dach. Kraah!',
    'Geh so viele Felder nach <b>Osten</b>, wie Palmen am Strand stehen.',
    'Dann nach <b>Süden</b> – so lange, bis ein Felsen direkt vor deiner Nase liegt.',
    'Jetzt <b>halb so weit</b> nach <b>Westen</b>, wie du eben nach Süden gestapft bist.',
    'Dann nach <b>Norden</b>, bis der Brunnen direkt westlich neben dir steht.',
    'Zum Schluss schräg nach <b>Südwesten</b>, bis du zum ersten Mal Sand unter den Pfoten hast. Grab da, Landratte!',
  ];
  const WRONG = [
    'Arrr! Nur Sand und eine verdutzte Krabbe. Zähl nochmal nach!',
    'Kraah! Hier liegt nur eine alte Socke. Falsches Feld!',
    'Nix da, Landratte! Lies jeden Schritt ganz genau.',
    'Blubb … nur Muscheln. Der Schatz liegt woanders!',
  ];
  const terr = (c, r) => (c < 0 || r < 0 || c >= N || r >= N ? '~' : TERRAIN[r][c]);
  const markAt = (c, r) => { const m = MARKS.find(m => m[0] === c && m[1] === r); return m ? m[2] : null; };
  const isLand = (c, r) => terr(c, r) === 's' || terr(c, r) === 'g';

  /* Follow the parrot's instructions with the data above. Returns {cells, end} or throws if a rule cannot be followed. */
  function walk() {
    const cells = [];
    const find = k => MARKS.find(m => m[2] === k);
    let [c, r] = find('hutRed'); cells.push([c, r]);
    const go = (dc, dr) => { c += dc; r += dr; if (!isLand(c, r)) throw new Error('path leaves the land at ' + c + ',' + r); cells.push([c, r]); };
    const beachPalms = MARKS.filter(m => m[2] === 'palm' && terr(m[0], m[1]) === 's').length;
    for (let i = 0; i < beachPalms; i++) go(1, 0);
    let south = 0; while (markAt(c, r + 1) !== 'rock') { go(0, 1); south++; if (south > N) throw new Error('no rock'); }
    if (south % 2) throw new Error('odd south walk');
    for (let i = 0; i < south / 2; i++) go(-1, 0);
    let k = 0; while (markAt(c - 1, r) !== 'well') { go(0, -1); if (++k > N) throw new Error('no well'); }
    k = 0; do { go(-1, 1); if (++k > N) throw new Error('no sand'); } while (terr(c, r) !== 's');
    if (markAt(c, r)) throw new Error('treasure on a landmark');
    return {cells, end: [c, r]};
  }

  const CSS = `
.sk{position:absolute;inset:0;overflow:hidden}
.sk-cv{position:absolute;left:0;top:0;touch-action:none;cursor:pointer}
.sk-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sk-panel{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;border-radius:16px;border:3px solid #3a2030;
  background:linear-gradient(#fbecc8,#f1d9a4);color:#4a2a14;box-shadow:0 5px 0 rgba(42,21,8,.35),inset 0 0 0 3px rgba(255,255,255,.35);overflow:hidden}
.sk-head{display:flex;align-items:center;gap:8px;padding:6px 10px 2px 6px;flex:0 0 auto}
.sk-head canvas{flex:0 0 auto}
.sk-say{font-weight:700;color:#a8321e;line-height:1.15}
.sk-say small{display:block;font-weight:500;color:#7a4a24;font-size:.78em}
.sk-steps{list-style:none;margin:0;padding:0 10px 4px;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:space-evenly}
.sk-step{display:flex;gap:7px;align-items:flex-start;padding:2px 4px;border-radius:9px;cursor:pointer;line-height:1.25;transition:background .15s}
.sk-step:hover{background:rgba(168,50,30,.08)}
.sk-step b{color:#a8321e}
.sk-num{flex:0 0 auto;width:1.45em;height:1.45em;border-radius:50%;border:2px solid #6b3e1f;display:grid;place-items:center;font-weight:700;font-size:.86em;background:#fff4e0;color:#6b3e1f;margin-top:-1px}
.sk-step.ok{color:rgba(74,42,20,.48)}
.sk-step.ok .sk-num{background:#9be7a5;border-color:#2f7a45;color:#2f7a45}
.sk-foot{display:flex;align-items:center;gap:8px;padding:4px 10px 8px;flex:0 0 auto}
.sk-foot span{flex:1 1 auto;font-size:.8em;color:#7a4a24;line-height:1.2}
.sk-btn{font:700 14px/1 "Fredoka",sans-serif;border:3px solid #3a2030;border-radius:999px;padding:8px 14px;min-height:36px;cursor:pointer;
  background:#ffd84a;color:#3a2030;box-shadow:0 4px 0 #3a2030;white-space:nowrap}
.sk-btn:disabled{opacity:.45;cursor:default;box-shadow:0 2px 0 #3a2030;transform:translateY(2px)}
.sk-btn:not(:disabled):active{transform:translateY(3px);box-shadow:0 1px 0 #3a2030}
.sk-btn.sm{background:#fff4e0;font-size:12px;padding:6px 10px;min-height:36px}
.sk.phone .sk-btn{font-size:12px;padding:6px 11px}
.sk.phone .sk-head{padding:3px 8px 0 4px}
.sk.phone .sk-foot{padding:2px 8px 5px}
`;

  /* ---------- drawing helpers ---------- */
  const OUT = '#3a2030', INK = '#6b3e1f';
  function wob(i, j) { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); }
  function drawPalm(c, x, y, s, t) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(60,30,10,.18)'; c.beginPath(); c.ellipse(0, s * 0.36, s * 0.3, s * 0.08, 0, 0, TAU); c.fill();
    c.strokeStyle = OUT; c.lineWidth = s * 0.16; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-s * 0.02, s * 0.36); c.quadraticCurveTo(s * 0.12, s * 0.05, -s * 0.03, -s * 0.22); c.stroke();
    c.strokeStyle = '#c08a4e'; c.lineWidth = s * 0.1; c.stroke();
    const sway = Math.sin((t || 0) * 1.6 + x * 0.05) * 0.06;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.72 + sway, L = s * (0.42 + (i % 2) * 0.06);
      c.save(); c.translate(-s * 0.03, -s * 0.24); c.rotate(a);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -L * 0.34, L, L * 0.14); c.quadraticCurveTo(L * 0.55, L * 0.02, 0, 0);
      c.fillStyle = i % 2 ? '#5fcf62' : '#47b552'; c.fill(); c.strokeStyle = '#1f5a2a'; c.lineWidth = Math.max(0.8, s * 0.03); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(L * 0.15, -L * 0.04); c.quadraticCurveTo(L * 0.5, -L * 0.18, L * 0.85, L * 0.08); c.stroke(); c.restore();
    }
    c.fillStyle = '#7a4a24'; for (const dx of [-0.08, 0.05]) { c.beginPath(); c.arc(dx * s, -s * 0.17, s * 0.07, 0, TAU); c.fill(); }
    c.restore();
  }
  function drawHut(c, x, y, s, roof) {
    c.save(); c.translate(x, y); c.lineJoin = 'round';
    c.fillStyle = 'rgba(60,30,10,.18)'; c.beginPath(); c.ellipse(0, s * 0.34, s * 0.38, s * 0.08, 0, 0, TAU); c.fill();
    c.fillStyle = '#e9c48a'; c.strokeStyle = OUT; c.lineWidth = s * 0.055;
    c.beginPath(); c.rect(-s * 0.28, -s * 0.06, s * 0.56, s * 0.4); c.fill(); c.stroke();
    c.fillStyle = '#7a4a24'; c.beginPath(); c.rect(-s * 0.08, s * 0.1, s * 0.16, s * 0.24); c.fill();
    c.beginPath(); c.moveTo(-s * 0.4, s * 0.0); c.lineTo(0, -s * 0.38); c.lineTo(s * 0.4, s * 0.0); c.closePath();
    c.fillStyle = roof; c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = s * 0.035; c.beginPath(); c.moveTo(-s * 0.22, -s * 0.06); c.lineTo(0, -s * 0.27); c.stroke();
    c.restore();
  }
  function drawRock(c, x, y, s) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(60,30,10,.2)'; c.beginPath(); c.ellipse(0, s * 0.27, s * 0.36, s * 0.08, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-s * 0.34, s * 0.26); c.quadraticCurveTo(-s * 0.36, -s * 0.06, -s * 0.12, -s * 0.2); c.quadraticCurveTo(s * 0.08, -s * 0.34, s * 0.24, -s * 0.12);
    c.quadraticCurveTo(s * 0.4, s * 0.06, s * 0.34, s * 0.26); c.closePath();
    c.fillStyle = '#a9a4b8'; c.fill(); c.strokeStyle = OUT; c.lineWidth = s * 0.055; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-s * 0.1, -s * 0.1, s * 0.09, s * 0.05, -0.5, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(58,32,48,.4)'; c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(s * 0.05, -s * 0.05); c.lineTo(s * 0.13, s * 0.12); c.stroke();
    c.restore();
  }
  function drawWell(c, x, y, s) {
    c.save(); c.translate(x, y); c.strokeStyle = OUT; c.lineWidth = s * 0.05;
    c.fillStyle = 'rgba(60,30,10,.18)'; c.beginPath(); c.ellipse(0, s * 0.34, s * 0.34, s * 0.08, 0, 0, TAU); c.fill();
    c.fillStyle = '#7a4a24'; c.fillRect(-s * 0.27, -s * 0.34, s * 0.06, s * 0.5); c.fillRect(s * 0.21, -s * 0.34, s * 0.06, s * 0.5);
    c.beginPath(); c.moveTo(-s * 0.36, -s * 0.28); c.lineTo(0, -s * 0.44); c.lineTo(s * 0.36, -s * 0.28); c.closePath(); c.fillStyle = '#c8553d'; c.fill(); c.stroke();
    c.fillStyle = '#b8b4c4'; c.beginPath(); c.rect(-s * 0.3, s * 0.02, s * 0.6, s * 0.3); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, s * 0.02, s * 0.3, s * 0.1, 0, 0, TAU); c.fillStyle = '#d4d0de'; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, s * 0.02, s * 0.2, s * 0.055, 0, 0, TAU); c.fillStyle = '#3a6fa8'; c.fill();
    c.strokeStyle = 'rgba(58,32,48,.35)'; c.lineWidth = s * 0.025; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * s * 0.15, s * 0.1); c.lineTo(i * s * 0.15, s * 0.3); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = s * 0.025; c.beginPath(); c.moveTo(0, -s * 0.3); c.lineTo(0, -s * 0.1); c.stroke();
    c.fillStyle = '#b07a3e'; c.fillRect(-s * 0.06, -s * 0.12, s * 0.12, s * 0.1);
    c.restore();
  }
  function drawWreck(c, x, y, s, t) {
    c.save(); c.translate(x, y + Math.sin((t || 0) * 1.4) * s * 0.02); c.rotate(-0.22); c.strokeStyle = OUT; c.lineWidth = s * 0.05; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-s * 0.4, -s * 0.02); c.lineTo(s * 0.3, -s * 0.06); c.lineTo(s * 0.18, s * 0.1); c.lineTo(s * 0.05, s * 0.04); c.lineTo(-s * 0.06, s * 0.14); c.lineTo(-s * 0.3, s * 0.14); c.closePath();
    c.fillStyle = '#8a5a2b'; c.fill(); c.stroke();
    c.strokeStyle = 'rgba(58,32,48,.4)'; c.lineWidth = s * 0.025; c.beginPath(); c.moveTo(-s * 0.34, s * 0.05); c.lineTo(s * 0.2, s * 0.02); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(-s * 0.06, -s * 0.03); c.lineTo(-s * 0.02, -s * 0.42); c.stroke();
    c.beginPath(); c.moveTo(-s * 0.02, -s * 0.4); c.lineTo(s * 0.22, -s * 0.3); c.lineTo(s * 0.1, -s * 0.24); c.lineTo(s * 0.17, -s * 0.15); c.lineTo(-s * 0.03, -s * 0.12); c.closePath();
    c.fillStyle = '#f4ead2'; c.fill(); c.lineWidth = s * 0.035; c.stroke();
    c.fillStyle = '#2a1508'; c.beginPath(); c.arc(s * 0.07, -s * 0.28, s * 0.03, 0, TAU); c.fill();
    c.restore();
  }
  function drawCompass(c, x, y, R, t) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(255,244,224,.85)'; c.strokeStyle = INK; c.lineWidth = Math.max(1, R * 0.06);
    c.beginPath(); c.arc(0, 0, R * 0.62, 0, TAU); c.fill(); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2, L = i % 2 ? R * 0.5 : R * 0.95, w = i % 2 ? R * 0.1 : R * 0.16;
      c.beginPath(); c.moveTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w); c.lineTo(0, 0); c.closePath();
      c.fillStyle = i === 0 ? '#c8402c' : '#6b3e1f'; c.fill();
      c.beginPath(); c.moveTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w); c.lineTo(0, 0); c.closePath();
      c.fillStyle = i === 0 ? '#ff7a5c' : '#e7c48e'; c.fill();
    }
    c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(0, 0, R * 0.09, 0, TAU); c.fill();
    c.font = 'bold ' + Math.round(R * 0.42) + 'px "Fredoka", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = R * 0.12; c.strokeStyle = '#fff4e0'; c.fillStyle = '#c8402c';
    c.strokeText('N', 0, -R * 1.18); c.fillText('N', 0, -R * 1.18);
    c.fillStyle = '#6b3e1f'; c.font = 'bold ' + Math.round(R * 0.3) + 'px "Fredoka", sans-serif';
    for (const [l, a] of [['O', 0], ['S', Math.PI / 2], ['W', Math.PI]]) { const px = Math.cos(a) * R * 1.18, py = Math.sin(a) * R * 1.18; c.strokeText(l, px, py); c.fillText(l, px, py); }
    c.restore();
  }
  function drawParrot(c, x, y, s, t, look) {
    /* feet at (x, y), about 1.6*s tall */
    c.save(); c.translate(x, y); const bob = Math.sin((t || 0) * 3) * s * 0.03; c.translate(0, bob);
    c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = s * 0.07;
    /* tail */
    c.beginPath(); c.moveTo(-s * 0.1, -s * 0.35); c.lineTo(-s * 0.42, s * 0.25); c.lineTo(-s * 0.18, s * 0.12); c.lineTo(-s * 0.1, s * 0.3); c.lineTo(s * 0.02, -s * 0.2); c.closePath();
    c.fillStyle = '#3a8ff0'; c.fill(); c.stroke();
    /* body */
    c.beginPath(); c.ellipse(0, -s * 0.55, s * 0.32, s * 0.48, 0.18, 0, TAU); c.fillStyle = '#e8402f'; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(s * 0.1, -s * 0.42, s * 0.16, s * 0.28, 0.2, 0, TAU); c.fillStyle = '#ff8a5c'; c.fill();
    /* wing */
    const flap = Math.sin((t || 0) * 9) * 0.12;
    c.save(); c.translate(-s * 0.1, -s * 0.66); c.rotate(0.35 + flap);
    c.beginPath(); c.ellipse(0, s * 0.2, s * 0.15, s * 0.32, 0, 0, TAU); c.fillStyle = '#3eaa4f'; c.fill(); c.stroke();
    c.fillStyle = '#ffd84a'; c.beginPath(); c.ellipse(0, s * 0.42, s * 0.09, s * 0.1, 0, 0, TAU); c.fill(); c.restore();
    /* head */
    c.beginPath(); c.arc(s * 0.08, -s * 1.0, s * 0.27, 0, TAU); c.fillStyle = '#e8402f'; c.fill(); c.stroke();
    /* beak */
    c.beginPath(); c.moveTo(s * 0.28, -s * 1.08); c.quadraticCurveTo(s * 0.58, -s * 1.1, s * 0.48, -s * 0.84); c.quadraticCurveTo(s * 0.4, -s * 0.94, s * 0.3, -s * 0.9); c.closePath();
    c.fillStyle = '#ffd84a'; c.fill(); c.stroke();
    /* eye patch + eye */
    c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 0.15, -s * 1.06, s * 0.1, 0, TAU); c.fill(); c.lineWidth = s * 0.04; c.stroke();
    c.fillStyle = '#2a1508'; c.beginPath(); c.arc(s * 0.17 + (look || 0) * s * 0.02, -s * 1.06, s * 0.05, 0, TAU); c.fill();
    /* pirate hat */
    c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(-s * 0.26, -s * 1.17); c.quadraticCurveTo(s * 0.08, -s * 1.62, s * 0.42, -s * 1.17); c.quadraticCurveTo(s * 0.08, -s * 1.28, -s * 0.26, -s * 1.17);
    c.fillStyle = '#2a1e2e'; c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 0.08, -s * 1.33, s * 0.05, 0, TAU); c.fill();
    /* feet */
    c.strokeStyle = '#e09a3a'; c.lineWidth = s * 0.06; c.lineCap = 'round'; for (const dx of [-0.05, 0.12]) { c.beginPath(); c.moveTo(dx * s, -s * 0.1); c.lineTo(dx * s, 0); c.stroke(); }
    c.restore();
  }

  G.PZ && G.PZ.register({
    id: 'insel-schatzkarte', world: 'insel', slot: 0,
    title: 'Die Schatzkarte des Papageis',
    intro: 'Folge Käpt\'n Kraks Weg Feld für Feld (Norden ist oben). Tippe das Schatzfeld an und nochmal zum Graben – falsche Löcher bleiben!',
    letter: 'Glaub dem Papagei jedes Wort, er lügt nie. Aber pass gut auf: Er zählt nur, was am Strand steht.',
    hint: 'Zähl nur die Palmen auf dem gelben Sand, nicht die im grünen Wald. „Vor deiner Nase“ heißt: Der Felsen ist das nächste Feld, du bleibst davor stehen. Schräg nach Südwesten heißt: pro Schritt ein Feld nach Westen und eins nach Süden.',

    station(ctx, x, y, t, solved) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y, 15, 3, 0, 0, TAU); ctx.fill();
      /* rolled map leaning on the post */
      ctx.save(); ctx.translate(x + 7, y - 7); ctx.rotate(0.45);
      ctx.fillStyle = '#f1d9a4'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.fillRect(-3, -9, 6, 17); ctx.strokeRect(-3, -9, 6, 17);
      ctx.fillStyle = '#c8402c'; ctx.fillRect(-3, -1.5, 6, 2.4);
      ctx.beginPath(); ctx.ellipse(0, -9, 3, 1.2, 0, 0, TAU); ctx.fillStyle = '#e2c084'; ctx.fill(); ctx.stroke();
      ctx.restore();
      /* post */
      ctx.fillStyle = '#9a6a38'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.fillRect(x - 3, y - 28, 6, 28); ctx.strokeRect(x - 3, y - 28, 6, 28);
      ctx.fillStyle = '#7a4a24'; ctx.fillRect(x - 9, y - 30, 18, 3.4); ctx.strokeRect(x - 9, y - 30, 18, 3.4);
      ctx.strokeStyle = 'rgba(58,32,48,.35)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - 1, y - 24); ctx.lineTo(x - 1, y - 14); ctx.moveTo(x + 1.5, y - 10); ctx.lineTo(x + 1.5, y - 3); ctx.stroke();
      /* parrot */
      drawParrot(ctx, x, y - 30, 9, t, Math.sin(t));
      if (solved) {
        ctx.fillStyle = '#ffd84a'; for (let i = 0; i < 4; i++) { const a = t * 2 + i * TAU / 4; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + i); ctx.fillRect(x + Math.cos(a) * 13 - 1, y - 40 + Math.sin(a) * 5 - 1, 2.2, 2.2); }
        ctx.globalAlpha = 1;
      } else {
        const bob = Math.sin(t * 3) * 1.5;
        ctx.font = 'bold 10px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = OUT;
        ctx.strokeText('X', x - 11, y - 46 + bob); ctx.fillStyle = '#ff6f5c'; ctx.fillText('X', x - 11, y - 46 + bob);
      }
      ctx.restore();
    },

    mount(root, api) {
      let route;
      try { route = walk(); } catch (e) { console.error('PZ_ERROR insel-schatzkarte: ' + e.message); route = {cells: [TREASURE], end: TREASURE}; }
      if (route.end[0] !== TREASURE[0] || route.end[1] !== TREASURE[1]) console.error('PZ_ERROR insel-schatzkarte: instructions end at ' + route.end + ' not at the treasure');

      const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
      const wrap = document.createElement('div'); wrap.className = 'sk'; root.appendChild(wrap);
      const bg = document.createElement('canvas'); bg.className = 'sk-bg'; wrap.appendChild(bg);
      const cv = document.createElement('canvas'); cv.className = 'sk-cv'; wrap.appendChild(cv);
      const panel = document.createElement('div'); panel.className = 'sk-panel'; wrap.appendChild(panel);
      const head = document.createElement('div'); head.className = 'sk-head'; panel.appendChild(head);
      const pc = document.createElement('canvas'); head.appendChild(pc);
      const say = document.createElement('div'); say.className = 'sk-say'; say.innerHTML = 'Kraah! Käpt\'n Kraks Schatzweg:<small>Tipp auf einen Schritt, um ihn abzuhaken.</small>'; head.appendChild(say);
      const ul = document.createElement('ol'); ul.className = 'sk-steps'; panel.appendChild(ul);
      const stepEls = STEPS.map((html, i) => {
        const li = document.createElement('li'); li.className = 'sk-step'; li.innerHTML = '<span class="sk-num">' + (i + 1) + '</span><span>' + html + '</span>';
        li.addEventListener('click', () => { li.classList.toggle('ok'); const n = li.querySelector('.sk-num'); n.textContent = li.classList.contains('ok') ? '✓' : String(i + 1); try { api.sfx('select'); } catch (e) {} });
        ul.appendChild(li); return li;
      });
      const foot = document.createElement('div'); foot.className = 'sk-foot'; panel.appendChild(foot);
      const info = document.createElement('span'); info.textContent = 'Tippe ein Feld an, um es zu markieren.'; foot.appendChild(info);
      const bReset = document.createElement('button'); bReset.className = 'sk-btn sm'; bReset.type = 'button'; bReset.textContent = 'Haken weg'; foot.appendChild(bReset);
      const bDig = document.createElement('button'); bDig.className = 'sk-btn'; bDig.type = 'button'; bDig.textContent = '⛏ Hier graben!'; bDig.disabled = true; foot.appendChild(bDig);
      bReset.addEventListener('click', () => { stepEls.forEach((li, i) => { li.classList.remove('ok'); li.querySelector('.sk-num').textContent = String(i + 1); }); try { api.sfx('select'); } catch (e) {} });

      /* --- state --- */
      let W = 0, H = 0, dpr = 1, cell = 30, ox = 0, oy = 0, M = 240, phone = false;
      let sel = null, hover = null, holes = [], found = false, done = false, solving = false, digging = null, trail = null, parts = [], raf = 0, timers = [], t0 = performance.now();
      const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
      const now = () => (performance.now() - t0) / 1000;

      function layout() {
        W = wrap.clientWidth; H = wrap.clientHeight; if (!W || !H) return;
        dpr = Math.min(2, window.devicePixelRatio || 1); phone = H < 320; wrap.classList.toggle('phone', phone);
        const pad = phone ? 6 : 10;
        M = Math.floor(Math.min(H - pad * 2, W * 0.5));
        cell = M / (N + 0.9); ox = pad + cell * 0.45; oy = pad + cell * 0.45;
        cv.style.left = '0px'; cv.style.top = '0px'; cv.style.width = (M + pad * 2) + 'px'; cv.style.height = (M + pad * 2) + 'px';
        cv.width = Math.round((M + pad * 2) * dpr); cv.height = Math.round((M + pad * 2) * dpr);
        bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
        const px = M + pad * 2 + (phone ? 4 : 10);
        panel.style.left = px + 'px'; panel.style.top = pad + 'px'; panel.style.width = (W - px - pad) + 'px'; panel.style.height = (H - pad * 2) + 'px';
        const ps = phone ? 38 : 56; pc.width = Math.round(ps * dpr); pc.height = Math.round(ps * dpr); pc.style.width = ps + 'px'; pc.style.height = ps + 'px';
        let fs = phone ? 13 : 16; panel.style.fontSize = fs + 'px';
        for (let k = 0; k < 30 && ul.scrollHeight > ul.clientHeight + 1 && fs > 9; k++) { fs -= 0.5; panel.style.fontSize = fs + 'px'; }
        drawBg(); draw();
      }
      function drawBg() {
        const c = bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(90,190,230,.35)'); g.addColorStop(1, 'rgba(40,120,170,.35)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
        for (let y = 14; y < H; y += 22) for (let x = (y / 22 % 2) * 30; x < W; x += 60) { c.beginPath(); c.arc(x, y, 8, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      }
      function cellAt(e) {
        const r = cv.getBoundingClientRect(); const x = e.clientX - r.left - ox, y = e.clientY - r.top - oy;
        const c = Math.floor(x / cell), rr = Math.floor(y / cell); if (c < 0 || rr < 0 || c >= N || rr >= N) return null; return [c, rr];
      }
      const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
      const isHole = p => holes.some(h => same(h, p));

      function draw() {
        const c = cv.getContext('2d'); const t = now();
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
        const L = ox - cell * 0.45, T = oy - cell * 0.45, S = cell * (N + 0.9);
        /* parchment with ragged edge */
        c.save(); c.beginPath();
        const segs = 36; for (let i = 0; i <= segs * 4; i++) {
          const side = Math.floor(i / segs) % 4, f = (i % segs) / segs, j = (wob(i, 3) - 0.5) * cell * 0.12;
          let x, y; if (side === 0) { x = L + f * S; y = T + j; } else if (side === 1) { x = L + S + j; y = T + f * S; } else if (side === 2) { x = L + S - f * S; y = T + S + j; } else { x = L + j; y = T + S - f * S; }
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath(); c.shadowColor = 'rgba(42,21,8,.4)'; c.shadowOffsetY = 5; c.fillStyle = '#f3dfb0'; c.fill(); c.shadowColor = 'transparent';
        c.lineWidth = 3; c.strokeStyle = '#8a5a2b'; c.stroke(); c.clip();
        const rg = c.createRadialGradient(L + S / 2, T + S / 2, S * 0.2, L + S / 2, T + S / 2, S * 0.75); rg.addColorStop(0, 'rgba(255,250,230,.0)'); rg.addColorStop(1, 'rgba(140,90,40,.35)');
        c.fillStyle = rg; c.fillRect(L, T, S, S);
        /* terrain */
        for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
          const k = terr(q, r), x = ox + q * cell, y = oy + r * cell;
          c.fillStyle = k === '~' ? 'rgba(110,190,235,.55)' : k === 's' ? '#ffe2a0' : '#9ad98f';
          c.fillRect(x - 0.5, y - 0.5, cell + 1, cell + 1);
          if (k === '~') { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(1, cell * 0.04); const ph = t * 1.2 + q + r; for (let w = 0; w < 2; w++) { const wy = y + cell * (0.32 + w * 0.36), wx = x + cell * (0.2 + w * 0.3) + Math.sin(ph + w) * cell * 0.05; c.beginPath(); c.arc(wx, wy, cell * 0.12, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
          if (k === 's') { c.fillStyle = 'rgba(200,150,70,.35)'; for (let d = 0; d < 4; d++) { c.beginPath(); c.arc(x + cell * (0.15 + wob(q * 7 + d, r) * 0.7), y + cell * (0.15 + wob(r * 5 + d, q) * 0.7), Math.max(0.8, cell * 0.025), 0, TAU); c.fill(); } }
          if (k === 'g') { c.strokeStyle = 'rgba(40,120,60,.45)'; c.lineWidth = Math.max(1, cell * 0.035); for (let d = 0; d < 2; d++) { const gx = x + cell * (0.2 + wob(q + d * 3, r * 2) * 0.6), gy = y + cell * (0.25 + wob(r + d * 5, q * 3) * 0.6); c.beginPath(); c.moveTo(gx - cell * 0.05, gy - cell * 0.07); c.lineTo(gx, gy); c.lineTo(gx + cell * 0.05, gy - cell * 0.08); c.stroke(); } }
          if (k === 'l' && false) { c.fillStyle = 'rgba(255,255,255,.7)'; const sp = (Math.sin(t * 3 + q * 2 + r) + 1) / 2; c.globalAlpha = sp; c.fillRect(x + cell * 0.3, y + cell * 0.3, cell * 0.06, cell * 0.06); c.globalAlpha = 1 - sp; c.fillRect(x + cell * 0.65, y + cell * 0.6, cell * 0.05, cell * 0.05); c.globalAlpha = 1; }
        }
        /* coast lines and sand/grass borders, slightly wobbly */
        const edge = (x1, y1, x2, y2, col, w, seed) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); const mx = (x1 + x2) / 2 + (wob(seed, 1) - 0.5) * cell * 0.08, my = (y1 + y2) / 2 + (wob(seed, 2) - 0.5) * cell * 0.08; c.quadraticCurveTo(mx, my, x2, y2); c.stroke(); };
        for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
          const k = terr(q, r); if (k === '~') continue;
          const x = ox + q * cell, y = oy + r * cell;
          const nb = [[0, -1, x, y, x + cell, y], [1, 0, x + cell, y, x + cell, y + cell], [0, 1, x, y + cell, x + cell, y + cell], [-1, 0, x, y, x, y + cell]];
          nb.forEach(([dq, dr, a, b, cc, d], i) => {
            const k2 = terr(q + dq, r + dr), seed = q * 31 + r * 17 + i;
            if (k2 === '~') edge(a, b, cc, d, INK, Math.max(1.5, cell * 0.07), seed);
            else if (k === 'g' && k2 === 's') edge(a, b, cc, d, 'rgba(60,130,60,.7)', Math.max(1, cell * 0.04), seed);
          });
        }
        /* the lagoon: one rounded pool over its cells */
        { const ls = []; for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) if (terr(q, r) === 'l') ls.push([q, r]);
          if (ls.length) { const q0 = Math.min(...ls.map(p => p[0])), q1 = Math.max(...ls.map(p => p[0])) + 1, r0 = Math.min(...ls.map(p => p[1])), r1 = Math.max(...ls.map(p => p[1])) + 1;
            const x = ox + q0 * cell + cell * 0.08, y = oy + r0 * cell + cell * 0.08, w = (q1 - q0) * cell - cell * 0.16, h = (r1 - r0) * cell - cell * 0.16, rad = Math.min(w, h) * 0.45;
            c.beginPath(); c.moveTo(x + rad, y); c.arcTo(x + w, y, x + w, y + h, rad); c.arcTo(x + w, y + h, x, y + h, rad); c.arcTo(x, y + h, x, y, rad); c.arcTo(x, y, x + w, y, rad); c.closePath();
            const lg = c.createLinearGradient(x, y, x + w, y + h); lg.addColorStop(0, '#7fe3dc'); lg.addColorStop(1, '#2fb4c4'); c.fillStyle = lg; c.fill(); c.strokeStyle = '#1f7f8f'; c.lineWidth = Math.max(1.5, cell * 0.06); c.stroke();
            c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1, cell * 0.035); for (let i = 0; i < 3; i++) { const yy = y + h * (0.25 + i * 0.25), xx = x + w * 0.5 + Math.sin(t * 1.5 + i) * w * 0.12; c.beginPath(); c.arc(xx, yy, w * 0.18, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
          } }
        /* dotted grid so the fields can be counted */
        c.strokeStyle = 'rgba(107,62,31,.28)'; c.lineWidth = 1; c.setLineDash([2, 3]);
        for (let i = 1; i < N; i++) { c.beginPath(); c.moveTo(ox + i * cell, oy); c.lineTo(ox + i * cell, oy + N * cell); c.stroke(); c.beginPath(); c.moveTo(ox, oy + i * cell); c.lineTo(ox + N * cell, oy + i * cell); c.stroke(); }
        c.setLineDash([]);
        /* holes */
        for (const h of holes) { const x = ox + (h[0] + 0.5) * cell, y = oy + (h[1] + 0.55) * cell; c.fillStyle = '#e0b866'; c.beginPath(); c.ellipse(x, y, cell * 0.36, cell * 0.22, 0, 0, TAU); c.fill(); c.fillStyle = '#5a3a1a'; c.beginPath(); c.ellipse(x, y + cell * 0.02, cell * 0.24, cell * 0.13, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(58,32,48,.5)'; c.lineWidth = 1; c.stroke(); }
        /* landmarks */
        for (const [q, r, k] of MARKS) {
          const x = ox + (q + 0.5) * cell, y = oy + (r + 0.5) * cell;
          if (k === 'palm') drawPalm(c, x, y, cell * 0.95, t);
          else if (k === 'hutRed') drawHut(c, x, y, cell * 0.95, '#e0453a');
          else if (k === 'hutBlue') drawHut(c, x, y, cell * 0.95, '#3a7be0');
          else if (k === 'rock') drawRock(c, x, y + cell * 0.04, cell * 0.95);
          else if (k === 'well') drawWell(c, x, y, cell * 0.95);
          else if (k === 'wreck') drawWreck(c, x, y + cell * 0.05, cell * 1.05, t);
        }
        drawCompass(c, ox + 7.05 * cell, oy + 0.62 * cell, cell * 0.62, t);
        /* sea creature for charm */
        const fx = ox + 0.45 * cell, fy = oy + 0.5 * cell + Math.sin(t * 2) * cell * 0.05; c.fillStyle = '#ff9eb0'; c.strokeStyle = OUT; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(fx, fy, cell * 0.2, cell * 0.12, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.moveTo(fx + cell * 0.18, fy); c.lineTo(fx + cell * 0.32, fy - cell * 0.1); c.lineTo(fx + cell * 0.32, fy + cell * 0.1); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = OUT; c.beginPath(); c.arc(fx - cell * 0.08, fy - cell * 0.02, cell * 0.025 + 0.5, 0, TAU); c.fill();
        /* autoSolve trail */
        if (trail && trail.n > 0) {
          c.strokeStyle = '#c8402c'; c.lineWidth = Math.max(2, cell * 0.08); c.setLineDash([cell * 0.12, cell * 0.12]); c.lineCap = 'round'; c.beginPath();
          for (let i = 0; i < Math.min(trail.n, route.cells.length); i++) { const p = route.cells[i], x = ox + (p[0] + 0.5) * cell, y = oy + (p[1] + 0.5) * cell; i ? c.lineTo(x, y) : c.moveTo(x, y); }
          c.stroke(); c.setLineDash([]);
        }
        /* hover + selection */
        if (hover && !same(hover, sel) && !found && isLand(hover[0], hover[1])) { c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.strokeRect(ox + hover[0] * cell + 2, oy + hover[1] * cell + 2, cell - 4, cell - 4); }
        if (sel && !found) {
          const x = ox + (sel[0] + 0.5) * cell, y = oy + (sel[1] + 0.5) * cell, k = 1 + Math.sin(t * 6) * 0.08, s = cell * 0.3 * k;
          c.fillStyle = 'rgba(255,216,74,.35)'; c.fillRect(ox + sel[0] * cell, oy + sel[1] * cell, cell, cell);
          c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = Math.max(4, cell * 0.17); c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke();
          c.strokeStyle = '#e8402f'; c.lineWidth = Math.max(2.5, cell * 0.1); c.stroke();
        }
        /* dig animation */
        if (digging) {
          const p = digging.p, x = ox + (p[0] + 0.5) * cell, y = oy + (p[1] + 0.5) * cell, k = Math.min(1, (performance.now() - digging.t) / 450);
          c.save(); c.translate(x + cell * 0.25, y - cell * 0.35); c.rotate(-0.6 + Math.sin(k * Math.PI * 3) * 0.5);
          c.fillStyle = '#b07a3e'; c.strokeStyle = OUT; c.lineWidth = 1.5; c.fillRect(-cell * 0.04, -cell * 0.5, cell * 0.08, cell * 0.5); c.strokeRect(-cell * 0.04, -cell * 0.5, cell * 0.08, cell * 0.5);
          c.beginPath(); c.moveTo(-cell * 0.14, 0); c.lineTo(cell * 0.14, 0); c.lineTo(cell * 0.1, cell * 0.2); c.lineTo(0, cell * 0.26); c.lineTo(-cell * 0.1, cell * 0.2); c.closePath(); c.fillStyle = '#c8ccd8'; c.fill(); c.stroke();
          c.restore();
        }
        /* treasure chest */
        if (found) {
          const p = TREASURE, x = ox + (p[0] + 0.5) * cell, y = oy + (p[1] + 0.5) * cell, k = Math.min(1, (performance.now() - found) / 500), rise = (1 - Math.pow(1 - k, 3)) * cell * 0.25;
          c.save(); c.translate(x, y - rise);
          const glow = c.createRadialGradient(0, 0, 0, 0, 0, cell * 1.2); glow.addColorStop(0, 'rgba(255,240,150,.85)'); glow.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = glow; c.beginPath(); c.arc(0, 0, cell * 1.2, 0, TAU); c.fill();
          const s = cell * 0.9; c.lineWidth = Math.max(1.5, s * 0.06); c.strokeStyle = OUT;
          c.fillStyle = '#a8642e'; c.beginPath(); c.rect(-s * 0.4, -s * 0.05, s * 0.8, s * 0.38); c.fill(); c.stroke();
          c.save(); c.translate(0, -s * 0.05); c.rotate(-0.5 * k); c.beginPath(); c.moveTo(-s * 0.4, 0); c.lineTo(-s * 0.4, -s * 0.18); c.quadraticCurveTo(0, -s * 0.42, s * 0.4, -s * 0.18); c.lineTo(s * 0.4, 0); c.closePath(); c.fillStyle = '#c47a3a'; c.fill(); c.stroke(); c.restore();
          c.fillStyle = '#ffd84a'; c.beginPath(); c.ellipse(0, -s * 0.07, s * 0.34, s * 0.1, 0, 0, TAU); c.fill();
          c.fillRect(-s * 0.07, s * 0.04, s * 0.14, s * 0.14); c.strokeRect(-s * 0.07, s * 0.04, s * 0.14, s * 0.14);
          c.restore();
        }
        /* particles */
        for (const p of parts) { c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5)); c.fillStyle = p.c; if (p.coin) { c.beginPath(); c.ellipse(p.x, p.y, p.s, p.s * Math.abs(Math.cos(p.rot)), 0, 0, TAU); c.fill(); c.strokeStyle = '#b07a00'; c.lineWidth = 1; c.stroke(); } else { c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.fill(); } }
        c.globalAlpha = 1;
        c.restore();
        drawPanelParrot(t);
      }
      function drawPanelParrot(t) {
        const c = pc.getContext('2d'), s = pc.width / dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, s, s);
        drawParrot(c, s * 0.4, s * 0.99, s * 0.5, t, 1);
      }
      function puff(p, n, cols, coin) {
        const x = ox + (p[0] + 0.5) * cell, y = oy + (p[1] + 0.5) * cell;
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = (1 + Math.random() * 2.5) * (coin ? 1.6 : 1); parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: 0.015 + Math.random() * 0.02, s: coin ? cell * 0.09 : 1.5 + Math.random() * cell * 0.06, c: cols[i % cols.length], coin, rot: Math.random() * TAU}); }
      }
      function loop() {
        raf = 0; const any = parts.length || digging || (found && performance.now() - found < 700) || (trail && trail.n < route.cells.length);
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= p.dec; p.rot += 0.2; }
        parts = parts.filter(p => p.life > 0);
        draw(); if (!done || any) raf = requestAnimationFrame(loop);
      }
      function kick() { if (!raf) raf = requestAnimationFrame(loop); }

      function setSel(p) {
        sel = p; bDig.disabled = !p || found;
        info.textContent = p ? 'Feld markiert. Nochmal tippen oder graben!' : 'Tippe ein Feld an, um es zu markieren.';
        draw();
      }
      function dig() {
        if (done || !sel || digging) return;
        const p = sel; digging = {p, t: performance.now()}; bDig.disabled = true; try { api.sfx('pound'); } catch (e) {}
        try { G.audio.noise(0.25, {type: 'lowpass', freq: 900, freqTo: 300, gain: 0.12}); } catch (e) {}
        puff(p, 14, ['#e8c27a', '#f3dfb0', '#c89a52']); kick();
        later(() => {
          digging = null;
          if (same(p, TREASURE)) { win(); return; }
          holes.push(p); setSel(null); puff(p, 8, ['#e8c27a', '#a8743a']);
          api.wrong(WRONG[(holes.length - 1) % WRONG.length]); draw();
        }, 480);
      }
      function win() {
        if (done) return; done = true; found = performance.now(); sel = null; bDig.disabled = true;
        info.textContent = 'Arrr, der Schatz! Goldtaler überall!';
        try { api.sfx('star'); G.audio.bell(1047, 0.4, 0.1, 0.1); G.audio.bell(1319, 0.5, 0.1, 0.25); } catch (e) {}
        puff(TREASURE, 26, ['#ffd84a', '#ffe98a', '#ffc21a'], true); puff(TREASURE, 16, ['#fff', '#ffd84a']); kick();
        api.msg('Kraah! Der Schatz ist gefunden!', 'good');
        later(() => api.solved(), 900);
      }
      function onDown(e) {
        if (done || digging || solving) return; e.preventDefault(); const p = cellAt(e); if (!p) return;
        const k = terr(p[0], p[1]);
        if (k === '~' || k === 'l') { api.msg(k === 'l' ? 'In der Lagune gräbt kein Pirat – blubb!' : 'Im Meer gräbt kein Pirat, Landratte!', 'info'); try { api.sfx('splash'); } catch (er) {} return; }
        if (isHole(p)) { api.msg('Da hast du schon gegraben – leer!', 'info'); try { api.sfx('bump'); } catch (er) {} return; }
        if (same(p, sel)) { dig(); return; }
        try { api.sfx('tick'); } catch (er) {} setSel(p);
      }
      function onMove(e) { if (api.isTouch) return; const p = cellAt(e); if (!same(p, hover)) { hover = p; draw(); } }
      function onLeave() { hover = null; draw(); }
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerleave', onLeave);
      bDig.addEventListener('click', dig);

      layout(); kick();
      let ro = null; try { ro = new ResizeObserver(() => layout()); ro.observe(root); } catch (e) { window.addEventListener('resize', layout); }

      return {
        destroy() { done = true; timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); else window.removeEventListener('resize', layout); },
        autoSolve() {
          if (done || solving) return; solving = true; trail = {n: 0}; setSel(null);
          route.cells.forEach((_, i) => later(() => { trail.n = i + 1; try { G.audio.tone(500 + i * 40, 0.06, {type: 'triangle', gain: 0.05}); } catch (e) {} draw(); }, 90 * i));
          const fin = () => { if (done) return; if (digging) { later(fin, 120); return; } sel = TREASURE; dig(); }; later(fin, 90 * route.cells.length + 150);
        },
      };
    },
  });
})();

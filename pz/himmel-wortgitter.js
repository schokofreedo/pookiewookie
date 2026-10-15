/* The Starway Home puzzle: "Das Wolken-Wortgitter" (Wolkenschloss, slot 0).
   11x11 letters on little clouds. Ten weather words hide in all 8 directions as decoys; the answer of the cloud king's riddle
   (WETTERHAHN) hides backwards on a diagonal. Drag from the first to the last letter (or tap first, then last).
   English: own riddle, words and letter pool, 12x12 so the 11-letter WEATHERVANE has as many diagonal spots as WETTERHAHN.
   The grid is generated at mount and validated: every hidden word appears exactly once, no rude words by accident. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, N = tr(11, 12);
  const ANSWER = tr('WETTERHAHN', 'WEATHERVANE');
  const DECOYS = tr(['DONNER', 'BLITZ', 'NEBEL', 'HAGEL', 'STURM', 'WOLKE', 'SONNE', 'FROST', 'FÖHN', 'WIND'], ['THUNDER', 'BREEZE', 'STORM', 'CLOUD', 'FROST', 'SLEET', 'RAIN', 'SNOW', 'HAIL', 'MIST']);
  /* parts of the answer and other weather words that may turn up by chance: they get a friendly reply, never a "no word here" */
  const PARTS = tr(['WETTER', 'HAHN'], ['WEATHER', 'VANE']);
  const UNIQUE = [ANSWER].concat(PARTS, DECOYS);
  const EXTRA = tr(['EIS', 'TAU', 'REIF', 'LUFT', 'BÖE', 'ORKAN', 'DUNST', 'HITZE', 'KÄLTE', 'SCHNEE', 'GRAUPEL', 'TAIFUN', 'GEWITTER', 'WOLKEN', 'HIMMEL', 'NASS', 'KALT', 'WARM', 'MOND', 'STERN'],
    ['ICE', 'DEW', 'WIND', 'GUST', 'GALE', 'HAZE', 'HEAT', 'COLD', 'WARM', 'WET', 'DRY', 'SUN', 'SKY', 'MOON', 'STAR', 'SUNNY', 'RAINY', 'WINDY', 'SNOWY', 'STORMY', 'CLOUDS', 'SHOWER', 'DRIZZLE', 'RAINBOW', 'TORNADO']);
  const BAD = tr(['NEGER', 'NAZI', 'FICK', 'HURE', 'ARSCH', 'SCHEIS', 'KACKE', 'FOTZE', 'PIMMEL', 'NUTTE', 'SEX', 'MORD', 'HITLER'],
    ['FUCK', 'SHIT', 'CUNT', 'DICK', 'COCK', 'PISS', 'ASS', 'SEX', 'TIT', 'FAG', 'NAZI', 'KILL', 'BITCH', 'SLUT', 'WHORE', 'PORN', 'NIGGER', 'NIGGA', 'HITLER', 'CRAP', 'DAMN', 'HELL', 'FART', 'POO', 'PEE', 'BUTT', 'BOOB', 'SUCK', 'DIE', 'DEAD']);
  const POOL = tr('EEEEEEENNNNNRRRRTTTTHHHHAAAAWWWIIISSSLLLDDOOOUUGGBBMMKKFFZZÄÖÜCP', 'EEEEEEETTTTTAAAAAOOOOIIIINNNNSSSRRRRHHHLLLDDDCCUUMMWWFFGGYYPPBBVK');
  const RIDDLE = tr([
    'Ich trag einen Kamm und krähe doch nie,',
    'auf Kirchturmspitzen steh ich – frag nicht, wie.',
    'Ich drehe mich, wohin der Wind gerade will,',
    'und zeig dir das Wetter, ganz stumm und still.',
  ], [
    'I have a comb but never crow,',
    'I sit on rooftops, high, not low.',
    'I turn to every wind that blows',
    'and show you where the weather goes.',
  ]);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const rev = s => s.split('').reverse().join('');

  function count(g, w) {
    let n = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dx, dy] of DIRS) {
      let ok = true; for (let i = 0; i < w.length; i++) { const x = c + dx * i, y = r + dy * i; if (x < 0 || y < 0 || x >= N || y >= N || g[y][x] !== w[i]) { ok = false; break; } }
      if (ok) n++;
    }
    return w === rev(w) ? n / 2 : n;
  }
  function tryPlace(g, w, rng, dirs, tries) {
    for (let k = 0; k < tries; k++) {
      const [dx, dy] = dirs[Math.floor(rng() * dirs.length)];
      const c = Math.floor(rng() * N), r = Math.floor(rng() * N);
      const ec = c + dx * (w.length - 1), er = r + dy * (w.length - 1); if (ec < 0 || er < 0 || ec >= N || er >= N) continue;
      let ok = true; for (let i = 0; i < w.length; i++) { const ch = g[r + dy * i][c + dx * i]; if (ch && ch !== w[i]) { ok = false; break; } }
      if (!ok) continue;
      for (let i = 0; i < w.length; i++) g[r + dy * i][c + dx * i] = w[i];
      return {c, r, dx, dy, len: w.length};
    }
    return null;
  }
  function generate(rng) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const g = Array.from({length: N}, () => new Array(N).fill(''));
      /* answer: backwards on a diagonal (it reads right-to-left) */
      const a = tryPlace(g, ANSWER, rng, [[-1, -1], [-1, 1]], 200); if (!a) continue;
      const pl = {}; let ok = true;
      for (const w of DECOYS.slice().sort((x, y) => y.length - x.length)) { const p = tryPlace(g, w, rng, DIRS, 300); if (!p) { ok = false; break; } pl[w] = p; }
      if (!ok) continue;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) g[r][c] = POOL[Math.floor(rng() * POOL.length)];
      if (UNIQUE.some(w => count(g, w) !== 1)) continue;
      if (BAD.some(w => count(g, w) > 0)) continue;
      pl[ANSWER] = a;
      return {g, pl};
    }
    return null;
  }

  const CSS = `
.wl{position:absolute;inset:0;overflow:hidden;background:linear-gradient(180deg,#8fd3ff 0%,#c9e6ff 55%,#ffd6ec 100%)}
.wl-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.wl-cv{position:absolute;touch-action:none;cursor:crosshair}
.wl-side{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;justify-content:center}
.wl-card{position:relative;background:#fff;border:3px solid #3a2030;border-radius:24px;padding:12px 16px 12px;color:#5a2a6a;box-shadow:0 5px 0 rgba(58,32,48,.3),inset 0 -5px 0 rgba(143,211,255,.35)}
.wl-card:before,.wl-card:after{content:"";position:absolute;background:#fff;border:3px solid #3a2030;border-bottom:0;border-radius:50% 50% 0 0;z-index:0}
.wl-card:before{width:56px;height:28px;left:22px;top:-19px}
.wl-card:after{width:40px;height:22px;left:70px;top:-14px}
.wl-crown{position:relative;z-index:1;font-weight:700;color:#c88a00;letter-spacing:.06em;text-transform:uppercase;font-size:.72em;margin-bottom:4px}
.wl-poem{position:relative;z-index:1;font-weight:500;line-height:1.38}
.wl-poem div{white-space:nowrap}
.wl-q{position:relative;z-index:1;margin-top:5px;font-weight:700;color:#e0457f}
.wl-sel{align-self:flex-start;min-height:1.5em;padding:2px 12px;border-radius:999px;font-weight:700;letter-spacing:.2em;color:#3a2030;font-size:17px;line-height:1.5em;
  background:rgba(255,216,74,.85);border:2.5px solid #3a2030;box-shadow:0 3px 0 rgba(58,32,48,.3);transition:opacity .15s}
.wl-sel.empty{background:rgba(255,255,255,.45);border:2px dashed rgba(58,32,48,.35);box-shadow:none;color:rgba(58,32,48,.5);letter-spacing:.02em;font-weight:600;font-size:.8em}
.wl-found{display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-height:24px;font-size:.8em;color:#3a2a5a}
.wl-found b{color:#3a2a5a;margin-right:2px}
.wl-chip{padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.75);border:2px solid rgba(58,32,48,.35);font-weight:700;letter-spacing:.05em;color:#5a7aa8;animation:wlchip .4s cubic-bezier(.3,1.7,.5,1)}
@keyframes wlchip{from{transform:scale(.3)}to{transform:scale(1)}}
.wl-row{display:flex;gap:8px;align-items:center}
.wl-btn{font:600 13px/1 "Fredoka",sans-serif;border:2.5px solid #3a2030;border-radius:999px;padding:7px 14px;min-height:34px;cursor:pointer;background:#fff;color:#3a2030;box-shadow:0 3px 0 #3a2030}
.wl-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #3a2030}
.wl-how{font-size:.74em;color:#3a2a5a;opacity:.85;line-height:1.25}
.wl.phone .wl-card{padding:7px 12px;border-radius:18px}
.wl.phone .wl-card:before{width:40px;height:20px;top:-13px;left:18px}
.wl.phone .wl-card:after{width:28px;height:16px;top:-10px;left:52px}
.wl.phone .wl-side{gap:5px}
.wl.phone .wl-sel{font-size:14px;padding:0 10px}
.wl.phone .wl-btn{font-size:12px;padding:5px 11px;min-height:36px}
`;

  G.PZ && G.PZ.register({
    id: 'himmel-wortgitter', world: 'himmel', slot: 0,
    title: tr('Das Wolken-Wortgitter', 'The Cloud Word Grid'),
    intro: tr('Löse das Rätsel und finde die Antwort im Gitter. Wörter laufen in alle 8 Richtungen – auch rückwärts und schräg.', 'Solve the riddle and find the answer in the grid. Words run in all 8 directions – even backwards and diagonally.'),
    letter: tr('Der Wolkenkönig ist ein Schelm: Das Wichtigste versteckt er immer rückwärts. Und der Vogel, den er meint, fliegt nie – er dreht sich nur im Wind.', 'The Cloud King is a trickster: he always hides the most important thing backwards. And the bird he means never flies – it only turns in the wind.'),
    hint: tr('Die Antwort hat 10 Buchstaben und steht schräg im Gitter – rückwärts, also von rechts nach links gelesen. Gesucht ist ein Blech-Tier mit Kamm, das auf dem Kirchturm die Windrichtung zeigt. Die Wetterwörter sind nur Ablenkung.', 'The answer has 11 letters and runs diagonally through the grid – backwards, so it reads from right to left. You are looking for the metal rooster on a rooftop that turns to show where the wind blows. The weather words are only there to trick you.'),

    station(ctx, x, y, t, solved) {
      ctx.save();
      const O = '#3a2030';
      ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(x, y, 15, 3, 0, 0, TAU); ctx.fill();
      /* cloud pillar: stacked puffs */
      const puffs = [[0, -9, 9], [-8, -6, 6], [8, -6, 6], [0, -16, 7.5], [-5, -20, 5.5], [5, -21, 5.5], [0, -24, 6.5]];
      ctx.fillStyle = '#fff'; ctx.strokeStyle = O; ctx.lineWidth = 2.2;
      for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.stroke(); }
      for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(143,211,255,.45)'; for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx + r * 0.25, y + dy + r * 0.3, r * 0.55, 0, TAU); ctx.fill(); }
      /* glowing tablet */
      const ty = y - 38 + Math.sin(t * 2) * 1.5, pulse = 0.55 + 0.45 * Math.sin(t * 3);
      const gl = ctx.createRadialGradient(x, ty, 2, x, ty, 18); gl.addColorStop(0, `rgba(255,230,120,${0.55 * pulse + 0.2})`); gl.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, ty, 18, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 8, ty + 8); ctx.lineTo(x - 8, ty - 5); ctx.quadraticCurveTo(x - 8, ty - 10, x, ty - 10); ctx.quadraticCurveTo(x + 8, ty - 10, x + 8, ty - 5); ctx.lineTo(x + 8, ty + 8); ctx.closePath();
      ctx.fillStyle = solved ? '#e6fff0' : '#fff4c4'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.font = 'bold 5px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#c88a00';
      ctx.fillText('A ? Z', x, ty - 3); ctx.fillText(tr('? Ö ?', '? W ?'), x, ty + 4);
      if (solved) {
        const cols = ['#ff6f9c', '#ffb27a', '#ffd84a', '#9be7a5', '#8fd3ff', '#b49cff'];
        cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, ty + 2, 16 - i * 1.6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
      } else {
        ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i); ctx.fillRect(x + Math.cos(a) * 13 - 1, ty + Math.sin(a) * 6 - 1, 2, 2); }
      }
      ctx.restore();
    },

    mount(root, api) {
      const rng = api.rng || Math.random;
      const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
      const wrap = document.createElement('div'); wrap.className = 'wl'; root.appendChild(wrap);
      const bg = document.createElement('canvas'); bg.className = 'wl-bg'; wrap.appendChild(bg);
      const cv = document.createElement('canvas'); cv.className = 'wl-cv'; wrap.appendChild(cv);
      const side = document.createElement('div'); side.className = 'wl-side'; wrap.appendChild(side);
      const card = document.createElement('div'); card.className = 'wl-card'; side.appendChild(card);
      card.innerHTML = '<div class="wl-crown">' + tr('♛ Das Rätsel des Wolkenkönigs', '♛ The Cloud King’s riddle') + '</div><div class="wl-poem">' + RIDDLE.map(l => '<div>' + l + '</div>').join('') + '</div><div class="wl-q">' + tr('Wer bin ich?', 'What am I?') + '</div>';
      const poem = card.querySelector('.wl-poem');
      const selEl = document.createElement('div'); selEl.className = 'wl-sel empty'; selEl.textContent = tr('Deine Auswahl …', 'Your selection …'); side.appendChild(selEl);
      const found = document.createElement('div'); found.className = 'wl-found'; side.appendChild(found);
      const row = document.createElement('div'); row.className = 'wl-row'; side.appendChild(row);
      const bNew = document.createElement('button'); bNew.className = 'wl-btn'; bNew.type = 'button'; bNew.textContent = tr('⟲ Neu mischen', '⟲ Shuffle'); row.appendChild(bNew);
      const how = document.createElement('div'); how.className = 'wl-how'; how.textContent = tr('Ziehen – oder ersten, dann letzten Buchstaben antippen.', 'Drag – or tap the first, then the last letter.'); row.appendChild(how);

      let grid, place, foundSet, done = false, raf = 0, timers = [], parts = [];
      let W = 0, H = 0, dpr = 1, gs = 300, cell = 27, gx = 0, gy = 0, phone = false, cloud = null;
      let drag = null, anchor = null, flash = null, winLine = null, autoLine = null, t0 = performance.now();
      const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
      const now = () => (performance.now() - t0) / 1000;
      const tone = (f, d, o) => { try { G.audio.tone(f, d, o); } catch (e) {} };
      const sfx = n => { try { api.sfx(n); } catch (e) {} };

      function build() {
        let res = generate(rng);
        if (!res) { res = generate(() => Math.random()); }
        if (!res) { console.error('PZ_ERROR himmel-wortgitter: no grid'); res = {g: Array.from({length: N}, () => new Array(N).fill('A')), pl: {[ANSWER]: {c: ANSWER.length - 1, r: ANSWER.length - 1, dx: -1, dy: -1, len: ANSWER.length}}}; }
        grid = res.g; place = res.pl; foundSet = new Set(); anchor = null; drag = null; flash = null; showSel(null);
        renderFound();
      }
      function renderFound() {
        found.innerHTML = '<b>' + tr('Wetterwörter: ', 'Weather words: ') + foundSet.size + '/' + DECOYS.length + '</b>';
        for (const w of DECOYS) if (foundSet.has(w)) { const c = document.createElement('span'); c.className = 'wl-chip'; c.textContent = w; found.appendChild(c); }
      }

      function makeCloud() {
        const s = Math.ceil(cell * dpr), c = document.createElement('canvas'); c.width = s; c.height = s; const x = c.getContext('2d');
        x.scale(dpr, dpr); const k = cell;
        const puffs = [[0.5, 0.56, 0.36], [0.27, 0.6, 0.22], [0.73, 0.6, 0.22], [0.36, 0.38, 0.2], [0.63, 0.4, 0.22]];
        x.fillStyle = 'rgba(90,110,170,.35)'; for (const [px, py, r] of puffs) { x.beginPath(); x.arc(px * k, py * k + k * 0.05, r * k, 0, TAU); x.fill(); }
        x.fillStyle = '#fff'; for (const [px, py, r] of puffs) { x.beginPath(); x.arc(px * k, py * k, r * k, 0, TAU); x.fill(); }
        x.fillStyle = 'rgba(200,228,255,.6)'; x.beginPath(); x.ellipse(0.5 * k, 0.74 * k, 0.3 * k, 0.08 * k, 0, 0, TAU); x.fill();
        cloud = c;
      }
      function layout() {
        W = wrap.clientWidth; H = wrap.clientHeight; if (!W || !H) return;
        dpr = Math.min(2, window.devicePixelRatio || 1); phone = H < 320; wrap.classList.toggle('phone', phone);
        const pad = phone ? 5 : 10;
        gs = Math.floor(Math.min(H - pad * 2, W * 0.54)); cell = gs / N;
        gx = pad; gy = Math.floor((H - gs) / 2);
        cv.style.left = gx + 'px'; cv.style.top = gy + 'px'; cv.style.width = gs + 'px'; cv.style.height = gs + 'px';
        cv.width = Math.round(gs * dpr); cv.height = Math.round(gs * dpr);
        bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
        const sx = gx + gs + (phone ? 10 : 18);
        side.style.left = sx + 'px'; side.style.top = (phone ? 12 : 24) + 'px'; side.style.width = (W - sx - pad - 4) + 'px'; side.style.height = (H - (phone ? 14 : 30)) + 'px';
        let fs = phone ? 13.5 : 18; card.style.fontSize = fs + 'px';
        const maxH = H * (phone ? 0.64 : 0.62);
        for (let k = 0; k < 30 && (poem.scrollWidth > poem.clientWidth + 1 || card.offsetHeight > maxH) && fs > 9; k++) { fs -= 0.5; card.style.fontSize = fs + 'px'; }
        found.style.fontSize = (phone ? 13 : 15) + 'px'; how.style.fontSize = (phone ? 10.5 : 12) + 'px';
        makeCloud(); drawBg(); draw();
      }
      function drawBg() {
        const c = bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
        const sx = W * 0.92, sy = H * 0.12; c.save(); c.translate(sx, sy);
        for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.fillStyle = 'rgba(255,240,170,.35)'; c.beginPath(); c.moveTo(0, -H * 0.08); c.lineTo(H * 0.03, -H * 0.3); c.lineTo(-H * 0.03, -H * 0.3); c.fill(); }
        c.restore(); c.fillStyle = '#ffe88a'; c.beginPath(); c.arc(sx, sy, H * 0.07, 0, TAU); c.fill();
        let s = 3; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        c.fillStyle = 'rgba(255,255,255,.55)';
        for (let i = 0; i < 6; i++) { const x = r() * W, y = H * (0.55 + r() * 0.45), k = 18 + r() * 30; for (const [dx, dy, rr] of [[0, 0, 1], [-0.9, 0.2, 0.7], [0.9, 0.2, 0.7]]) { c.beginPath(); c.arc(x + dx * k, y + dy * k, rr * k, 0, TAU); c.fill(); } }
      }
      const cellCenter = (c, r) => [(c + 0.5) * cell, (r + 0.5) * cell];
      function lineCells(a, b) {
        const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        const out = []; for (let i = 0; i <= n; i++) out.push([a[0] + dx * i, a[1] + dy * i]); return out;
      }
      const aligned = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy); };
      function snap(a, raw) {
        /* nearest of the 8 directions, clamped to the grid */
        const fx = raw[0] - a[0], fy = raw[1] - a[1]; if (Math.abs(fx) < 0.5 && Math.abs(fy) < 0.5) return a.slice();
        const ang = Math.atan2(fy, fx), k = Math.round(ang / (Math.PI / 4)), dx = Math.round(Math.cos(k * Math.PI / 4)), dy = Math.round(Math.sin(k * Math.PI / 4));
        let n = Math.round(Math.max(Math.abs(fx), Math.abs(fy)));
        while (n > 0) { const x = a[0] + dx * n, y = a[1] + dy * n; if (x >= 0 && y >= 0 && x < N && y < N) break; n--; }
        return [a[0] + dx * n, a[1] + dy * n];
      }
      function capsule(c, a, b, fill, stroke, w) {
        const [x1, y1] = cellCenter(a[0], a[1]), [x2, y2] = cellCenter(b[0], b[1]);
        c.lineCap = 'round';
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = w + 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
        if (fill) { c.strokeStyle = fill; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
      }
      function capsulePath(c, a, b, h) {
        const [x1, y1] = cellCenter(a[0], a[1]), [x2, y2] = cellCenter(b[0], b[1]), L = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
        c.save(); c.translate(x1, y1); c.rotate(ang); c.beginPath(); c.arc(0, 0, h, Math.PI / 2, Math.PI * 1.5); c.lineTo(L, -h); c.arc(L, 0, h, -Math.PI / 2, Math.PI / 2); c.closePath(); c.restore();
      }
      function endOf(p) { return [p.c + p.dx * (p.len - 1), p.r + p.dy * (p.len - 1)]; }

      function draw() {
        const c = cv.getContext('2d'), t = now(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, gs, gs);
        /* found decoys: a soft glow under the clouds (the outline follows after the clouds) */
        for (const w of foundSet) { const p = place[w]; capsule(c, [p.c, p.r], endOf(p), 'rgba(160,210,255,.85)', null, cell * 0.9); }
        if (flash && performance.now() < flash.until) capsule(c, flash.a, flash.b, flash.col, null, cell * 0.8);
        /* the solution */
        const wl = winLine || autoLine;
        if (wl) {
          const [x1, y1] = cellCenter(wl.a[0], wl.a[1]), [x2, y2] = cellCenter(wl.b[0], wl.b[1]);
          const gr = c.createLinearGradient(x1, y1, x2, y2); ['#ff6f9c', '#ffb27a', '#ffd84a', '#9be7a5', '#8fd3ff', '#b49cff'].forEach((col, i) => gr.addColorStop(i / 5, col));
          c.lineCap = 'round'; c.strokeStyle = '#3a2030'; c.lineWidth = cell * 0.86 + 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
          c.strokeStyle = gr; c.lineWidth = cell * 0.86; c.stroke();
        }
        /* clouds and letters */
        const fs = Math.round(cell * 0.5);
        c.font = '700 ' + fs + 'px "Fredoka", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const inWin = new Set(); if (wl) for (const q of lineCells(wl.a, wl.b)) inWin.add(q[0] + ',' + q[1]);
        let sel = null; if (drag) sel = drag.anchor && same(drag.a, drag.b) ? lineCells(drag.anchor, drag.a) : lineCells(drag.a, drag.b); else if (anchor) sel = [anchor];
        const selSet = new Set(); if (sel) for (const q of sel) selSet.add(q[0] + ',' + q[1]);
        if (sel && sel.length > 1) capsule(c, sel[0], sel[sel.length - 1], 'rgba(255,216,74,.75)', 'rgba(58,32,48,.55)', cell * 0.8);
        for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
          const key = q + ',' + r, x = q * cell, y = r * cell, bob = Math.sin(t * 1.3 + q * 0.7 + r * 0.45) * cell * 0.03;
          const hot = selSet.has(key) || inWin.has(key);
          if (!hot) { c.globalAlpha = 0.95; c.drawImage(cloud, x, y + bob, cell, cell); c.globalAlpha = 1; }
          else if (anchor && !drag && selSet.has(key)) { c.fillStyle = 'rgba(255,216,74,.85)'; c.beginPath(); c.arc(x + cell / 2, y + cell / 2, cell * (0.42 + Math.sin(t * 8) * 0.03), 0, TAU); c.fill(); c.strokeStyle = '#3a2030'; c.lineWidth = 2; c.stroke(); }
          c.fillStyle = inWin.has(key) ? '#fff' : hot ? '#3a2030' : '#6a3a7a';
          if (inWin.has(key)) { c.lineWidth = 3; c.strokeStyle = '#3a2030'; c.strokeText(grid[r][q], x + cell / 2, y + cell / 2 + 1 + bob); }
          c.fillText(grid[r][q], x + cell / 2, y + cell / 2 + 1 + (hot ? 0 : bob));
        }
        for (const w of foundSet) {
          const p = place[w]; capsulePath(c, [p.c, p.r], endOf(p), cell * 0.46);
          c.setLineDash([cell * 0.18, cell * 0.12]); c.strokeStyle = 'rgba(60,110,190,.85)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
        }
        /* sparkles */
        for (const p of parts) { c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5)); c.fillStyle = p.c; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); c.restore(); }
        c.globalAlpha = 1;
      }
      function loop() {
        raf = 0;
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= p.dec; p.rot += 0.15; }
        parts = parts.filter(p => p.life > 0);
        draw(); if (!done || parts.length) raf = requestAnimationFrame(loop);
      }
      function kick() { if (!raf) raf = requestAnimationFrame(loop); }
      function sparkle(cells, n, cols) {
        for (const q of cells) { const [x, y] = cellCenter(q[0], q[1]); for (let i = 0; i < n; i++) { const a = rng() * TAU, v = 0.8 + rng() * 2.4; parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, dec: 0.015 + rng() * 0.02, s: 2 + rng() * 3.5, c: cols[(i + q[0]) % cols.length], rot: rng() * TAU}); } }
        kick();
      }

      function cellFrom(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / cell - 0.5, (e.clientY - r.top) / cell - 0.5]; }
      const roundCell = f => [Math.max(0, Math.min(N - 1, Math.round(f[0]))), Math.max(0, Math.min(N - 1, Math.round(f[1])))];
      function evaluate(a, b) {
        const cells = lineCells(a, b); if (cells.length < 2) return;
        const s = cells.map(q => grid[q[1]][q[0]]).join(''), sr = rev(s);
        if (s === ANSWER || sr === ANSWER) { win(s === ANSWER ? [a, b] : [b, a]); return; }
        const part = PARTS.find(w => w === s || w === sr);
        if (part) {
          flash = {a, b, col: 'rgba(255,216,74,.6)', until: performance.now() + 700}; kick(); later(draw, 720);
          sfx('bubblePop'); tone(784, 0.12, {gain: 0.05}); tone(988, 0.14, {gain: 0.05, delay: 0.08});
          api.msg(tr('„' + part + '“ – ganz warm! Aber das ist erst ein Teil der Antwort.', '“' + part + '” – getting warm! But that is only part of the answer.'), 'info'); return;
        }
        const extra = EXTRA.find(w => w === s || w === sr);
        if (extra) {
          flash = {a, b, col: 'rgba(160,210,255,.7)', until: performance.now() + 600}; kick(); later(draw, 620);
          sfx('bubblePop'); api.msg(tr('„' + extra + '“ – auch ein Wetterwort, aber das öffnet die Tür nicht.', '“' + extra + '” – another weather word, but it does not open the door.'), 'info'); return;
        }
        const d = DECOYS.find(w => w === s || w === sr);
        if (d) {
          const p = place[d], inPlace = (same(a, [p.c, p.r]) && same(b, endOf(p))) || (same(b, [p.c, p.r]) && same(a, endOf(p)));
          if (inPlace && foundSet.has(d)) { api.msg(tr('„' + d + '“ hast du schon gefunden.', 'You already found “' + d + '”.'), 'info'); sfx('bump'); return; }
          foundSet.add(d); renderFound(); sfx('bubblePop'); [0, 4, 7].forEach((k, i) => tone(660 * Math.pow(2, k / 12), 0.15, {gain: 0.06, delay: i * 0.06}));
          sparkle(cells, 3, ['#fff', '#8fd3ff', '#ffd84a']);
          api.msg(tr('„' + d + '“ – schönes Wort, aber das öffnet die Tür nicht.', '“' + d + '” – nice word, but it does not open the door.'), 'info');
          if (foundSet.size === DECOYS.length) later(() => api.msg(tr('Alle Wetterwörter gefunden – doch die Antwort auf das Rätsel fehlt noch!', 'All weather words found – but the answer to the riddle is still missing!'), 'info'), 1400);
          draw(); return;
        }
        flash = {a, b, col: 'rgba(255,111,156,.45)', until: performance.now() + 450}; kick(); later(draw, 470);
        sfx('bump'); api.msg(tr('„' + s + '“ – hier versteckt sich kein Wort.', '“' + s + '” – no word is hiding here.'), 'bad');
      }
      const same = (p, q) => p[0] === q[0] && p[1] === q[1];
      function showSel(cells) {
        const txt = cells && cells.length ? cells.map(q => grid[q[1]][q[0]]).join('') : '';
        selEl.textContent = txt || tr('Deine Auswahl …', 'Your selection …'); selEl.classList.toggle('empty', !txt);
      }
      function win(line) {
        if (done) return; done = true; winLine = {a: line[0], b: line[1]}; drag = null; anchor = null;
        const cells = lineCells(line[0], line[1]); showSel(cells);
        cells.forEach((q, i) => later(() => { tone(523 * Math.pow(2, i / 7), 0.2, {gain: 0.07}); sparkle([q], 6, ['#ff6f9c', '#ffd84a', '#9be7a5', '#8fd3ff', '#fff']); }, i * 60));
        api.msg(tr('Der Wetterhahn! Der Wolkenkönig verneigt sich.', 'The weathervane! The Cloud King takes a bow.'), 'good');
        draw(); kick();
        later(() => api.solved(), cells.length * 60 + 500);
      }

      function onDown(e) {
        if (done) return; e.preventDefault(); const p = roundCell(cellFrom(e));
        try { cv.setPointerCapture(e.pointerId); } catch (er) {}
        const an = anchor && !same(anchor, p) && aligned(anchor, p) ? anchor : null;
        drag = {a: p, b: p, moved: false, id: e.pointerId, anchor: an}; sfx('tick');
        showSel(an ? lineCells(an, p) : [p]); draw(); kick();
      }
      function onMove(e) {
        if (!drag || drag.id !== e.pointerId) return; const f = cellFrom(e); const b = snap(drag.a, f);
        if (!same(b, drag.b)) { drag.b = b; drag.moved = true; const lc = lineCells(drag.a, b); showSel(drag.anchor && same(drag.a, b) ? lineCells(drag.anchor, drag.a) : lc); tone(700 + lc.length * 50, 0.04, {type: 'triangle', gain: 0.03}); draw(); }
      }
      function onUp(e) {
        if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null;
        if (!same(d.a, d.b)) { anchor = null; showSel(null); evaluate(d.a, d.b); }
        else if (d.anchor) { anchor = null; showSel(null); evaluate(d.anchor, d.a); }
        else if (anchor && same(anchor, d.a)) { anchor = null; showSel(null); }
        else { anchor = d.a; showSel([anchor]); api.msg(tr('Jetzt den letzten Buchstaben antippen.', 'Now tap the last letter.'), 'info'); }
        draw();
      }
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', () => { drag = null; showSel(anchor ? [anchor] : null); draw(); });
      bNew.addEventListener('click', () => { if (done) return; build(); sfx('spring'); api.msg(tr('Neues Gitter! Die Wörter haben sich neu versteckt.', 'A new grid! The words have hidden somewhere else.'), 'info'); draw(); });

      build(); layout(); kick();
      let ro = null; try { ro = new ResizeObserver(() => layout()); ro.observe(root); } catch (e) { window.addEventListener('resize', layout); }

      return {
        destroy() { done = true; timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); else window.removeEventListener('resize', layout); },
        autoSolve() {
          if (done) return; const p = place[ANSWER], a = [p.c, p.r], b = endOf(p);
          for (let i = 1; i < p.len; i++) later(() => { autoLine = {a, b: [a[0] + p.dx * i, a[1] + p.dy * i]}; draw(); }, i * 55);
          later(() => { autoLine = null; win([a, b]); }, p.len * 55 + 100);
        },
      };
    },
  });
})();

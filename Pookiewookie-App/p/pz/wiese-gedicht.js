/* Pookiewookie puzzle: "Das Zuckergedicht" (Zuckerwattewiese, slot 1).
   A riddle poem on a candy-stripe signboard describes one thing. The player spells the answer with letter tiles
   (answer letters + 5 decoys, shuffled): tap a tile to put it into the next free slot, tap a slot to give the letter back. */
(function () {
  const G = window.PW = window.PW || {};
  const TAU = Math.PI * 2;
  const ANSWER = 'LÖWENZAHN';
  const DECOYS = ['B', 'U', 'R', 'S', 'T'];
  const POEM = [
    'Im Frühling steh ich gelb und strahle wie ein Stern,',
    'die Bienen und die Kinder haben mich so gern.',
    'Mein Name ist ein König, der in der Steppe brüllt,',
    'und das, womit er beißt, wenn er den Hunger stillt.',
    'Im Sommer werd ich weiß, ein Kopf aus weichem Flaum,',
    'ein Pusten – und ich fliege davon wie in \'nem Traum.',
    'Mit hundert kleinen Schirmchen reis ich übers Land:',
    'Wie heiß ich, lieber Wookie? Hast du mich erkannt?',
  ];
  const WRONG = [
    'Nicht ganz … das Wort ist es noch nicht. Lies das Gedicht Zeile für Zeile.',
    'Nicht ganz … wer brüllt denn da in Zeile 3 – und womit beißt er?',
    'Nicht ganz … was wird im Sommer weiß und fliegt beim Pusten davon?',
    'Nicht ganz … alle neun Felder müssen ein einziges Wort ergeben.',
  ];
  const TILE_COLS = ['#ff9eb0', '#ffd84a', '#9be7a5', '#8fd3ff', '#ffc2e2', '#ffb27a', '#d8b4ff'];
  const sfx = (api, n) => { try { api.sfx(n); } catch (e) {} };
  const tone = (f, d, o) => { try { if (G.audio && G.audio.tone) G.audio.tone(f, d, o); } catch (e) {} };

  const CSS = `
.wg{position:absolute;inset:0;display:flex;gap:14px;padding:16px 18px 12px;box-sizing:border-box;align-items:stretch;overflow:hidden;
  background:radial-gradient(120% 90% at 20% 0%,rgba(255,214,232,.32),transparent 60%),linear-gradient(180deg,rgba(143,211,255,.20),rgba(155,231,165,.22))}
.wg-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.wg-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}
.wg-board{position:relative;flex:1 1 54%;min-width:0;border-radius:20px;padding:9px;border:3px solid #3a2030;
  background:repeating-linear-gradient(-45deg,#ff6f9c 0 11px,#fff4e0 11px 22px);box-shadow:0 6px 0 rgba(42,21,8,.35);z-index:1}
.wg-paper{height:100%;box-sizing:border-box;border-radius:13px;border:3px solid #3a2030;background:linear-gradient(#fffaf0,#fff0dc);
  padding:8px 16px;color:#5a2440;display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;
  box-shadow:inset 0 -6px 0 rgba(255,158,176,.25)}
.wg-line{white-space:nowrap;font-weight:500;letter-spacing:.005em}
.wg-line.gap{margin-top:.42em}
.wg-ask{margin-top:.5em;font-weight:700;color:#e0457f;font-size:1.05em;letter-spacing:.04em}
.wg-lolli{position:absolute;width:var(--lr,34px);height:var(--lr,34px);border-radius:50%;border:3px solid #3a2030;z-index:2;
  background:conic-gradient(from 0deg,#ff6f9c 0 12.5%,#fff4e0 0 25%,#9be7a5 0 37.5%,#fff4e0 0 50%,#ff6f9c 0 62.5%,#fff4e0 0 75%,#8fd3ff 0 87.5%,#fff4e0 0);
  box-shadow:inset -4px -4px 0 rgba(0,0,0,.12),inset 3px 3px 0 rgba(255,255,255,.6);animation:wgspin 9s linear infinite}
.wg-lolli.l{left:-12px;top:-9px}.wg-lolli.r{right:-12px;top:-9px;animation-direction:reverse}
@keyframes wgspin{to{transform:rotate(360deg)}}
.wg-side{position:relative;flex:1 1 46%;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:var(--gap,12px);z-index:1}
.wg-label{font:700 13px/1 "Fredoka",sans-serif;color:#ffe9a8;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 2px 0 rgba(42,21,8,.5)}
.wg-slots{display:flex;gap:var(--sg,5px);padding:7px 9px;border-radius:16px;background:rgba(42,21,8,.32);box-shadow:inset 0 3px 0 rgba(0,0,0,.18)}
.wg-slot{width:var(--s,40px);height:calc(var(--s,40px)*1.16);border-radius:11px;border:2.5px dashed rgba(255,244,224,.55);box-sizing:border-box;
  display:grid;place-items:center;font:700 calc(var(--s,40px)*.58)/1 "Fredoka",sans-serif;color:#3a2030;cursor:pointer;transition:transform .12s}
.wg-slot.next{border-color:#ffd84a;animation:wgblink 1s ease-in-out infinite}
@keyframes wgblink{50%{border-color:rgba(255,216,74,.35)}}
.wg-slot.full{border:3px solid #3a2030;background:var(--c,#ff9eb0);box-shadow:inset 0 -4px 0 rgba(0,0,0,.14),inset 0 3px 0 rgba(255,255,255,.55);animation:wgpop .28s cubic-bezier(.3,1.8,.5,1)}
.wg-slot.full:hover{transform:translateY(-2px)}
.wg-slot.win{animation:wgwin .7s cubic-bezier(.3,1.8,.5,1) both;background:#ffd84a!important;box-shadow:0 0 14px #fff6a8,inset 0 -4px 0 rgba(0,0,0,.14)}
@keyframes wgpop{0%{transform:scale(.5)}100%{transform:scale(1)}}
@keyframes wgwin{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-14px) scale(1.18) rotate(-6deg)}100%{transform:translateY(0) scale(1)}}
.wg-slots.bad{animation:wgbad .4s}
.wg-slots.bad .wg-slot.full{background:#ff8fa8}
@keyframes wgbad{20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
.wg-tiles{display:grid;grid-template-columns:repeat(7,var(--t,46px));gap:var(--tg,8px)}
.wg-tile{width:var(--t,46px);height:var(--t,46px);border-radius:12px;border:3px solid #3a2030;background:var(--c,#ff9eb0);color:#3a2030;
  font:700 calc(var(--t,46px)*.54)/1 "Fredoka",sans-serif;display:grid;place-items:center;cursor:pointer;padding:0;
  box-shadow:0 4px 0 #3a2030,inset 0 -4px 0 rgba(0,0,0,.13),inset 0 3px 0 rgba(255,255,255,.6);transition:transform .12s,opacity .18s;
  transform:rotate(var(--rot,0deg))}
.wg-tile:hover{transform:translateY(-3px) rotate(var(--rot,0deg))}
.wg-tile:active{transform:translateY(2px) scale(.94);box-shadow:0 2px 0 #3a2030}
.wg-tile.used{opacity:.18;transform:scale(.82);pointer-events:none;box-shadow:none}
.wg-tile.hop{animation:wghop .45s cubic-bezier(.3,1.6,.5,1) both}
@keyframes wghop{0%{transform:translateY(0)}35%{transform:translateY(-16px) rotate(8deg)}100%{transform:translateY(0) rotate(var(--rot,0deg))}}
.wg-btns{display:flex;gap:10px}
.wg-btn{font:600 13px/1 "Fredoka",sans-serif;color:#fff7ef;background:rgba(255,158,176,.18);border:2px solid rgba(255,158,176,.75);border-radius:999px;
  padding:8px 16px;cursor:pointer;min-height:36px}
.wg-btn:hover{background:rgba(255,158,176,.35)}
.wg-fly{position:absolute;z-index:6;border-radius:12px;border:3px solid #3a2030;display:grid;place-items:center;color:#3a2030;
  font:700 20px/1 "Fredoka",sans-serif;pointer-events:none;transition:transform .2s cubic-bezier(.4,1.3,.6,1)}
.wg.phone{gap:10px;padding:9px 12px 7px}
.wg.phone .wg-board{padding:6px;border-radius:15px}
.wg.phone .wg-paper{padding:4px 10px;border-width:2.5px}
.wg.phone .wg-label{font-size:11px}
.wg.phone .wg-slots{padding:5px 6px;border-radius:12px}
.wg.phone .wg-btn{font-size:12px;padding:6px 14px}
`;

  function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  G.PZ && G.PZ.register({
    id: 'wiese-gedicht', world: 'wiese', slot: 1,
    title: 'Das Zuckergedicht',
    intro: 'Das Gedicht beschreibt EIN Ding. Lege sein Wort aus den Buchstaben – fünf sind zu viel. Feld antippen = Buchstabe zurück.',
    letter: 'Auf der Zuckerwattewiese blüht etwas, das gefährlich heißt und doch ganz sanft ist. Im Sommer genügt ein einziges Pusten, und es reist davon.',
    hint: 'Die Zeilen 3 und 4 ergeben zusammen ein Wort: ein Tier, das als König brüllt, plus das, womit es zubeißt. Und die Zeilen 5 bis 7 beschreiben, was im Sommer aus der gelben Blume wird.',

    station(ctx, x, y, t, solved) {
      ctx.save();
      const O = '#3a2030';
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y, 17, 3, 0, 0, TAU); ctx.fill();
      /* two lollipop posts */
      for (const s of [-1, 1]) {
        const px = x + s * 13;
        ctx.fillStyle = '#fff4e0'; ctx.strokeStyle = O; ctx.lineWidth = 1.2;
        ctx.fillRect(px - 1.3, y - 33, 2.6, 33); ctx.strokeRect(px - 1.3, y - 33, 2.6, 33);
        const cy = y - 36, r = 6.2;
        ctx.save(); ctx.translate(px, cy); ctx.rotate(t * 1.5 * s);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = s < 0 ? '#ff6f9c' : '#8fd3ff'; ctx.fill();
        ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let a = 0; a < 9.5; a += 0.25) { const rr = a / 9.5 * (r - 1); const xx = Math.cos(a) * rr, yy = Math.sin(a) * rr; a === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
        ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(px, cy, r, 0, TAU); ctx.strokeStyle = O; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(px - 2, cy - 2.3, 1.3, 0, TAU); ctx.fill();
      }
      /* sign with candy-stripe border */
      const bx = x - 12, by = y - 31, bw = 24, bh = 19;
      ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      ctx.fillStyle = '#fff4e0'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#ff6f9c'; for (let i = -bh; i < bw + bh; i += 5) { ctx.beginPath(); ctx.moveTo(bx + i, by); ctx.lineTo(bx + i + 2.5, by); ctx.lineTo(bx + i + 2.5 - bh, by + bh); ctx.lineTo(bx + i - bh, by + bh); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#fffaf0'; ctx.fillRect(bx + 2.5, by + 2.5, bw - 5, bh - 5);
      ctx.strokeStyle = O; ctx.lineWidth = 1.4; ctx.strokeRect(bx, by, bw, bh); ctx.lineWidth = 0.9; ctx.strokeRect(bx + 2.5, by + 2.5, bw - 5, bh - 5);
      /* the scroll on the sign */
      const sy = by + bh / 2;
      ctx.fillStyle = '#f6e2b8'; ctx.fillRect(x - 6, sy - 4, 12, 8);
      ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 0.7; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 4.5, sy - 2 + i * 2); ctx.lineTo(x + (i === 2 ? 1.5 : 4.5), sy - 2 + i * 2); ctx.stroke(); }
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 6.5, sy, 1.6, 4.8, 0, 0, TAU); ctx.fillStyle = '#e9c98f'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 0.8; ctx.stroke(); }
      /* status */
      if (solved) {
        ctx.strokeStyle = '#2f9e5b'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 4, y - 46); ctx.lineTo(x - 1, y - 43); ctx.lineTo(x + 5, y - 50); ctx.stroke();
        for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; ctx.fillStyle = '#ffd84a'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5 + i); ctx.fillRect(x + Math.cos(a) * 11 - 1, y - 46 + Math.sin(a) * 4 - 1, 2, 2); }
      } else {
        const bob = Math.sin(t * 3) * 2;
        ctx.font = 'bold 11px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = O; ctx.strokeText('?', x, y - 47 + bob); ctx.fillStyle = '#ffd84a'; ctx.fillText('?', x, y - 47 + bob);
      }
      ctx.restore();
    },

    mount(root, api) {
      const rng = api.rng || Math.random;
      const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
      const wrap = document.createElement('div'); wrap.className = 'wg'; root.appendChild(wrap);
      const bg = document.createElement('canvas'); bg.className = 'wg-bg'; wrap.appendChild(bg);
      const board = document.createElement('div'); board.className = 'wg-board'; wrap.appendChild(board);
      const paper = document.createElement('div'); paper.className = 'wg-paper'; board.appendChild(paper);
      for (const s of ['l', 'r']) { const l = document.createElement('div'); l.className = 'wg-lolli ' + s; board.appendChild(l); }
      POEM.forEach((ln, i) => { const d = document.createElement('div'); d.className = 'wg-line' + (i && i % 2 === 0 ? ' gap' : ''); d.textContent = ln; paper.appendChild(d); });
      const ask = document.createElement('div'); ask.className = 'wg-ask'; ask.textContent = '❀ Wer bin ich? ❀'; paper.appendChild(ask);

      const side = document.createElement('div'); side.className = 'wg-side'; wrap.appendChild(side);
      const label = document.createElement('div'); label.className = 'wg-label'; label.textContent = 'Das Lösungswort'; side.appendChild(label);
      const slotsEl = document.createElement('div'); slotsEl.className = 'wg-slots'; side.appendChild(slotsEl);
      const tilesEl = document.createElement('div'); tilesEl.className = 'wg-tiles'; side.appendChild(tilesEl);
      const btns = document.createElement('div'); btns.className = 'wg-btns'; side.appendChild(btns);
      const bMix = document.createElement('button'); bMix.className = 'wg-btn'; bMix.type = 'button'; bMix.textContent = '⟲ Mischen'; btns.appendChild(bMix);
      const bClr = document.createElement('button'); bClr.className = 'wg-btn'; bClr.type = 'button'; bClr.textContent = 'Leeren'; btns.appendChild(bClr);
      const fx = document.createElement('canvas'); fx.className = 'wg-fx'; wrap.appendChild(fx);

      /* --- state --- */
      const letters = ANSWER.split('').concat(DECOYS);
      const tiles = letters.map((ch, i) => ({id: i, ch, used: false, col: TILE_COLS[i % TILE_COLS.length], rot: 0, el: null}));
      let order = shuffle(tiles.slice(), rng);
      while (order.slice(0, ANSWER.length).map(t => t.ch).join('') === ANSWER) order = shuffle(tiles.slice(), rng);
      const slots = new Array(ANSWER.length).fill(null);   /* tile per slot */
      const slotEls = [];
      let done = false, busy = false, solving = false, wrongN = 0, timers = [], raf = 0, parts = [], dpr = 1, W = 0, H = 0;
      const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

      for (let i = 0; i < ANSWER.length; i++) {
        const s = document.createElement('div'); s.className = 'wg-slot'; slotsEl.appendChild(s); slotEls.push(s);
        s.addEventListener('pointerdown', e => { e.preventDefault(); takeBack(i); });
      }
      for (const t of tiles) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wg-tile'; b.textContent = t.ch;
        b.style.setProperty('--c', t.col);
        b.addEventListener('pointerdown', e => { e.preventDefault(); place(t); });
        t.el = b;
      }
      function renderTiles() {
        tilesEl.innerHTML = '';
        for (const t of order) { t.rot = (rng() * 8 - 4).toFixed(1); t.el.style.setProperty('--rot', t.rot + 'deg'); t.el.classList.toggle('used', t.used); tilesEl.appendChild(t.el); }
      }
      function renderSlots() {
        const nx = slots.indexOf(null);
        slots.forEach((t, i) => {
          const s = slotEls[i]; const had = s.dataset.tid; const now = t ? String(t.id) : '';
          s.textContent = t ? t.ch : ''; s.classList.toggle('full', !!t); s.classList.toggle('next', !t && i === nx && !done);
          if (t) s.style.setProperty('--c', t.col);
          if (had !== now && t) { s.classList.remove('full'); void s.offsetWidth; s.classList.add('full'); }
          s.dataset.tid = now;
        });
      }

      /* --- particles (sparkles) --- */
      function burst(x, y, n, cols, power) {
        for (let i = 0; i < n; i++) { const a = rng() * TAU, v = (0.6 + rng()) * (power || 3); parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, dec: 0.012 + rng() * 0.02, s: 2 + rng() * 4, c: cols[i % cols.length], star: rng() < 0.5, rot: rng() * TAU}); }
        loop();
      }
      function centerOf(el) { const r = el.getBoundingClientRect(), R = wrap.getBoundingClientRect(); return {x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2, w: r.width, h: r.height}; }
      function star(c, x, y, r, rot) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
      function drawFx() {
        const c = fx.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
        for (const p of parts) { c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4)); c.fillStyle = p.c; if (p.star) star(c, p.x, p.y, p.s, p.rot); else { c.beginPath(); c.arc(p.x, p.y, p.s * 0.55, 0, TAU); c.fill(); } }
        c.globalAlpha = 1;
      }
      function step() {
        raf = 0;
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.98; p.life -= p.dec; p.rot += 0.1; }
        parts = parts.filter(p => p.life > 0);
        drawFx(); if (parts.length) loop();
      }
      function loop() { if (!raf) raf = requestAnimationFrame(step); }

      /* --- background: candy meadow --- */
      function drawBg() {
        const c = bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
        const hills = [[0.15, 0.78, 0.55, '#bfe8b5'], [0.7, 0.82, 0.65, '#a9e0a0'], [0.4, 0.95, 0.8, '#94d68e']];
        for (const [cx, cy, r, col] of hills) { c.fillStyle = col; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(cx * W, cy * H + H * 0.35, r * W, H * 0.45, 0, 0, TAU); c.fill(); }
        c.globalAlpha = 0.55;
        let s = 7; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        for (let i = 0; i < 26; i++) {
          const x = r() * W, y = H * (0.72 + r() * 0.28), k = 2 + r() * 2.5, col = ['#ff9eb0', '#fff4e0', '#ffd84a', '#d8b4ff'][i % 4];
          c.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * k, y + Math.sin(a) * k, k * 0.75, 0, TAU); c.fill(); }
          c.fillStyle = '#ffb000'; c.beginPath(); c.arc(x, y, k * 0.55, 0, TAU); c.fill();
        }
        c.globalAlpha = 0.25; c.fillStyle = '#fff';
        for (let i = 0; i < 12; i++) { const x = r() * W, y = r() * H * 0.6, k = 2 + r() * 3; c.beginPath(); c.moveTo(x, y + k * 0.6); c.bezierCurveTo(x - k * 1.6, y - k * 0.6, x - k * 0.4, y - k * 1.5, x, y - k * 0.5); c.bezierCurveTo(x + k * 0.4, y - k * 1.5, x + k * 1.6, y - k * 0.6, x, y + k * 0.6); c.fill(); }
        c.globalAlpha = 1;
      }

      /* --- actions --- */
      function chirp(i) { tone(520 + i * 60, 0.09, {type: 'triangle', gain: 0.08, slide: 700 + i * 60, slideDur: 0.06}); }
      function fly(fromEl, toEl, t, cb) {
        const a = centerOf(fromEl), b = centerOf(toEl);
        const f = document.createElement('div'); f.className = 'wg-fly'; f.textContent = t.ch;
        f.style.cssText += `left:${a.x - a.w / 2}px;top:${a.y - a.h / 2}px;width:${a.w}px;height:${a.h}px;background:${t.col};font-size:${a.h * 0.54}px`;
        wrap.appendChild(f); void f.offsetWidth;
        f.style.transform = `translate(${b.x - a.x}px,${b.y - a.y}px) scale(${b.w / a.w})`;
        later(() => { f.remove(); cb && cb(); }, 200);
      }
      function place(t) {
        if (done || busy || t.used) return;
        const i = slots.indexOf(null); if (i < 0) return;
        slotsEl.classList.remove('bad');
        t.used = true; slots[i] = t; t.el.classList.add('used');
        sfx(api, 'pop'); chirp(i);
        fly(t.el, slotEls[i], t, () => { const p = centerOf(slotEls[i]); burst(p.x, p.y, 7, ['#ffd84a', '#fff', t.col], 2.2); });
        renderSlots();
        if (slots.indexOf(null) < 0) { busy = true; later(check, 330); }
      }
      function takeBack(i) {
        if (done || busy) return; const t = slots[i]; if (!t) return;
        slotsEl.classList.remove('bad');
        slots[i] = null; t.used = false; t.el.classList.remove('used'); t.el.classList.remove('hop'); void t.el.offsetWidth; t.el.classList.add('hop');
        sfx(api, 'select'); tone(480, 0.08, {type: 'triangle', gain: 0.06, slide: 300});
        renderSlots();
      }
      function clearAll() { if (done || busy) return; slotsEl.classList.remove('bad'); let any = false; slots.forEach((t, i) => { if (t) { any = true; t.used = false; t.el.classList.remove('used'); slots[i] = null; } }); if (any) sfx(api, 'bump'); renderSlots(); }
      function mix() {
        if (done || busy) return; sfx(api, 'spring');
        order = shuffle(order, rng); renderTiles();
        for (const t of order) { t.el.classList.remove('hop'); void t.el.offsetWidth; t.el.classList.add('hop'); }
      }
      function word() { return slots.map(t => (t ? t.ch : '')).join(''); }
      function check() {
        if (done || solving) return;
        if (word() === ANSWER) { win(); return; }
        busy = false;
        slotsEl.classList.remove('bad'); void slotsEl.offsetWidth; slotsEl.classList.add('bad');
        api.wrong(WRONG[wrongN++ % WRONG.length]);
      }
      function win() {
        done = true; busy = true; renderSlots();
        slotEls.forEach((s, i) => later(() => {
          s.classList.add('win'); tone(660 * Math.pow(2, i / 8), 0.18, {type: 'sine', gain: 0.07});
          const p = centerOf(s); burst(p.x, p.y, 12, ['#ffd84a', '#fff', '#ff9eb0', '#9be7a5'], 3.2);
        }, i * 70));
        later(() => { const r = centerOf(slotsEl); burst(r.x, r.y, 40, ['#ffd84a', '#fff', '#ff9eb0', '#8fd3ff', '#9be7a5'], 5.5); api.msg('Ein Löwenzahn! Puste – und das Tor fliegt auf.', 'good'); }, ANSWER.length * 70 + 80);
        later(() => api.solved(), ANSWER.length * 70 + 420);
      }
      bMix.addEventListener('click', mix);
      bClr.addEventListener('click', clearAll);

      function onKey(e) {
        if (done || busy || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Backspace') { for (let i = slots.length - 1; i >= 0; i--) if (slots[i]) { takeBack(i); break; } e.preventDefault(); return; }
        if (!e.key || e.key.length !== 1) return;
        const k = e.key.toUpperCase();
        const t = order.find(x => !x.used && x.ch === k); if (t) { place(t); e.preventDefault(); }
      }
      document.addEventListener('keydown', onKey);

      /* --- layout --- */
      function layout() {
        W = wrap.clientWidth; H = wrap.clientHeight; if (!W || !H) return;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        for (const cv of [bg, fx]) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        const phone = H < 320; wrap.classList.toggle('phone', phone);
        const sideW = side.clientWidth || W * 0.45;
        const gap = phone ? 6 : 12;
        const s = Math.floor(Math.min(phone ? 40 : 46, (sideW - 24 - 8 * (phone ? 4 : 5)) / 9, H * (phone ? 0.15 : 0.13)));
        const tg = phone ? 6 : 8;
        const tt = Math.floor(Math.min(phone ? 40 : 50, (sideW - 6 * tg - 6) / 7, (H - s * 1.16 - 120) / 2.3));
        wrap.style.setProperty('--s', s + 'px'); wrap.style.setProperty('--sg', (phone ? 4 : 5) + 'px');
        wrap.style.setProperty('--t', Math.max(phone ? 36 : 34, tt) + 'px'); wrap.style.setProperty('--tg', tg + 'px'); wrap.style.setProperty('--gap', gap + 'px');
        wrap.style.setProperty('--lr', (phone ? 24 : 34) + 'px');
        /* fit the poem */
        let fs = phone ? 13 : 17.5; paper.style.fontSize = fs + 'px'; paper.style.lineHeight = '1.32';
        for (let k = 0; k < 40 && (paper.scrollHeight > paper.clientHeight + 1 || paper.scrollWidth > paper.clientWidth + 1) && fs > 8; k++) { fs -= 0.5; paper.style.fontSize = fs + 'px'; }
        drawBg(); drawFx();
      }
      renderTiles(); renderSlots(); layout();
      let ro = null; try { ro = new ResizeObserver(() => layout()); ro.observe(root); } catch (e) { window.addEventListener('resize', layout); }

      return {
        destroy() {
          done = true; timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = 0;
          document.removeEventListener('keydown', onKey); if (ro) ro.disconnect(); else window.removeEventListener('resize', layout);
        },
        autoSolve() {
          if (done || solving) return; busy = true; solving = true; slotsEl.classList.remove('bad');
          slots.forEach((t, i) => { if (t) { t.used = false; t.el.classList.remove('used'); slots[i] = null; } }); renderSlots();
          const pool = tiles.slice();
          ANSWER.split('').forEach((ch, i) => later(() => {
            const t = pool.find(x => !x.used && x.ch === ch); if (!t) return;
            t.used = true; t.el.classList.add('used'); slots[i] = t; chirp(i); renderSlots();
            const p = centerOf(slotEls[i]); burst(p.x, p.y, 6, ['#ffd84a', '#fff'], 2);
            if (i === ANSWER.length - 1) later(win, 260);
          }, 120 + i * 110));
        },
      };
    },
  });
})();

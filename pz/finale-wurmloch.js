/* The Starway Home puzzle: "Die Wurmloch-Koordinaten" (Finale, slot 0). META puzzle at the wormhole gate.
   The alien console wants a 7-letter destination word. Mallo's letters from worlds 1-7 each end with a "P.S. ...";
   the first letters after "P.S. " spell Z-U-H-A-U-S-E. The letters can be read right here ("Briefe lesen").
   English: 8 letters, the P.S. lines of worlds 1-8 spell H-O-M-E-W-A-R-D, QWERTY keyboard without umlauts.
   Entry with the on-screen console keyboard (A-Z, Ä, Ö, Ü, delete) or the real keyboard. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2;
  const ANSWER = tr('ZUHAUSE', 'HOMEWARD'), NL = ANSWER.length;
  const ROWS = tr(['QWERTZUIOPÜ', 'ASDFGHJKLÖÄ', 'YXCVBNM'], ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']), KMAX = Math.max(...ROWS.map(r => r.length));
  const KEYRX = tr(/^[A-ZÄÖÜ]$/, /^[A-Z]$/);
  const SCALE = NL > 7 ? [0, 2, 4, 5, 7, 9, 11, 12] : [0, 2, 4, 5, 7, 9, 12];   /* one rising note per slot on success */
  const WRONG = tr('Das Wurmloch flackert … falsche Koordinaten.', 'The wormhole flickers … wrong coordinates.');

  const CSS = `
.wh{position:absolute;inset:0;overflow:hidden;background:radial-gradient(120% 120% at 20% 40%,#2a1850 0%,#120a26 60%,#08051a 100%);color:#e8f6ff}
.wh-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.wh-main{position:absolute;inset:0;display:flex;gap:var(--g,14px);padding:var(--p,12px);box-sizing:border-box}
.wh-left{flex:0 0 var(--lw,300px);display:flex;flex-direction:column;gap:8px;min-width:0}
.wh-hole{flex:1 1 auto;min-height:40px}
.wh-btn{font:700 15px/1 "Fredoka",sans-serif;border:3px solid #3a2030;border-radius:999px;padding:0 14px;min-height:var(--bh,40px);cursor:pointer;
  box-shadow:0 4px 0 #3a2030;transition:transform .08s;white-space:nowrap;color:#3a2030}
.wh-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #3a2030}
.wh-btn.read{background:#ff9eb0}
.wh-btn.go{background:linear-gradient(#ffe680,#ffc21a)}
.wh-btn.go.ready{animation:whready 1s ease-in-out infinite}
@keyframes whready{50%{box-shadow:0 4px 0 #3a2030,0 0 18px 4px rgba(255,216,74,.7)}}
.wh-con{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:var(--cg,10px);padding:var(--cp,12px);box-sizing:border-box;border-radius:20px;
  border:3px solid #3a2030;background:linear-gradient(160deg,#2b2a52,#1a1838 60%,#24204a);box-shadow:0 0 0 2px rgba(120,230,255,.25) inset,0 6px 0 rgba(0,0,0,.4),0 0 24px rgba(90,200,255,.15)}
.wh-head{display:flex;justify-content:space-between;align-items:center;font:600 var(--hf,12px)/1 "Fredoka",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7fe6ff}
.wh-head i{font-style:normal;color:#ffd84a;animation:whblink 1.4s steps(2) infinite}
@keyframes whblink{50%{opacity:.3}}
.wh-slots{display:flex;justify-content:center;gap:var(--sg,8px)}
.wh-slot{width:var(--s,46px);height:calc(var(--s,46px)*1.12);border-radius:10px;border:2.5px solid rgba(127,230,255,.6);background:rgba(10,30,60,.65);box-sizing:border-box;
  display:grid;place-items:center;font:700 calc(var(--s,46px)*.6)/1 "Fredoka",sans-serif;color:#bff4ff;text-shadow:0 0 8px #3fd0ff;position:relative}
.wh-slot.cur:after{content:"";position:absolute;left:22%;right:22%;bottom:12%;height:3px;border-radius:2px;background:#ffd84a;animation:whblink 1s steps(2) infinite}
.wh-slot.pop{animation:whpop .22s cubic-bezier(.3,1.8,.5,1)}
@keyframes whpop{from{transform:scale(.6)}to{transform:scale(1)}}
.wh-slots.bad .wh-slot{border-color:#ff5a7a;color:#ffc0cc;text-shadow:0 0 8px #ff3a6a;background:rgba(80,10,30,.7)}
.wh-slots.bad{animation:whbad .45s}
@keyframes whbad{20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
.wh-slot.win{border-color:#ffd84a;color:#fff6c0;text-shadow:0 0 10px #ffd84a;background:rgba(90,70,10,.6);animation:whwin .5s cubic-bezier(.3,1.8,.5,1)}
@keyframes whwin{40%{transform:translateY(-10px) scale(1.15)}}
.wh-kb{display:flex;flex-direction:column;gap:var(--kg,5px);align-items:center}
.wh-kr{display:flex;gap:var(--kg,5px)}
.wh-key{width:var(--kw,40px);height:var(--kh,38px);border-radius:9px;border:2px solid #0a0820;background:linear-gradient(#3d3a70,#2a2754);color:#bff4ff;
  font:700 calc(var(--kh,38px)*.45)/1 "Fredoka",sans-serif;cursor:pointer;padding:0;box-shadow:0 3px 0 #0a0820,inset 0 1px 0 rgba(255,255,255,.18);transition:transform .06s,background .1s}
.wh-key:hover{background:linear-gradient(#4c4888,#34306a)}
.wh-key.hit,.wh-key:active{transform:translateY(2px);box-shadow:0 1px 0 #0a0820;background:linear-gradient(#5be0ff,#2a9ed0);color:#08142a}
.wh-key.del{width:calc(var(--kw,40px)*2 + var(--kg,5px));color:#ffb0c0}
.wh-reader{position:absolute;inset:var(--p,12px);z-index:5;display:flex;flex-direction:column;border-radius:18px;border:3px solid #3a2030;
  background:linear-gradient(#fff6e6,#ffe9cf);color:#4a2a3a;box-shadow:0 8px 0 rgba(0,0,0,.4);animation:whin .25s cubic-bezier(.3,1.5,.5,1)}
@keyframes whin{from{transform:translateY(16px) scale(.96)}}
.wh-rhead{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 6px 16px;border-bottom:2px dashed rgba(122,59,87,.35);flex:0 0 auto}
.wh-rhead b{font:700 16px/1.1 "Fredoka",sans-serif;color:#e0457f}
.wh-x{font:700 13px/1 "Fredoka",sans-serif;border:2.5px solid #3a2030;border-radius:999px;background:#fff;color:#3a2030;padding:0 12px;min-height:36px;cursor:pointer;box-shadow:0 3px 0 #3a2030}
.wh-list{flex:1 1 auto;overflow-y:auto;padding:8px 16px 12px;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.wh-list *{touch-action:pan-y}
.wh-letter{margin:0 0 10px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.7);border:2px solid rgba(255,158,176,.6)}
.wh-letter h4{margin:0 0 3px;font:700 14px/1.2 "Fredoka",sans-serif;color:#7a3b57}
.wh-letter p{margin:0;font:500 14px/1.4 "Fredoka",sans-serif;white-space:pre-wrap;-webkit-user-select:text;user-select:text}
.wh-empty{opacity:.7;font-style:italic}
.wh.phone .wh-rhead b{font-size:13px}
.wh.phone .wh-letter{padding:6px 10px;margin-bottom:7px}
.wh.phone .wh-letter h4{font-size:12px}
.wh.phone .wh-letter p{font-size:12px;line-height:1.35}
.wh.phone .wh-btn{font-size:12.5px;padding:0 10px}
`;

  function drawConsole(ctx, x, y, t, solved) {
    const O = '#3a2030';
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y, 16, 3, 0, 0, TAU); ctx.fill();
    /* pedestal */
    ctx.fillStyle = '#4a4680'; ctx.strokeStyle = O; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 5, y - 16); ctx.lineTo(x + 5, y - 16); ctx.lineTo(x + 7, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6f6ab0'; ctx.fillRect(x - 3, y - 13, 2, 10);
    /* slanted desk */
    ctx.beginPath(); ctx.moveTo(x - 15, y - 16); ctx.lineTo(x + 15, y - 16); ctx.lineTo(x + 12, y - 30); ctx.lineTo(x - 12, y - 30); ctx.closePath(); ctx.fillStyle = '#5a5498'; ctx.fill(); ctx.stroke();
    /* glowing screen */
    const glow = 0.6 + 0.4 * Math.sin(t * 3), col = solved ? '120,255,170' : '90,220,255';
    const g = ctx.createRadialGradient(x, y - 24, 1, x, y - 24, 20); g.addColorStop(0, `rgba(${col},${0.45 * glow})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 24, 20, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 10, y - 18.5); ctx.lineTo(x + 10, y - 18.5); ctx.lineTo(x + 8, y - 28); ctx.lineTo(x - 8, y - 28); ctx.closePath(); ctx.fillStyle = `rgb(${col})`; ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(10,20,50,.6)'; ctx.lineWidth = 0.8; for (let i = 0; i < 3; i++) { const yy = y - 26 + i * 2.6, w = 5 + ((Math.floor(t * 4) + i) % 3) * 2; ctx.beginPath(); ctx.moveTo(x - 6, yy); ctx.lineTo(x - 6 + w, yy); ctx.stroke(); }
    /* blinking buttons on the desk edge */
    ['#ff6f9c', '#ffd84a', '#9be7a5'].forEach((c, i) => { ctx.globalAlpha = (Math.floor(t * 3) + i) % 3 === 0 ? 1 : 0.4; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x - 6 + i * 6, y - 16.8, 1.3, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    /* antennae */
    ctx.strokeStyle = O; ctx.lineWidth = 1.2; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 10, y - 30); ctx.quadraticCurveTo(x + s * 14, y - 37, x + s * 12, y - 41); ctx.stroke(); ctx.fillStyle = (Math.floor(t * 2) % 2 === (s > 0 ? 1 : 0)) ? '#ff6f9c' : '#ffd84a'; ctx.beginPath(); ctx.arc(x + s * 12, y - 41, 2, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (!solved) { ctx.font = 'bold 9px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = O; const b = Math.sin(t * 3) * 1.5; ctx.strokeText('???', x, y - 45 + b); ctx.fillStyle = '#7fe6ff'; ctx.fillText('???', x, y - 45 + b); }
  }

  G.PZ && G.PZ.register({
    id: 'finale-wurmloch', world: 'finale', slot: 0,
    title: tr('Die Wurmloch-Koordinaten', 'The Wormhole Coordinates'),
    intro: tr('Das Wurmloch braucht ein Ziel aus 7 Buchstaben. Die Koordinaten stecken irgendwo in Mallos Briefen – lies sie ganz genau, bis zum letzten Satz!', 'The wormhole needs a destination with 8 letters. The coordinates are hidden somewhere in Mallo’s letters – read them very carefully, right to the last line!'),
    letter: tr('Wenn du je den Weg nach Hause suchst: Meine P.S. sind die Wegweiser, von Anfang an.', 'If you’re ever looking for the way home: my P.S. lines are the signposts, from the very beginning.'),
    hint: tr('Lies in jedem Brief nur das P.S. am Ende und nimm davon den allerersten Buchstaben – Brief für Brief, in der Reihenfolge der Welten. Die ersten sieben P.S. ergeben die sieben Buchstaben.', 'In every letter, read only the P.S. at the end and take its very first letter – letter by letter, in the order of the worlds. The first eight P.S. lines give you the eight letters.'),

    station(ctx, x, y, t, solved) { ctx.save(); drawConsole(ctx, x, y, t, solved); ctx.restore(); },

    mount(root, api) {
      const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
      const wrap = document.createElement('div'); wrap.className = 'wh'; root.appendChild(wrap);
      const cv = document.createElement('canvas'); cv.className = 'wh-cv'; wrap.appendChild(cv);
      const main = document.createElement('div'); main.className = 'wh-main'; wrap.appendChild(main);
      const left = document.createElement('div'); left.className = 'wh-left'; main.appendChild(left);
      const hole = document.createElement('div'); hole.className = 'wh-hole'; left.appendChild(hole);
      const bRead = document.createElement('button'); bRead.type = 'button'; bRead.className = 'wh-btn read'; bRead.textContent = tr('✉ Briefe lesen', '✉ Read letters'); left.appendChild(bRead);
      const bGo = document.createElement('button'); bGo.type = 'button'; bGo.className = 'wh-btn go'; bGo.textContent = tr('Koordinaten setzen ➜', 'Set coordinates ➜'); left.appendChild(bGo);
      const con = document.createElement('div'); con.className = 'wh-con'; main.appendChild(con);
      const head = document.createElement('div'); head.className = 'wh-head'; head.innerHTML = '<span>' + tr('◉ Wurmloch-Steuerung', '◉ Wormhole control') + '</span><span>' + tr('Ziel: ', 'Target: ') + '<i>' + '?'.repeat(NL) + '</i></span>'; con.appendChild(head);
      const slotsEl = document.createElement('div'); slotsEl.className = 'wh-slots'; con.appendChild(slotsEl);
      const slotEls = []; for (let i = 0; i < ANSWER.length; i++) { const s = document.createElement('div'); s.className = 'wh-slot'; slotsEl.appendChild(s); slotEls.push(s); }
      const kb = document.createElement('div'); kb.className = 'wh-kb'; con.appendChild(kb);
      const keyEls = {};
      ROWS.forEach((row, ri) => {
        const r = document.createElement('div'); r.className = 'wh-kr'; kb.appendChild(r);
        for (const ch of row) { const k = document.createElement('button'); k.type = 'button'; k.className = 'wh-key'; k.textContent = ch; k.addEventListener('pointerdown', e => { e.preventDefault(); if (!auto) type(ch); }); r.appendChild(k); keyEls[ch] = k; }
        if (ri === 2) { const d = document.createElement('button'); d.type = 'button'; d.className = 'wh-key del'; d.textContent = '⌫'; d.setAttribute('aria-label', tr('Löschen', 'Delete')); d.addEventListener('pointerdown', e => { e.preventDefault(); if (!auto) del(); }); r.appendChild(d); keyEls.DEL = d; }
      });
      let reader = null;

      /* --- state --- */
      let word = '', done = false, busy = false, auto = false, raf = 0, timers = [], W = 0, H = 0, dpr = 1, phone = false, t0 = performance.now();
      let flick = 0, bloom = 0, spin = 1, stars = [];
      const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
      const now = () => (performance.now() - t0) / 1000;
      const tone = (f, d, o) => { try { G.audio.tone(f, d, o); } catch (e) {} };
      const sfx = n => { try { api.sfx(n); } catch (e) {} };
      for (let i = 0; i < 120; i++) stars.push({x: Math.random(), y: Math.random(), z: 0.3 + Math.random(), tw: Math.random() * 6});

      function render() {
        slotEls.forEach((s, i) => { const ch = word[i] || ''; if (s.textContent !== ch) { s.textContent = ch; if (ch) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); } } s.classList.toggle('cur', i === word.length && !done); });
        bGo.classList.toggle('ready', word.length === ANSWER.length && !done);
        head.querySelector('i').textContent = (word + '·'.repeat(NL)).slice(0, NL);
      }
      function flashKey(k) { if (!k) return; k.classList.add('hit'); later(() => k.classList.remove('hit'), 110); }
      function type(ch) {
        if (done || busy || reader) return;
        if (word.length >= ANSWER.length) { sfx('bump'); api.msg(tr('Alle 7 Felder sind voll. Mit ⌫ löschen oder Koordinaten setzen.', 'All 8 slots are full. Delete with ⌫ or set the coordinates.'), 'info'); return; }
        slotsEl.classList.remove('bad');
        word += ch; flashKey(keyEls[ch]); tone(880 + word.length * 70, 0.05, {type: 'square', gain: 0.03}); tone(1320 + word.length * 90, 0.04, {type: 'sine', gain: 0.03, delay: 0.03});
        render();
      }
      function del() {
        if (done || busy || reader || !word.length) return; slotsEl.classList.remove('bad');
        word = word.slice(0, -1); flashKey(keyEls.DEL); tone(500, 0.06, {type: 'square', gain: 0.03, slide: 300}); render();
      }
      function submit() {
        if (done || busy || reader) return;
        if (word.length < ANSWER.length) { sfx('bump'); api.msg(tr('Das Ziel braucht genau 7 Buchstaben – es fehlen noch ' + (ANSWER.length - word.length) + '.', 'The destination needs exactly 8 letters – ' + (ANSWER.length - word.length) + ' still missing.'), 'info'); return; }
        if (word.toUpperCase() === ANSWER) { win(); return; }
        flick = performance.now(); kick();
        slotsEl.classList.remove('bad'); void slotsEl.offsetWidth; slotsEl.classList.add('bad');
        try { G.audio.noise(0.4, {type: 'bandpass', freq: 1800, freqTo: 300, gain: 0.08}); } catch (e) {}
        api.wrong(WRONG);
      }
      function win() {
        done = true; busy = true; render();
        slotEls.forEach((s, i) => later(() => { s.classList.add('win'); tone(392 * Math.pow(2, SCALE[i] / 12), 0.25, {type: 'triangle', gain: 0.07}); }, i * 90));
        later(() => { bloom = performance.now(); spin = 4; kick(); sfx('globeGo'); api.msg(tr('Koordinaten akzeptiert: ' + ANSWER + '. Das Wurmloch öffnet sich!', 'Coordinates accepted: ' + ANSWER + '. The wormhole opens!'), 'good'); }, ANSWER.length * 90 + 80);
        later(() => api.solved(), ANSWER.length * 90 + 700);
      }
      bGo.addEventListener('click', () => { if (!auto) submit(); });

      /* --- letter reader --- */
      function openReader() {
        if (reader || done) return; sfx('select');
        reader = document.createElement('div'); reader.className = 'wh-reader';
        const h = document.createElement('div'); h.className = 'wh-rhead'; reader.appendChild(h);
        const b = document.createElement('b'); b.textContent = tr('✉ Mallos Briefe', '✉ Mallo’s letters'); h.appendChild(b);
        const x = document.createElement('button'); x.type = 'button'; x.className = 'wh-x'; x.textContent = tr('Zur Konsole', 'Back to console'); h.appendChild(x);
        const list = document.createElement('div'); list.className = 'wh-list'; reader.appendChild(list);
        let L = []; try { L = api.letters() || []; } catch (e) { L = []; }
        if (!L.length) { const p = document.createElement('p'); p.className = 'wh-empty'; p.textContent = tr('Du hast noch keine Briefe von Mallo gelesen.', 'You have not read any letters from Mallo yet.'); list.appendChild(p); }
        L.forEach((l, i) => {
          const a = document.createElement('div'); a.className = 'wh-letter';
          const t = document.createElement('h4'); t.textContent = (l && l.title) || (tr('Brief ', 'Letter ') + (i + 1)); a.appendChild(t);
          const p = document.createElement('p'); p.textContent = (l && l.text) || ''; a.appendChild(p);
          list.appendChild(a);
        });
        x.addEventListener('click', closeReader);
        wrap.appendChild(reader);
      }
      function closeReader() { if (!reader) return; reader.remove(); reader = null; sfx('select'); }
      bRead.addEventListener('click', () => { if (auto) return; reader ? closeReader() : openReader(); });

      function onKey(e) {
        if (done || auto || e.ctrlKey || e.metaKey || e.altKey) return;
        if (reader) { if (e.key === 'Enter') { closeReader(); e.preventDefault(); } return; }
        if (e.key === 'Backspace' || e.key === 'Delete') { del(); e.preventDefault(); return; }
        if (e.key === 'Enter') { submit(); e.preventDefault(); return; }
        if (!e.key || e.key.length !== 1) return;
        const k = e.key.toUpperCase();
        if (KEYRX.test(k)) { type(k); e.preventDefault(); }
      }
      document.addEventListener('keydown', onKey);

      /* --- wormhole + stars canvas --- */
      function holeRect() { const a = hole.getBoundingClientRect(), b = wrap.getBoundingClientRect(); return {x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, r: Math.max(20, Math.min(a.width, a.height) / 2 - 4)}; }
      function draw() {
        const c = cv.getContext('2d'), t = now(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
        for (const s of stars) { c.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(t * 1.5 + s.tw)) * s.z; c.fillStyle = s.z > 1 ? '#fff' : '#bcd2ff'; const k = s.z > 1 ? 1.8 : 1.1; c.fillRect(s.x * W, s.y * H, k, k); }
        c.globalAlpha = 1;
        const {x, y, r} = holeRect(), pt = performance.now();
        const fl = flick && pt - flick < 700 ? 1 - (pt - flick) / 700 : 0, bl = bloom ? Math.min(1, (pt - bloom) / 900) : 0;
        const jit = fl ? (Math.random() - 0.5) * r * 0.08 * fl : 0;
        c.save(); c.translate(x + jit, y);
        /* outer glow */
        const og = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.25);
        og.addColorStop(0, fl ? `rgba(255,80,120,${0.5 * fl})` : 'rgba(120,90,255,.0)'); og.addColorStop(0.6, fl ? 'rgba(255,60,100,.35)' : `rgba(110,80,255,${0.35 + bl * 0.4})`); og.addColorStop(1, 'rgba(60,40,160,0)');
        c.fillStyle = og; c.beginPath(); c.arc(0, 0, r * 1.25, 0, TAU); c.fill();
        /* spiral arms */
        const arms = 5, rot = t * 0.9 * spin + (bl * 6);
        for (let a = 0; a < arms; a++) {
          c.beginPath();
          for (let i = 0; i <= 60; i++) { const f = i / 60, ang = rot + a * TAU / arms + f * 4.2, rr = r * (0.12 + f * 0.88); const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr * 0.92; i ? c.lineTo(px, py) : c.moveTo(px, py); }
          c.strokeStyle = fl ? `rgba(255,${120 - fl * 80},${160 - fl * 60},.75)` : a % 2 ? 'rgba(127,230,255,.75)' : 'rgba(200,140,255,.75)';
          c.lineWidth = Math.max(2, r * 0.06); c.lineCap = 'round'; c.stroke();
        }
        /* rim */
        c.lineWidth = Math.max(3, r * 0.08); c.strokeStyle = '#3a2030'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
        c.lineWidth = Math.max(2, r * 0.05); const rg = c.createLinearGradient(-r, -r, r, r); rg.addColorStop(0, '#7fe6ff'); rg.addColorStop(0.5, '#c58cff'); rg.addColorStop(1, '#ff9eb0'); c.strokeStyle = rg; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
        /* one coordinate lamp per letter around the rim (same arc for 7 or 8) */
        for (let i = 0; i < NL; i++) {
          const ang = -Math.PI / 2 + (i - (NL - 1) / 2) * 1.92 / (NL - 1), lx = Math.cos(ang) * (r + r * 0.02), ly = Math.sin(ang) * (r + r * 0.02), on = i < word.length;
          c.fillStyle = done ? '#ffd84a' : on ? '#7fe6ff' : '#2a2754'; c.strokeStyle = '#0a0820'; c.lineWidth = 1.5;
          c.beginPath(); c.arc(lx, ly, Math.max(3, r * 0.07), 0, TAU); c.fill(); c.stroke();
        }
        /* core */
        const cg = c.createRadialGradient(0, 0, 0, 0, 0, r * (0.3 + bl * 0.8)); cg.addColorStop(0, '#fff'); cg.addColorStop(0.35, bl ? '#fff6c0' : '#d8f6ff'); cg.addColorStop(1, 'rgba(120,200,255,0)');
        c.fillStyle = cg; c.beginPath(); c.arc(0, 0, r * (0.3 + bl * 0.8), 0, TAU); c.fill();
        c.restore();
        if (bl) { c.fillStyle = `rgba(255,255,255,${Math.max(0, 0.6 - Math.abs(bl - 0.5)) })`; c.fillRect(0, 0, W, H); }
      }
      function loop() { raf = 0; draw(); const pt = performance.now(); if (!done || (bloom && pt - bloom < 1200)) raf = requestAnimationFrame(loop); }
      function kick() { if (!raf) raf = requestAnimationFrame(loop); }

      function layout() {
        W = wrap.clientWidth; H = wrap.clientHeight; if (!W || !H) return;
        dpr = Math.min(2, window.devicePixelRatio || 1); phone = H < 320; wrap.classList.toggle('phone', phone);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        const p = phone ? 7 : 12, g = phone ? 8 : 14;
        const lw = Math.round(Math.min(phone ? 180 : 290, W * (phone ? 0.24 : 0.32)));
        const conW = W - p * 2 - g - lw, conH = H - p * 2;
        const cp = phone ? 7 : 12, cg = phone ? 5 : 10, hf = phone ? 10 : 12;
        const kg = phone ? 4 : 5;
        const kw = Math.floor(Math.min(56, (conW - cp * 2 - 6 - kg * (KMAX - 1)) / KMAX));
        const s = Math.floor(Math.min(phone ? 40 : 52, (conW - cp * 2 - NL * 8) / NL, (conH - cp * 2 - hf - cg * 3) * 0.24));
        const kh = Math.floor(Math.min(phone ? 40 : 46, kw * 1.1, (conH - cp * 2 - hf - s * 1.12 - cg * 3 - kg * 2 - 6) / 3));
        const set = (k, v) => wrap.style.setProperty(k, v);
        set('--p', p + 'px'); set('--g', g + 'px'); set('--lw', lw + 'px'); set('--cp', cp + 'px'); set('--cg', cg + 'px'); set('--hf', hf + 'px');
        set('--kg', kg + 'px'); set('--kw', kw + 'px'); set('--kh', Math.max(28, kh) + 'px'); set('--s', s + 'px'); set('--sg', (phone ? 6 : 8) + 'px'); set('--bh', (phone ? 36 : 42) + 'px');
        draw();
      }
      render(); layout(); kick();
      let ro = null; try { ro = new ResizeObserver(() => layout()); ro.observe(root); } catch (e) { window.addEventListener('resize', layout); }

      return {
        destroy() { done = true; timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = 0; document.removeEventListener('keydown', onKey); if (ro) ro.disconnect(); else window.removeEventListener('resize', layout); },
        autoSolve() {
          if (done || auto) return; auto = true; busy = false; closeReader(); word = ''; slotsEl.classList.remove('bad'); render();
          ANSWER.split('').forEach((ch, i) => later(() => { busy = false; type(ch); }, 100 + i * 110));
          later(() => submit(), 100 + ANSWER.length * 110 + 150);
        },
      };
    },
  });
})();

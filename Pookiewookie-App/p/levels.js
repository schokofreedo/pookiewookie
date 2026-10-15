/* The Starway Home: level generator. 24 levels (6 worlds x 4), assembled from hand-designed chunks with a fixed seed each,
   difficulty rising with the level index. Tower levels (4th of each world) end in a boss arena.
   Tile legend (rows 0..14): '#' ground, '=' block, '?' heart box, '!' power box, 'X' used box, 'n' pipe rim, '|' pipe body, 'q' teleporter pad, 'y' disco block,
   '~' liquid hazard, 's' slow ground, 'i' ice, 'o' heart, '*' star cookie, 'F' goal post, 'W' tower door, 'Z' boss gate (solid until the boss falls),
   'R' start, 'K' checkpoint, 'v' vine (climbable), 'b' bouncy mushroom, 'c' crumbling platform, 'A' arena marker,
   entities: 'E' walker, 'G' flyer, 'M' spiky, 'S' pipe hazard, 'C' horizontal platform, 'V' vertical platform, 'T' thrower, 'J' liquid jumper, 'D' dropper, 'B' boss,
   decor: 'p' tree-ish, 'h' bush-ish, 'f' signpost, 'd' world decor, 'c' is NOT decor here, 'Q' cottage, 'U' tower */
(function () {
  const G = window.PW = window.PW || {};
  const H = 15;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const empty = () => Array(H).fill('-');

  /* ---------- the techno disco (bonus room): a new layout on every load (Math.random, not the level seed) ----------
     A 30x15 box (walls, ceiling row 0, floor rows 13-14). The teleporter pad sits in the floor (left, centre or right), the rest
     is split into two or three zones with different set pieces: equalizer bars, speaker stairs, a DJ booth, a bass trampoline,
     an LED pyramid, hanging neon bars, plus heart shapes. Solid set pieces are 'y' tiles; b.props tells draw.js how to paint them.
     Jump + double jump reach every heart (checked by #flow 'disco-reach'). */
  const PATS = {
    heart: ['.oo.oo.', 'ooooooo', 'ooooooo', '.ooooo.', '..ooo..', '...o...'],
    mini: ['oo.oo', 'ooooo', '.ooo.', '..o..'],
    diamond: ['..o..', '.ooo.', 'ooooo', '.ooo.', '..o..'],
    ring: ['.ooo.', 'o...o', 'o...o', 'o...o', '.ooo.'],
    notes: ['.oooo', '.o..o', '.o..o', 'oo.oo', 'oo.oo'],
    arrow: ['..o..', '.ooo.', 'o.o.o', '..o..', '..o..'],
    star: ['..o..', 'ooooo', '.ooo.', '.o.o.', 'o...o'],
    smile: ['.o...o.', '.......', 'o.....o', '.o...o.', '..ooo..'],
  };
  const DISCO_MUSIC = [{pattern: 1, transpose: 0}, {pattern: 1, transpose: -3}, {pattern: 3, transpose: 2}, {pattern: 0, transpose: 2}];
  function discoRoom(cols, b) {
    const R = Math.random, ri = n => Math.floor(R() * n), pick = a => a[ri(a.length)], x0 = b.roomCol, props = b.props = [], busy = new Set();
    const at = (x, y) => cols[x0 + x][y];
    const free = (x, y) => x >= 1 && x <= 28 && y >= 1 && y <= 12 && at(x, y) === '-' && !busy.has(x * 16 + y);
    const set = (x, y, ch) => { if (x >= 1 && x <= 28 && y >= 1 && y <= 12) cols[x0 + x][y] = ch; };
    /* reach: from a spot to stand on, jump + double jump touch hearts up to 6 rows higher and 4 columns aside; a bass speaker reaches the ceiling */
    const sol = (x, y) => x < 1 || x > 28 || y < 1 || y > 12 || '#yqb?gX'.includes(at(x, y));
    const reach = (x, y) => { for (let c = Math.max(1, x - 4); c <= Math.min(28, x + 4); c++) for (let s = 1; s <= 12; s++) if (!sol(c, s) && sol(c, s + 1)) { if (s + 1 <= 12 && at(c, s + 1) === 'b') return true; if (s - y <= 6) return true; break; } return false; };
    const heart = (x, y) => { if (free(x, y) && reach(x, y)) cols[x0 + x][y] = 'o'; };
    const solid = (k, x, y, w, h, o) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) set(x + i, y + j, 'y'); props.push(Object.assign({k, x, y, w, h, hue: ri(24)}, o)); };
    const fits = (pat, x, y) => {   /* free, reachable, and a one-tile gap to other hearts so every shape stays readable */
      const pw = pat[0].length, ph = pat.length;
      for (let j = -1; j <= ph; j++) for (let i = -1; i <= pw; i++) { const X = x + i, Y = y + j; if (i >= 0 && j >= 0 && i < pw && j < ph) { if (!free(X, Y) || (pat[j][i] === 'o' && !reach(X, Y))) return false; } else if (X >= 1 && X <= 28 && Y >= 1 && Y <= 12 && at(X, Y) === 'o') return false; }
      return true;
    };
    const stamp = (pat, x, y) => pat.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'o') heart(x + i, y + j); });
    const place = (pat, a, w, y0, y1) => { const pw = pat[0].length; for (let k = 0; k < 40; k++) { const x = a + ri(Math.max(1, w - pw + 1)), y = y0 + ri(Math.max(1, y1 - y0 + 1)); if (fits(pat, x, y)) { stamp(pat, x, y); return true; } } return false; };
    for (let x = 1; x <= 28; x++) { for (let y = 1; y <= 12; y++) cols[x0 + x][y] = '-'; cols[x0 + x][13] = '#'; }
    /* the pad: two tiles in the floor; its light column stays free */
    const px = pick([3, 13, 25]); cols[x0 + px][13] = 'q'; cols[x0 + px + 1][13] = 'q'; b.padCol = px;
    for (let x = px - 1; x <= px + 2; x++) for (let y = 8; y <= 12; y++) busy.add(x * 16 + y);
    const ARCH = {
      eq(a, w) {   /* equalizer bars of different heights, hearts on top */
        const bw = w >= 11 && R() < 0.45 ? 2 : 1, n = Math.floor((w + 1) / (bw + 1)), off = a + Math.floor((w - (n * (bw + 1) - 1)) / 2), ph = R() * 6.3, fq = 0.55 + R() * 0.7;
        for (let i = 0; i < n; i++) {
          const h = Math.max(1, Math.min(4, Math.round(2.4 + Math.sin(ph + i * fq) * 1.7 + (R() - 0.5) * 0.8))), x = off + i * (bw + 1);
          solid('eq', x, 13 - h, bw, h); for (let k = 0; k < bw; k++) { heart(x + k, 12 - h); if (h >= 2) heart(x + k, 11 - h); }
          if (i < n - 1 && R() < 0.5) heart(x + bw, 12);
        }
        if (R() < 0.5) for (let x = a; x < a + w; x++) heart(x, 5 + Math.round(Math.sin(x * 0.9 + ph)));
        else place(pick([PATS.mini, PATS.diamond, PATS.arrow, PATS.smile]), a, w, 1, 4);
      },
      speakers(a, w) {   /* a speaker stack on the floor, then hanging speaker boxes stepping up */
        const dir = R() < 0.5 ? 1 : -1, n = w >= 11 ? 3 : 2; let x = dir > 0 ? a : a + w - 2, y = 11;
        solid('spk', x, 11, 2, 2); heart(x, 10); heart(x + 1, 10);
        for (let s = 0; s < n; s++) { const nx = x + dir * (3 + (w >= 12 ? ri(2) : 0)); if (nx < Math.max(a, 2) || nx + 1 > a + w - 1) break; x = nx; y -= 3; solid('spk', x, y, 2, 2, {hang: true}); heart(x, y - 1); heart(x + 1, y - 1); }
        place(pick([PATS.ring, PATS.diamond, PATS.notes, PATS.mini]), a, w, 1, 6);
      },
      booth(a, w) {   /* the DJ booth on a stage, a neon bar above it, music in the air */
        const sw = Math.min(w - 2, 6 + ri(3)), sx = a + Math.floor((w - sw) / 2);
        solid('stage', sx, 11, sw, 2); props.push({k: 'dj', x: sx, y: 11, w: sw, h: 0, hue: ri(24)});
        heart(sx, 10); heart(sx + sw - 1, 10);
        const bw = Math.min(4, sw - 2), bx = sx + Math.floor((sw - bw) / 2);
        solid('bar', bx, 7, bw, 1, {hang: true}); for (let i = 0; i < bw; i++) heart(bx + i, 6);
        place(pick([PATS.notes, PATS.mini, PATS.smile, PATS.diamond]), a, w, 1, 1);
      },
      bass(a, w) {   /* a bass speaker trampoline shoots Toffo up to a big heart shape */
        const bx = a + Math.floor(w / 2) - 1; set(bx, 12, 'b'); set(bx + 1, 12, 'b'); props.push({k: 'bass', x: bx, y: 12, w: 2, h: 1, hue: ri(24)});
        const pat = pick(w >= 8 ? [PATS.heart, PATS.ring, PATS.diamond, PATS.star, PATS.smile] : [PATS.ring, PATS.diamond, PATS.star, PATS.mini]);
        stamp(pat, bx + 1 - Math.floor(pat[0].length / 2), 1 + ri(2));
        heart(bx - 1, 9); heart(bx + 2, 9); heart(bx - 2, 11); heart(bx + 3, 11);
      },
      steps(a, w) {   /* an LED cube pyramid with an arrow or a diamond over the top */
        const n = Math.min(w - 1, 7 + (w >= 10 ? 2 : 0)), sx = a + Math.floor((w - n) / 2);
        for (let i = 0; i < n; i++) { const h = Math.min(4, 1 + Math.min(i, n - 1 - i)); solid('cube', sx + i, 13 - h, 1, h); heart(sx + i, 12 - h); }
        place(pick([PATS.arrow, PATS.diamond, PATS.mini, PATS.star]), sx, n, 2, 3);
      },
      bars(a, w) {   /* hanging neon bars zig-zag up, hearts on top of each */
        const span = Math.min(w, 10), xL = a + Math.floor((w - span) / 2), xR = xL + span - 3, left = R() < 0.5;
        [11, 8, 5].forEach((y, i) => { const x = ((i % 2 === 0) === left) ? xL : xR; solid('bar', x, y, 3, 1, {hang: y < 11}); for (let k = 0; k < 3; k++) heart(x + k, y - 1); });
        place(pick([PATS.mini, PATS.smile, PATS.diamond]), a, w, 1, 1);
      },
    };
    const MINW = {eq: 6, speakers: 7, booth: 8, bass: 5, steps: 7, bars: 7};
    /* the floor beside the pad is split into two or three zones (one free column between them), each gets a different set piece */
    const spans = px === 3 ? [[6, 23]] : (px === 13 ? [[1, 11], [16, 13]] : [[1, 23]]), zones = [];
    for (const [a, w] of spans) {
      if (w >= 20 && R() < 0.45) { const w1 = 7 + ri(2), w2 = 7 + ri(2); zones.push([a, w1 - 1], [a + w1, w2 - 1], [a + w1 + w2, w - w1 - w2]); }
      else if (w >= 20) { const w1 = 9 + ri(w - 17); zones.push([a, w1 - 1], [a + w1, w - w1]); }
      else zones.push([a, w]);
    }
    const pool = Object.keys(ARCH); for (let i = pool.length - 1; i > 0; i--) { const j = ri(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    b.sets = [];
    for (const [a, w] of zones) { const k = pool.find(k => MINW[k] <= w && !b.sets.includes(k)) || 'eq'; b.sets.push(k); ARCH[k](a, w); }
    /* a gift over free floor (most of the time): a gadget capsule or a heart box */
    const gift = R(); if (gift < 0.85) { const spots = []; for (let x = 2; x <= 27; x++) { let ok = at(x, 13) === '#'; for (let y = 8; y <= 12 && ok; y++) ok = free(x, y); if (ok) spots.push(x); } if (spots.length) set(pick(spots), 9, gift < 0.5 ? 'g' : '?'); }
    heart(px - 1, 7); heart(px, 6); heart(px + 1, 6); heart(px + 2, 7);   /* a little arc over the pad */
    /* more shapes wherever they fit and can be reached */
    const extra = [PATS.heart, PATS.mini, PATS.diamond, PATS.ring, PATS.notes, PATS.arrow, PATS.star, PATS.smile];
    for (let k = 0, n = 3 + ri(2); k < 30 && n > 0; k++) if (place(pick(extra), 1, 28, 1, 8)) n--;
    /* still a small room? heart arcs over the free stretches of the dance floor */
    let cnt = 0; for (let x = 1; x <= 28; x++) for (let y = 1; y <= 12; y++) if (at(x, y) === 'o') cnt++;
    for (let x = 1; x <= 26 && cnt < 48; x++) { let n = 0; while (x + n <= 28 && free(x + n, 12) && free(x + n, 11) && free(x + n, 10) && at(x + n, 13) === '#') n++; for (let s = 0; n - s >= 3; s += 6) { const len = Math.min(5, n - s); for (let i = 0; i < len; i++) { const y = 11 - Math.round(Math.sin((i + 0.5) / len * Math.PI) * 1.4); if (free(x + s + i, y)) { cols[x0 + x + s + i][y] = 'o'; cnt++; } } } x += n; }
    /* the look: palette, LED wall program, floor program, disco ball, lasers, music */
    b.theme = ri(4); b.wall = ri(4); b.floor = ri(3); b.ball = 6 + ri(18); b.ballLen = 18 + ri(14); b.lasers = R() < 0.75; b.music = pick(DISCO_MUSIC);
    b.hearts = 0; for (let x = 1; x <= 28; x++) for (let y = 1; y <= 12; y++) if (at(x, y) === 'o') b.hearts++;
    return b;
  }
  G.discoRoom = discoRoom;

  function build(wi, li, seedExtra, Wover) {
    const W = Wover || G.WORLDS[wi], d = Math.min(23, Math.round((wi * 4 + li) * 0.66)), tower = li === 3;
    const r = rng(9000 + wi * 311 + li * 97 + (seedExtra || 0)), cols = [];
    const push = c => cols.push(c);
    const gapW = 2 + Math.min(3, Math.floor(d / 6));              // 2..5 columns
    const dens = 0.18 + d * 0.02;                                   // enemy density
    const hazP = 0.25 + d * 0.025;                                  // hazard on pipes
    const plat = d < 8 ? 4 : (d < 16 ? 5 : 6);                      // platform pitch over liquid
    const groundBase = () => { const c = empty(); c[13] = W.ice && r() < 0.35 ? 'i' : '#'; c[14] = '#'; return c; };
    const enemyChar = () => { const x = r(); if (x < 0.5) return 'E'; if (x < 0.75) return 'G'; if (x < 0.9 && d > 2) return 'M'; return 'E'; };
    const ground = (n, o = {}) => {
      for (let i = 0; i < n; i++) {
        const c = groundBase();
        if (o.deco && i % 5 === 2 && r() < 0.6) c[12] = ['p', 'h', 'f', 'd', 'p'][Math.floor(r() * 5)];
        if (o.enemies && i > 1 && i < n - 2 && r() < o.enemies) c[12] = enemyChar();
        if (o.hearts && i > 0 && i < n - 1 && r() < 0.35) c[9 + Math.floor(r() * 2)] = 'o';
        if (o.thrower && i === Math.floor(n / 2) && W.ents.T) c[12] = 'T';
        if (o.dropper && i === Math.floor(n / 2) && W.ents.D) c[6] = 'D';
        push(c);
      }
    };
    const gap = n => { for (let i = 0; i < n; i++) push(empty()); };
    const liquid = (n, platforms) => {
      for (let i = 0; i < n; i++) {
        const c = empty(); c[13] = '~'; c[14] = '~';
        if (platforms && i % plat === 2) c[10] = '=';
        if (platforms && i % plat === 3) { c[10] = '='; if (r() < 0.6) c[8] = 'o'; }
        if (W.ents.J && i % 5 === 1 && r() < 0.35 + d * 0.015) c[12] = 'J';
        push(c);
      }
    };
    const slow = n => { for (let i = 0; i < n; i++) { const c = empty(); c[13] = 's'; c[14] = '#'; if (i === Math.floor(n / 2)) c[12] = 'E'; push(c); } };
    const pipe = (h, hazard) => { for (let k = 0; k < 2; k++) { const c = groundBase(); for (let y = 13 - h; y < 13; y++) c[y] = y === 13 - h ? 'n' : '|'; if (hazard && k === 0) c[12 - h] = 'S'; push(c); } };
    const boxes = (pattern, row = 9) => { for (const ch of pattern) { const c = groundBase(); if (ch !== '-') c[row] = ch; if (ch === '=' && r() < 0.3) c[12] = 'E'; push(c); } };
    const stairs = (h, dir) => { for (let i = 0; i < h; i++) { const c = groundBase(); const hh = dir > 0 ? i + 1 : h - i; for (let y = 13 - hh; y < 13; y++) c[y] = '='; push(c); } };
    const plateau = (n, h, hearts) => { for (let i = 0; i < n; i++) { const c = empty(); for (let y = 13 - h; y <= 14; y++) c[y] = (y === 13 - h && W.ice && r() < 0.4) ? 'i' : '#'; if (hearts && i % 2 === 1) c[11 - h] = 'o'; if (i === Math.floor(n / 2) && n > 4) c[12 - h] = r() < 0.5 ? 'G' : 'E'; push(c); } };
    const movers = n => { for (let i = 0; i < n; i++) { const c = empty(); if (i === 1 || i === n - 3 || (n > 9 && i === Math.floor(n / 2) - 1)) c[11] = 'C'; push(c); } };
    const lift = n => { for (let i = 0; i < n; i++) { const c = empty(); if (i === Math.floor(n / 2)) c[9] = 'V'; if (i === n - 1) { for (let y = 7; y <= 14; y++) c[y] = y === 7 ? '#' : '#'; } push(c); } for (let i = 0; i < 3; i++) { const c = empty(); for (let y = 7; y <= 14; y++) c[y] = '#'; if (i === 1) c[5] = 'o'; push(c); } stairsDown(6); };
    const stairsDown = h => { for (let i = 0; i < h; i++) { const c = empty(); const top = 7 + i; for (let y = top; y <= 14; y++) c[y] = '#'; push(c); } };
    const heartArc = n => { const start = cols.length - n; for (let i = 0; i < n; i++) { const c = cols[start + i]; if (!c) continue; const y = 8 + Math.round(Math.abs(i - (n - 1) / 2) * 0.9); if (c[y] === '-') c[y] = 'o'; } };
    let starBudget = 3;
    const starOr = () => { if (starBudget > 0) { starBudget--; return '*'; } return 'o'; };
    const vineClimb = () => {   // a vine up to a high ledge with hearts, then a drop
      ground(2); const c = groundBase(); for (let y = 4; y < 13; y++) c[y] = 'v'; push(c);
      for (let i = 0; i < 4; i++) { const k = empty(); k[4] = '='; k[2] = i === 1 ? starOr() : 'o'; k[13] = '#'; k[14] = '#'; if (i === 2) k[12] = 'E'; push(k); }
      ground(2);
    };
    const bouncy = () => { ground(2); const c = groundBase(); c[12] = 'b'; push(c); ground(1); for (let i = 0; i < 3; i++) { const k = groundBase(); k[6] = '='; k[4] = i === 1 ? starOr() : 'o'; push(k); } ground(3, {hearts: true}); };
    const crumble = n => { ground(2); for (let i = 0; i < n; i++) { const c = empty(); if (i % 2 === 0) c[11] = 'c'; else if (r() < 0.5) c[8] = 'o'; if (W.ents.J && i % 4 === 1) c[12] = 'J'; c[13] = '~'; c[14] = '~'; push(c); } ground(2); };
    const icy = n => { for (let i = 0; i < n; i++) { const c = empty(); c[13] = 'i'; c[14] = '#'; if (i > 1 && i < n - 2 && r() < dens) c[12] = enemyChar(); push(c); } };
    const post = () => { const c = groundBase(); for (let y = 4; y < 13; y++) c[y] = 'F'; push(c); };
    const cottage = () => { const c = groundBase(); c[12] = 'Q'; push(c); };
    const capsule = () => { ground(3, {deco: true}); const c = groundBase(); c[9] = 'g'; push(c); ground(3, {hearts: true}); };
    const cannon = () => {       // honey cannon over a wide gap: Toffo walks in, gets shot across, lands on a heart carpet
      ground(3); const c = groundBase(); c[12] = 'N'; push(c); gap(8);
      for (let i = 0; i < 6; i++) { const k = groundBase(); if (i >= 1 && i <= 4) k[10] = 'o'; push(k); }
    };
    /* ---------- vertical sections ---------- */
    const DEEP = 30;                       // rows of a level that has a cave layer (band 0..14, cave 15..29)
    const deepCols = new Set(), vchunks = [], reserved = new Set();
    const reserve = (a, b) => { for (let x = a; x < b; x++) reserved.add(x); };
    const deepCol = () => Array(DEEP).fill('-');
    /* Kletter-Kamin: a free-standing pillar and a high plateau form a chimney; wall-jump or hop the alternating ledges up,
       cross the plateau (hearts, an enemy), then drop down the far side. Ledge spacing grows with difficulty. */
    const kamin = () => {
      const top = d < 4 ? 7 : (d < 10 ? 5 : 3), sp = d < 4 ? 3 : (d < 12 ? 4 : 5);
      ground(3, {hearts: true});
      const x0 = cols.length * 16, rs = cols.length;
      const pillar = groundBase(); for (let y = top; y < 13; y++) pillar[y] = '#'; push(pillar);
      const w = 3; const shaft = [];
      for (let i = 0; i < w; i++) { const c = groundBase(); push(c); shaft.push(c); }
      /* alternating ledges: left (against the pillar) and right (against the plateau) */
      let side = 1;
      for (let y = 13 - sp; y > top + 1; y -= sp) { const c = side > 0 ? shaft[w - 1] : shaft[0]; c[y] = '='; if (r() < 0.6) { const o = side > 0 ? shaft[w - 2] : shaft[1]; if (o[y - 2] === '-') o[y - 2] = 'o'; } side = -side; }
      const n = 9 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) { const c = empty(); for (let y = top; y <= 14; y++) c[y] = (y === top && W.ice && r() < 0.4) ? 'i' : '#'; if (i % 2 === 1 && i < n - 1) c[top - 2] = 'o'; if (i === Math.floor(n / 2)) c[top - 1] = d > 5 && r() < 0.4 ? 'M' : 'E'; if (i === n - 2 && r() < 0.5) c[top - 4] = starOr(); push(c); }
      vchunks.push({x0, exitX: (cols.length - 2) * 16 + 2, exitY: top * 16 - 14});
      stairsDownFrom(top); reserve(rs - 1, cols.length + 1);
      ground(2);
    };
    const stairsDownFrom = top => { for (let y = top + 2; y <= 13; y += 2) { const c = empty(); for (let k = y; k <= 14; k++) c[k] = '#'; push(c); } };
    /* Höhle: a mountain blocks the way; a shaft in front of it leads down into a cave (camera follows), the cave runs under the
       mountain, and a chimney with ledges (double jumps!) or wall jumps climbs back up to the surface on the far side. */
    const hoehle = () => {
      const floor = 27, ceil = 19, sp = d < 6 ? 4 : 5, len = 16 + Math.min(14, d);
      ground(3);
      const x0 = cols.length * 16, rs = cols.length;
      /* shaft: three columns open from the surface down into the cave, hearts to collect while falling */
      for (let i = 0; i < 3; i++) { const c = deepCol(); for (let y = floor; y < DEEP; y++) c[y] = '#'; if (i === 1) { c[16] = 'o'; c[19] = 'o'; c[22] = 'o'; } deepCols.add(cols.length); push(c); }
      /* cave under the mountain */
      const pool = len > 18 ? 6 + Math.floor(r() * (len - 14)) : -1;
      for (let i = 0; i < len; i++) {
        const c = deepCol(); for (let y = 0; y <= ceil; y++) c[y] = '#'; for (let y = floor; y < DEEP; y++) c[y] = '#';
        if (i >= pool && i < pool + 3) { c[floor] = '~'; c[floor + 1] = '~'; if (i === pool + 1) c[floor - 3] = '='; }
        else if (i > 2 && i < len - 3 && i % 3 === 0 && r() < 0.35 + d * 0.012) { const e = enemyChar(); c[floor - 1] = e === 'G' ? 'E' : e; }
        if (i % 3 === 1) c[floor - 3 - (i % 2)] = 'o';
        if (i === Math.floor(len * 0.6)) { c[floor - 4] = '='; c[floor - 6] = starOr(); }
        if (W.ents.D && i % 7 === 4) c[ceil + 1] = 'D';
        deepCols.add(cols.length); push(c);
      }
      /* chimney back up: four columns, alternating ledges, the surface continues to the right */
      const ch = []; for (let i = 0; i < 4; i++) { const c = deepCol(); for (let y = floor; y < DEEP; y++) c[y] = '#'; deepCols.add(cols.length); push(c); ch.push(c); }
      let side = -1; for (let y = floor - sp; y > 13; y -= sp) { const a = side < 0 ? 0 : 2; ch[a][y] = '='; ch[a + 1][y] = '='; if (r() < 0.7) ch[side < 0 ? 3 : 0][y - 2] = 'o'; side = -side; }
      vchunks.push({x0, exitX: (cols.length + 1) * 16 + 2, exitY: 13 * 16 - 14}); reserve(rs - 1, cols.length + 1);
      ground(3, {hearts: true});
    };
    /* Rätsel-Tor: the puzzle station ('§') and a gate ('z', solid up into the sky) that only opens when the puzzle is solved */
    let pz = null;
    const pzGate = id => { ground(4, {deco: true}); const st = groundBase(); st[12] = '§'; push(st); ground(3); const gc = cols.length; const g = groundBase(); for (let y = 0; y < 13; y++) g[y] = 'z'; push(g); pz = {id, stationCol: gc - 4, gateCol: gc}; reserve(gc - 6, gc + 2); ground(3, {hearts: true}); };
    /* Schokowasserfall: grab the parachute, jump off the cliff, steer down through the waterfall past ledges, nuts and bonbons,
       land beside the hot-chocolate pool, then bounce back up on mushrooms. */
    let waterfall = null;
    const waterfallChunk = () => {
      const depth = 54, wd = 14, rowsN = depth + 4, col = () => Array(rowsN).fill('-');
      ground(3, {hearts: true}); const pc = groundBase(); pc[12] = 'u'; push(pc); ground(3);
      const x0 = cols.length;
      for (let i = 0; i < wd; i++) {
        const c = col(); for (let y = depth; y < rowsN; y++) c[y] = '#';
        if (i >= 4 && i <= 9) { c[depth] = '~'; c[depth + 1] = '~'; }
        deepCols.add(cols.length); push(c);
      }
      /* outcrops from alternating walls, hearts in the free lane, nuts and bonbons as moving obstacles */
      let side = 0;
      for (let y = 20; y < depth - 6; y += 6) {
        const w = 4 + Math.floor(r() * 3);
        for (let k = 0; k < w; k++) { const c = cols[side === 0 ? x0 + k : x0 + wd - 1 - k]; c[y] = '#'; c[y + 1] = '#'; }
        if (r() < 0.55) cols[side === 0 ? x0 + 1 : x0 + wd - 3][y - 1] = 'M';
        for (let k = 0; k < 3; k++) { const c = cols[side === 0 ? x0 + wd - 3 - k : x0 + 2 + k]; c[y - 2 + k] = 'o'; }
        if (r() < 0.6) cols[x0 + 5 + Math.floor(r() * 4)][y + 3] = 'G';
        side = 1 - side;
      }
      cols[x0 + 7][Math.floor(depth * 0.6)] = starOr();
      /* bottom tunnel to the right */
      for (let i = 0; i < 5; i++) { const c = col(); for (let y = 0; y < depth - 4; y++) c[y] = '#'; for (let y = depth; y < rowsN; y++) c[y] = '#'; if (i === 2) c[depth - 2] = 'o'; deepCols.add(cols.length); push(c); }
      /* mushroom chimney back up to the surface */
      const ch = []; for (let i = 0; i < 4; i++) { const c = col(); for (let y = depth; y < rowsN; y++) c[y] = '#'; deepCols.add(cols.length); push(c); ch.push(c); }
      /* mushroom ledges every 8 rows, alternating sides; the topmost sits on the right so the last bounce lands on the surface */
      const ys = []; for (let y = depth - 8; y > 16; y -= 8) ys.push(y);
      ys.forEach((y, i) => { const right = (ys.length - 1 - i) % 2 === 0; if (right) { ch[2][y] = 'b'; ch[3][y] = '#'; } else { ch[0][y] = 'b'; ch[1][y] = '#'; } ch[right ? 0 : 3][y - 3] = 'o'; });
      const firstRight = (ys.length - 1) % 2 === 0; ch[firstRight ? 1 : 2][depth - 1] = 'b';
      waterfall = {x0: x0 * 16, x1: (x0 + wd) * 16, top: 13 * 16, bottom: depth * 16};
      vchunks.push({x0: x0 * 16 - 16, exitX: (cols.length + 1) * 16 + 2, exitY: 13 * 16 - 14});
      ground(3, {hearts: true});
    };
    let bonus = null;
    const bonusPipe = () => {    // a teleporter pad ('q', two tiles flush in the ground); press down on it to beam into the techno disco
      ground(3, {hearts: true}); const col = cols.length;
      for (let k = 0; k < 2; k++) { const c = groundBase(); c[13] = 'q'; push(c); }
      bonus = {pipeCol: col, pipeTop: 13}; reserve(col - 1, col + 3); ground(3);
    };
    const bonusRoom = () => {    // appended after the level end: club wall, the 30x15 disco box (exactly one screen), club wall; discoRoom fills it
      bonus.mainW = cols.length;
      const wall = () => { const c = empty(); for (let y = 0; y < H; y++) c[y] = '#'; push(c); };
      for (let i = 0; i < 6; i++) wall();   /* wide screens centre the box and see the club walls on both sides, never the level */
      bonus.roomCol = cols.length;
      for (let x = 0; x < 30; x++) { const c = empty(); for (let y = 0; y < H; y++) c[y] = (x === 0 || x === 29 || y === 0 || y >= 13) ? '#' : '-'; push(c); }
      bonus.roomEnd = cols.length; for (let i = 0; i < 6; i++) wall();
      discoRoom(cols, bonus);
    };
    /* puzzle room: four bells ('@') must be rung in the right order (a board '^' shows it, or the bells sing it), then the gate 'z' opens
       and the chocolate coin ('$') waits behind it. Entered through a purple pipe ('&'). */
    let puzzle = null;
    const puzzlePipe = () => { ground(3, {hearts: true}); const col = cols.length; for (let k = 0; k < 2; k++) { const c = groundBase(); c[11] = '&'; c[12] = '|'; push(c); } puzzle = {pipeCol: col, pipeTop: 11, kind: G.PUZZLES[wi].kind}; ground(3); };
    const PUZZLE_ROOM = [
      '########################################',
      '#.................................######',
      '#.................................######',
      '#.................................######',
      '#.................................######',
      '#.................................######',
      '#.................................######',
      '#.................................######',
      '#.....@....@....@....@........o...######',
      '#.........................z..ooo..######',
      '#.........................z.o.$.o.######',
      '#..^......................z..ooo.&&######',
      '#.........................z...o..||######',
      '########################################',
      '########################################'];
    const puzzleRoom = () => {
      puzzle.roomCol = cols.length; puzzle.bells = []; puzzle.gateCol = -1;
      for (let x = 0; x < 40; x++) { const c = empty(); for (let y = 0; y < H; y++) { const ch = PUZZLE_ROOM[y][x]; c[y] = ch === '.' ? '-' : ch; if (ch === '@') puzzle.bells.push(cols.length); if (ch === 'z') puzzle.gateCol = cols.length; if (ch === '^') puzzle.signCol = cols.length; } push(c); }
      puzzle.roomEnd = cols.length;
      const order = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } puzzle.order = order;
    };
    /* ---------- boss arenas: four kinds, chosen by the world's boss ---------- */
    const towerEnd = () => { ground(2); const t = groundBase(); t[12] = 'U'; push(t); const w = groundBase(); w[12] = 'W'; push(w); ground(5); };
    const gateCol = (from, to) => { const c = empty(); for (let y = 0; y < H; y++) c[y] = '-'; for (let y = from; y <= to; y++) c[y] = 'Z'; c[13] = '#'; c[14] = '#'; return c; };
    /* cover: a long flat hall with stone pillars to hide behind; the weapon is handed out at the start */
    const arenaCover = () => {
      ground(3); const g1 = groundBase(); for (let y = 10; y < 13; y++) g1[y] = '='; push(g1);
      for (let i = 0; i < 22; i++) { const c = groundBase(); if (i === 1) c[12] = 'A'; if (i === 16) c[12] = 'B'; if (i === 6 || i === 7 || i === 13) { c[12] = '='; c[11] = '='; if (i !== 7) c[10] = '='; } if (i === 3 || i === 10) c[8] = '?'; push(c); }
      const g2 = groundBase(); for (let y = 0; y < 13; y++) g2[y] = 'Z'; push(g2); towerEnd();
    };
    /* sky: a jetpack on the ground, an abyss with a few cloud steps, and a floating island arena high up */
    const arenaSky = () => {
      ground(3); const jp = groundBase(); jp[12] = 'j'; push(jp); ground(2);
      const top = 7;
      for (let i = 0; i < 12; i++) { const c = empty(); if (i === 2 || i === 3) c[10] = '='; if (i === 6 || i === 7) c[9] = '='; if (i === 10) c[8] = '='; if (i === 5) c[6] = 'o'; push(c); }
      for (let i = 0; i < 20; i++) { const c = empty(); c[top] = '#'; c[top + 1] = '#'; if (i === 1) c[top - 1] = 'A'; if (i === 13) c[top - 1] = 'B'; if (i === 5 || i === 14) c[top - 4] = '?'; push(c); }
      const g = empty(); for (let y = 0; y <= top + 1; y++) g[y] = 'Z'; push(g);
      for (let i = 0; i < 2; i++) { const c = empty(); c[top] = '#'; c[top + 1] = '#'; push(c); }
      stairsDownFrom(top); towerEnd();
    };
    /* cave: a shaft down into a cave below the mountain, the fight down there, then a chimney back up to the tower */
    const arenaCave = () => {
      const floor = 27, ceil = 17;
      ground(3);
      for (let i = 0; i < 3; i++) { const c = deepCol(); for (let y = floor; y < DEEP; y++) c[y] = '#'; if (i === 1) { c[17] = 'o'; c[21] = 'o'; } deepCols.add(cols.length); push(c); }
      for (let i = 0; i < 20; i++) { const c = deepCol(); for (let y = 0; y <= ceil; y++) c[y] = '#'; for (let y = floor; y < DEEP; y++) c[y] = '#'; if (i === 1) c[floor - 1] = 'A'; if (i === 13) c[floor - 1] = 'B'; if (i === 5 || i === 15) c[floor - 4] = '?'; deepCols.add(cols.length); push(c); }
      { const c = deepCol(); for (let y = 0; y < floor; y++) c[y] = y <= ceil ? '#' : 'Z'; for (let y = floor; y < DEEP; y++) c[y] = '#'; deepCols.add(cols.length); push(c); }
      const ch = []; for (let i = 0; i < 4; i++) { const c = deepCol(); for (let y = floor; y < DEEP; y++) c[y] = '#'; deepCols.add(cols.length); push(c); ch.push(c); }
      let side = -1; for (let y = floor - 4; y > 13; y -= 4) { const a = side < 0 ? 0 : 2; ch[a][y] = '='; ch[a + 1][y] = '='; side = -side; }
      vchunks.push({x0: (cols.length - 4) * 16, exitX: (cols.length + 1) * 16 + 2, exitY: 13 * 16 - 14, afterBoss: true});
      towerEnd();
    };
    const arena = () => {        // boss arena: gate, flat floor, boss, locked gate, door
      ground(2); const g1 = groundBase(); for (let y = 9; y < 13; y++) g1[y] = '='; push(g1);
      for (let i = 0; i < 18; i++) { const c = groundBase(); c[13] = '#'; if (i === 1) c[12] = 'A'; if (i === 11) c[12] = 'B'; if (i === 4 || i === 13) c[9] = i === 4 ? '?' : '!'; push(c); }
      const g2 = groundBase(); for (let y = 0; y < 13; y++) g2[y] = 'Z'; push(g2);
      ground(2); const t = groundBase(); t[12] = 'U'; push(t); const w = groundBase(); w[12] = 'W'; push(w); ground(5);
    };

    /* opening */
    ground(4); cols[2][12] = 'R'; ground(7, {deco: true});
    const beats = tower ? 5 + Math.round(d * 0.25) : 8 + Math.round(d * 0.45);
    const kinds = ['boxes', 'gap', 'pipe', 'liquid', 'stairs', 'slow', 'plateau', 'movers', 'run'];
    if (W.vines) kinds.push('vine', 'vine'); if (W.bouncy) kinds.push('bouncy'); if (W.crumble) kinds.push('crumble', 'crumble'); if (W.ice) kinds.push('icy', 'icy');
    if (W.ents.T) kinds.push('thrower'); if (W.ents.D) kinds.push('dropper', 'dropper'); if (W.vertical) kinds.push('lift', 'lift');
    kinds.push('capsule'); if (d >= 2) kinds.push('cannon');
    const wfBeat = (W.waterfall === li && !seedExtra) ? Math.max(2, Math.floor(beats * 0.45)) : -1;
    let kaminBeat = tower ? -1 : 1 + Math.floor(r() * Math.max(1, beats - 2)); if (kaminBeat === wfBeat) kaminBeat = -1;
    let hoehleBeat = (tower || li === 0 || wfBeat >= 0) ? -1 : 2 + Math.floor(r() * Math.max(1, beats - 3)); if (hoehleBeat === kaminBeat) hoehleBeat = Math.min(beats - 1, hoehleBeat + 2);
    let lastKind = '', cannons = 0, capsules = 0;
    const pipeBeat = tower ? -1 : 1 + Math.floor(r() * Math.max(1, beats - 3));
    const hasPuzzle = false;   /* the old bell rooms are retired; the mandatory puzzle gate below replaces them */
    const pzDef = (!tower && !seedExtra && (li === 1 || li === 2) && G.PZ) ? Object.values(G.PZ.defs).find(p => p.world === W.key && p.slot === li - 1) : null;
    let pzBeat = pzDef ? Math.max(1, Math.min(beats - 1, Math.round(beats * 0.6))) : -1;
    const puzzleBeat = -1;   /* the old bell rooms are retired */
    for (let b = 0; b < beats; b++) {
      let kind = kinds[Math.floor(r() * kinds.length)]; if (kind === lastKind) kind = kinds[Math.floor(r() * kinds.length)]; lastKind = kind;
      if (kind === 'cannon' && cannons >= 1) kind = 'run'; if (kind === 'capsule' && capsules >= 2) kind = 'run';
      if (b === pipeBeat) bonusPipe();
      if (b === puzzleBeat) puzzlePipe();
      if (b === pzBeat) pzGate(pzDef.id);
      if (b === wfBeat) { waterfallChunk(); continue; }
      if (b === kaminBeat) { kamin(); continue; }
      if (b === hoehleBeat) { hoehle(); continue; }
      if (kind === 'capsule') { capsule(); capsules++; }
      else if (kind === 'cannon') { cannon(); cannons++; }
      else if (kind === 'boxes') { ground(4, {deco: true}); boxes(['?=?', d < 10 ? '?!?' : '?=?', '=?=?=', '?-?-?', '==?=='][Math.floor(r() * 5)]); ground(3, {enemies: dens}); }
      else if (kind === 'gap') { ground(3); gap(gapW); ground(4, {enemies: dens}); if (d > 6 && r() < 0.5) { gap(gapW - 1); ground(3); } }
      else if (kind === 'pipe') { const hz = r() < hazP; ground(3); pipe(hz ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 3), hz); ground(3, {hearts: true}); }
      else if (kind === 'liquid') { ground(2); liquid(6 + Math.round(d * 0.5), true); ground(3); }
      else if (kind === 'stairs') { const h = 3 + Math.min(2, Math.floor(d / 8)); ground(2); stairs(h, 1); gap(Math.min(3, 1 + Math.floor(d / 6))); stairs(h, -1); ground(3); }
      else if (kind === 'slow') { ground(2); slow(4 + Math.floor(d / 3)); ground(2, {hearts: true}); }
      else if (kind === 'plateau') { ground(2); plateau(5 + Math.floor(d / 3), 2 + Math.floor(r() * 2), true); ground(2); }
      else if (kind === 'movers') { ground(3); movers(7 + Math.round(d * 0.4)); ground(3); }
      else if (kind === 'vine') vineClimb();
      else if (kind === 'bouncy') bouncy();
      else if (kind === 'crumble') crumble(5 + Math.floor(d / 4));
      else if (kind === 'icy') { ground(1); icy(6 + Math.floor(d / 3)); ground(1); }
      else if (kind === 'thrower') { ground(3); plateau(3, 2, false); cols[cols.length - 2][10] = 'T'; ground(5, {hearts: true}); }
      else if (kind === 'dropper') { ground(7, {dropper: true, hearts: true}); }
      else if (kind === 'lift') { ground(2); lift(5); ground(2); }
      else { ground(8, {enemies: dens, hearts: true, deco: true}); heartArc(7); }
    }
    /* ending: every tower has its own arena kind; normal levels vary how the flag pole is reached */
    if (tower) {
      const kind = (W.boss && W.boss.arena) || 'ground';
      ground(4, {deco: true}); boxes(d < 12 ? '?!?' : '?=?'); ground(4, {enemies: dens});
      if (kind === 'cover') arenaCover(); else if (kind === 'sky') arenaSky(); else if (kind === 'cave') arenaCave(); else { stairs(4, 1); gap(1); arena(); }
    } else {
      ground(4, {deco: true}); boxes(d < 12 ? '?!?' : '?=?'); ground(6, {enemies: dens});
      const endKind = r();
      if (endKind < 0.4) { stairs(4, 1); gap(1); }
      else if (endKind < 0.7) { const c = groundBase(); c[12] = 'b'; push(c); ground(1); gap(2); plateau(2, 5, false); }
      else { plateau(3, 2, false); plateau(3, 4, true); plateau(2, 6, false); gap(1); }
      post(); ground(5); cottage(); ground(6);
    }

    /* checkpoint at about half of the level, on solid ground */
    const mid = Math.floor(cols.length / 2);
    for (let k = 0; k < 40; k++) { const i = mid + k; if (cols[i] && !reserved.has(i) && cols[i][13] === '#' && cols[i][12] === '-' && cols[i][11] === '-') { cols[i][12] = 'K'; break; } }
    /* three star cookies: little climbs at 22 %, 48 % and 78 % of the level */
    for (const f of [0.22, 0.48, 0.78]) {
      if (starBudget <= 0) break;
      const base = Math.floor(cols.length * f);
      for (let k = 0; k < 60; k++) {
        const i = base + k; const c0 = cols[i], c1 = cols[i + 1], c2 = cols[i + 2], c3 = cols[i + 3];
        if (!c0 || !c1 || !c2 || !c3) break;
        const flat = ![i, i + 1, i + 2, i + 3].some(x => reserved.has(x)) && [c0, c1, c2, c3].every(c => c[13] === '#' && c[12] === '-' && c[11] === '-' && c[10] === '-' && c[9] === '-' && c[8] === '-' && c[7] === '-' && c[6] === '-' && c[5] === '-');
        if (!flat) continue;
        c1[10] = '='; c2[8] = '='; c3[5] = '*'; starBudget--; break;
      }
    }
    for (let i = 10; i < cols.length - 10 && starBudget > 0; i += 17) { if (!reserved.has(i) && cols[i][13] === '#' && cols[i][6] === '-' && cols[i][12] === '-') { cols[i][6] = '*'; starBudget--; } }
    /* a calm start: no enemies in the first 18 columns */
    for (let i = 0; i < 18 && i < cols.length; i++) for (let y = 0; y < H; y++) if ('EGMTJ'.includes(cols[i][y])) cols[i][y] = '-';
    /* every level has at least one gadget capsule: on flat ground around 35 % if the chunk roll gave none */
    if (!cols.some(c => c[9] === 'g')) {
      const base = Math.floor(cols.length * 0.35);
      for (let k = 0; k < 80; k++) { const c = cols[base + k]; if (c && !reserved.has(base + k) && c[13] === '#' && c[12] === '-' && c[11] === '-' && c[10] === '-' && c[9] === '-' && c[8] === '-') { c[9] = 'g'; break; } }
    }
    if (bonus) bonusRoom();
    if (puzzle) puzzleRoom();
    /* every column gets the same height: under ground and liquid there is rock, under pits there is air (pits kill at the band bottom) */
    const Hmax = deepCols.size ? Math.max(DEEP, ...cols.map(c => c.length)) : H;
    if (Hmax > H) for (let x = 0; x < cols.length; x++) { const c = cols[x]; if (c.length >= Hmax) continue; const fill = (c[14] === '-' ? '-' : '#'); while (c.length < Hmax) c.push(fill); }
    const deep = Hmax > H ? cols.map((c, x) => deepCols.has(x) ? 1 : 0) : null;
    return {cols, bonus, puzzle, deep, vchunks, pz, waterfall};
  }
  /* the rocket flight level has no tiles to speak of: a short flat strip the engine can load; game.js runs the shooter on top */
  function buildRocket() { const cols = []; for (let x = 0; x < 40; x++) { const c = empty(); c[13] = '#'; c[14] = '#'; cols.push(c); } cols[3][12] = 'R'; return {cols, bonus: null, puzzle: null}; }
  G.levelCount = () => G.WORLDS.length * 4;
  G.buildLevel = (wi, li, seedExtra) => {
    const W = G.WORLDS[wi], b = (W.rocket && li === 0) ? buildRocket() : build(wi, li, seedExtra);
    return {world: wi, index: li, name: W.name + ' ' + (li + 1), sub: W.levels[li], par: 300 + (wi * 4 + li) * 10 + (b.deep ? 40 : 0), tower: li === 3, cols: b.cols, bonus: b.bonus, puzzle: b.puzzle, rocket: !!(W.rocket && li === 0), deep: b.deep || null, vchunks: b.vchunks || [], pz: b.pz || null, waterfall: b.waterfall || null};
  };
  /* daily level: the date picks a world (not the tower, not space) and a fresh seed */
  /* event levels (Halloween): a world definition outside G.WORLDS, difficulty borrowed from world index wi */
  G.buildEventLevel = (def, wi, li, seedExtra) => { const b = build(wi, li, seedExtra, def); return {world: wi, index: li, name: def.name + ' ' + (li + 1), sub: def.levels[li], par: 340, tower: li === 3, cols: b.cols, bonus: b.bonus, puzzle: null, rocket: false, deep: b.deep || null, vchunks: b.vchunks || [], pz: null, waterfall: null, worldDef: def, event: def.key}; };
  G.dailyKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  G.buildDaily = () => { const key = G.dailyKey(); let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const pool = G.WORLDS.map((W, i) => i).filter(i => !G.WORLDS[i].modes && !G.WORLDS[i].rocket); const wi = pool[h % pool.length], li = 1 + (h >> 3) % 2; const lv = G.buildLevel(wi, li, 1000 + (h % 50000)); lv.daily = key; lv.name = G.tr ? G.tr('Tageslevel', 'Daily Level') : 'Tageslevel'; lv.sub = key + ' · ' + G.WORLDS[wi].name; lv.par = 400; return lv; };
})();

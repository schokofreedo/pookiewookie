/* Pookiewookie: level generator. 24 levels (6 worlds x 4), assembled from hand-designed chunks with a fixed seed each,
   difficulty rising with the level index. Tower levels (4th of each world) end in a boss arena.
   Tile legend (rows 0..14): '#' ground, '=' block, '?' heart box, '!' power box, 'X' used box, 'n' pipe rim, '|' pipe body,
   '~' liquid hazard, 's' slow ground, 'i' ice, 'o' heart, '*' star cookie, 'F' goal post, 'W' tower door, 'Z' boss gate (solid until the boss falls),
   'R' start, 'K' checkpoint, 'v' vine (climbable), 'b' bouncy mushroom, 'c' crumbling platform, 'A' arena marker,
   entities: 'E' walker, 'G' flyer, 'M' spiky, 'S' pipe hazard, 'C' horizontal platform, 'V' vertical platform, 'T' thrower, 'J' liquid jumper, 'D' dropper, 'B' boss,
   decor: 'p' tree-ish, 'h' bush-ish, 'f' signpost, 'd' world decor, 'c' is NOT decor here, 'Q' cottage, 'U' tower */
(function () {
  const G = window.PW = window.PW || {};
  const H = 15;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const empty = () => Array(H).fill('-');

  function build(wi, li, seedExtra) {
    const W = G.WORLDS[wi], d = Math.min(23, Math.round((wi * 4 + li) * 0.66)), tower = li === 3;
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
    const cannon = () => {       // honey cannon over a wide gap: Wookie walks in, gets shot across, lands on a heart carpet
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
    const bonusPipe = () => {    // a golden pipe (rim 'P'); press down on it to visit the bonus room
      ground(3, {hearts: true}); const col = cols.length;
      for (let k = 0; k < 2; k++) { const c = groundBase(); c[11] = 'P'; c[12] = '|'; push(c); }
      bonus = {pipeCol: col, pipeTop: 11}; ground(3);
    };
    const ROOMS = [[
      '##############################',
      '#............................#',
      '#............................#',
      '#............................#',
      '#.......oo...oo..............#',
      '#......oooo.oooo.............#',
      '#..==..ooooooooo..==....g....#',
      '#.......ooooooo..............#',
      '#........ooooo...............#',
      '#.==......ooo.......==.===...#',
      '#..........o.................#',
      '#.?.......................PP.#',
      '#.........................||.#',
      '##############################',
      '##############################'], [
      '##############################',
      '#............................#',
      '#............................#',
      '#......oo.........oo.........#',
      '#.....oooo.......oooo........#',
      '#.....oooooooooooooo....==...#',
      '#......oooooooooooo..........#',
      '#.==...oo..oooo..oo..........#',
      '#......oooooooooooo.....g....#',
      '#.......oooo..oooo...........#',
      '#.........oooooo....==.===...#',
      '#.?.........oo............PP.#',
      '#.........................||.#',
      '##############################',
      '##############################']];
    const bonusRoom = () => {    // appended after the level end; the camera is locked to this screen while inside
      const room = ROOMS[(wi + li) % ROOMS.length]; bonus.roomCol = cols.length;
      for (let x = 0; x < 40; x++) { const c = empty(); for (let y = 0; y < H; y++) { const ch = x < 30 ? room[y][x] : '#'; c[y] = ch === '.' ? '-' : ch; } push(c); }   /* 10 wall columns on the right: wide screens see rock, not the level */
      bonus.roomEnd = cols.length;
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
  G.dailyKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  G.buildDaily = () => { const key = G.dailyKey(); let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const pool = G.WORLDS.map((W, i) => i).filter(i => !G.WORLDS[i].modes && !G.WORLDS[i].rocket); const wi = pool[h % pool.length], li = 1 + (h >> 3) % 2; const lv = G.buildLevel(wi, li, 1000 + (h % 50000)); lv.daily = key; lv.name = 'Tageslevel'; lv.sub = key + ' · ' + G.WORLDS[wi].name; lv.par = 400; return lv; };
})();

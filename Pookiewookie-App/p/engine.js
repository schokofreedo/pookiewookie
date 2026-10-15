/* The Starway Home: core engine. Tiles, physics, Toffo, boxes, collectibles, checkpoints, goal and rescue sequences, particles. */
(function () {
  const G = window.PW = window.PW || {}, A = () => G.audio;
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const T = G.T = 16, VH = G.VH = 270, MH = G.MH = 15; G.VW = G.VW || 480; G.OFFY = VH - MH * T;
  const SOLID = new Set(['#', '=', '?', '!', 'X', 'n', '|', 's', 'i', 'b', 'c', 'Z', 'g', 'P', '@', '&', 'z']);
  const S = G.S = {mode: 'title', wi: 0, li: 0, lives: 4, score: 0, hearts: 0, time: 300, timeAcc: 0, cam: 0, frames: 0, shake: 0, voiceT: 8, stars: [false, false, false], checkpoint: null, bossActive: false, gateOpen: false, wind: 0, camLock: null, room: 0, honey: 0, flash: 0};
  const P = G.P = {x: 0, y: 0, vx: 0, vy: 0, w: 12, h: 14, big: false, coffee: false, wings: false, onGround: false, facing: 1, inv: 0, dead: false, deathT: 0, anim: 0, throwT: 0, ground: 'meadow', coyote: 0, jumpBuf: 0, climbing: false, sx: 1, sy: 1, gliding: false, wasGround: false,
    gadget: null, gadT: 0, fuel: 0, jetting: false, wallSlide: false, wallDir: 0, wallCoyote: 0, wallJumpT: 0, pound: false, poundT: 0, poundLand: false, launch: 0, cannon: null, cannonCd: 0, combo: 0, pipeCd: 0, hidden: false};
  const input = G.input = {left: false, right: false, jump: false, run: false, down: false, up: false, jumpEdge: false, runEdge: false, downEdge: false};
  G.ents = []; G.parts = []; G.bumps = []; G.crumbles = []; G.goalSeq = null;
  let L = null;

  const E = G.eng = {
    load(wi, li, fromCheckpoint, custom) {
      const src = custom || G.buildLevel(wi, li);
      const W0 = (custom && custom.worldDef) || G.WORLDS[wi], skin = W0.skins ? (W0.skins[src.hub || src.rocket ? 0 : li] || null) : null;
      const world = skin ? Object.assign({}, W0, skin) : W0;   /* planets: own palette, sky and gravity on top of the world */
      L = G.L = {w: src.cols.length, wi, li, world, tower: src.tower, name: src.name, sub: src.sub, par: src.par, cols: src.cols.map(c => c.slice()), rescued: false, starXs: [], h: src.cols[0] ? src.cols[0].length : MH, deep: src.deep || null, vchunks: src.vchunks || [], pz: src.pz ? Object.assign({}, src.pz) : null, waterfall: src.waterfall || null, bonus: src.bonus || null, puzzle: src.puzzle ? Object.assign({progress: 0, solved: false, lit: [0, 0, 0, 0], demo: null, demoCd: 0}, src.puzzle) : null, mainW: src.bonus ? src.bonus.roomCol : (src.puzzle ? src.puzzle.roomCol : src.cols.length), hub: !!src.hub, rocket: !!src.rocket, daily: src.daily || null, event: src.event || null, grav: (skin && skin.grav) || 1};
      P.skydive = false; P.victory = false; S.outfit = S.outfitOverride || W0.key;
      G.ents = []; G.parts = []; G.bumps = []; G.crumbles = []; G.goalSeq = null;
      S.bossActive = false; S.gateOpen = false; S.camLock = null; S.wind = 0; S.room = 0; S.honey = 0; S.flash = 0;
      if (G.gad) G.gad.clear(true); A().fast = false; A().slow = false;
      P.pound = false; P.poundT = 0; P.poundLand = false; P.flip = 0; P.chute = false; P.chuteOpen = 0; P.launch = 0; P.cannon = null; P.cannonCd = 0; P.combo = 0; P.pipeCd = 0; P.hidden = false; P.jetting = false; P.wallSlide = false; P.wallJumpT = 0; P.wallCoyote = 0;
      if (!fromCheckpoint) { S.stars = [false, false, false]; S.checkpoint = null; }
      for (let cx = 0; cx < L.w; cx++) for (let cy = 0; cy < L.h; cy++) {
        const ch = L.cols[cx][cy];
        if (ch === 'R') { P.x = cx * T + 2; P.y = cy * T + (T - P.h); L.cols[cx][cy] = '-'; }
        else if ('EGMSCVTJDBN'.includes(ch)) { const e = G.entsMod.make(ch, cx, cy, L.world, wi * 4 + li); if (e) G.ents.push(e); L.cols[cx][cy] = '-'; }
        else if (ch === 'F' && !L.goalX) L.goalX = cx * T;
        else if (ch === 'W') { L.doorX = cx * T; L.cols[cx][cy] = '-'; }
        else if (ch === 'U') L.towerX = cx * T;
        else if (ch === 'A') { L.arenaX = cx * T; L.arenaRow = cy; L.cols[cx][cy] = '-'; }
        else if (ch === 'u') { G.ents.push({kind: 'chute', x: cx * T + 1, y: cy * T + 1, w: 14, h: 14, alive: true, anim: 0}); L.cols[cx][cy] = '-'; }
        else if (ch === 'j') { G.ents.push({kind: 'gadget', id: 'jet', x: cx * T + 1, y: cy * T + 1, w: 14, h: 14, vx: 0, vy: 0, alive: true, anim: 0, fixed: true}); L.cols[cx][cy] = '-'; }
        else if (ch === '*') L.starXs.push(cx);
      }
      L.starXs.sort((a, b) => a - b);
      if (L.arenaX) { let ex = Math.floor(L.arenaX / T); while (ex < L.w - 1 && !L.cols[ex].includes('Z')) ex++; L.arenaEnd = ex * T; }
      P.blaster = false; P.armor = S.hero === 'rexi' ? 1 : 0;   /* hero perk: Rexi shrugs off one hit per life */
      if (L.pz && G.flow && G.flow.isSolved && G.flow.isSolved(L.pz.id)) E.openPzGate(true);
      if (fromCheckpoint && S.checkpoint) { P.x = S.checkpoint.x; P.y = S.checkpoint.y; for (let cy = 0; cy < L.h; cy++) if (L.cols[S.checkpoint.cx][cy] === 'K') L.cols[S.checkpoint.cx][cy] = 'k'; for (const sx of L.starXs) { const idx = L.starXs.indexOf(sx); if (S.stars[idx]) for (let cy = 0; cy < MH; cy++) if (L.cols[sx][cy] === '*') L.cols[sx][cy] = '-'; } }
      P.vx = P.vy = 0; P.dead = false; P.inv = 0; P.facing = 1; P.climbing = false; P.h = P.big ? 24 : 14; P.sx = P.sy = 1;
      S.time = src.par; S.timeAcc = 0; S.camY = 0; S.cam = Math.max(0, P.x - G.VW * 0.4); S.voiceT = 3; S.shake = 0;
      A().setWorld(L.world.music); A().setBoss(false);
      return L;
    },
    tileAt(cx, cy) { if (cx < 0 || cx >= L.w) return '#'; if (cy >= L.h) return '-'; if (cy < 0) { const t = L.cols[cx][0]; return (t === 'Z' || t === 'z' || t === '#') ? t : '-'; } return L.cols[cx][cy]; },
    solidAt(cx, cy) { return SOLID.has(E.tileAt(cx, cy)); },
    setTile(cx, cy, ch) { if (cx >= 0 && cx < L.w && cy >= 0 && cy < L.h) L.cols[cx][cy] = ch; },
    isDeep(cx) { return !!(L.deep && L.deep[cx]); },
    overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; },
    moveX(e) {
      e.x += e.vx; e.hitWall = false;
      const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
      if (e.vx > 0) { const cx = Math.floor((e.x + e.w - 0.01) / T); for (let cy = y0; cy <= y1; cy++) if (E.solidAt(cx, cy)) { e.x = cx * T - e.w; e.vx = 0; e.hitWall = true; break; } }
      else if (e.vx < 0) { const cx = Math.floor(e.x / T); for (let cy = y0; cy <= y1; cy++) if (E.solidAt(cx, cy)) { e.x = (cx + 1) * T; e.vx = 0; e.hitWall = true; break; } }
    },
    moveY(e, isPlayer) {
      e.y += e.vy; e.onGround = false;
      const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
      if (e.vy > 0) {
        const cy = Math.floor((e.y + e.h - 0.01) / T);
        for (let cx = x0; cx <= x1; cx++) if (E.solidAt(cx, cy)) {
          e.y = cy * T - e.h; e.onGround = true; const ch = E.tileAt(cx, cy);
          if (isPlayer) {
            P.ground = ch === 's' ? 'honey' : (ch === 'i' ? 'ice' : 'meadow');
            if (P.pound) { P.pound = false; P.poundLand = true; }
            if (ch === 'b') { e.vy = -10.4 * (G.gad ? G.gad.jumpMul() : 1); e.onGround = false; P.bounceT = 0.5; A().sfx.spring(); P.sx = 0.7; P.sy = 1.4; E.puff(e.x + 6, e.y + e.h, 6, '#fff'); return; }
            if (ch === 'c') for (let k = x0; k <= x1; k++) if (E.tileAt(k, cy) === 'c' && !G.crumbles.some(q => q.cx === k && q.cy === cy)) G.crumbles.push({cx: k, cy, t: 0});
          }
          e.vy = 0; break;
        }
      } else if (e.vy < 0) {
        const cy = Math.floor(e.y / T); let hit = null, bestD = 1e9;
        for (let cx = x0; cx <= x1; cx++) if (E.solidAt(cx, cy)) { const d = Math.abs((cx + 0.5) * T - (e.x + e.w / 2)); if (d < bestD) { bestD = d; hit = cx; } }
        if (hit !== null) { e.y = (cy + 1) * T; e.vy = 0; if (isPlayer) E.bump(hit, cy); }
      }
    },
    edgeAhead(e) { const cx = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1) / T), cy = Math.floor((e.y + e.h + 1) / T); return !E.solidAt(cx, cy); },
    puff(x, y, n, col) { for (let i = 0; i < n; i++) G.parts.push({kind: 'puff', x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 1.2, t: 0.35 + Math.random() * 0.2, col}); },
    toast(t, x, y) { G.parts.push({kind: 'text', text: t, x: x !== undefined ? x : P.x, y: y !== undefined ? y : P.y - 10, vy: -0.5, t: 1.2}); },

    /* ---------- boxes and collectibles ---------- */
    bump(cx, cy) {
      const ch = E.tileAt(cx, cy);
      if (ch === '?') { E.setTile(cx, cy, 'X'); G.bumps.push({cx, cy, t: 0}); E.collectHeart(cx, cy, true); }
      else if (ch === '!') { E.setTile(cx, cy, 'X'); G.bumps.push({cx, cy, t: 0}); A().sfx.appear(); const kind = !P.big ? 'milk' : (Math.random() < 0.5 || P.coffee ? 'feather' : 'coffee'); G.ents.push({kind, x: cx * T + 1, y: cy * T - 2, w: 14, h: 14, vx: 0, alive: true, rise: 16}); }
      else if (ch === 'g') { E.setTile(cx, cy, 'X'); G.bumps.push({cx, cy, t: 0}); A().sfx.appear(); G.ents.push({kind: 'roulette', x: cx * T + 1, y: cy * T - 4, baseY: cy * T - 22, w: 14, h: 14, vx: 0, alive: true, t: 0, idx: Math.floor(Math.random() * 8), id: null, anim: 0}); S.score += 200; }
      else if (ch === '@') { G.bumps.push({cx, cy, t: 0}); E.ringBell(cx); }
      else if (ch === '=') { if (P.big) { E.setTile(cx, cy, '-'); A().sfx.pop(); for (let i = 0; i < 4; i++) G.parts.push({kind: 'crumb', x: cx * T + 4 + (i % 2) * 8, y: cy * T + 4 + Math.floor(i / 2) * 8, vx: (i % 2 ? 1 : -1) * (1 + Math.random()), vy: -3 - Math.random() * 2, t: 1.2}); S.score += 50; } else { G.bumps.push({cx, cy, t: 0}); A().sfx.bump(); } }
      else A().sfx.bump();
      for (const e of G.ents) if (e.alive && e.stompable !== undefined && Math.floor((e.y + e.h + 1) / T) === cy && Math.floor((e.x + e.w / 2) / T) === cx) E.kill(e, true);
    },
    collectHeart(cx, cy, fromBox) {
      if (G.eco) G.eco.add(1, cx * T, cy * T, true);
      S.hearts++; S.score += 100; A().sfx.heart();
      G.parts.push({kind: 'heart', x: cx * T + 4, y: cy * T - (fromBox ? 8 : 0), vy: -2.6, t: 0.7});
      if (S.hearts >= 50) { S.hearts -= 50; S.lives++; A().sfx.oneUp(); E.toast('1 UP'); }
    },
    collectStar(cx, cy) {
      const idx = Math.max(0, L.starXs.indexOf(cx)); S.stars[idx] = true; if (G.eco) G.eco.add(30, cx * T, cy * T - 10); S.score += 2000; A().sfx.star(); E.toast(tr('Sternkeks!', 'Star cookie!'));
      for (let i = 0; i < 12; i++) G.parts.push({kind: 'star', x: cx * T + 8, y: cy * T + 8, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2.5, t: 0.9});
    },
    kill(e, byBump, ptsOverride) {
      if (!e.alive) return; e.alive = false; e.dieT = 0; e.flip = !!byBump;
      const pts = ptsOverride !== undefined ? ptsOverride : (e.points || 100); S.score += pts; if (G.eco && e.kind !== 'shot' && e.kind !== 'bean') G.eco.add(3, e.x, e.y - 18); if (pts) E.toast(P.combo > 1 && !byBump && ptsOverride !== undefined ? '×' + P.combo + '  +' + pts : '+' + pts, e.x, e.y - 8);
      for (let i = 0; i < 6; i++) G.parts.push({kind: e.kind === 'flyer' ? 'star' : 'puff', x: e.x + e.w / 2, y: e.y + 6, vx: (Math.random() - 0.5) * 2.5, vy: -1 - Math.random() * 2, t: 0.8});
    },

    /* ---------- Toffo ---------- */
    hurt(by) {
      if (P.inv > 0 || P.dead || G.goalSeq || P.gadget === 'star' || P.launch > 0 || P.cannon) return;
      S.hits = (S.hits || 0) + 1;
      if (G.gad && G.gad.absorbHit()) return;
      if (P.armor > 0) { P.armor--; P.inv = 1.6; A().sfx.bubblePop(); S.shake = 3; E.toast(tr('Dino-Panzer!', 'Dino armor!')); return; }
      if (P.big) { P.big = false; P.coffee = false; P.wings = false; P.h = 14; P.y += 10; P.inv = 1.6; A().sfx.hurt(); S.shake = 4; }
      else E.die('enemy:' + (by || '?'));
    },
    die(why) {
      if (P.dead) return;
      S.lastDeath = {why, x: Math.round(P.x), y: Math.round(P.y)};
      P.dead = true; P.deathT = 0; P.vy = -6.5; P.vx = 0; P.big = false; P.coffee = false; P.wings = false; P.climbing = false; S.timeAcc = 0;
      P.pound = false; P.launch = 0; P.cannon = null; P.hidden = false; P.jetting = false; P.wallSlide = false; P.flip = 0; P.blaster = false; if (G.gad) G.gad.clear(true); S.honey = 0; A().slow = false; A().fast = false;
      A().stopMusic(); A().sfx.sad(); A().sfx.die(); G.flow.speak(G.SAD[Math.floor(Math.random() * G.SAD.length)], {sad: true});
    },
    /* ground pound landing: shockwave, blocks below get hit, nearby enemies flattened */
    shockwave() {
      const cy = Math.floor((P.y + P.h + 1) / T), x0 = Math.floor(P.x / T), x1 = Math.floor((P.x + P.w - 1) / T);
      S.shake = Math.max(S.shake, 5); A().sfx.pound(); P.sx = 1.5; P.sy = 0.6;
      for (let i = 0; i < 10; i++) G.parts.push({kind: 'puff', x: P.x + 6 + (i % 2 ? 1 : -1) * (4 + i * 2), y: P.y + P.h - 2, vx: (i % 2 ? 1 : -1) * (1 + i * 0.25), vy: -0.5 - Math.random(), t: 0.4, col: '#fff'});
      G.parts.push({kind: 'ring', x: P.x + 6, y: P.y + P.h, t: 0.35, float: true, vx: 0, vy: 0});
      for (let cx = x0; cx <= x1; cx++) { const ch = E.tileAt(cx, cy); if (ch === '?' || ch === '!' || ch === 'g' || (ch === '=' && P.big)) E.bump(cx, cy); }
      for (const e of G.ents) if (e.alive && e.stompable !== undefined && e.kind !== 'boss' && Math.abs(e.x + e.w / 2 - (P.x + 6)) < 34 && Math.abs(e.y + e.h - (P.y + P.h)) < 20) E.kill(e, true, e.points || 100);
    },
    /* bonus rooms: enter via a golden pipe ('P'), the room lives at the far right of the level */
    room(n) { return n === 1 ? L.bonus : (n === 2 ? L.puzzle : null); },
    enterRoom(n) {
      const rm = E.room(n || S.room); if (!rm) return;
      S.room = n; P.vx = 0; P.vy = 0; P.pipeCd = 40; S.flash = 1; A().sfx.pipe(); P.climbing = false; P.pound = false;
      if (n) { P.x = (rm.roomCol + 2) * T + 2; P.y = 13 * T - P.h; S.cam = rm.roomCol * T; E.toast(n === 2 ? tr('Rätselkammer!', 'Puzzle room!') : tr('Bonusraum!', 'Bonus room!')); if (n === 2) { G.flow.speak('A puzzle! Let me think...', {happy: true}); if (L.puzzle.kind === 'melody' && !L.puzzle.solved) E.puzzleDemo(); } }
      else { P.x = rm.pipeCol * T + 2; P.y = rm.pipeTop * T - P.h; S.cam = Math.max(0, Math.min(L.mainW * T - G.VW, P.x - G.VW * 0.42)); }
    },
    /* ---------- puzzle room: ring the four bells in the right order ---------- */
    ringBell(cx) {
      const pz = L.puzzle; if (!pz) return; const idx = pz.bells.indexOf(cx); if (idx < 0) return;
      pz.lit[idx] = 0.7; A().sfx.bell(idx);
      if (pz.solved || pz.demo) return;
      if (pz.order[pz.progress] === idx) { pz.progress++; if (pz.progress >= pz.order.length) E.solvePuzzle(); }
      else { pz.progress = 0; A().sfx.wrong(); S.shake = 2; E.toast(tr('Falsch... nochmal!', 'Wrong... try again!')); for (let i = 0; i < 4; i++) pz.lit[i] = 0.25; }
    },
    puzzleDemo() { const pz = L.puzzle; if (!pz || pz.demo) return; pz.demo = {t: -0.6, i: 0}; pz.progress = 0; },
    solvePuzzle() {
      const pz = L.puzzle; pz.solved = true; A().sfx.puzzleSolved(); S.score += 1500; E.toast(tr('Gelöst!', 'Solved!')); G.flow.speak('I solved it!', {happy: true});
      for (let i = 0; i < 4; i++) pz.lit[i] = 2;
      for (let cx = 0; cx < L.w; cx++) for (let cy = 0; cy < L.h; cy++) if (L.cols[cx][cy] === 'z') { L.cols[cx][cy] = '-'; for (let i = 0; i < 3; i++) G.parts.push({kind: 'spark', x: cx * T + 8, y: cy * T + 4 + i * 4, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, t: 0.8, col: '#c9a0ff'}); }
      if (G.flow.achieve) G.flow.achieve('puzzle');
    },
    fireCannon(e) {
      P.cannon = null; P.hidden = false; P.launch = 40; P.cannonCd = 50; P.x = e.x + 4; P.y = e.y - 8; P.vx = 5.6; P.vy = -6.2; P.facing = 1; P.sx = 1.5; P.sy = 0.7;
      S.shake = 6; A().sfx.cannon(); e.fireT = 0.5;
      for (let i = 0; i < 14; i++) G.parts.push({kind: 'puff', x: e.x + 12, y: e.y - 2, vx: 1 + Math.random() * 3, vy: -2 + Math.random() * 2, t: 0.5 + Math.random() * 0.3, col: i % 3 ? '#fff' : '#ffd84a'});
    },
    updatePlayer() {
      if (P.dead) { P.deathT += 1 / 60; if (P.deathT > 0.35) { P.vy += 0.3; P.y += P.vy; } if (P.deathT > 3) G.flow.afterDeath(); return; }
      if (G.goalSeq) return;
      if (G.gad) G.gad.update();
      /* at the puzzle station: the up key (not the jump key) or down opens the puzzle instead of jumping */
      if (P.onGround && L.pz && G.flow.openPuzzle && E.nearStation() && ((input.up && input.jumpEdge && !input.jumpKeyEdge && !input.touchMode) || input.downEdge)) { input.jumpEdge = false; input.downEdge = false; input.up = false; input.jump = false; P.jumpBuf = 0; G.flow.openPuzzle(L.pz.id, () => E.openPzGate()); return; }
      if (P.cannonCd > 0) P.cannonCd--; if (P.pipeCd > 0) P.pipeCd--; if (P.wallJumpT > 0) P.wallJumpT--;
      if (P.flip > 0) { P.flip = Math.max(0, P.flip - 1 / 26); if (P.onGround) P.flip = 0; }
      /* inside a honey cannon: wait, then fly */
      if (P.cannon) { const e = P.cannon; e.loadT -= 1 / 60; P.x = e.x + 4; P.y = e.y; P.vx = P.vy = 0; if (e.loadT <= 0) E.fireCannon(e); return; }
      /* cannonball flight: no control until Toffo lands or hits a wall */
      if (P.launch > 0) {
        P.launch--; P.vy += 0.42; E.moveX(P); E.moveY(P, true); P.anim += 0.3;
        if (S.frames % 2 === 0) G.parts.push({kind: 'spark', x: P.x + 2, y: P.y + 6, vx: -1 - Math.random(), vy: (Math.random() - 0.5), t: 0.35, col: '#ffd84a'});
        if (P.onGround || P.hitWall) { P.launch = 0; if (P.onGround) { P.vx *= 0.5; E.puff(P.x + 6, P.y + P.h, 6, '#fff'); } }
        E.afterMove(); return;
      }
      const W = L.world, icy = P.ground === 'ice' && P.onGround, honey = P.ground === 'honey' && P.onGround;
      /* movement feel: snappy stops, quick turnarounds, real air control; ice stays slippery on purpose */
      const max = (input.touchMode ? 2.15 : (input.run ? 2.3 : 1.5)) * (honey ? 0.5 : 1) * (P.coffee ? 1.12 : 1) * (S.hero === 'flitz' ? 1.1 : 1);
      const dir = P.wallJumpT > 0 ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const turning = dir !== 0 && Math.sign(P.vx) === -dir;
      const acc = P.onGround ? (icy ? 0.05 : (turning ? 0.5 : 0.24)) : (turning ? 0.34 : 0.22), fr = P.onGround ? (icy ? 0.012 : (honey ? 0.25 : 0.34)) : 0.05;
      /* ground pound: tap down in the air */
      if (input.downEdge && !P.onGround && !P.climbing && !P.pound && !P.jetting) { P.pound = true; P.poundT = 9; P.vx = 0; P.vy = -1.5; A().sfx.poundStart(); P.sx = 0.8; P.sy = 1.2; }
      if (P.pound) {
        if (P.poundT > 0) { P.poundT--; P.vy = -1.2; } else { P.vy = 7.5; if (S.frames % 2 === 0) E.puff(P.x + 6, P.y, 1, '#fff'); }
        P.vx = 0; E.moveX(P); E.moveY(P, true); P.anim += 0.5;
        E.afterMove(); return;
      }
      /* vines */
      const ccx = Math.floor((P.x + P.w / 2) / T), ccy = Math.floor((P.y + P.h / 2) / T), onVine = E.tileAt(ccx, ccy) === 'v' || E.tileAt(ccx, Math.floor((P.y + 2) / T)) === 'v';
      const upIn = input.up || (input.touchMode && input.jump);   /* on touch the jump button also grabs and climbs vines */
      if (!P.climbing && onVine && (upIn || (input.down && !P.onGround))) { P.climbing = true; P.vx = 0; P.vy = 0; P.jumpBuf = 0; input.jumpEdge = false; input.jumpKeyEdge = false; }
      if (P.climbing) {
        if (!onVine) P.climbing = false;
        else {
          P.vy = (upIn ? -1.3 : 0) + (input.down ? 1.3 : 0); P.vx = dir * 0.8; if (dir) P.facing = dir;
          E.moveX(P); E.moveY(P, true); P.anim += Math.abs(P.vy) * 0.15 + Math.abs(P.vx) * 0.1;
          if (input.jumpKeyEdge && !input.touchMode) { P.climbing = false; P.vy = -5; A().sfx.jump(); }
          if (P.onGround && input.down) P.climbing = false;
          E.afterMove(); return;
        }
      }
      if (dir) { P.vx += dir * acc; P.facing = dir; if (Math.abs(P.vx) > max) P.vx += (max * Math.sign(P.vx) - P.vx) * (icy ? 0.03 : 0.25); }
      else { if (Math.abs(P.vx) < fr) P.vx = 0; else P.vx -= Math.sign(P.vx) * fr; }
      if (W.wind) { S.wind = Math.sin(S.frames / 240) * 0.05 + Math.sin(S.frames / 71) * 0.015; P.vx += S.wind * (P.onGround ? 0.35 : 1); }
      if (P.onGround) { P.coyote = 6; P.jumps = 0; } else if (P.coyote > 0) P.coyote--;
      if (input.jumpEdge) P.jumpBuf = 6; else if (P.jumpBuf > 0) P.jumpBuf--;
      const jm = G.gad ? G.gad.jumpMul() : 1;
      /* jumps have a fixed height (no holding); a second jump is allowed in the air */
      if (P.jumpBuf > 0 && P.coyote > 0) { P.vy = -(6.1 + Math.abs(P.vx) * 0.25) * jm; P.coyote = 0; P.jumpBuf = 0; P.onGround = false; P.jumps = 1; P.sx = 0.8; P.sy = 1.25; if (P.big || jm > 1) A().sfx.bigJump(); else A().sfx.jump(); E.puff(P.x + 6, P.y + P.h, 3, '#fff'); }
      else if (P.jumpBuf > 0 && !P.onGround && !P.climbing && !P.wallSlide && P.wallCoyote <= 0 && (P.jumps || 1) < (S.hero === 'bolt' ? 3 : 2)) { P.jumps = (P.jumps || 1) + 1; P.vy = -5.4 * jm; P.jumpBuf = 0; P.sx = 0.8; P.sy = 1.25; P.flip = 1; A().sfx.doubleJump(); G.parts.push({kind: 'ring', x: P.x + 6, y: P.y + P.h, t: 0.3, float: true, vx: 0, vy: 0}); E.puff(P.x + 6, P.y + P.h, 4, '#fff'); }
      /* wall slide and wall jump (everyone); the climbing claws make Toffo stick and climb */
      P.wallSlide = false; if (P.onGround) P.lastWallDir = 0;
      if (!P.onGround && !P.climbing && !P.pound && P.launch <= 0) {
        const cyA = Math.floor((P.y + 3) / T), cyB = Math.floor((P.y + P.h - 3) / T);
        const wl = E.solidAt(Math.floor((P.x - 1) / T), cyA) || E.solidAt(Math.floor((P.x - 1) / T), cyB), wr = E.solidAt(Math.floor((P.x + P.w + 1) / T), cyA) || E.solidAt(Math.floor((P.x + P.w + 1) / T), cyB);
        const wd = (dir < 0 && wl) ? -1 : ((dir > 0 && wr) ? 1 : 0);
        if (wd && P.vy > 0) { P.wallSlide = true; P.wallDir = wd; P.wallCoyote = 8; if (S.frames % 4 === 0) { E.puff(P.x + (wd > 0 ? P.w : 0), P.y + P.h - 2, 1, '#fff'); A().sfx.slide(); } }
        else if (P.wallCoyote > 0) P.wallCoyote--;
        if (P.wallSlide && P.gadget === 'claws' && (input.up || input.jump) && !input.jumpEdge) { P.vy = -1.3; }
        if (P.jumpBuf > 0 && (P.wallSlide || P.wallCoyote > 0)) { const same = P.lastWallDir === P.wallDir; P.vy = (same ? -4.6 : -5.8) * jm; P.vx = -P.wallDir * 3.0; P.facing = -P.wallDir; P.wallJumpT = 10; P.jumpBuf = 0; P.wallSlide = false; P.wallCoyote = 0; P.lastWallDir = P.wallDir; if (same) P.jumps = 2; P.jumps = 1; A().sfx.wallJump(); E.puff(P.x + (P.wallDir > 0 ? P.w : 0), P.y + P.h / 2, 4, '#fff'); }
      } else P.wallCoyote = 0;
      P.gliding = P.wings && !P.onGround && P.vy > 0 && input.jump && !P.jetting;
      if (P.bounceT > 0) P.bounceT -= 1 / 60;
      P.vy += (P.vy < 0 ? 0.28 : 0.42) * (L.grav || 1); if (P.vy > 6.5) P.vy = 6.5; if (P.gliding && P.vy > 1.1) P.vy = 1.1; if (P.wallSlide && P.vy > (P.gadget === 'claws' ? 0.55 : 1.6)) P.vy = P.gadget === 'claws' ? 0.55 : 1.6;
      if (S.hero === 'hollo' && !P.onGround && !P.wallSlide && input.jump && P.vy > 0.9 && P.jumps >= 1) P.vy = 0.9;   /* hero perk: Hollo floats down like a little ghost while jump is held */
      if (P.chute) { const wf = L.waterfall, inShaft = wf && P.x + P.w > wf.x0 - 8 && P.x < wf.x1 + 8 && P.y + P.h < wf.bottom - 2; if (P.onGround) { P.chuteOpen = 0; if (!inShaft && P.y + P.h > 13 * T + 2 || (wf && P.y + P.h >= wf.bottom - 2)) P.chute = false; } else if (P.vy > 0.2) { P.chuteOpen = Math.min(1, (P.chuteOpen || 0) + 0.08); if (P.vy > 0.95) P.vy = 0.95; } }
      if (G.gad) G.gad.jet(input);
      E.moveX(P); E.moveY(P, true);
      /* moving platforms carry Toffo */
      for (const e of G.ents) if ((e.kind === 'platformH' || e.kind === 'platformV' || e.kind === 'choco') && e.alive) { const top = e.y, onIt = P.x + P.w > e.x + 2 && P.x < e.x + e.w - 2 && P.y + P.h >= top - 1 && P.y + P.h <= top + 6 + Math.max(0, e.dy || 0) && P.vy >= 0; if (onIt) { P.y = top - P.h; P.vy = 0; P.onGround = true; P.x += e.dx || 0; P.coyote = 6; } }
      E.afterMove();
    },
    afterMove() {
      if (P.onGround && !P.wasGround && P.vy >= 0) { P.sx = 1.25; P.sy = 0.75; E.puff(P.x + 6, P.y + P.h, 4, '#fff'); }
      P.wasGround = P.onGround;
      P.sx += (1 - P.sx) * 0.2; P.sy += (1 - P.sy) * 0.2;
      const x0 = Math.floor(P.x / T), x1 = Math.floor((P.x + P.w - 1) / T), y0 = Math.floor(P.y / T), y1 = Math.floor((P.y + P.h - 1) / T);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
        const ch = E.tileAt(cx, cy);
        if (ch === 'o') { E.setTile(cx, cy, '-'); E.collectHeart(cx, cy, false); }
        else if (ch === '$') { E.setTile(cx, cy, '-'); S.score += 3000; A().sfx.coin(); E.toast(tr('Schokomünze!', 'Chocolate coin!')); G.flow.speak('Chocolate!', {happy: true}); for (let i = 0; i < 14; i++) G.parts.push({kind: 'spark', x: cx * T + 8, y: cy * T + 8, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3, t: 0.9, col: i % 2 ? '#5a2e14' : '#ffd84a'}); if (G.flow.coin) G.flow.coin(L.wi); }
        else if (ch === '^' && L.puzzle && L.puzzle.kind === 'melody' && !L.puzzle.solved && L.puzzle.demoCd <= 0 && P.onGround) { L.puzzle.demoCd = 4; E.puzzleDemo(); }
        else if (ch === '*') { E.setTile(cx, cy, '-'); E.collectStar(cx, cy); }
        else if (ch === 'K') { E.setTile(cx, cy, 'k'); S.checkpoint = {x: cx * T + 2, y: cy * T + T - 14, cx}; A().sfx.checkpoint(); E.toast('Checkpoint!'); }
        else if (ch === '~' && P.y + P.h > cy * T + 6) { for (let i = 0; i < 8; i++) G.parts.push({kind: 'splash', x: P.x + 6, y: cy * T + 4, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, t: 0.7, col: L.world.liquid.b}); A().sfx.splash(); E.die('liquid'); return; }
      }
      if ((P.y > MH * T + 20 && !E.isDeep(Math.floor((P.x + P.w / 2) / T))) || P.y > L.h * T + 20) { E.die('pit'); return; }
      if (P.poundLand) { P.poundLand = false; E.shockwave(); if (E.nearStation() && G.flow.openPuzzle) { G.flow.openPuzzle(L.pz.id, () => E.openPzGate()); return; } }
      if (P.onGround) P.combo = 0;
      if (!S.room) {
        if (L.goalX && P.x + P.w / 2 >= L.goalX + 4) E.startPost();
        if (L.arenaX && !S.bossActive && !S.gateOpen && !L.bossDone && P.x >= L.arenaX) G.entsMod.bossStart();
        if (L.doorX && S.gateOpen && P.x + P.w / 2 >= L.doorX + 6) E.startDoor();
      }
      /* golden pipes lead into and out of the bonus room */
      if ((L.bonus || L.puzzle) && input.down && P.onGround && P.pipeCd <= 0 && !P.pound) { const pc = Math.floor((P.x + P.w / 2) / T), pr = Math.floor((P.y + P.h + 1) / T), ch = E.tileAt(pc, pr); if (ch === 'P' && L.bonus) { E.enterRoom(S.room ? 0 : 1); return; } if (ch === '&' && L.puzzle) { E.enterRoom(S.room ? 0 : 2); return; } }
      if (P.throwT > 0) P.throwT -= 1 / 60;
      if (P.coffee && input.runEdge && P.throwT <= 0 && G.ents.filter(e => e.kind === 'bean' && e.alive).length < 2) { P.throwT = 0.25; A().sfx.throwBean(); G.ents.push({kind: 'bean', x: P.x + (P.facing > 0 ? P.w : -6), y: P.y + 6, w: 6, h: 6, vx: P.facing * 3.8, vy: -1, alive: true, t: 3}); }
      /* honey blaster: the gadget, or the boss weapon (faster, aims at the boss in front of Toffo, holding Shift auto-fires) */
      const wantShot = input.runEdge || (P.blaster && input.run && !input.touchMode && S.frames % 9 === 0);
      if ((P.gadget === 'sling' || P.blaster) && wantShot && P.throwT <= 0 && G.ents.filter(e => e.kind === 'honeyshot' && e.alive).length < (P.blaster ? 4 : 2)) {
        P.throwT = P.blaster ? 0.15 : 0.22; A().sfx.shoot(); P.sx = 1.2;
        let vx = P.facing * 4.6, vy = 0;
        const b = P.blaster && G.ents.find(e => e.kind === 'boss' && e.active);
        if (b) { const dx = b.x + b.w / 2 - (P.x + P.w / 2), dy = b.y + b.h / 2 - (P.y + 6); if (Math.sign(dx) === P.facing) { const a = Math.max(-1.0, Math.min(0.6, Math.atan2(dy, Math.abs(dx)))); vx = P.facing * 5 * Math.cos(a); vy = 5 * Math.sin(a); } }
        G.ents.push({kind: 'honeyshot', x: P.x + (P.facing > 0 ? P.w : -8), y: P.y + (P.big ? 10 : 4), w: 8, h: 8, vx, vy, alive: true, t: P.blaster ? 1.4 : 1.1, anim: 0});
      }
      if (P.inv > 0) P.inv -= 1 / 60;
      if (Math.abs(P.vx) > 0.1 && P.onGround) { P.anim += Math.abs(P.vx) * 0.12; if (S.frames % 10 === 0 && Math.abs(P.vx) > 2) E.puff(P.x + (P.facing > 0 ? 0 : 12), P.y + P.h, 1, P.ground === 'ice' ? '#dff' : '#fff'); } else if (P.onGround) P.anim = 0;
    },
    startPost() {
      G.goalSeq = {t: 0, phase: 'slide'}; P.x = L.goalX - P.w + 3; P.vx = 0; P.vy = 0; P.climbing = false; P.flip = 0;
      const bonus = Math.max(100, Math.round((13 * T - P.y) / T) * 100); S.score += bonus; E.toast('+' + bonus); A().stopMusic(); A().sfx.flag();
      for (const e of G.ents) e.frozen = true;
    },
    startDoor() {
      G.goalSeq = {t: 0, phase: L.world.boss.final ? 'rescue' : 'door'}; P.vx = 0; P.vy = 0; P.flip = 0; A().stopMusic();
      for (const e of G.ents) e.frozen = true;
      if (L.world.boss.final) { A().sfx.rescue(); L.rescued = true; G.ents.push({kind: 'pookie', x: L.doorX + 20, y: 13 * T - 14, w: 12, h: 14, alive: true, anim: 0, vx: 0}); G.flow.speak('Mallo!', {pitch: 1.9, rate: 0.9}); setTimeout(() => { if (G.goalSeq) G.flow.speak('Toffo!', {pitch: 2.0, rate: 0.95}); }, 1400); }
      else { A().sfx.flag(); G.flow.speak(L.world.doorLine || 'Mallo is in another tower...', {sad: !L.world.doorLine}); }
    },
    updateGoal() {
      const g = G.goalSeq; g.t += 1 / 60;
      if (g.phase === 'slide') { P.y = Math.min(P.y + 2, 13 * T - P.h); if (P.y >= 13 * T - P.h) { g.phase = 'walk'; g.t = 0; } }
      else if (g.phase === 'walk') { P.vx = 1.2; P.facing = 1; E.moveX(P); P.vy += 0.42; E.moveY(P, true); P.anim += 0.15; if (g.t > 1.6) { g.phase = 'card'; g.t = 0; G.flow.levelClear(); } }
      else if (g.phase === 'door') { P.vy += 0.42; E.moveY(P, true); if (g.t > 2.6) { g.phase = 'card'; G.flow.levelClear(); } }
      else if (g.phase === 'rescue') {
        const pk = G.ents.find(e => e.kind === 'pookie'); P.vy += 0.42; E.moveY(P, true);
        if (pk) { pk.anim += 0.12; if (pk.x > P.x + P.w + 2) pk.x -= 0.6; if (g.t > 1.2 && g.t % 0.5 < 0.02) G.parts.push({kind: 'heart', x: P.x + 2 + Math.random() * 20, y: P.y - 6, vy: -1 - Math.random(), vx: (Math.random() - 0.5), t: 1.4, float: true}); }
        if (g.t > 1.0 && Math.floor(g.t * 3) % 2 === 0 && P.onGround) P.vy = -2.2;
        if (g.t > 5) { g.phase = 'card'; G.flow.levelClear(); }
      }
    },
    /* the puzzle gate opens for good once its puzzle is solved */
    openPzGate(silent) {
      if (!L.pz) return; L.pz.solved = true;
      for (let cy = 0; cy < L.h; cy++) if (L.cols[L.pz.gateCol][cy] === 'z') { L.cols[L.pz.gateCol][cy] = '-'; if (!silent) for (let i = 0; i < 2; i++) G.parts.push({kind: 'spark', x: L.pz.gateCol * T + 8, y: cy * T + 4 + i * 6, vx: (Math.random() - 0.5) * 2.5, vy: -1 - Math.random() * 2, t: 0.9, col: i ? '#ffd84a' : '#c9a0ff'}); }
      if (!silent) { A().sfx.gate(); S.shake = 4; }
    },
    nearStation() { if (!L.pz || L.pz.solved) return false; const sx = L.pz.stationCol * T + 8; return Math.abs(P.x + P.w / 2 - sx) < 20 && P.y + P.h > 11 * T && P.y < 14 * T; },
    openGate() {
      S.gateOpen = true; S.camLock = null; P.blaster = false; for (const e of G.ents) if (e.kind === 'beam' || e.kind === 'warn' || (e.kind === 'shot' && e.boss)) e.alive = false; A().sfx.gate(); A().setBoss(false);
      for (let cx = 0; cx < L.w; cx++) for (let cy = 0; cy < L.h; cy++) if (L.cols[cx][cy] === 'Z') { L.cols[cx][cy] = '-'; for (let i = 0; i < 3; i++) G.parts.push({kind: 'crumb', x: cx * T + 4 + i * 4, y: cy * T + 4, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, t: 1}); }
    },
    updateParts() {
      for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.t -= 1 / 60; if (p.kind === 'text') p.y += p.vy; else if (p.float || p.kind === 'rain') { p.y += p.vy; p.x += p.vx || 0; } else { p.vy = (p.vy || 0) + (p.kind === 'heart' ? 0.22 : 0.18); p.y += p.vy; p.x += p.vx || 0; } if (p.t <= 0) G.parts.splice(i, 1); }
      for (let i = G.bumps.length - 1; i >= 0; i--) { G.bumps[i].t += 1 / 60; if (G.bumps[i].t > 0.25) G.bumps.splice(i, 1); }
      for (let i = G.crumbles.length - 1; i >= 0; i--) {
        const c = G.crumbles[i]; c.t += 1 / 60;
        if (c.t > 0.45 && !c.gone) { c.gone = true; E.setTile(c.cx, c.cy, '-'); A().sfx.crumble(); for (let k = 0; k < 4; k++) G.parts.push({kind: 'crumb', x: c.cx * T + 2 + k * 4, y: c.cy * T + 4, vx: (Math.random() - 0.5), vy: 0.5 + Math.random(), t: 0.8}); }
        if (c.t > 5) { if (E.tileAt(c.cx, c.cy) === '-') E.setTile(c.cx, c.cy, 'c'); G.crumbles.splice(i, 1); }
      }
      if (S.shake > 0) S.shake = Math.max(0, S.shake - 0.3);
      /* puzzle bells: lights fade; the melody demo plays the order */
      const pz = L.puzzle;
      if (pz) {
        for (let i = 0; i < 4; i++) if (pz.lit[i] > 0) pz.lit[i] = Math.max(0, pz.lit[i] - 1 / 60);
        if (pz.demoCd > 0) pz.demoCd -= 1 / 60;
        if (pz.demo) { pz.demo.t += 1 / 60; if (pz.demo.t >= 0.55) { pz.demo.t = 0; const idx = pz.order[pz.demo.i]; pz.lit[idx] = 0.5; A().sfx.bell(idx); G.bumps.push({cx: pz.bells[idx], cy: 8, t: 0}); pz.demo.i++; if (pz.demo.i >= pz.order.length) pz.demo = null; } }
      }
    },
    updateCamera() {
      let target = P.x + P.facing * 20 - G.VW * 0.42;
      if (S.camLock) target = S.camLock;
      const rm = E.room(S.room), minX = rm ? rm.roomCol * T : 0, maxX = rm ? (rm.roomEnd || L.w) * T - G.VW : L.mainW * T - G.VW;
      S.cam += (Math.max(minX, Math.min(maxX, target)) - S.cam) * 0.12;
      if (S.flash > 0) S.flash = Math.max(0, S.flash - 0.04);
      /* the camera follows downwards in deep sections (caves, waterfalls) and stays on the band elsewhere */
      let ty = 0; if (L.h > MH && !S.room && (E.isDeep(Math.floor((P.x + P.w / 2) / T)) || P.y + P.h > MH * T + 8)) ty = P.y + P.h / 2 - MH * T * 0.55;
      ty = Math.max(0, Math.min(L.h * T - MH * T, ty)); S.camY = (S.camY || 0) + (ty - (S.camY || 0)) * (Math.abs(P.vy) > 4 ? 0.22 : 0.12); if (Math.abs(S.camY - ty) < 0.05) S.camY = ty;
    },
  };
})();

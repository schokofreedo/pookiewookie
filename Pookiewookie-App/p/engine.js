/* Pookiewookie: core engine. Tiles, physics, Wookie, boxes, collectibles, checkpoints, goal and rescue sequences, particles. */
(function () {
  const G = window.PW = window.PW || {}, A = () => G.audio;
  const T = G.T = 16, VW = G.VW = 480, VH = G.VH = 270, MH = G.MH = 15; G.OFFY = VH - MH * T;
  const SOLID = new Set(['#', '=', '?', '!', 'X', 'n', '|', 's', 'i', 'b', 'c', 'Z', 'g', 'P']);
  const S = G.S = {mode: 'title', wi: 0, li: 0, lives: 4, score: 0, hearts: 0, time: 300, timeAcc: 0, cam: 0, frames: 0, shake: 0, voiceT: 8, stars: [false, false, false], checkpoint: null, bossActive: false, gateOpen: false, wind: 0, camLock: null, room: 0, honey: 0, flash: 0};
  const P = G.P = {x: 0, y: 0, vx: 0, vy: 0, w: 12, h: 14, big: false, coffee: false, wings: false, onGround: false, facing: 1, inv: 0, dead: false, deathT: 0, anim: 0, throwT: 0, ground: 'meadow', coyote: 0, jumpBuf: 0, climbing: false, sx: 1, sy: 1, gliding: false, wasGround: false,
    gadget: null, gadT: 0, fuel: 0, jetting: false, wallSlide: false, wallDir: 0, wallCoyote: 0, wallJumpT: 0, pound: false, poundT: 0, poundLand: false, launch: 0, cannon: null, cannonCd: 0, combo: 0, pipeCd: 0, hidden: false};
  const input = G.input = {left: false, right: false, jump: false, run: false, down: false, up: false, jumpEdge: false, runEdge: false, downEdge: false};
  G.ents = []; G.parts = []; G.bumps = []; G.crumbles = []; G.goalSeq = null;
  let L = null;

  const E = G.eng = {
    load(wi, li, fromCheckpoint, custom) {
      const src = custom || G.buildLevel(wi, li);
      L = G.L = {w: src.cols.length, wi, li, world: G.WORLDS[wi], tower: src.tower, name: src.name, sub: src.sub, par: src.par, cols: src.cols.map(c => c.slice()), rescued: false, starXs: [], bonus: src.bonus || null, mainW: src.bonus ? src.bonus.roomCol : src.cols.length, hub: !!src.hub};
      P.skydive = false; P.victory = false; S.outfit = G.WORLDS[wi].key;
      G.ents = []; G.parts = []; G.bumps = []; G.crumbles = []; G.goalSeq = null;
      S.bossActive = false; S.gateOpen = false; S.camLock = null; S.wind = 0; S.room = 0; S.honey = 0; S.flash = 0;
      if (G.gad) G.gad.clear(true); A().fast = false; A().slow = false;
      P.pound = false; P.poundT = 0; P.poundLand = false; P.launch = 0; P.cannon = null; P.cannonCd = 0; P.combo = 0; P.pipeCd = 0; P.hidden = false; P.jetting = false; P.wallSlide = false; P.wallJumpT = 0; P.wallCoyote = 0;
      if (!fromCheckpoint) { S.stars = [false, false, false]; S.checkpoint = null; }
      for (let cx = 0; cx < L.w; cx++) for (let cy = 0; cy < MH; cy++) {
        const ch = L.cols[cx][cy];
        if (ch === 'R') { P.x = cx * T + 2; P.y = cy * T + (T - P.h); L.cols[cx][cy] = '-'; }
        else if ('EGMSCVTJDBN'.includes(ch)) { const e = G.entsMod.make(ch, cx, cy, L.world, wi * 4 + li); if (e) G.ents.push(e); L.cols[cx][cy] = '-'; }
        else if (ch === 'F' && !L.goalX) L.goalX = cx * T;
        else if (ch === 'W') { L.doorX = cx * T; L.cols[cx][cy] = '-'; }
        else if (ch === 'U') L.towerX = cx * T;
        else if (ch === 'A') { L.arenaX = cx * T; L.cols[cx][cy] = '-'; }
        else if (ch === '*') L.starXs.push(cx);
      }
      L.starXs.sort((a, b) => a - b);
      if (fromCheckpoint && S.checkpoint) { P.x = S.checkpoint.x; P.y = S.checkpoint.y; for (let cy = 0; cy < MH; cy++) if (L.cols[S.checkpoint.cx][cy] === 'K') L.cols[S.checkpoint.cx][cy] = 'k'; for (const sx of L.starXs) { const idx = L.starXs.indexOf(sx); if (S.stars[idx]) for (let cy = 0; cy < MH; cy++) if (L.cols[sx][cy] === '*') L.cols[sx][cy] = '-'; } }
      P.vx = P.vy = 0; P.dead = false; P.inv = 0; P.facing = 1; P.climbing = false; P.h = P.big ? 24 : 14; P.sx = P.sy = 1;
      S.time = src.par; S.timeAcc = 0; S.cam = Math.max(0, P.x - VW * 0.4); S.voiceT = 3; S.shake = 0;
      A().setWorld(L.world.music); A().setBoss(false);
      return L;
    },
    tileAt(cx, cy) { if (cx < 0 || cx >= L.w) return '#'; if (cy < 0 || cy >= MH) return '-'; return L.cols[cx][cy]; },
    solidAt(cx, cy) { return SOLID.has(E.tileAt(cx, cy)); },
    setTile(cx, cy, ch) { if (cx >= 0 && cx < L.w && cy >= 0 && cy < MH) L.cols[cx][cy] = ch; },
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
      else if (ch === '=') { if (P.big) { E.setTile(cx, cy, '-'); A().sfx.pop(); for (let i = 0; i < 4; i++) G.parts.push({kind: 'crumb', x: cx * T + 4 + (i % 2) * 8, y: cy * T + 4 + Math.floor(i / 2) * 8, vx: (i % 2 ? 1 : -1) * (1 + Math.random()), vy: -3 - Math.random() * 2, t: 1.2}); S.score += 50; } else { G.bumps.push({cx, cy, t: 0}); A().sfx.bump(); } }
      else A().sfx.bump();
      for (const e of G.ents) if (e.alive && e.stompable !== undefined && Math.floor((e.y + e.h + 1) / T) === cy && Math.floor((e.x + e.w / 2) / T) === cx) E.kill(e, true);
    },
    collectHeart(cx, cy, fromBox) {
      S.hearts++; S.score += 100; A().sfx.heart();
      G.parts.push({kind: 'heart', x: cx * T + 4, y: cy * T - (fromBox ? 8 : 0), vy: -2.6, t: 0.7});
      if (S.hearts >= 50) { S.hearts -= 50; S.lives++; A().sfx.oneUp(); E.toast('1 UP'); }
    },
    collectStar(cx, cy) {
      const idx = Math.max(0, L.starXs.indexOf(cx)); S.stars[idx] = true; S.score += 2000; A().sfx.star(); E.toast('Sternkeks!');
      for (let i = 0; i < 12; i++) G.parts.push({kind: 'star', x: cx * T + 8, y: cy * T + 8, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2.5, t: 0.9});
    },
    kill(e, byBump, ptsOverride) {
      if (!e.alive) return; e.alive = false; e.dieT = 0; e.flip = !!byBump;
      const pts = ptsOverride !== undefined ? ptsOverride : (e.points || 100); S.score += pts; if (pts) E.toast(P.combo > 1 && !byBump && ptsOverride !== undefined ? '×' + P.combo + '  +' + pts : '+' + pts, e.x, e.y - 8);
      for (let i = 0; i < 6; i++) G.parts.push({kind: e.kind === 'flyer' ? 'star' : 'puff', x: e.x + e.w / 2, y: e.y + 6, vx: (Math.random() - 0.5) * 2.5, vy: -1 - Math.random() * 2, t: 0.8});
    },

    /* ---------- Wookie ---------- */
    hurt(by) {
      if (P.inv > 0 || P.dead || G.goalSeq || P.gadget === 'star' || P.launch > 0 || P.cannon) return;
      if (G.gad && G.gad.absorbHit()) return;
      if (P.big) { P.big = false; P.coffee = false; P.wings = false; P.h = 14; P.y += 10; P.inv = 1.6; A().sfx.hurt(); S.shake = 4; }
      else E.die('enemy:' + (by || '?'));
    },
    die(why) {
      if (P.dead) return;
      S.lastDeath = {why, x: Math.round(P.x), y: Math.round(P.y)};
      P.dead = true; P.deathT = 0; P.vy = -6.5; P.vx = 0; P.big = false; P.coffee = false; P.wings = false; P.climbing = false; S.timeAcc = 0;
      P.pound = false; P.launch = 0; P.cannon = null; P.hidden = false; P.jetting = false; P.wallSlide = false; if (G.gad) G.gad.clear(true); S.honey = 0; A().slow = false; A().fast = false;
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
    enterRoom(n) {
      const b = L.bonus; if (!b) return;
      S.room = n; P.vx = 0; P.vy = 0; P.pipeCd = 40; S.flash = 1; A().sfx.pipe(); P.climbing = false; P.pound = false;
      if (n === 1) { P.x = (b.roomCol + 2) * T + 2; P.y = 13 * T - P.h; S.cam = b.roomCol * T; E.toast('Bonusraum!'); }
      else { P.x = b.pipeCol * T + 2; P.y = b.pipeTop * T - P.h; S.cam = Math.max(0, Math.min(L.mainW * T - VW, P.x - VW * 0.42)); }
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
      if (P.cannonCd > 0) P.cannonCd--; if (P.pipeCd > 0) P.pipeCd--; if (P.wallJumpT > 0) P.wallJumpT--;
      if (P.flip > 0) { P.flip = Math.max(0, P.flip - 1 / 26); if (P.onGround) P.flip = 0; }
      /* inside a honey cannon: wait, then fly */
      if (P.cannon) { const e = P.cannon; e.loadT -= 1 / 60; P.x = e.x + 4; P.y = e.y; P.vx = P.vy = 0; if (e.loadT <= 0) E.fireCannon(e); return; }
      /* cannonball flight: no control until Wookie lands or hits a wall */
      if (P.launch > 0) {
        P.launch--; P.vy += 0.42; E.moveX(P); E.moveY(P, true); P.anim += 0.3;
        if (S.frames % 2 === 0) G.parts.push({kind: 'spark', x: P.x + 2, y: P.y + 6, vx: -1 - Math.random(), vy: (Math.random() - 0.5), t: 0.35, col: '#ffd84a'});
        if (P.onGround || P.hitWall) { P.launch = 0; if (P.onGround) { P.vx *= 0.5; E.puff(P.x + 6, P.y + P.h, 6, '#fff'); } }
        E.afterMove(); return;
      }
      const W = L.world, icy = P.ground === 'ice' && P.onGround, honey = P.ground === 'honey' && P.onGround;
      const max = (input.run ? 2.6 : 1.55) * (honey ? 0.5 : 1) * (P.coffee ? 1.12 : 1);
      const acc = P.onGround ? (icy ? 0.045 : 0.11) : 0.07, fr = P.onGround ? (icy ? 0.012 : (honey ? 0.2 : 0.1)) : 0.02;
      const dir = P.wallJumpT > 0 ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
      /* ground pound: tap down in the air */
      if (input.downEdge && !P.onGround && !P.climbing && !P.pound && !P.jetting) { P.pound = true; P.poundT = 9; P.vx = 0; P.vy = -1.5; A().sfx.poundStart(); P.sx = 0.8; P.sy = 1.2; }
      if (P.pound) {
        if (P.poundT > 0) { P.poundT--; P.vy = -1.2; } else { P.vy = 7.5; if (S.frames % 2 === 0) E.puff(P.x + 6, P.y, 1, '#fff'); }
        P.vx = 0; E.moveX(P); E.moveY(P, true); P.anim += 0.5;
        E.afterMove(); return;
      }
      /* vines */
      const ccx = Math.floor((P.x + P.w / 2) / T), ccy = Math.floor((P.y + P.h / 2) / T), onVine = E.tileAt(ccx, ccy) === 'v' || E.tileAt(ccx, Math.floor((P.y + 2) / T)) === 'v';
      if (!P.climbing && onVine && (input.up || (input.down && !P.onGround))) { P.climbing = true; P.vx = 0; P.vy = 0; P.jumpBuf = 0; input.jumpEdge = false; }
      if (P.climbing) {
        if (!onVine) P.climbing = false;
        else {
          P.vy = (input.up ? -1.3 : 0) + (input.down ? 1.3 : 0); P.vx = dir * 0.8; if (dir) P.facing = dir;
          E.moveX(P); E.moveY(P, true); P.anim += Math.abs(P.vy) * 0.15 + Math.abs(P.vx) * 0.1;
          if (input.jumpKeyEdge) { P.climbing = false; P.vy = -5; A().sfx.jump(); }
          if (P.onGround && input.down) P.climbing = false;
          E.afterMove(); return;
        }
      }
      if (dir) { P.vx += dir * acc; P.facing = dir; if (Math.abs(P.vx) > max) P.vx += (max * Math.sign(P.vx) - P.vx) * (icy ? 0.03 : 0.1); }
      else { if (Math.abs(P.vx) < fr) P.vx = 0; else P.vx -= Math.sign(P.vx) * fr; }
      if (W.wind) { S.wind = Math.sin(S.frames / 240) * 0.05 + Math.sin(S.frames / 71) * 0.015; P.vx += S.wind * (P.onGround ? 0.35 : 1); }
      if (P.onGround) { P.coyote = 6; P.jumps = 0; } else if (P.coyote > 0) P.coyote--;
      if (input.jumpEdge) P.jumpBuf = 6; else if (P.jumpBuf > 0) P.jumpBuf--;
      const jm = G.gad ? G.gad.jumpMul() : 1;
      /* jumps have a fixed height (no holding); a second jump is allowed in the air */
      if (P.jumpBuf > 0 && P.coyote > 0) { P.vy = -(6.1 + Math.abs(P.vx) * 0.25) * jm; P.coyote = 0; P.jumpBuf = 0; P.onGround = false; P.jumps = 1; P.sx = 0.8; P.sy = 1.25; if (P.big || jm > 1) A().sfx.bigJump(); else A().sfx.jump(); E.puff(P.x + 6, P.y + P.h, 3, '#fff'); }
      else if (P.jumpBuf > 0 && !P.onGround && !P.climbing && !P.wallSlide && P.wallCoyote <= 0 && (P.jumps || 1) < 2) { P.jumps = (P.jumps || 1) + 1; P.vy = -5.4 * jm; P.jumpBuf = 0; P.sx = 0.8; P.sy = 1.25; P.flip = 1; A().sfx.doubleJump(); G.parts.push({kind: 'ring', x: P.x + 6, y: P.y + P.h, t: 0.3, float: true, vx: 0, vy: 0}); E.puff(P.x + 6, P.y + P.h, 4, '#fff'); }
      /* climbing claws: slide down walls, kick off them */
      P.wallSlide = false;
      if (P.gadget === 'claws' && !P.onGround && !P.climbing) {
        const cyA = Math.floor((P.y + 3) / T), cyB = Math.floor((P.y + P.h - 3) / T);
        const wl = E.solidAt(Math.floor((P.x - 1) / T), cyA) || E.solidAt(Math.floor((P.x - 1) / T), cyB), wr = E.solidAt(Math.floor((P.x + P.w + 1) / T), cyA) || E.solidAt(Math.floor((P.x + P.w + 1) / T), cyB);
        const wd = (dir < 0 && wl) ? -1 : ((dir > 0 && wr) ? 1 : 0);
        if (wd && P.vy > 0) { P.wallSlide = true; P.wallDir = wd; P.wallCoyote = 8; if (S.frames % 4 === 0) { E.puff(P.x + (wd > 0 ? P.w : 0), P.y + P.h - 2, 1, '#fff'); A().sfx.slide(); } }
        else if (P.wallCoyote > 0) P.wallCoyote--;
        if (P.jumpBuf > 0 && (P.wallSlide || P.wallCoyote > 0)) { P.vy = -5.8 * jm; P.vx = -P.wallDir * 3.0; P.facing = -P.wallDir; P.wallJumpT = 10; P.jumpBuf = 0; P.wallSlide = false; P.wallCoyote = 0; P.jumps = 1; A().sfx.wallJump(); E.puff(P.x + (P.wallDir > 0 ? P.w : 0), P.y + P.h / 2, 4, '#fff'); }
      } else P.wallCoyote = 0;
      P.gliding = P.wings && !P.onGround && P.vy > 0 && input.jump && !P.jetting;
      if (P.bounceT > 0) P.bounceT -= 1 / 60;
      P.vy += P.vy < 0 ? 0.28 : 0.42; if (P.vy > 6.5) P.vy = 6.5; if (P.gliding && P.vy > 1.1) P.vy = 1.1; if (P.wallSlide && P.vy > 1.0) P.vy = 1.0;
      if (G.gad) G.gad.jet(input);
      E.moveX(P); E.moveY(P, true);
      /* moving platforms carry Wookie */
      for (const e of G.ents) if ((e.kind === 'platformH' || e.kind === 'platformV') && e.alive) { const top = e.y, onIt = P.x + P.w > e.x + 2 && P.x < e.x + e.w - 2 && P.y + P.h >= top - 1 && P.y + P.h <= top + 6 + Math.max(0, e.dy || 0) && P.vy >= 0; if (onIt) { P.y = top - P.h; P.vy = 0; P.onGround = true; P.x += e.dx || 0; P.coyote = 6; } }
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
        else if (ch === '*') { E.setTile(cx, cy, '-'); E.collectStar(cx, cy); }
        else if (ch === 'K') { E.setTile(cx, cy, 'k'); S.checkpoint = {x: cx * T + 2, y: cy * T + T - 14, cx}; A().sfx.checkpoint(); E.toast('Checkpoint!'); }
        else if (ch === '~' && P.y + P.h > cy * T + 6) { for (let i = 0; i < 8; i++) G.parts.push({kind: 'splash', x: P.x + 6, y: cy * T + 4, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, t: 0.7, col: L.world.liquid.b}); A().sfx.splash(); E.die('liquid'); return; }
      }
      if (P.y > MH * T + 20) { E.die('pit'); return; }
      if (P.poundLand) { P.poundLand = false; E.shockwave(); }
      if (P.onGround) P.combo = 0;
      if (!S.room) {
        if (L.goalX && P.x + P.w / 2 >= L.goalX + 4) E.startPost();
        if (L.arenaX && !S.bossActive && !S.gateOpen && !L.bossDone && P.x >= L.arenaX) G.entsMod.bossStart();
        if (L.doorX && S.gateOpen && P.x + P.w / 2 >= L.doorX + 6) E.startDoor();
      }
      /* golden pipes lead into and out of the bonus room */
      if (L.bonus && input.down && P.onGround && P.pipeCd <= 0 && !P.pound) { const pc = Math.floor((P.x + P.w / 2) / T), pr = Math.floor((P.y + P.h + 1) / T); if (E.tileAt(pc, pr) === 'P') { E.enterRoom(S.room ? 0 : 1); return; } }
      if (P.throwT > 0) P.throwT -= 1 / 60;
      if (P.coffee && input.runEdge && P.throwT <= 0 && G.ents.filter(e => e.kind === 'bean' && e.alive).length < 2) { P.throwT = 0.25; A().sfx.throwBean(); G.ents.push({kind: 'bean', x: P.x + (P.facing > 0 ? P.w : -6), y: P.y + 6, w: 6, h: 6, vx: P.facing * 3.8, vy: -1, alive: true, t: 3}); }
      if (P.gadget === 'sling' && input.runEdge && P.throwT <= 0 && G.ents.filter(e => e.kind === 'honeyshot' && e.alive).length < 2) { P.throwT = 0.22; A().sfx.shoot(); P.sx = 1.2; G.ents.push({kind: 'honeyshot', x: P.x + (P.facing > 0 ? P.w : -8), y: P.y + (P.big ? 10 : 4), w: 8, h: 8, vx: P.facing * 4.6, vy: 0, alive: true, t: 1.1, anim: 0}); }
      if (P.inv > 0) P.inv -= 1 / 60;
      if (Math.abs(P.vx) > 0.1 && P.onGround) { P.anim += Math.abs(P.vx) * 0.12; if (S.frames % 10 === 0 && Math.abs(P.vx) > 2) E.puff(P.x + (P.facing > 0 ? 0 : 12), P.y + P.h, 1, P.ground === 'ice' ? '#dff' : '#fff'); } else if (P.onGround) P.anim = 0;
    },
    startPost() {
      G.goalSeq = {t: 0, phase: 'slide'}; P.x = L.goalX - P.w + 3; P.vx = 0; P.vy = 0; P.climbing = false;
      const bonus = Math.max(100, Math.round((13 * T - P.y) / T) * 100); S.score += bonus; E.toast('+' + bonus); A().stopMusic(); A().sfx.flag();
      for (const e of G.ents) e.frozen = true;
    },
    startDoor() {
      G.goalSeq = {t: 0, phase: L.world.boss.final ? 'rescue' : 'door'}; P.vx = 0; P.vy = 0; A().stopMusic();
      for (const e of G.ents) e.frozen = true;
      if (L.world.boss.final) { A().sfx.rescue(); L.rescued = true; G.ents.push({kind: 'pookie', x: L.doorX + 20, y: 13 * T - 14, w: 12, h: 14, alive: true, anim: 0, vx: 0}); G.flow.speak('Pookie!', {pitch: 1.9, rate: 0.9}); setTimeout(() => { if (G.goalSeq) G.flow.speak('Wookie!', {pitch: 2.0, rate: 0.95}); }, 1400); }
      else { A().sfx.flag(); G.flow.speak('Pookie is in another tower...', {pitch: 1.7, rate: 0.8, sad: true}); }
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
    openGate() {
      S.gateOpen = true; S.camLock = null; A().sfx.gate(); A().setBoss(false);
      for (let cx = 0; cx < L.w; cx++) for (let cy = 0; cy < MH; cy++) if (L.cols[cx][cy] === 'Z') { L.cols[cx][cy] = '-'; for (let i = 0; i < 3; i++) G.parts.push({kind: 'crumb', x: cx * T + 4 + i * 4, y: cy * T + 4, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, t: 1}); }
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
    },
    updateCamera() {
      let target = P.x + P.facing * 20 - VW * 0.42;
      if (S.camLock) target = S.camLock;
      const minX = S.room && L.bonus ? L.bonus.roomCol * T : 0, maxX = S.room ? L.w * T - VW : L.mainW * T - VW;
      S.cam += (Math.max(minX, Math.min(maxX, target)) - S.cam) * 0.12;
      if (S.flash > 0) S.flash = Math.max(0, S.flash - 0.04);
    },
  };
})();

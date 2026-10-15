/* Pookiewookie: enemies, hazards, platforms, projectiles, power-ups and bosses. Behaviours are generic; the look comes from the world. */
(function () {
  const G = window.PW = window.PW || {}, A = () => G.audio, T = 16, MH = 15;
  const E = () => G.eng, S = () => G.S, P = () => G.P, L = () => G.L;
  const M = G.entsMod = {
    make(ch, cx, cy, W, d) {
      const x = cx * T, y = cy * T, sp = 1 + d * 0.025;
      const look = W.ents[ch];
      if (ch === 'E') { const edge = ['crab', 'penguin', 'cloudling'].includes(look); return {kind: 'walker', look, x, y: y + 2, w: 14, h: 14, vx: -0.45 * sp, speed: 0.45 * sp, alive: true, anim: 0, turnsAtEdge: edge, stompable: true, points: 100}; }
      if (ch === 'G') return {kind: 'flyer', look, x, y: y - 14, baseY: y - 14, w: 14, h: 12, vx: -0.6 * sp, speed: 0.6 * sp, alive: true, anim: Math.random() * 6, stompable: true, points: 200};
      if (ch === 'M') return {kind: 'spiky', look, x, y: y + 2, w: 14, h: 14, vx: -0.5 * sp, speed: 0.5 * sp, alive: true, anim: 0, turnsAtEdge: true, stompable: false, points: 400};
      if (ch === 'S') return {kind: 'pipeHazard', look, x: x + 2, y: y + T, baseY: y + T, w: 28, h: 12, t: Math.random() * 5, alive: true, up: 0, period: Math.max(3.2, 5 - d * 0.08)};
      if (ch === 'C') return {kind: 'platformH', look, x, y: y + 6, ox: x, w: 40, h: 10, vx: 0.7 * sp, dir: 1, alive: true, range: 36 + Math.min(20, d * 1.2), dx: 0};
      if (ch === 'V') return {kind: 'platformV', look, x, y: y + 6, oy: y + 6, w: 40, h: 10, vy: 0.6 * sp, dir: 1, alive: true, range: 40, dy: 0};
      if (ch === 'T') { if (!look) return null; return {kind: 'thrower', look, x, y: y + 2, w: 14, h: 14, alive: true, anim: 0, t: 1 + Math.random(), period: Math.max(1.4, 2.4 - d * 0.04), stompable: look !== 'cannon', points: 300}; }
      if (ch === 'J') { if (!look) return null; return {kind: 'jumper', look, x: x + 1, y: y + 20, baseY: y + 20, w: 14, h: 14, alive: true, anim: 0, t: Math.random() * 3, vy: 0, period: Math.max(1.8, 3 - d * 0.05), stompable: look === 'fish', points: 200}; }
      if (ch === 'D') { if (!look) return null; return {kind: 'dropper', look, x: x + 1, y, oy: y, w: 14, h: look === 'thwomp' ? 20 : 18, alive: true, state: 'wait', vy: 0, t: 0}; }
      if (ch === 'B') { const b = W.boss; return {kind: 'boss', look: W.boss.kind, name: b.name, x: x - 8, y: y - 14, w: 30, h: 30, vx: 0, vy: 0, hp: b.hp, maxHp: b.hp, alive: true, active: false, anim: 0, t: 0, inv: 0, dir: -1, phase: 'idle', baseY: y - 14, flash: 0, points: 5000, weapon: !!b.weapon, attacks: b.attacks || [], atkI: 0, atkT: 2.2, arena: b.arena || 'ground', tip: b.tip || ''}; }
      if (ch === 'N') return {kind: 'cannon', look: 'honeycannon', x: x - 4, y: y - 4, w: 22, h: 20, alive: true, anim: 0, loadT: 0, fireT: 0};
      return null;
    },
    bossStart() {
      const boss = G.ents.find(e => e.kind === 'boss'); if (!boss) return;
      S().bossActive = true; S().camLock = L().arenaX - 40; boss.active = true; boss.t = 1.2; boss.atkT = 2.4; A().setBoss(true); S().shake = 6; A().sfx.thud();
      if (boss.weapon) { P().blaster = true; if (A().sfx.gadget) A().sfx.gadget(); }
      G.flow.banner(boss.name, 3.2, boss.tip || ('Stampfe ' + boss.maxHp + '× auf den Kopf!'));
    },
    throwAt(e, target, look) {
      const dx = target.x - e.x, dist = Math.abs(dx); if (dist > 230) return;
      const vx = Math.sign(dx) * Math.min(3.2, 1.2 + dist / 90), vy = -4.2 - Math.min(1.5, dist / 120);
      G.ents.push({kind: 'shot', look, x: e.x + 4, y: e.y - 4, w: 8, h: 8, vx, vy, alive: true, t: 4, anim: 0}); A().sfx.throwIt(); e.anim = 1;
    },
    update() {
      const p = P(), s = S(), ents = G.ents, eng = E();
      const NOSLOW = {bean: 1, honeyshot: 1, heartfly: 1, roulette: 1, gadget: 1, cannon: 1, pookie: 1, milk: 1, coffee: 1, feather: 1, choco: 1};
      const slowFrame = s.honey > 0 && (s.frames % 5) >= 2;   /* Honigzeit: enemies only move on 2 of 5 frames */
      for (let i = ents.length - 1; i >= 0; i--) {
        const e = ents[i];
        if (!e.alive) { e.dieT += 1 / 60; if (e.flip) e.y += 2; if (e.dieT > 0.8) ents.splice(i, 1); continue; }
        if (e.frozen) continue;
        const onScreen = e.x > s.cam - 64 && e.x < s.cam + G.VW + 64; if (!onScreen && !['bean', 'shot', 'boss', 'honeyshot', 'heartfly', 'beam', 'warn'].includes(e.kind)) continue;
        if (!(slowFrame && !NOSLOW[e.kind])) {
        e.anim += 0.1; if (e.flash > 0) e.flash -= 1 / 60;
        if (e.kind === 'roulette') {
          /* spins through the gadget icons above the capsule, then settles */
          e.t += 1 / 60; if (e.y > e.baseY) e.y -= 1.5; const idx = Math.floor(e.t * 9) % G.GADGET_IDS.length; if (idx !== e.idx) { e.idx = idx; A().sfx.tick(); }
          if (e.t > 1.7) { e.kind = 'gadget'; e.id = G.gad.pick(); e.anim = 0; e.vx = 0.7; e.vy = -1.5; A().sfx.appear(); for (let k = 0; k < 8; k++) G.parts.push({kind: 'spark', x: e.x + 7, y: e.y + 7, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, t: 0.6, col: G.GADGETS[e.id].col}); }
          continue;
        }
        else if (e.kind === 'gadget') {
          /* the drawn gadget hops off the block and wanders like a mushroom so Wookie can grab it on the ground */
          eng.moveX(e); if (e.hitWall) e.vx = -(e.lastVx || e.vx || 0.7); if (e.vx) e.lastVx = e.vx;
          e.vy = Math.min(4, (e.vy || 0) + 0.3); eng.moveY(e, false); if (e.y > (G.L ? G.L.h : MH) * T + 20) { ents.splice(i, 1); continue; }
        }
        else if (e.kind === 'honeyshot') { e.t -= 1 / 60; e.anim += 0.3; eng.moveX(e); if (e.vy) { e.y += e.vy; if (eng.solidAt(Math.floor((e.x + 4) / T), Math.floor((e.y + 4) / T))) e.hitWall = true; } if (e.hitWall || e.t <= 0) { e.alive = false; e.dieT = 10; eng.puff(e.x + 4, e.y + 4, 3, '#f5c242'); continue; } for (const o of ents) if (o !== e && o.alive && (o.stompable !== undefined || o.kind === 'boss') && eng.overlap(e, o)) { if (o.kind === 'boss') { if (o.inv <= 0 && o.active) M.bossHit(o, 1); } else if (o.look !== 'cannon') eng.kill(o, true, (o.points || 100)); e.alive = false; e.dieT = 10; A().sfx.honeyHit(); eng.puff(e.x + 4, e.y + 4, 4, '#f5c242'); break; } continue; }
        else if (e.kind === 'heartfly') { e.t += 1 / 60; const dx = p.x + 6 - (e.x + 4), dy = p.y + p.h / 2 - (e.y + 4), d = Math.max(1, Math.hypot(dx, dy)), sp = Math.min(7, 1.2 + e.t * 7); e.x += dx / d * sp; e.y += dy / d * sp; if (d < 8 || e.t > 3) { e.alive = false; e.dieT = 10; eng.collectHeart(Math.floor(e.x / T), Math.floor(e.y / T), false); } continue; }
        else if (e.kind === 'cannon') { if (e.fireT > 0) e.fireT -= 1 / 60; }
        else if (e.kind === 'choco') { e.t -= 1 / 60; if (e.t <= 0) { e.alive = false; e.dieT = 10; if (s.frames % 4 === 0) A().sfx.melt(); for (let k = 0; k < 2; k++) G.parts.push({kind: 'splash', x: e.x + 4, y: e.y + 4, vx: (Math.random() - 0.5), vy: 0.5 + Math.random(), t: 0.5, col: '#5a2e14'}); } continue; }
        else if (e.kind === 'walker' || e.kind === 'spiky' || e.kind === 'milk' || e.kind === 'thrower') {
          if (e.rise > 0) { e.rise -= 0.5; e.y -= 0.5; if (e.rise <= 0 && e.kind === 'milk') e.vx = 1; continue; }
          if (e.kind === 'thrower') { e.t -= 1 / 60; if (e.t <= 0) { e.t = e.period; M.throwAt(e, p, e.look === 'monkey' ? 'coconut' : (e.look === 'snowman' ? 'snowball' : (e.look === 'robot' ? 'bolt' : 'cookieshot'))); } e.vy = (e.vy || 0) + 0.42; eng.moveY(e, false); continue; }
          if (e.turnsAtEdge && e.onGround && eng.edgeAhead(e)) e.vx = -e.vx;
          eng.moveX(e); if (e.hitWall) e.vx = (e.kind === 'milk' ? 1 : e.speed) * -Math.sign(e.lastVx || -1); if (e.vx) e.lastVx = e.vx;
          e.vy = (e.vy || 0) + 0.42; if (e.vy > 6) e.vy = 6; eng.moveY(e, false);
          if (e.y > (G.L ? G.L.h : MH) * T + 20) { ents.splice(i, 1); continue; }
        }
        else if (e.kind === 'flyer') { eng.moveX(e); if (e.hitWall) e.vx = e.speed * -Math.sign(e.lastVx || -1); if (e.vx) e.lastVx = e.vx; e.y = e.baseY + Math.sin(e.anim * 0.8) * 10; }
        else if (e.kind === 'coffee' || e.kind === 'feather') { if (e.rise > 0) { e.rise -= 0.5; e.y -= 0.5; } else if (e.kind === 'feather') e.y += Math.sin(e.anim) * 0.3; }
        else if (e.kind === 'pipeHazard') { e.t += 1 / 60; const ph = e.t % e.period; e.up = ph < 0.5 ? ph / 0.5 : (ph < 2 ? 1 : (ph < 2.5 ? 1 - (ph - 2) / 0.5 : 0)); e.y = e.baseY - 14 * e.up; if (ph < 0.02) A().sfx.hazard(); if (e.up > 0.9 && s.frames % 6 === 0 && e.look !== 'snapper') G.parts.push({kind: 'rain', x: e.x + 4 + Math.random() * 20, y: e.y + 10, vy: e.look === 'geyser' ? -1.5 : 1.5, t: 0.5, col: e.look === 'geyser' ? '#ffb347' : '#8fd3ff'}); }
        else if (e.kind === 'platformH') { const nx = e.x + e.vx * e.dir; e.dx = nx - e.x; e.x = nx; if (e.x > e.ox + e.range || e.x < e.ox - e.range) e.dir = -e.dir; }
        else if (e.kind === 'platformV') { const ny = e.y + e.vy * e.dir; e.dy = ny - e.y; e.y = ny; if (e.y > e.oy + e.range || e.y < e.oy - e.range) e.dir = -e.dir; }
        else if (e.kind === 'jumper') { e.t -= 1 / 60; if (e.state === 'air') { e.vy += 0.3; e.y += e.vy; if (e.y >= e.baseY) { e.y = e.baseY; e.state = 'wait'; e.t = e.period * (0.6 + Math.random() * 0.8); if (e.look === 'fireball') A().sfx.fire(); } } else if (e.t <= 0) { e.state = 'air'; e.vy = -(6.2 + Math.random() * 1.5); if (e.look === 'fish') A().sfx.splash(); else A().sfx.fire(); for (let k = 0; k < 4; k++) G.parts.push({kind: 'splash', x: e.x + 7, y: e.baseY, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), t: 0.5, col: L().world.liquid.b}); } }
        else if (e.kind === 'dropper') {
          if (e.state === 'wait') { if (Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < 40 && p.y > e.y) { e.state = 'warn'; e.t = 0; if (e.look === 'icicle') A().sfx.icicle(); } }
          else if (e.state === 'warn') { e.t += 1 / 60; e.x = e.ox !== undefined ? e.ox + (Math.random() - 0.5) * 2 : e.x; if (e.ox === undefined) e.ox = e.x; if (e.t > (e.look === 'icicle' ? 0.3 : 0.45)) { e.state = 'fall'; e.vy = 0; e.x = e.ox; } }
          else if (e.state === 'fall') { e.vy = Math.min(7, e.vy + 0.5); e.y += e.vy; const cy = Math.floor((e.y + e.h) / T), cx = Math.floor((e.x + e.w / 2) / T); if (eng.solidAt(cx, cy) || e.y > (G.L ? G.L.h : MH) * T) { e.y = cy * T - e.h; e.state = 'hit'; e.t = 0; s.shake = Math.max(s.shake, 5); A().sfx.thud(); eng.puff(e.x + e.w / 2, e.y + e.h, 8, e.look === 'icicle' ? '#dff' : '#ccc'); } }
          else if (e.state === 'hit') { e.t += 1 / 60; if (e.look === 'icicle') { if (e.t > 0.3) { e.state = 'respawn'; e.t = 0; } } else if (e.t > 0.8) e.state = 'rise'; }
          else if (e.state === 'respawn') { e.t += 1 / 60; if (e.t > 2.5) { e.state = 'wait'; e.y = e.oy; } continue; }
          else if (e.state === 'rise') { e.y -= 0.8; if (e.y <= e.oy) { e.y = e.oy; e.state = 'wait'; } }
        }
        else if (e.kind === 'beam' || e.kind === 'warn') { M.updateHazard(e); if (!e.alive) { ents.splice(i, 1); continue; } }
        else if (e.kind === 'shot') { e.t -= 1 / 60; e.vy += e.grav !== undefined ? e.grav : 0.25; e.x += e.vx; e.y += e.vy; const cx = Math.floor((e.x + 4) / T), cy = Math.floor((e.y + 8) / T); if (e.t <= 0 || e.y > (G.L ? G.L.h : MH) * T || eng.solidAt(cx, cy)) { e.alive = false; e.dieT = 10; eng.puff(e.x + 4, e.y + 4, 3, '#fff'); continue; } }
        else if (e.kind === 'bean') { e.t -= 1 / 60; e.vy += 0.35; eng.moveX(e); eng.moveY(e, false); if (e.onGround) e.vy = -3; if (e.hitWall || e.t <= 0 || e.y > (G.L ? G.L.h : MH) * T) { e.alive = false; e.dieT = 10; continue; } for (const o of ents) if (o !== e && o.alive && (o.stompable !== undefined || o.kind === 'boss') && o.kind !== 'bean' && eng.overlap(e, o)) { if (o.kind === 'boss') { if (o.inv <= 0 && o.active) { M.bossHit(o, 1); } } else if (o.look !== 'cannon') eng.kill(o, true); e.alive = false; e.dieT = 10; A().sfx.pop(); break; } }
        else if (e.kind === 'boss') M.updateBoss(e);
        }
        /* interaction with Wookie */
        if (p.dead || G.goalSeq || !e.alive || p.cannon) continue;
        const box = {x: p.x, y: p.y, w: p.w, h: p.h}, star = p.gadget === 'star';
        if (e.kind === 'milk' && eng.overlap(box, e)) { e.alive = false; e.dieT = 10; if (!p.big) { p.big = true; p.h = 24; p.y -= 10; } A().sfx.power(); s.score += 1000; eng.toast('Milch!'); continue; }
        if (e.kind === 'coffee' && eng.overlap(box, e)) { e.alive = false; e.dieT = 10; p.coffee = true; if (!p.big) { p.big = true; p.h = 24; p.y -= 10; } A().sfx.power(); s.score += 1000; eng.toast('Kaffee!'); continue; }
        if (e.kind === 'feather' && eng.overlap(box, e)) { e.alive = false; e.dieT = 10; p.wings = true; if (!p.big) { p.big = true; p.h = 24; p.y -= 10; } A().sfx.power(); s.score += 1000; eng.toast('Honigflügel! Springen halten = gleiten'); continue; }
        if (e.kind === 'chute' && eng.overlap(box, e)) { e.alive = false; e.dieT = 10; p.chute = true; p.chuteOpen = 0; A().sfx.gadget(); G.flow.banner('Fallschirm!', 2.6, 'Spring in den Schokowasserfall und lenk mit ◀ ▶. Unten ist heißer Kakao!'); continue; }
        if (e.kind === 'gadget' && eng.overlap(box, e)) { e.alive = false; e.dieT = 10; G.gad.give(e.id); continue; }
        if (e.kind === 'cannon' && p.launch <= 0 && p.cannonCd <= 0 && eng.overlap(box, e)) { p.cannon = e; e.loadT = 0.75; p.hidden = true; p.vx = p.vy = 0; p.pound = false; p.climbing = false; A().sfx.cannonLoad(); eng.toast('Honigkanone!', e.x + 4, e.y - 16); continue; }
        if (e.kind === 'beam' && e.active && M.beamHits(e, box)) { eng.hurt('beam'); continue; }
        if (e.kind === 'shot' && eng.overlap(box, e)) { e.alive = false; e.dieT = 10; if (star) { eng.puff(e.x + 4, e.y + 4, 4, '#ffd84a'); A().sfx.pop(); } else eng.hurt(e.look); continue; }
        if ((e.kind === 'walker' || e.kind === 'flyer' || e.kind === 'spiky' || e.kind === 'thrower' || e.kind === 'jumper') && eng.overlap(box, e)) {
          if (star) { eng.kill(e, true, (e.points || 100) * 2); A().sfx.pop(); for (let k = 0; k < 6; k++) G.parts.push({kind: 'spark', x: e.x + 7, y: e.y + 7, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3, t: 0.6, col: '#ffd84a'}); continue; }
          const fromAbove = p.vy > 0 && p.y + p.h - e.y < (p.pound ? 22 : 10);
          if (p.pound && fromAbove && e.look !== 'cannon') { eng.kill(e, true, (e.points || 100) * 2); p.vy = -4.5; p.pound = false; p.poundT = 0; A().sfx.stomp(); A().sfx.pop(); p.sx = 1.3; p.sy = 0.7; s.shake = Math.max(s.shake, 3); }
          else if (e.stompable && fromAbove) { eng.kill(e, false, G.gad.comboPoints(e)); p.vy = -5.0 * G.gad.jumpMul(); p.jumps = 1; A().sfx.stomp(); p.sx = 1.3; p.sy = 0.7; }
          else if (e.look === 'cannon' && fromAbove) { p.vy = -3.5; }
          else eng.hurt(e.look);
        }
        if (e.kind === 'pipeHazard' && e.up > 0.3 && eng.overlap(box, {x: e.x + 4, y: e.y, w: e.w - 8, h: e.h})) eng.hurt(e.look);
        if (e.kind === 'dropper' && (e.state === 'fall' || e.state === 'hit' || e.state === 'rise') && eng.overlap(box, e)) eng.hurt(e.look);
        if (e.kind === 'boss' && e.active && eng.overlap(box, e)) {
          if (p.vy > 0 && p.y + p.h - e.y < (p.pound ? 22 : 12) && e.inv <= 0) { M.bossHit(e, 1); p.vy = -6; p.sx = 1.3; p.sy = 0.7; p.pound = false; p.poundT = 0; }
          else if (star) { p.vx = (p.x + 6 < e.x + e.w / 2 ? -1 : 1) * 3; p.vy = -3; }
          else if (e.inv <= 0) eng.hurt('boss');
        }
      }
    },
    bossHit(b, dmg) {
      b.hp -= dmg; b.inv = b.weapon ? 0.3 : 1.2; b.flash = 0.4; S().shake = 6; A().sfx.bossHit(); E().toast(b.hp > 0 ? 'Treffer!' : 'Besiegt!', b.x, b.y - 10);
      for (let i = 0; i < 8; i++) G.parts.push({kind: 'star', x: b.x + 15, y: b.y + 6, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2, t: 0.8});
      if (b.hp <= 0) { if (G.eco) G.eco.add(150, b.x, b.y - 20); b.active = false; b.alive = false; b.dieT = -1.2; b.defeated = true; L().bossDone = true; S().score += b.points; S().bossActive = false; A().sfx.bossDown(); for (let i = 0; i < 24; i++) G.parts.push({kind: 'puff', x: b.x + 15 + (Math.random() - 0.5) * 20, y: b.y + 15, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 3, t: 1.2, col: '#fff'}); setTimeout(() => E().openGate(), 1300); G.flow.banner('Boss besiegt!', 2, 'Das Tor öffnet sich.'); }
    },
    /* ---------- boss attacks: projectiles, falling hazards with warning marks, telegraphed beams ---------- */
    groundBelow(x, y) { const eng = E(), Lv = L(); let cy = Math.floor(y / T); const cx = Math.floor(x / T); while (cy < Lv.h && !eng.solidAt(cx, cy) && E().tileAt(cx, cy) !== '~') cy++; return cy * T; },
    ceilingAbove(x, y) { const eng = E(); let cy = Math.floor(y / T); const cx = Math.floor(x / T); let n = 0; while (cy > 0 && !eng.solidAt(cx, cy - 1) && n++ < 14) cy--; return cy * T; },
    shoot(b, o) { G.ents.push(Object.assign({kind: 'shot', boss: true, w: 8, h: 8, alive: true, t: 5, anim: 0}, o)); },
    dropAt(b, x, look, fromCeiling) {
      const gy = M.groundBelow(x, b.baseY - 4), top = fromCeiling ? M.ceilingAbove(x, b.baseY - 10) : Math.max(S().camY || 0, gy - 220);
      G.ents.push({kind: 'warn', x: x - 6, y: gy - 6, w: 12, h: 6, alive: true, t: 0, delay: 0.95, look, spawn: {x: x - 4, y: top, vx: 0, vy: 0.5, grav: 0.32, look}});
    },
    attack(b, kind) {
      const p = P(), cx = b.x + b.w / 2, cy = b.y + b.h * 0.45, px = p.x + p.w / 2, py = p.y + p.h / 2, dir = Math.sign(px - cx) || -1, Lw = L().world.key;
      if (kind === 'spit') { const look = Lw === 'weltraum' ? 'plasma' : (Lw === 'schnee' ? 'snowball' : 'spit'); for (let k = -1; k <= 1; k++) M.shoot(b, {x: cx - 4, y: cy, vx: dir * (1.5 + Math.abs(px - cx) / 170 + k * 0.55), vy: -4.4 - k * 0.5, grav: 0.22, look}); A().sfx.throwIt(); }
      else if (kind === 'bubble') { for (let k = 0; k < 3; k++) M.shoot(b, {x: cx - 4 + dir * 10, y: cy - 4 - k * 8, vx: dir * (1.0 + k * 0.35), vy: -0.35 - k * 0.15, grav: -0.004, t: 5, look: 'bubble', w: 10, h: 10}); A().sfx.bubbleOn(); }
      else if (kind === 'coco') { for (const off of [-48, 0, 48]) M.dropAt(b, px + off + (Math.random() - 0.5) * 16, 'coconut', false); A().sfx.throwIt(); }
      else if (kind === 'rain') { for (let k = 0; k < 4; k++) M.dropAt(b, px + (k - 1.5) * 44 + (Math.random() - 0.5) * 20, 'lavadrop', false); A().sfx.fire(); }
      else if (kind === 'quake') { for (let k = 0; k < 3; k++) M.dropAt(b, px + (k - 1) * 52 + (Math.random() - 0.5) * 24, 'icechunk', true); }
      else if (kind === 'fire') { b.charge = 0.7; b.chargeKind = 'fire'; b.aim = {x: px, y: py}; }
      else if (kind === 'bolt') { G.ents.push({kind: 'beam', dir: 'v', x: px, y: M.ceilingAbove(px, p.y), alive: true, t: 0, warn: 0.95, on: 0.3, look: 'bolt'}); A().sfx.time(); }
      else if (kind === 'laser') { G.ents.push({kind: 'beam', dir: 'h', x: cx + dir * 12, y: py, sgn: dir, alive: true, t: 0, warn: 0.95, on: 0.4, look: 'laser'}); A().sfx.time(); }
    },
    updateHazard(e) {
      e.t += 1 / 60;
      if (e.kind === 'warn') { if (e.t >= e.delay) { e.alive = false; const o = e.spawn; M.shoot(null, {x: o.x, y: o.y, vx: 0, vy: o.vy, grav: o.grav, look: o.look, t: 4}); } return; }
      /* beams: warning line first, then the beam stops at the first solid tile (so cover protects) */
      if (!e.active && e.t >= e.warn) {
        e.active = true; const eng = E();
        if (e.dir === 'v') { let cy = Math.floor(e.y / T); while (cy < L().h && !eng.solidAt(Math.floor(e.x / T), cy)) cy++; e.len = cy * T - e.y; A().sfx.boom(); S().shake = 5; }
        else { let cx = Math.floor(e.x / T), n = 0; while (n++ < 40 && !eng.solidAt(cx, Math.floor(e.y / T))) cx += e.sgn; e.len = e.sgn > 0 ? cx * T - e.x : e.x - (cx + 1) * T; A().sfx.laser(); A().sfx.laser(); S().shake = 3; }
      }
      if (e.active && e.t >= e.warn + e.on) e.alive = false;
    },
    beamHits(e, box) {
      if (e.dir === 'v') return box.x + box.w > e.x - 6 && box.x < e.x + 6 && box.y + box.h > e.y && box.y < e.y + (e.len || 0);
      const x0 = e.sgn > 0 ? e.x : e.x - (e.len || 0), x1 = e.sgn > 0 ? e.x + (e.len || 0) : e.x;
      return box.x + box.w > x0 && box.x < x1 && box.y + box.h > e.y - 4 && box.y < e.y + 4;
    },
    updateBoss(b) {
      const p = P(), eng = E();
      if (!b.active) return;
      if (b.inv > 0) b.inv -= 1 / 60;
      b.t -= 1 / 60;
      const dx = (p.x + p.w / 2) - (b.x + b.w / 2); b.dir = dx < 0 ? -1 : 1;
      const rage = 1 + (b.maxHp - b.hp) / b.maxHp * 0.9;
      const ax0 = (L().arenaX || b.x - 160) - 8, ax1 = (L().arenaEnd || b.x + 200) - b.w;
      /* attacks on a timer (a hopper's quake fires on landing instead) */
      if (b.charge > 0) {
        b.charge -= 1 / 60;
        if (b.charge <= 0 && b.chargeKind === 'fire') { b.burst = 5; b.burstT = 0; A().sfx.fire(); }
      }
      if (b.burst > 0) { b.burstT -= 1 / 60; if (b.burstT <= 0) { b.burstT = 0.11; b.burst--; const cx = b.x + b.w / 2, cy = b.y + b.h * 0.45, ddx = b.aim.x - cx, ddy = b.aim.y - cy, d = Math.hypot(ddx, ddy) || 1; M.shoot(b, {x: cx - 4 + Math.sign(ddx) * 12, y: cy - 4, vx: ddx / d * 3.3, vy: ddy / d * 3.3, grav: 0, look: 'fire', t: 3}); } }
      if (b.attacks.length) { b.atkT -= 1 / 60; if (b.atkT <= 0 && !(b.charge > 0) && !(b.burst > 0)) { let k = b.attacks[b.atkI++ % b.attacks.length]; if (k === 'quake') k = b.attacks.find(a => a !== 'quake') || ''; if (k) M.attack(b, k); b.atkT = Math.max(1.3, 2.9 - rage * 0.7); } }
      if (b.look === 'hopper') {
        b.vy = (b.vy || 0) + 0.42; if (b.vy > 7) b.vy = 7;
        if (b.onGround && b.t <= 0) { b.vy = -(5.2 + Math.random() * 1.5); b.vx = Math.sign(dx) * (1.3 + Math.random() * 0.8) * rage; b.t = 1.4 / rage + Math.random() * 0.6; A().sfx.bigJump(); }
        if (b.onGround) b.vx *= 0.8;
        eng.moveX(b); eng.moveY(b, false); if (b.onGround && Math.abs(b.vy) < 0.1 && b.landed !== true) { b.landed = true; S().shake = Math.max(S().shake, 3); A().sfx.thud(); if (b.attacks.includes('quake')) M.attack(b, 'quake'); } if (!b.onGround) b.landed = false;
      } else if (b.look === 'charger') {
        b.vy = (b.vy || 0) + 0.42; if (b.vy > 7) b.vy = 7;
        if (b.phase === 'idle') { b.vx = Math.sign(dx) * 0.5 * rage; if (b.t <= 0) { b.phase = 'tell'; b.t = 0.6; b.vx = 0; } }
        else if (b.phase === 'tell') { b.vx = 0; S().shake = Math.max(S().shake, 1); if (b.t <= 0) { b.phase = 'charge'; b.t = 0.9; b.vx = Math.sign(dx) * 3.4 * rage; A().sfx.thud(); } }
        else if (b.phase === 'charge') { if (b.hitWall || b.t <= 0) { b.phase = 'idle'; b.t = 2.2 / rage; b.vx = 0; if (b.hitWall) { S().shake = 5; A().sfx.thud(); } } }
        eng.moveX(b); eng.moveY(b, false);
      } else {
        /* flyer: hovers and drifts; a weapon fight keeps its distance and attacks, a stomp fight swoops low */
        const hoverY = b.baseY - (b.weapon ? 74 : 60);
        if (b.phase === 'idle') {
          b.y += (hoverY + Math.sin(b.anim * 0.7) * 10 - b.y) * 0.08;
          const want = b.weapon ? (p.x + p.w / 2) + (dx > 0 ? -110 : 110) : p.x;
          b.x += Math.max(-1.1, Math.min(1.1, (want - (b.x + b.w / 2)) * 0.03)) * rage;
          if (b.t <= 0) { b.phase = 'swoop'; b.t = b.weapon ? 1.1 : 1.5; b.swoopX = p.x; }
        }
        else if (b.phase === 'swoop') { const target = b.baseY + 4; b.y += (target - b.y) * 0.1; b.x += Math.sign(b.swoopX - b.x) * 1.2; if (b.t <= 0) { b.phase = 'rise'; b.t = 1; } }
        else if (b.phase === 'rise') { b.y += (hoverY - b.y) * 0.08; if (b.t <= 0) { b.phase = 'idle'; b.t = (b.weapon ? 4.2 : 2.4) / rage; } }
      }
      /* stay inside the arena; anything that falls out is put back */
      b.x = Math.max(ax0, Math.min(ax1, b.x));
      if (b.y > b.baseY + 140 || b.y > (G.L ? G.L.h : MH) * T) { b.y = b.baseY - 40; b.vy = 0; b.x = (ax0 + ax1) / 2; }
    },
  };
})();

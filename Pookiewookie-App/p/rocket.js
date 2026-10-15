/* The Starway Home: the rocket. Two things live here: the launch from the globe into space (replaces the cloud dive for the space world)
   and the shoot-'em-up flight between planets: steer the rocket, lasers fire on their own, asteroids, saucers and space bees come at you,
   a pirate saucer guards the end of the first flight, then the planet grows and you land. */
(function () {
  const G = window.PW = window.PW || {}, VH = 270, TAU = Math.PI * 2;
  const S = () => G.S, A = () => G.audio, I = () => G.input, VW = () => G.VW || 480;
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de), PIRATE = tr("Käpt'n Bitterbart", 'Captain Bitterbeard');
  const ease = (t, a, b) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  const font = (ctx, px) => { ctx.font = 'bold ' + px + 'px "Fredoka", sans-serif'; ctx.textBaseline = 'middle'; };
  const outlined = (ctx, t, x, y, px, col, align) => { font(ctx, px); ctx.textAlign = align || 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.35; ctx.strokeStyle = 'rgba(20,10,40,.85)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const PLANETS = {mond: {col: '#cfcfdd', col2: '#9a9ab4', name: tr('Mond', 'Moon')}, mars: {col: '#d9643a', col2: '#9a3f1e', name: 'Mars'}, saturn: {col: '#e8c48a', col2: '#b48a5a', name: 'Saturn', rings: true}, erde: {col: '#3f8fe0', col2: '#2f9e5b', name: tr('Erde', 'Earth')}};
  let stars = [];
  const mkStars = () => { stars = []; for (let i = 0; i < 90; i++) stars.push({x: Math.random() * 700, y: Math.random() * VH, z: 0.3 + Math.random() * 1.2, tw: Math.random() * 6}); };

  function drawStars(ctx, t, speed) { for (const s of stars) { const x = ((s.x - t * speed * s.z * 60) % 700 + 700) % 700; if (x > VW() + 10) continue; ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + s.tw)) * Math.min(1, s.z); ctx.fillStyle = s.z > 1.2 ? '#fff' : '#cfd6ff'; ctx.fillRect(x, s.y, s.z > 1 ? 1.6 : 1, s.z > 1 ? 1.6 : 1); } ctx.globalAlpha = 1; }
  function drawPlanet(ctx, key, x, y, r) {
    const p = PLANETS[key] || PLANETS.mond;
    if (p.rings) { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ctx.beginPath(); ctx.ellipse(0, 0, r * 2.1, r * 0.55, 0, Math.PI, TAU); ctx.strokeStyle = 'rgba(255,230,180,.75)'; ctx.lineWidth = r * 0.28; ctx.stroke(); ctx.restore(); }
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(0.15, p.col); g.addColorStop(1, p.col2); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
    if (key === 'mond' || key === 'mars') { ctx.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 5; i++) { const a = i * 1.3, d = r * (0.25 + (i % 3) * 0.2); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.1 + (i % 2) * 0.08), 0, TAU); ctx.fill(); } }
    if (key === 'erde') { ctx.fillStyle = 'rgba(60,170,90,.85)'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.1, r * 0.45, r * 0.3, 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.35, r * 0.25, r * 0.2, -0.4, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x + r * 0.1, y - r * 0.45, r * 0.5, r * 0.12, 0.2, 0, TAU); ctx.fill(); }
    if (p.rings) { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ctx.beginPath(); ctx.ellipse(0, 0, r * 2.1, r * 0.55, 0, 0, Math.PI); ctx.strokeStyle = 'rgba(255,230,180,.9)'; ctx.lineWidth = r * 0.28; ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawShip(ctx, x, y, tilt, flame, inv, fr, lo, shield) {
    lo = lo || {}; const hull = lo.paint ? '#ffd84a' : '#e0457b', body = lo.paint ? '#fff6c8' : '#fff4e6';
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt * 0.35); if (lo.fat) ctx.scale(1.25, 1.3);
    if (inv > 0 && (fr >> 2) % 2) ctx.globalAlpha = 0.45;
    /* flame */
    const fl = 10 + flame * 14 + Math.sin(fr * 0.9) * 3; ctx.beginPath(); ctx.moveTo(-16, -5); ctx.lineTo(-16 - fl, 0); ctx.lineTo(-16, 5); ctx.closePath(); ctx.fillStyle = '#ff7a2a'; ctx.fill(); ctx.beginPath(); ctx.moveTo(-16, -2.5); ctx.lineTo(-16 - fl * 0.55, 0); ctx.lineTo(-16, 2.5); ctx.closePath(); ctx.fillStyle = '#ffe94a'; ctx.fill();
    /* fins, body, nose, window with Toffo */
    ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-22, -12); ctx.lineTo(-8, -6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-22, 12); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
    rr(ctx, -16, -7, 30, 14, 6); ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = '#7a3b57'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, -7); ctx.quadraticCurveTo(26, -3, 26, 0); ctx.quadraticCurveTo(26, 3, 13, 7); ctx.closePath(); ctx.fillStyle = hull; ctx.fill(); ctx.stroke();
    ctx.fillStyle = hull; ctx.fillRect(-12, -7, 3, 14);
    if (lo.laser > 1) { ctx.fillStyle = '#5a5a72'; rr(ctx, 4, -10, 10, 3, 1.5); ctx.fill(); rr(ctx, 4, 7, 10, 3, 1.5); ctx.fill(); }
    ctx.beginPath(); ctx.arc(2, 0, 5.5, 0, TAU); ctx.fillStyle = '#8fd3ff'; ctx.fill(); ctx.strokeStyle = '#7a3b57'; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(2, 0, 5, 0, TAU); ctx.clip(); if (G.draw && G.draw.drawBearAt) G.draw.drawBearAt(ctx, 2, 6, {scale: 0.55, facing: 1, frame: 0, pose: 'idle', outfit: 'weltraum', t: fr / 60}); ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawEnemy(ctx, e, fr) {
    const x = e.x, y = e.y;
    if (e.kind === 'ast') { ctx.save(); ctx.translate(x, y); ctx.rotate(e.rot); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = e.r * (0.8 + ((i * 7) % 5) * 0.08); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = e.flash > 0 ? '#fff' : '#8a8a9a'; ctx.fill(); ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(-e.r * 0.3, -e.r * 0.2, e.r * 0.25, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(e.r * 0.3, e.r * 0.3, e.r * 0.18, 0, TAU); ctx.fill(); ctx.restore(); }
    else if (e.kind === 'ufo' || e.kind === 'boss') { const s = e.kind === 'boss' ? 2.2 : 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.ellipse(0, 2, 16, 6, 0, 0, TAU); ctx.fillStyle = e.flash > 0 ? '#fff' : '#9a9ab4'; ctx.fill(); ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 1; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -2, 8, Math.PI, 0); ctx.fillStyle = e.kind === 'boss' ? 'rgba(180,120,255,.75)' : 'rgba(143,211,255,.7)'; ctx.fill(); ctx.stroke(); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 9, 4, 1.8, 0, TAU); ctx.fillStyle = (fr >> 3) % 3 === i + 1 ? '#ffe94a' : '#ff6f9c'; ctx.fill(); } if (e.kind === 'boss') { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-4, -14); ctx.lineTo(-1, -10); ctx.lineTo(1, -15); ctx.lineTo(3, -10); ctx.lineTo(6, -14); ctx.lineTo(6, -8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#2a1a50'; ctx.beginPath(); ctx.arc(-2, -4, 2.2, 0, TAU); ctx.fill(); ctx.fillRect(1, -5.5, 3, 2.5); } else { ctx.fillStyle = '#2f9e5b'; ctx.beginPath(); ctx.arc(0, -3, 3, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(-1.5, -4, 1, 1.5); ctx.fillRect(0.8, -4, 1, 1.5); } ctx.restore(); }
    else if (e.kind === 'bee') { ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, TAU); ctx.fillStyle = e.flash > 0 ? '#fff' : '#f6cc3a'; ctx.fill(); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-2, -4, 1.5, 8); ctx.fillRect(1.5, -4, 1.5, 8); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(0, -5 + Math.sin(fr) * 1.5, 5, 2, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else if (e.kind === 'plasma') { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = '#c9a0ff'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }
    else if (e.kind === 'coin') { const sx = Math.abs(Math.cos(e.t * 5)); ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.2, sx), 1); ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.strokeStyle = '#a0741a'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = '#a0741a'; ctx.font = 'bold 7px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('S', 0, 0.5); ctx.restore(); }
    else if (e.kind === 'heart') { ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-7, -2, -3, -7, 0, -3); ctx.bezierCurveTo(3, -7, 7, -2, 0, 4); ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.restore(); }
  }

  const R = G.rocket = {
    on: false, t: 0, dur: 60, full: false, target: 'mond', from: 'erde', ship: null, bullets: [], enemies: [], parts: [], phase: 'fly', score: 0, kills: 0, done: null, spawnT: 0, boss: null, landT: 0, deaths: 0,
    start(o) {
      mkStars(); this.on = true; this.t = 0; this.full = !!o.full; this.dur = o.full ? 62 : 22; this.target = o.target || 'mond'; this.from = o.from || 'erde'; this.done = o.done;
      this.lo = (G.eco && G.eco.loadout && G.eco.loadout()) || {}; this.money = 0;
      const maxHp = this.lo.fat ? 5 : 3;
      this.ship = {x: 70, y: VH / 2, vy: 0, vx: 0, hp: maxHp, maxHp, shield: this.lo.shield ? 1 : 0, inv: 2, fireT: 0, flame: 0.5, tilt: 0}; this.bullets = []; this.enemies = []; this.parts = []; this.phase = 'fly'; this.score = 0; this.kills = 0; this.spawnT = 1.2; this.boss = null; this.landT = 0;
      if (A()) A().sfx.liftoff(); { const pn = (PLANETS[this.target] || PLANETS.mond).name, ctl = I() && I().touchMode ? tr('◀ ▶ fliegen, A hoch, ▼ runter', '◀ ▶ fly, A up, ▼ down') : tr('◀ ▶ ▲ ▼ steuern', 'steer with ◀ ▶ ▲ ▼'); G.flow.banner(o.title || tr('Raketenflug', 'Rocket flight'), 2.2, tr(`Ziel: ${pn} · ${ctl}, die Laser feuern selbst`, `Destination: ${pn} · ${ctl}, the lasers fire by themselves`)); }
      G.flow.speak(o.full ? 'Rocket time! To the moon!' : 'Next planet, Mallo!', {happy: true});
    },
    pay(n) { this.money += n; if (G.eco) G.eco.add(n, 0, 0, true); },
    end(result) { this.on = false; const d = this.done; this.done = null; if (d) d(result); },
    boom(x, y, big, col) { for (let i = 0; i < (big ? 26 : 10); i++) this.parts.push({x, y, vx: (Math.random() - 0.5) * (big ? 7 : 4), vy: (Math.random() - 0.5) * (big ? 7 : 4), t: 0.5 + Math.random() * 0.5, r: 1 + Math.random() * (big ? 3 : 2), col: col || (i % 3 ? '#ff7a2a' : '#ffe94a')}); this.parts.push({x, y, ring: true, t: 0.4, r: big ? 40 : 18}); },
    spawn() {
      const t = this.t, dif = this.full ? Math.min(1, t / 45) : 0.6, w = VW() + 30, y = 30 + Math.random() * (VH - 70);
      const roll = Math.random();
      if (roll < 0.45) this.enemies.push({kind: 'ast', x: w, y, vx: -(1.4 + Math.random() * 1.2 + dif), vy: (Math.random() - 0.5) * 0.6, r: 8 + Math.random() * 10, hp: 2, rot: 0, vr: (Math.random() - 0.5) * 0.08, flash: 0});
      else if (roll < 0.75) this.enemies.push({kind: 'ufo', x: w, y, baseY: y, vx: -(1.1 + dif * 0.8), hp: 3, t: Math.random() * 3, shootT: 1.5 + Math.random(), flash: 0, r: 14});
      else { const n = 3 + Math.floor(dif * 3); for (let i = 0; i < n; i++) this.enemies.push({kind: 'bee', x: w + i * 18, y, baseY: y, vx: -(2.4 + dif), hp: 1, t: i * 0.4, flash: 0, r: 6}); }
      if (Math.random() < 0.18) this.enemies.push({kind: 'heart', x: w, y: 30 + Math.random() * (VH - 70), vx: -1.2, hp: 1, r: 6, t: 0});
    },
    update() {
      if (!this.on) return;
      const s = this.ship, inp = I(), fr = S().frames; this.t += 1 / 60;
      if (this.phase === 'dead') { this.landT += 1 / 60; if (this.landT > 1.6) this.end('dead'); return; }
      if (this.phase === 'land') {
        this.landT += 1 / 60; const k = ease(this.landT, 0, 3.2); s.x += (VW() * 0.5 - s.x) * 0.04; s.y += (VH * 0.62 - s.y) * 0.03; s.tilt += (0.8 - s.tilt) * 0.05; s.flame = 0.3;
        if (this.landT > 3.4) { if (A()) A().sfx.landing(); this.end('landed'); }
        return;
      }
      /* steering: up/jump thrusts, down dives, left/right throttles; the ship stays in the left half */
      const up = inp.up || inp.jump, down = inp.down;
      const acc = this.lo.turbo ? 0.6 : 0.42; s.vy += (up ? -acc : 0) + (down ? acc : 0); s.vy *= 0.9; s.y += s.vy; if (s.y < 18) { s.y = 18; s.vy = 0; } if (s.y > VH - 26) { s.y = VH - 26; s.vy = 0; }
      s.vx += (inp.right ? acc * 0.72 : 0) - (inp.left ? acc * 0.72 : 0); s.vx *= 0.9; s.x += s.vx; if (s.x < 30) s.x = 30; if (s.x > VW() * 0.6) s.x = VW() * 0.6;
      s.tilt += ((s.vy * 0.12) - s.tilt) * 0.2; s.flame = 0.5 + (inp.right ? 0.5 : 0) + (up ? 0.2 : 0);
      if (s.inv > 0) s.inv -= 1 / 60; if (fr % 9 === 0 && A()) A().sfx.thrust();
      /* lasers */
      s.fireT -= 1 / 60; if (s.fireT <= 0) { s.fireT = 0.19; const nL = this.lo.laser || 1; if (nL === 1) this.bullets.push({x: s.x + 24, y: s.y, vx: 7, vy: 0}); else if (nL === 2) { this.bullets.push({x: s.x + 22, y: s.y - 6, vx: 7, vy: 0}); this.bullets.push({x: s.x + 22, y: s.y + 6, vx: 7, vy: 0}); } else { this.bullets.push({x: s.x + 24, y: s.y, vx: 7, vy: 0}); this.bullets.push({x: s.x + 22, y: s.y - 4, vx: 6.8, vy: -1.3}); this.bullets.push({x: s.x + 22, y: s.y + 4, vx: 6.8, vy: 1.3}); } if (A()) A().sfx.laser(); }
      for (const b of this.bullets) { b.x += b.vx; b.y += b.vy || 0; } this.bullets = this.bullets.filter(b => b.x < VW() + 20 && !b.dead);
      /* waves and the pirate boss at the end of the long flight */
      const bossTime = this.full && this.t > this.dur - 24;
      if (!bossTime) { this.spawnT -= 1 / 60; if (this.spawnT <= 0) { this.spawn(); this.spawnT = Math.max(0.55, 1.6 - this.t * 0.02); } }
      else if (!this.boss) { this.boss = {kind: 'boss', x: VW() + 60, y: VH / 2, baseY: VH / 2, vx: -1, hp: 22, maxHp: 22, t: 0, shootT: 1, flash: 0, r: 32}; this.enemies.push(this.boss); G.flow.banner(PIRATE + '!', 2, tr('Triff die Untertasse 22×', 'Hit the saucer 22×')); if (A()) A().setBoss(true); }
      if (!this.full && this.t > this.dur) { this.phase = 'land'; this.landT = 0; this.enemies = []; G.flow.banner(tr('Landung', 'Landing'), 1.5, tr(`${(PLANETS[this.target] || PLANETS.mond).name} in Sicht!`, `${(PLANETS[this.target] || PLANETS.mond).name} in sight!`)); }
      /* enemies */
      for (const e of this.enemies) {
        e.t = (e.t || 0) + 1 / 60; if (e.flash > 0) e.flash -= 1 / 60;
        if (e.kind === 'ast') { e.x += e.vx; e.y += e.vy; e.rot += e.vr; }
        else if (e.kind === 'ufo') { e.x += e.vx; e.y = e.baseY + Math.sin(e.t * 2.2) * 28; e.shootT -= 1 / 60; if (e.shootT <= 0 && e.x < VW() - 10) { e.shootT = 2.2; const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy) || 1; this.enemies.push({kind: 'plasma', x: e.x, y: e.y + 6, vx: dx / d * 2.6, vy: dy / d * 2.6, hp: 1, r: 4, t: 0}); } }
        else if (e.kind === 'bee') { e.x += e.vx; e.y = e.baseY + Math.sin(e.t * 5) * 18; }
        else if (e.kind === 'plasma') { e.x += e.vx; e.y += e.vy; }
        else if (e.kind === 'heart' || e.kind === 'coin') { e.x += e.vx; e.y += Math.sin(e.t * (e.kind === 'coin' ? 4 : 3)) * 0.6; if (this.lo.magnet) { const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy); if (d < 130) { e.x += dx / d * 3.2; e.y += dy / d * 3.2; } } }
        else if (e.kind === 'boss') {
          if (e.x > VW() - 80) e.x += e.vx; else { e.y = e.baseY + Math.sin(e.t * 1.3) * 70; e.x = VW() - 80 + Math.sin(e.t * 0.7) * 30; }
          e.shootT -= 1 / 60; if (e.shootT <= 0) { e.shootT = Math.max(0.55, 1.4 - (e.maxHp - e.hp) * 0.04); for (let k = -1; k <= 1; k++) { const dx = s.x - e.x, dy = s.y - e.y + k * 40, d = Math.hypot(dx, dy) || 1; this.enemies.push({kind: 'plasma', x: e.x - 20, y: e.y, vx: dx / d * 3, vy: dy / d * 3, hp: 1, r: 4, t: 0}); } }
        }
        /* hit by lasers */
        if (e.kind !== 'plasma' && e.kind !== 'heart' && e.kind !== 'coin') for (const b of this.bullets) { if (!b.dead && Math.abs(b.x - e.x) < e.r + 4 && Math.abs(b.y - e.y) < e.r + 2) { b.dead = true; e.hp--; e.flash = 0.1; if (e.hp <= 0) { e.dead = true; this.kills++; this.score += e.kind === 'boss' ? 5000 : (e.kind === 'ast' ? 100 : 200); this.pay(e.kind === 'boss' ? 150 : 2); if (e.kind !== 'boss' && Math.random() < 0.35) this.enemies.push({kind: 'coin', x: e.x, y: e.y, vx: -1.2, hp: 1, r: 6, t: 0}); this.boom(e.x, e.y, e.kind === 'boss', e.kind === 'ast' ? '#aaa' : null); if (A()) e.kind === 'boss' ? A().sfx.bossDown() : A().sfx.smallBoom(); if (e.kind === 'boss') { this.boss = null; if (A()) A().setBoss(false); this.phase = 'land'; this.landT = 0; this.enemies = this.enemies.filter(z => z.kind === 'heart'); G.flow.banner(tr('Sternenpirat besiegt!', 'Star Pirate defeated!'), 2, tr('Landung auf dem ' + (PLANETS[this.target] || PLANETS.mond).name, 'Landing on ' + (this.target === 'mond' || !PLANETS[this.target] ? 'the ' : '') + (PLANETS[this.target] || PLANETS.mond).name)); if (G.flow.achieve) G.flow.achieve('pirate'); } else if (A()) A().sfx.smallBoom(); } else if (A()) A().sfx.pop(); } }
        /* collision with the ship */
        if (!e.dead && Math.abs(e.x - s.x) < e.r + 14 && Math.abs(e.y - s.y) < e.r + 6) {
          if (e.kind === 'heart') { e.dead = true; s.hp = Math.min(s.maxHp, s.hp + 1); this.score += 300; if (A()) A().sfx.heart(); }
          else if (e.kind === 'coin') { e.dead = true; this.pay(5); if (A()) A().sfx.coin(); }
          else if (s.inv <= 0 && s.shield > 0) { s.shield = 0; s.inv = 1.2; if (A()) A().sfx.bubblePop(); this.boom(s.x, s.y, false, '#8fd3ff'); if (e.kind === 'plasma' || e.kind === 'bee') e.dead = true; }
          else if (s.inv <= 0) { s.hp--; s.inv = 1.8; S().shake = 6; if (A()) A().sfx.rocketHit(); if (e.kind === 'plasma' || e.kind === 'bee') { e.dead = true; this.boom(e.x, e.y, false); } if (s.hp <= 0) { this.phase = 'dead'; this.landT = 0; this.boom(s.x, s.y, true); if (A()) { A().sfx.boom(); A().setBoss(false); } G.flow.speak('Oh no... Mallo...', {sad: true}); } }
        }
        if (e.x < -60 || e.x > VW() + 200 || e.y < -40 || e.y > VH + 40) e.dead = true;
      }
      this.enemies = this.enemies.filter(e => !e.dead);
      for (const p of this.parts) { p.t -= 1 / 60; if (!p.ring) { p.x += p.vx; p.y += p.vy; } } this.parts = this.parts.filter(p => p.t > 0);
      if (S().shake > 0) S().shake = Math.max(0, S().shake - 0.3);
    },
    frame(ctx) {
      const s = this.ship, fr = S().frames, t = this.t, W = VW();
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#05030f'); g.addColorStop(0.5, '#0b0a2a'); g.addColorStop(1, '#1a1038'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VH);
      ctx.fillStyle = 'rgba(120,80,200,.08)'; ctx.beginPath(); ctx.ellipse(W * 0.6, VH * 0.4, 200, 90, -0.3, 0, TAU); ctx.fill();
      drawStars(ctx, t, this.phase === 'land' ? 0.3 : 1);
      /* the planet we left shrinks behind, the target grows ahead */
      const prog = Math.min(1, t / this.dur);
      if (prog < 0.5) drawPlanet(ctx, this.from, 40 - prog * 120, VH + 40 - prog * 20, 90 * (1 - prog));
      const tr = this.phase === 'land' ? 90 + ease(this.landT, 0, 3.2) * 260 : Math.max(0, (prog - 0.45) / 0.55) * 90;
      if (tr > 0) drawPlanet(ctx, this.target, this.phase === 'land' ? W / 2 : W - 60 - (1 - prog) * 40, this.phase === 'land' ? VH + tr * 0.55 : VH * 0.3, tr);
      ctx.save(); const sh = S().shake; if (sh > 0) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      for (const b of this.bullets) { ctx.fillStyle = '#ffe94a'; rr(ctx, b.x - 6, b.y - 1.2, 12, 2.4, 1.2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(b.x - 2, b.y - 0.5, 5, 1); }
      for (const e of this.enemies) drawEnemy(ctx, e, fr);
      if (this.phase !== 'dead') { drawShip(ctx, s.x, s.y, s.tilt, s.flame, s.inv, fr, this.lo, s.shield); if (s.shield > 0) { ctx.beginPath(); ctx.ellipse(s.x + 3, s.y, 32, 20, 0, 0, TAU); ctx.fillStyle = 'rgba(143,211,255,.18)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.25 * Math.sin(fr * 0.15)) + ')'; ctx.lineWidth = 1.5; ctx.stroke(); } }
      for (const p of this.parts) { ctx.globalAlpha = Math.max(0, Math.min(1, p.t * 2)); if (p.ring) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - p.t / 0.4) + 4, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fillStyle = p.col; ctx.fill(); } } ctx.globalAlpha = 1;
      ctx.restore();
      /* HUD: hearts, progress, score, boss bar */
      outlined(ctx, '● ' + this.money, 14, 30, 9, '#ffd84a', 'left');
      for (let i = 0; i < s.maxHp; i++) { ctx.save(); ctx.translate(14 + i * 14, 14); ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-8, -2, -4, -8, 0, -4); ctx.bezierCurveTo(4, -8, 8, -2, 0, 5); ctx.fillStyle = i < s.hp ? '#ff6f9c' : 'rgba(255,255,255,.25)'; ctx.fill(); ctx.restore(); }
      const bx = (G.input && G.input.touchMode) ? W / 2 + 90 : W / 2;   /* phones: the pause button sits at the top centre */
      rr(ctx, bx - 70, 7, 140, 8, 4); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); rr(ctx, bx - 70, 7, Math.max(8, 140 * prog), 8, 4); ctx.fillStyle = '#8fd3ff'; ctx.fill();
      outlined(ctx, (PLANETS[this.from] || PLANETS.erde).name + ' → ' + (PLANETS[this.target] || PLANETS.mond).name, bx, 24, 8, '#fff');
      outlined(ctx, String(this.score).padStart(6, '0'), W - 12, 14, 10, '#ffd84a', 'right');
      if (this.boss) { rr(ctx, W / 2 - 60, VH - 18, 120, 8, 4); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill(); rr(ctx, W / 2 - 60, VH - 18, 120 * this.boss.hp / this.boss.maxHp, 8, 4); ctx.fillStyle = '#c9a0ff'; ctx.fill(); outlined(ctx, PIRATE, W / 2, VH - 26, 8, '#fff'); }
      if (this.phase === 'land') { const k = ease(this.landT, 2.2, 3.4); if (k > 0) { ctx.fillStyle = 'rgba(255,255,255,' + k + ')'; ctx.fillRect(0, 0, W, VH); } }
      if (this.phase === 'dead') { const k = ease(this.landT, 0.8, 1.6); ctx.fillStyle = 'rgba(0,0,0,' + k + ')'; ctx.fillRect(0, 0, W, VH); }
    },
    /* launch from the globe: the rocket climbs out of the atmosphere, then docks at the station */
    launch(wi, done) { mkStars(); this.lt = 0; this.ldone = done; this.lwi = wi; if (A()) A().sfx.liftoff(); G.flow.speak('Rocket time! To the moon!', {happy: true}); S().outfit = 'weltraum'; },
    launchUpdate() { this.lt += 1 / 60; if (this.lt >= 4.2 && this.ldone) { const d = this.ldone; this.ldone = null; d(); } },
    launchFrame(ctx) {
      const t = this.lt, W = VW(), k = ease(t, 0, 3.2), fr = S().frames;
      const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, '#05030f'); sky.addColorStop(1, k < 0.6 ? '#7fd7ff' : '#0b0a2a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, VH);
      ctx.globalAlpha = Math.min(1, k * 1.5); drawStars(ctx, t * 0.2, 0.2); ctx.globalAlpha = 1;
      ctx.globalAlpha = Math.max(0, 1 - k * 1.1); ctx.fillStyle = '#9fd0f0'; ctx.fillRect(0, 0, W, VH); ctx.globalAlpha = 1;
      drawPlanet(ctx, 'erde', W / 2, VH + 420 - k * 300, 480 - k * 380);
      for (let i = 0; i < 12; i++) { ctx.globalAlpha = 0.5 * Math.max(0, 1 - k * 1.3); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse((i * 97) % W, VH - 60 - i * 17 + t * 90 * (0.5 + i % 3 * 0.3), 50, 10, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
      const ry = VH * 0.55 - Math.sin(k * Math.PI) * 30; ctx.save(); ctx.translate(W / 2, ry); ctx.rotate(-Math.PI / 2); drawShip(ctx, 0, 0, 0, 1.2, 0, fr); ctx.restore();
      if (t > 3.0) { const d = ease(t, 3.0, 4.2); ctx.fillStyle = 'rgba(255,255,255,' + d + ')'; ctx.fillRect(0, 0, W, VH); }
      outlined(ctx, tr('Welt ', 'World ') + ((this.lwi | 0) + 1), W / 2, VH - 48, 15, '#ffd84a'); outlined(ctx, tr('Weltraum', 'Outer Space'), W / 2, VH - 28, 12, '#fff');
    },
  };
})();

/* The Starway Home puzzle: "Das Nordlicht-Prisma" (Schnee, slot 1).
   8x8 grid: an aurora crystal on the edge shines a beam into the field; ice walls stop it, mirrors turn it by 90 degrees.
   6 mirrors can be flipped (/ <-> \) by tapping, 2 are frozen. Both target crystals must glow at the same time (the beam passes
   through a crystal). The field is built around a random beam path; at mount all 2^6 mirror states are brute-forced: the start
   must be unsolved and at most two states may solve it. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const TAU = Math.PI * 2, S = 8;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const SL = [1, 0, 3, 2], BS = [3, 2, 1, 0];   /* '/' and '\' reflections of dir 0=up 1=right 2=down 3=left */
  const snd = f => { try { const A = G.audio; if (A && A.ctx) f(A); } catch (e) {} };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const fnt = (ctx, w, px) => { ctx.font = w + ' ' + Math.round(px) + 'px "Fredoka", sans-serif'; };
  const inG = (x, y) => x >= 0 && y >= 0 && x < S && y < S;

  /* field: {wall[], mir[] (-1 none, else index into mirrors), mirrors: [{x,y,o,fixed}], targets: [i,i], ex, ey, ed} */
  function trace(F, ori) {
    let x = F.ex, y = F.ey, d = F.ed; const pts = [[x, y]], lit = [false, false], seen = new Set(); let end = 'exit';
    for (let guard = 0; guard < 400; guard++) {
      x += DX[d]; y += DY[d];
      if (!inG(x, y)) { pts.push([x, y]); end = 'exit'; break; }
      const i = y * S + x;
      if (F.wall[i]) { pts.push([x - DX[d] * 0.5, y - DY[d] * 0.5]); end = 'wall'; break; }
      const key = i * 4 + d; if (seen.has(key)) { pts.push([x, y]); end = 'loop'; break; } seen.add(key);
      const t = F.targets.indexOf(i); if (t >= 0) lit[t] = true;
      const m = F.mir[i];
      if (m >= 0) { pts.push([x, y]); d = (ori[m] ? BS : SL)[d]; }
    }
    return {pts, lit, end, solved: lit[0] && lit[1]};
  }
  function generate(rng) {
    const R = n => Math.floor(rng() * n);
    for (let attempt = 0; attempt < 3000; attempt++) {
      const side = R(4), k = 1 + R(S - 2);
      let ex, ey, ed;
      if (side === 0) { ex = k; ey = -1; ed = 2; } else if (side === 1) { ex = S; ey = k; ed = 3; } else if (side === 2) { ex = k; ey = S; ed = 0; } else { ex = -1; ey = k; ed = 1; }
      const turns = 7 + R(2);
      const use = new Array(S * S).fill(0); /* 0 free, 1 beam passes, 2 mirror */
      const order = [], turnIdx = [], mirrorsAt = [];
      let x = ex, y = ey, d = ed, ok = true;
      for (let t = 0; t <= turns && ok; t++) {
        /* candidate lengths */
        const opts = [];
        for (let L = 1; L <= S; L++) {
          const cx = x + DX[d] * L, cy = y + DY[d] * L; if (!inG(cx, cy)) break;
          const ci = cy * S + cx; if (use[ci] === 2) break;
          if (t < turns && use[ci] === 0) {
            /* a turn here must leave room in the new direction */
            const nd = [(d + 1) % 4, (d + 3) % 4].filter(q => inG(cx + DX[q], cy + DY[q]) && use[(cy + DY[q]) * S + cx + DX[q]] !== 2);
            if (nd.length) opts.push({L, nd});
          }
          if (t === turns) opts.push({L, nd: []});
        }
        if (!opts.length) { ok = false; break; }
        const pick = opts.filter(o => o.L >= 2 && o.L <= 5); const o = (pick.length ? pick : opts)[R((pick.length ? pick : opts).length)];
        for (let s = 1; s <= o.L; s++) { const cx = x + DX[d] * s, cy = y + DY[d] * s, ci = cy * S + cx; if (use[ci] === 0) use[ci] = 1; order.push(ci); }
        x += DX[d] * o.L; y += DY[d] * o.L;
        if (t < turns) {
          const nd = o.nd[R(o.nd.length)], ci = y * S + x;
          use[ci] = 2; turnIdx.push(order.length - 1); mirrorsAt.push({x, y, o: SL[d] === nd ? 0 : 1}); d = nd;
        }
      }
      if (!ok) continue;
      /* last segment: let it run to a wall or out of the field */
      const tail = [];
      { let cx = x, cy = y; for (;;) { cx += DX[d]; cy += DY[d]; if (!inG(cx, cy)) break; const ci = cy * S + cx; if (use[ci] === 2) { ok = false; break; } tail.push(ci); } }
      if (!ok) continue;
      const wall = new Array(S * S).fill(false);
      let tailLen = tail.length;
      if (tail.length && rng() < 0.6) { tailLen = R(tail.length); wall[tail[tailLen]] = true; }
      for (let s = 0; s < tailLen; s++) { if (use[tail[s]] === 0) use[tail[s]] = 1; order.push(tail[s]); }
      /* targets: one in the middle part, one late, both on plain cells crossed only once */
      const count = {}; for (const c of order) count[c] = (count[c] || 0) + 1;
      const plain = (a, b) => { const r = []; for (let s = a; s < b; s++) { const c = order[s]; if (use[c] === 1 && count[c] === 1) r.push(c); } return r; };
      const t1c = plain(turnIdx[0] + 1, turnIdx[2]), t2c = plain(turnIdx[turns - 2] + 1, order.length);
      if (!t1c.length || !t2c.length) continue;
      const t1 = t1c[R(t1c.length)], t2 = t2c[R(t2c.length)]; if (t1 === t2) continue;
      /* fixed vs rotatable mirrors */
      const idx = mirrorsAt.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = R(i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      const fixedSet = new Set(idx.slice(0, 2));
      const mirrors = []; const mir = new Array(S * S).fill(-1);
      mirrorsAt.forEach((m, i) => { if (!fixedSet.has(i)) { mir[m.y * S + m.x] = mirrors.length; mirrors.push({x: m.x, y: m.y, sol: m.o, fixed: false}); } });
      const nRot = mirrors.length;
      if (nRot > 6) continue;
      /* decoys: free cells in line with the path */
      const free = []; for (let i = 0; i < S * S; i++) if (use[i] === 0 && !wall[i]) free.push(i);
      const inLine = free.filter(i => mirrorsAt.some(m => m.x === i % S || m.y === ((i / S) | 0)));
      let need = 6 - nRot; const pool = inLine.length >= need ? inLine : free;
      while (need > 0 && pool.length) { const j = R(pool.length), c = pool.splice(j, 1)[0]; if (mir[c] >= 0 || wall[c]) continue; mir[c] = mirrors.length; mirrors.push({x: c % S, y: (c / S) | 0, sol: R(2), fixed: false, decoy: true}); need--; }
      if (mirrors.length !== 6) continue;
      mirrorsAt.forEach((m, i) => { if (fixedSet.has(i)) { mir[m.y * S + m.x] = mirrors.length; mirrors.push({x: m.x, y: m.y, sol: m.o, fixed: true}); } });
      /* ice walls: near the path, never on it */
      const nw = 6 + R(4); let tries = 0;
      while (nw > wall.filter(Boolean).length && tries++ < 200) {
        const c = R(S * S); if (use[c] !== 0 || wall[c] || mir[c] >= 0) continue;
        const cx = c % S, cy = (c / S) | 0; let near = false; for (let q = 0; q < 4; q++) { const nx = cx + DX[q], ny = cy + DY[q]; if (inG(nx, ny) && use[ny * S + nx]) near = true; }
        if (near || rng() < 0.3) wall[c] = true;
      }
      const F = {wall, mir, mirrors, targets: [t1, t2], ex, ey, ed};
      /* brute force all 2^6 states of the rotatable mirrors */
      const base = mirrors.map(m => m.sol); let sols = 0, solMask = -1;
      for (let mask = 0; mask < 64; mask++) { const ori = base.slice(); for (let b = 0; b < 6; b++) ori[b] = (mask >> b) & 1; if (trace(F, ori).solved) { sols++; if (solMask < 0) solMask = mask; } }
      const solOri = base.slice(); if (!trace(F, solOri).solved || sols > 2) continue;
      /* how many rotatable mirrors does the solution beam actually use? */
      /* scramble: unsolved, no crystal lit, at least 3 (fallback 2) of the needed rotatable mirrors wrong */
      let start = null;
      for (let s = 0; s < 160 && !start; s++) {
        const ori = solOri.slice(); let wrong = 0; for (let b = 0; b < 6; b++) { ori[b] = R(2); if (ori[b] !== solOri[b] && !mirrors[b].decoy) wrong++; }
        const tc = trace(F, ori);
        if (!tc.solved && !tc.lit[0] && !tc.lit[1] && wrong >= (s < 120 ? 3 : 2)) start = ori;
      }
      if (!start) continue;
      F.start = start; F.sol = solOri; F.sols = sols; F.turns = turns;
      return F;
    }
    return null;
  }

  function crystal(ctx, x, y, s, lit, t, col) {
    /* cluster of hexagonal crystals, (x, y) = centre */
    const c1 = lit ? col : '#6d5a9a', c2 = lit ? '#ffffff' : '#9a88c8';
    ctx.save(); ctx.translate(x, y);
    if (lit) { ctx.shadowColor = col; ctx.shadowBlur = s * 1.2; }
    const shard = (dx, h, w, a) => { ctx.save(); ctx.translate(dx, s * 0.45); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.75); ctx.lineTo(w, 0); ctx.closePath(); const g = ctx.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, c1); g.addColorStop(0.45, c2); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a2050'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); };
    shard(-s * 0.28, s * 0.6, s * 0.14, -0.35); shard(s * 0.3, s * 0.55, s * 0.13, 0.35); shard(0, s * 0.9, s * 0.18, 0);
    ctx.restore();
    if (lit) { ctx.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1, r = s * (0.55 + 0.1 * Math.sin(t * 5 + k)); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + k * 2); ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 1.6, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
  }

  G.PZ.register({
    id: 'schnee-spiegel', world: 'schnee', slot: 1, _gen: generate,
    title: tr('Das Nordlicht-Prisma', 'The Northern Lights Prism'),
    intro: tr('Der Nordlicht-Kristall schickt einen Lichtstrahl ins Eis. Tippe auf die hellen Spiegel, um sie zu kippen (/ oder \\). Die dunklen Spiegel sind festgefroren, Eiswände schlucken das Licht. Beide Kristalle müssen GLEICHZEITIG leuchten.', 'The aurora crystal shines a beam of light into the ice. Tap the bright mirrors to tilt them (/ or \\). The dark mirrors are frozen solid, and ice walls swallow the light. Both crystals must glow AT THE SAME TIME.'),
    letter: tr('Licht biegt immer rechtwinklig ab. Geh rückwärts vom letzten Kristall aus.', 'Light always turns at a right angle. Work backwards from the last crystal.'),
    hint: tr('Beginne beim Kristall, der am weitesten vom Strahl entfernt ist: Aus welcher Richtung kann Licht ihn überhaupt erreichen, ohne an eine Eiswand zu stoßen? Verfolge diese Linie zurück zum nächsten Spiegel. Die festgefrorenen Spiegel stehen schon richtig und gehören zum Weg.', 'Start with the crystal farthest from the beam: from which direction can light reach it at all without hitting an ice wall? Follow that line back to the next mirror. The frozen mirrors are already set right and are part of the path.'),
    station(ctx, x, y, t, solved) {
      ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
      /* pedestal */
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-9, -12); ctx.lineTo(9, -12); ctx.lineTo(12, 0); ctx.closePath();
      const g = ctx.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, '#8fc4e6'); g.addColorStop(0.4, '#e8f8ff'); g.addColorStop(1, '#7ab0d6'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1.6; ctx.stroke();
      rr(ctx, -11, -15, 22, 4, 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      /* glow */
      const p = 0.5 + 0.5 * Math.sin(t * 3);
      const gl = ctx.createRadialGradient(0, -26, 2, 0, -26, 18); gl.addColorStop(0, solved ? 'rgba(160,255,200,.7)' : 'rgba(180,140,255,' + (0.25 + p * 0.25) + ')'); gl.addColorStop(1, 'rgba(160,255,200,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -26, 18, 0, TAU); ctx.fill();
      /* crystal */
      ctx.save(); ctx.translate(0, -15 - Math.sin(t * 2) * 1.2);
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(6, -16); ctx.lineTo(5, -3); ctx.lineTo(0, 0); ctx.lineTo(-5, -3); ctx.lineTo(-6, -16); ctx.closePath();
      const cg = ctx.createLinearGradient(-6, 0, 6, 0); cg.addColorStop(0, solved ? '#5fe0a0' : '#8a6ad8'); cg.addColorStop(0.5, '#ffffff'); cg.addColorStop(1, solved ? '#3fb9a0' : '#6a4ab8'); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#2a2050'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 0); ctx.stroke();
      ctx.restore();
      /* frost sparkles */
      ctx.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { const a = t * 1.5 + k * 2.1; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + k); ctx.fillRect(Math.cos(a) * 12 - 1, -28 + Math.sin(a) * 9 - 1, 2, 2); }
      ctx.globalAlpha = 1; ctx.restore();
    },
    mount(root, api) {
      const rng = api.rng || Math.random;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:pointer';
      root.appendChild(cv);
      const ctx = cv.getContext('2d');
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ghost'; btn.textContent = tr('Zurücksetzen', 'Reset');
      btn.style.cssText = 'position:absolute;margin:0;padding:6px 14px;font-size:13px;min-height:36px;background:rgba(30,30,80,.55);border-color:rgba(190,170,255,.7);color:#f4f0ff;white-space:nowrap';
      root.appendChild(btn);

      let W = 0, H = 0, dpr = 1, cell = 30, bx = 0, by = 0, panelX = 0, compact = false;
      let F = null, ori = [], angFrom = [], angT0 = [], beam = null, done = false, busy = false, solvedAt = 0, timers = [], fx = [], litAt = [-9, -9];
      const stars = []; for (let i = 0; i < 60; i++) stars.push({x: rng(), y: rng() * 0.8, r: 0.5 + rng() * 1.3, ph: rng() * 9});

      function setup() {
        F = generate(rng); if (!F) throw new Error('no field');
        ori = F.start.slice(); angFrom = ori.map(o => (o ? -1 : 1));   /* 1 = backslash = plate tilted -45 deg */ angT0 = ori.map(() => -9);
        done = false; busy = false; beam = trace(F, fullOri());
      }
      const fullOri = () => F.mirrors.map((m, i) => (m.fixed ? m.sol : ori[i]));
      const gx = x => bx + x * cell + cell / 2, gy = y => by + y * cell + cell / 2;

      function layout() {
        const w = root.clientWidth, h = root.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
        if (w !== W || h !== H || d !== dpr) { W = w; H = h; dpr = d; cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); }
        compact = H < 300;
        const side = compact ? 160 : 200, M = 0.8;
        cell = Math.floor(Math.min((H - 8) / (S + M * 2), (W - side - 40) / (S + M * 2)));
        cell = Math.max(22, Math.min(cell, 60));
        const tot = cell * (S + M * 2), total = tot + 20 + side;
        const ox = Math.round((W - total) / 2), oy = Math.round((H - tot) / 2);
        bx = ox + cell * M; by = oy + cell * M; panelX = ox + tot + 20;
        btn.style.left = panelX + 'px'; btn.style.top = (by + cell * S - 36) + 'px'; btn.style.fontSize = compact ? '12px' : '13px';
        draw(performance.now() / 1000);
      }

      /* ---------- drawing ---------- */
      function drawSky(t) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1033'); g.addColorStop(0.6, '#1b2a5c'); g.addColorStop(1, '#2c4a7a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; for (const s of stars) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + s.ph)); ctx.fillRect(s.x * W, s.y * H, s.r, s.r); } ctx.globalAlpha = 1;
        /* aurora ribbons */
        const boost = done ? Math.min(1, (t - solvedAt) / 0.6) : 0;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const bands = [['rgba(90,255,170,', 0.18, 0.12], ['rgba(170,110,255,', 0.3, 0.1], ['rgba(110,220,255,', 0.45, 0.08]];
        bands.forEach(([c, yy, a], k) => {
          for (let s = 0; s < 3; s++) {
            ctx.beginPath();
            for (let x = 0; x <= W + 20; x += 20) { const y = H * yy + Math.sin(x * 0.008 + t * 0.4 + k * 2) * 26 + Math.sin(x * 0.021 - t * 0.6 + k) * 10; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
            ctx.strokeStyle = c + (a + boost * 0.15) / (s + 1) + ')'; ctx.lineWidth = 18 + s * 22; ctx.stroke();
          }
        });
        ctx.restore();
        /* snowy ground */
        ctx.fillStyle = 'rgba(220,240,255,.18)'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * 0.85 - Math.sin(x * 0.015) * 10); ctx.lineTo(W, H); ctx.fill();
      }
      function drawWall(i) {
        const x = bx + (i % S) * cell, y = by + ((i / S) | 0) * cell, p = cell * 0.06;
        rr(ctx, x + p, y + p, cell - p * 2, cell - p * 2, cell * 0.14);
        const g = ctx.createLinearGradient(x, y, x + cell, y + cell); g.addColorStop(0, '#e9f8ff'); g.addColorStop(1, '#8ec3e8'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + cell * 0.25, y + cell * 0.3); ctx.lineTo(x + cell * 0.45, y + cell * 0.2); ctx.moveTo(x + cell * 0.22, y + cell * 0.5); ctx.lineTo(x + cell * 0.3, y + cell * 0.45); ctx.stroke();
        ctx.strokeStyle = 'rgba(42,74,106,.35)'; ctx.beginPath(); ctx.moveTo(x + cell * 0.6, y + cell * 0.55); ctx.lineTo(x + cell * 0.72, y + cell * 0.75); ctx.lineTo(x + cell * 0.66, y + cell * 0.85); ctx.stroke();
      }
      function mirrorAngle(i, t) {
        const m = F.mirrors[i], target = (m.fixed ? m.sol : ori[i]) ? -1 : 1;
        const k = Math.min(1, Math.max(0, (t - angT0[i]) / 0.22)), e = k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
        const a0 = angFrom[i] * Math.PI / 4, a1 = target * Math.PI / 4;
        return a0 + (a1 - a0) * e;
      }
      function drawMirror(i, t) {
        const m = F.mirrors[i], x = gx(m.x), y = gy(m.y), r = cell * 0.42;
        if (m.fixed) {
          rr(ctx, x - r, y - r, r * 2, r * 2, cell * 0.12); ctx.fillStyle = '#3b3f66'; ctx.fill(); ctx.strokeStyle = '#1a1c38'; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.fillStyle = '#9aa0c8'; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x + a * r * 0.72, y + b * r * 0.72, Math.max(1.2, cell * 0.04), 0, TAU); ctx.fill(); }
        } else {
          const p = 0.5 + 0.5 * Math.sin(t * 3 + i);
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = 'rgba(200,235,255,.28)'; ctx.fill(); ctx.strokeStyle = 'rgba(220,245,255,' + (0.55 + p * 0.35) + ')'; ctx.lineWidth = 2; ctx.stroke();
          /* turn arrows */
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, r * 0.82, -0.4, 0.4); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.82, Math.PI - 0.4, Math.PI + 0.4); ctx.stroke();
        }
        /* the plate */
        const a = mirrorAngle(i, t), L = cell * 0.48;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1a2040'; ctx.lineWidth = cell * 0.17; ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(0, L); ctx.stroke();
        ctx.strokeStyle = m.fixed ? '#c9b6ff' : '#e9fbff'; ctx.lineWidth = cell * 0.1; ctx.stroke();
        ctx.strokeStyle = m.fixed ? '#8f7ad8' : '#8fd3ff'; ctx.lineWidth = cell * 0.035; ctx.beginPath(); ctx.moveTo(cell * 0.025, -L * 0.85); ctx.lineTo(cell * 0.025, L * 0.85); ctx.stroke();
        ctx.restore();
        if (m.fixed) { /* frost on the frozen ones */ ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x - r * 0.5, y + r * 0.62, r * 0.4, r * 0.16, 0, 0, TAU); ctx.fill(); }
      }
      function drawEmitter(t) {
        const x = gx(F.ex), y = gy(F.ey), r = cell * 0.4, a = F.ed * Math.PI / 2;
        const gl = ctx.createRadialGradient(x, y, 1, x, y, cell * 0.9); gl.addColorStop(0, 'rgba(140,255,200,.75)'); gl.addColorStop(1, 'rgba(140,255,200,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, cell * 0.9, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(0, -r * 1.1); ctx.lineTo(r * 0.55, -r * 0.2); ctx.lineTo(r * 0.4, r * 0.7); ctx.lineTo(-r * 0.4, r * 0.7); ctx.lineTo(-r * 0.55, -r * 0.2); ctx.closePath();
        const g = ctx.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, '#5fe0a0'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#3fb9a0'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#1a3a40'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.restore();
      }
      function drawBeam(t) {
        const pts = beam.pts.map(([x, y]) => [gx(x), gy(y)]);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const w = [cell * 0.5, cell * 0.28, cell * 0.12, cell * 0.05], c = ['rgba(90,255,170,.12)', 'rgba(90,255,190,.25)', 'rgba(170,255,220,.6)', 'rgba(255,255,255,.95)'];
        for (let k = 0; k < 4; k++) { ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.strokeStyle = c[k]; ctx.lineWidth = w[k] * (k === 0 ? 1 + 0.15 * Math.sin(t * 6) : 1); ctx.stroke(); }
        /* sparkles running along the beam */
        let total = 0; const segs = []; for (let j = 1; j < pts.length; j++) { const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); segs.push(l); total += l; }
        ctx.fillStyle = '#ffffff';
        const n = Math.max(3, Math.floor(total / (cell * 1.2)));
        for (let s = 0; s < n; s++) {
          let d = ((t * cell * 3 + s * total / n) % total + total) % total, j = 0;
          while (j < segs.length - 1 && d > segs[j]) { d -= segs[j]; j++; }
          const f = segs[j] ? d / segs[j] : 0, x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f;
          ctx.beginPath(); ctx.arc(x, y, cell * 0.06, 0, TAU); ctx.fill();
        }
        ctx.restore();
        /* end splash on a wall */
        if (beam.end === 'wall') { const [x, y] = pts[pts.length - 1]; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 5; k++) { const a = t * 7 + k * 1.3; ctx.strokeStyle = 'rgba(170,255,220,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * cell * 0.22, y + Math.sin(a) * cell * 0.22); ctx.stroke(); } ctx.restore(); }
      }
      function draw(t) {
        if (!W || !F) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawSky(t);
        const bw = cell * S;
        rr(ctx, bx - cell * 0.8 + 2, by - cell * 0.8 + 2, bw + cell * 1.6 - 4, bw + cell * 1.6 - 4, cell * 0.4); ctx.fillStyle = 'rgba(10,15,45,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,170,255,.45)'; ctx.lineWidth = 2; ctx.stroke();
        rr(ctx, bx, by, bw, bw, 8); const ig = ctx.createLinearGradient(bx, by, bx, by + bw); ig.addColorStop(0, 'rgba(160,200,255,.22)'); ig.addColorStop(1, 'rgba(120,170,230,.3)'); ctx.fillStyle = ig; ctx.fill();
        ctx.strokeStyle = 'rgba(200,225,255,.18)'; ctx.lineWidth = 1;
        for (let k = 0; k <= S; k++) { ctx.beginPath(); ctx.moveTo(bx + k * cell, by); ctx.lineTo(bx + k * cell, by + bw); ctx.moveTo(bx, by + k * cell); ctx.lineTo(bx + bw, by + k * cell); ctx.stroke(); }
        for (let i = 0; i < S * S; i++) if (F.wall[i]) drawWall(i);
        F.targets.forEach((ti, k) => { const x = gx(ti % S), y = gy((ti / S) | 0); ctx.beginPath(); ctx.arc(x, y, cell * 0.42, 0, TAU); ctx.fillStyle = beam.lit[k] ? 'rgba(255,170,220,.25)' : 'rgba(120,100,200,.2)'; ctx.fill(); });
        drawBeam(t);
        F.mirrors.forEach((m, i) => drawMirror(i, t));
        F.targets.forEach((ti, k) => { const pop = Math.max(0, 1 - (t - litAt[k]) / 0.4); crystal(ctx, gx(ti % S), gy((ti / S) | 0), cell * 0.6 * (1 + pop * 0.3), beam.lit[k], t, k ? '#ff9ee0' : '#ffd84a'); });
        drawEmitter(t);
        drawPanel(t);
        for (let k = fx.length - 1; k >= 0; k--) {
          const f = fx[k], a = (t - f.t0) / f.life; if (a >= 1) { fx.splice(k, 1); continue; } if (a < 0) continue;
          ctx.globalAlpha = 1 - a; ctx.fillStyle = f.col; const x = f.x + f.vx * a, y = f.y + f.vy * a;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a * 5); const r = f.r * (1 - a * 0.5); ctx.beginPath(); for (let j = 0; j < 4; j++) { const an = j * Math.PI / 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); ctx.lineTo(Math.cos(an + 0.785) * r * 0.3, Math.sin(an + 0.785) * r * 0.3); } ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.globalAlpha = 1;
        if (done) {
          const a = Math.min(1, (t - solvedAt) / 0.4); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; fnt(ctx, '700', compact ? 22 : 30);
          const tx = bx + bw / 2, ty = by + bw / 2 + Math.sin(t * 4) * 3; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1b1a4a'; const wt = tr('Nordlicht!', 'Northern lights!'); ctx.strokeText(wt, tx, ty); ctx.fillStyle = '#b8ffd8'; ctx.fillText(wt, tx, ty); ctx.restore();
        }
      }
      function drawPanel(t) {
        const x = panelX, w = W - panelX - 8; if (w < 60) return;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        let y = by + (compact ? 12 : 18);
        fnt(ctx, '700', compact ? 14 : 17); ctx.fillStyle = '#ffd84a'; ctx.fillText(tr('Kristalle', 'Crystals'), x, y);
        y += compact ? 10 : 14;
        const s = compact ? 26 : 34;
        for (let k = 0; k < 2; k++) { const cx0 = x + s / 2 + k * (s + 10); ctx.beginPath(); ctx.arc(cx0, y + s / 2, s / 2, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); crystal(ctx, cx0, y + s / 2, s * 0.55, beam.lit[k], t, k ? '#ff9ee0' : '#ffd84a'); }
        y += s + (compact ? 16 : 24);
        fnt(ctx, '600', compact ? 12 : 14); const n = beam.lit.filter(Boolean).length; ctx.fillStyle = n === 2 ? '#9be7a5' : '#e8e4ff'; ctx.fillText(tr(n + ' von 2 leuchten', n + ' of 2 glowing'), x, y);
        if (!compact || H > 230) {
          y += compact ? 22 : 32;
          /* legend */
          const r = compact ? 9 : 11;
          ctx.beginPath(); ctx.arc(x + r, y - r * 0.4, r, 0, TAU); ctx.fillStyle = 'rgba(200,235,255,.28)'; ctx.fill(); ctx.strokeStyle = '#e9fbff'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.strokeStyle = '#e9fbff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + r - r * 0.6, y - r * 0.4 + r * 0.6); ctx.lineTo(x + r + r * 0.6, y - r * 0.4 - r * 0.6); ctx.stroke();
          fnt(ctx, '500', compact ? 11 : 12.5); ctx.fillStyle = '#e8e4ff'; ctx.fillText(tr('kippbar', 'tiltable'), x + r * 2 + 8, y);
          y += compact ? 22 : 28;
          rr(ctx, x, y - r * 1.4, r * 2, r * 2, 4); ctx.fillStyle = '#3b3f66'; ctx.fill(); ctx.strokeStyle = '#c9b6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.4 + r * 0.6); ctx.lineTo(x + r * 1.6, y - r * 0.4 - r * 0.6); ctx.stroke();
          ctx.fillStyle = '#e8e4ff'; ctx.fillText(tr('festgefroren', 'frozen'), x + r * 2 + 8, y);
        }
      }

      let raf = 0, alive = true;
      const loop = () => { if (!alive) return; draw(performance.now() / 1000); raf = requestAnimationFrame(loop); };

      function flip(i, quiet) {
        const now = performance.now() / 1000;
        angFrom[i] = mirrorAngle(i, now) / (Math.PI / 4); angT0[i] = now; ori[i] ^= 1;
        const before = beam.lit.slice(); beam = trace(F, fullOri());
        if (!quiet) snd(A => { A.tone(1400 + i * 120, 0.12, {type: 'sine', gain: 0.07}); A.tone(2100 + i * 150, 0.08, {type: 'triangle', gain: 0.03, delay: 0.03}); });
        beam.lit.forEach((l, k) => {
          if (l && !before[k]) {
            litAt[k] = now; const ti = F.targets[k];
            for (let j = 0; j < 10; j++) { const a = rng() * TAU, v = 20 + rng() * 40; fx.push({x: gx(ti % S), y: gy((ti / S) | 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + rng() * 3, life: 0.5 + rng() * 0.3, t0: now, col: k ? '#ff9ee0' : '#ffd84a'}); }
            snd(A => { A.bell(k ? 1568 : 1319, 0.5, 0.1, 0.05); A.bell(k ? 2093 : 1760, 0.4, 0.06, 0.12); });
          }
        });
        if (beam.solved && !quiet) win();   /* quiet = "Zurücksetzen" flipping back: a passing state must not count as solved */
      }
      function win() {
        if (done) return; done = true; busy = true; solvedAt = performance.now() / 1000;
        api.msg(tr('Beide Kristalle leuchten, das Nordlicht tanzt!', 'Both crystals glow, the northern lights dance!'), 'good');
        const now = solvedAt;
        for (const p of beam.pts) for (let j = 0; j < 4; j++) { const a = rng() * TAU, v = 15 + rng() * 40; fx.push({x: gx(p[0]), y: gy(p[1]), vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + rng() * 3, life: 0.8 + rng() * 0.5, t0: now + rng() * 0.5, col: ['#b8ffd8', '#ffffff', '#c9b6ff', '#ffd84a'][j]}); }
        snd(A => { [659, 880, 1047, 1319, 1760, 2093].forEach((f, k) => A.bell(f, 0.6, 0.08, k * 0.09)); });
        draw(now);
        timers.push(setTimeout(() => api.solved(), 1100));
      }
      const onDown = e => {
        if (busy) return;
        const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        let best = -1, bd = (cell * 0.85) ** 2;
        F.mirrors.forEach((m, i) => { const dx = x - gx(m.x), dy = y - gy(m.y), d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
        if (best < 0) return;
        e.preventDefault();
        if (F.mirrors[best].fixed) { snd(A => A.tone(220, 0.1, {type: 'triangle', gain: 0.1})); api.msg(tr('Dieser Spiegel ist festgefroren und lässt sich nicht kippen.', 'This mirror is frozen solid and can\'t be tilted.'), 'info'); return; }
        flip(best);
      };
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('contextmenu', e => e.preventDefault());
      btn.addEventListener('click', () => {
        if (busy) return; api.sfx('select');
        F.mirrors.forEach((m, i) => { if (!m.fixed && ori[i] !== F.start[i]) flip(i, true); });
        api.msg(tr('Alle Spiegel stehen wieder wie am Anfang.', 'All mirrors are back the way they started.'), 'info');
      });

      setup();
      const ro = new ResizeObserver(() => layout()); ro.observe(root);
      layout();
      raf = requestAnimationFrame(loop);

      return {
        _s: () => ({F, ori, beam, cell, bx, by, done}),
        destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); timers.forEach(clearTimeout); },
        autoSolve() {
          if (done || busy) return; busy = true; let k = 0;
          F.mirrors.forEach((m, i) => { if (!m.fixed && ori[i] !== F.sol[i]) { timers.push(setTimeout(() => { if (!done) flip(i); }, 120 + (k++) * 220)); } });
          timers.push(setTimeout(() => { if (!done) { F.mirrors.forEach((m, i) => { if (!m.fixed) ori[i] = F.sol[i]; }); beam = trace(F, fullOri()); win(); } }, 300 + k * 220));
        },
      };
    },
  });
})();

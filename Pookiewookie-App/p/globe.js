/* Pookiewookie: the world map is a slowly turning 3D globe (WebGL). Six themed continents painted on a canvas texture,
   drifting procedural clouds, day/night lighting, glowing lava and castle lights, atmosphere rim, star field.
   DOM markers float over the worlds; pick one and the camera dives toward the surface before the cloud fall begins. */
(function () {
  const G = window.PW = window.PW || {}, VW = 480, VH = 270;
  const POS = {wiese: [-100, 22], insel: [-28, -12], unterwasser: [-62, -38], dschungel: [55, 4], schoko: [102, -24], schnee: [138, 46], lava: [-158, -46], himmel: [20, 74]};
  const D = 3.2, rad = d => d * Math.PI / 180;
  let gl = null, prog = null, canvas = null, cssW = VW, cssH = VH, uni = {}, markers = [], ui = null, startT = performance.now();
  const st = {yaw: 2.2, pitch: 0.35, zoom: 1.55, auto: true, drag: null, fly: null, flash: 0, sel: 0, visible: false, dragged: false};

  const VS = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }';
  const FS = `precision highp float;
uniform vec2 uRes; uniform float uTime, uZoom, uFlash; uniform vec2 uRot; uniform vec3 uSel; uniform sampler2D uTex, uMask;
float hash(vec3 p){ p = fract(p * 0.3183099 + vec3(.1, .2, .3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.07; a *= 0.5; } return s; }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
void main(){
  vec2 ndc = (gl_FragCoord.xy / uRes) * 2. - 1.; float asp = uRes.x / uRes.y;
  vec3 o = vec3(0., 0., -${D.toFixed(1)}); vec3 d = normalize(vec3(ndc.x * asp, ndc.y, uZoom));
  vec3 sun = normalize(vec3(-0.55, 0.5, -0.75));
  /* background: deep space gradient, twinkling stars, a soft nebula */
  vec3 bg = mix(vec3(0.05, 0.03, 0.12), vec3(0.16, 0.08, 0.3), ndc.y * 0.5 + 0.5);
  bg += vec3(0.25, 0.1, 0.35) * fbm(d * 3.0 + vec3(0., uTime * 0.01, 0.)) * 0.35;
  float sh = hash(floor(d * 520.)); float tw = 0.6 + 0.4 * sin(uTime * 3. + sh * 50.);
  if (sh > 0.993) bg += vec3(1.) * (sh - 0.993) / 0.007 * tw;
  float b = dot(o, d), c = dot(o, o) - 1.0, h = b * b - c;
  vec3 col = bg;
  float m = sqrt(max(0., c - b * b));
  col += vec3(0.35, 0.6, 1.0) * exp(-(m - 1.0) * 7.0) * 0.9 * step(0., m - 1.0);
  if (h > 0.) {
    float t = -b - sqrt(h); vec3 p = o + t * d; vec3 n = p;
    vec3 L = rotY(-uRot.x) * (rotX(-uRot.y) * n);
    float lat = asin(clamp(L.y, -1., 1.)), lon = atan(L.x, L.z);
    vec2 uv = vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.1415927);
    vec3 tc = texture2D(uTex, uv).rgb; float mk = texture2D(uMask, uv).r;
    float land = smoothstep(0.2, 0.4, mk), emis = smoothstep(0.8, 0.95, mk);
    float diff = max(dot(n, sun), 0.);
    /* clouds drift in local space so they turn with the globe */
    vec3 cp = L * 2.6 + vec3(uTime * 0.02, 0., uTime * 0.013);
    float cl = smoothstep(0.50, 0.72, fbm(cp)); float csh = smoothstep(0.50, 0.72, fbm(cp + sun * 0.06));
    vec3 r = reflect(d, n); float spec = pow(max(dot(r, sun), 0.), 48.) * (1. - land) * 0.8;
    vec3 surf = tc * (0.28 + 0.85 * diff) * (1. - csh * 0.35) + vec3(spec);
    surf += tc * emis * (0.9 + 0.3 * sin(uTime * 2.5 + lon * 9.));
    surf = mix(surf, vec3(1.) * (0.45 + 0.65 * diff), cl * 0.92);
    /* selected world: a soft pulsing ring on the surface */
    vec3 sc = vec3(cos(uSel.y) * sin(uSel.x), sin(uSel.y), cos(uSel.y) * cos(uSel.x));
    float ang = acos(clamp(dot(normalize(L), sc), -1., 1.)); float ring = smoothstep(0.03, 0., abs(ang - (0.2 + 0.02 * sin(uTime * 4.)))) * uSel.z;
    surf += vec3(1., 0.85, 0.3) * ring * 0.9;
    float fr = pow(1. - max(dot(n, -d), 0.), 2.6);
    col = surf + vec3(0.45, 0.7, 1.0) * fr * (0.5 + 0.6 * diff);
  }
  col = mix(col, vec3(1.), uFlash);
  gl_FragColor = vec4(col, 1.);
}`;

  /* ---------- texture: six continents on a pastel ocean ---------- */
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function paint() {
    const W = 1024, H = 512, cc = document.createElement('canvas'), mc = document.createElement('canvas'); cc.width = mc.width = W; cc.height = mc.height = H;
    const c = cc.getContext('2d'), m = mc.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b3f9a'); g.addColorStop(0.5, '#2f7fe0'); g.addColorStop(1, '#1b3f9a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
    const px = (lon, lat) => [(lon / 360 + 0.5) * W, (0.5 - lat / 180) * H];
    const both = (fill, maskFill, fn) => { c.fillStyle = fill; fn(c); if (maskFill) { m.fillStyle = maskFill; fn(m); } };
    const blob = (lon, lat, r, n, seed, fill, maskFill, stretch) => {
      const rr = rng(seed), [cx, cy] = px(lon, lat), sx = 1 / Math.max(0.3, Math.cos(rad(lat))) * (stretch || 1);
      for (let i = 0; i < n; i++) { const a = rr() * Math.PI * 2, dd = rr() * r * 0.75, rad2 = r * (0.35 + rr() * 0.45); const x = cx + Math.cos(a) * dd * sx, y = cy + Math.sin(a) * dd; both(fill, maskFill, k => { k.beginPath(); k.ellipse(x, y, rad2 * sx, rad2, 0, 0, Math.PI * 2); k.fill(); }); }
    };
    const dots = (lon, lat, r, n, seed, fill, maskFill, size) => { const rr = rng(seed), [cx, cy] = px(lon, lat), sx = 1 / Math.max(0.3, Math.cos(rad(lat))); for (let i = 0; i < n; i++) { const a = rr() * Math.PI * 2, dd = rr() * r * 0.7; both(fill, maskFill, k => { k.beginPath(); k.ellipse(cx + Math.cos(a) * dd * sx, cy + Math.sin(a) * dd, size * sx, size, 0, 0, Math.PI * 2); k.fill(); }); } };
    /* a few generic islets */
    const ir = rng(77); for (let i = 0; i < 14; i++) { const lon = ir() * 360 - 180, lat = ir() * 120 - 60; blob(lon, lat, 10 + ir() * 10, 4, 100 + i, '#9be7a5', '#808080'); }
    /* Zuckerwattewiese: pink meadow with mint hills and lollipops */
    blob(-100, 22, 70, 26, 1, '#ffc9dc', '#808080'); blob(-104, 26, 40, 12, 2, '#b4e6c0', '#808080'); blob(-92, 14, 28, 10, 3, '#fff4e0', '#808080');
    dots(-100, 22, 60, 26, 4, '#ff6f9c', null, 3.2); dots(-100, 22, 60, 18, 5, '#8fd3ff', null, 2.6);
    /* Kokosinsel: turquoise shallows, golden sand, palms */
    blob(-28, -12, 70, 16, 6, '#7fe0ea', null, 1.15); blob(-28, -12, 52, 22, 7, '#f7d58a', '#808080'); blob(-10, -22, 22, 8, 8, '#f7d58a', '#808080'); blob(-44, 0, 18, 8, 9, '#f7d58a', '#808080');
    dots(-28, -12, 46, 30, 10, '#2f9e5b', null, 2.4); dots(-28, -12, 46, 12, 11, '#ffffff', null, 1.6);
    /* Dschungel: deep green with lighter canopy and a river */
    blob(55, 4, 78, 28, 12, '#2f7a4e', '#808080'); dots(55, 4, 70, 60, 13, '#5fcf6a', null, 3.4); dots(55, 4, 70, 30, 14, '#1f5a3a', null, 2.4);
    both('#3aa0e8', '#000', k => { k.lineWidth = 5; k.strokeStyle = k.fillStyle; k.beginPath(); const [ax, ay] = px(40, 18); k.moveTo(ax, ay); const [bx, by] = px(52, 6), [cx2, cy2] = px(62, -6), [dx, dy] = px(70, -14); k.bezierCurveTo(bx, by, cx2, cy2, dx, dy); k.stroke(); });
    /* Schneeland: white with icy blue mountains */
    blob(138, 46, 72, 26, 15, '#eef6ff', '#808080'); dots(138, 46, 60, 22, 16, '#9fd0f0', null, 4); dots(138, 46, 60, 40, 17, '#ffffff', null, 2.2);
    const sr = rng(18); for (let i = 0; i < 9; i++) { const [tx, ty] = px(138 + (sr() - 0.5) * 40, 46 + (sr() - 0.5) * 24); both('#7fb8e6', null, k => { k.beginPath(); k.moveTo(tx - 9, ty + 6); k.lineTo(tx, ty - 10); k.lineTo(tx + 9, ty + 6); k.closePath(); k.fill(); }); both('#ffffff', null, k => { k.beginPath(); k.moveTo(tx - 4, ty - 2); k.lineTo(tx, ty - 10); k.lineTo(tx + 4, ty - 2); k.closePath(); k.fill(); }); }
    /* Lavawelt: dark rock with glowing cracks and craters */
    blob(-158, -46, 74, 26, 19, '#3a2a2e', '#808080'); dots(-158, -46, 64, 30, 20, '#2a1a1e', null, 4);
    both('#ff7a2a', '#ffffff', k => { const rr = rng(21); k.lineWidth = 2.2; k.strokeStyle = k.fillStyle; for (let i = 0; i < 16; i++) { const [ax, ay] = px(-158 + (rr() - 0.5) * 50, -46 + (rr() - 0.5) * 30); k.beginPath(); k.moveTo(ax, ay); let x = ax, y = ay; for (let s = 0; s < 4; s++) { x += (rr() - 0.5) * 24; y += (rr() - 0.5) * 16; k.lineTo(x, y); } k.stroke(); } });
    dots(-158, -46, 60, 8, 22, '#ffd24a', '#ffffff', 3.5);
    /* Wolkenschloss: a glowing violet polar sky with castle lights */
    both('#8a6ad0', '#808080', k => { const gg = k === c ? c.createLinearGradient(0, 0, 0, H * 0.14) : null; if (gg) { gg.addColorStop(0, '#8a6ad0'); gg.addColorStop(1, '#5a3fa0'); k.fillStyle = gg; } k.fillRect(0, 0, W, H * 0.13); });
    { const rr = rng(23); for (let i = 0; i < 40; i++) { const x = rr() * W, y = rr() * H * 0.12, r2 = 8 + rr() * 16; both('#c9b8f0', null, k => { k.beginPath(); k.ellipse(x, y, r2 * 2.2, r2 * 0.6, 0, 0, Math.PI * 2); k.fill(); }); } }
    { const rr = rng(24); for (let i = 0; i < 10; i++) { const x = (i + 0.5) * W / 10, y = H * 0.07; both('#3b2a6a', null, k => { k.fillRect(x - 10, y - 6, 20, 14); k.fillRect(x - 14, y - 10, 6, 18); k.fillRect(x + 8, y - 10, 6, 18); k.beginPath(); k.moveTo(x - 10, y - 6); k.lineTo(x, y - 16); k.lineTo(x + 10, y - 6); k.fill(); }); for (let w = 0; w < 3; w++) both('#ffe9a8', '#ffffff', k => { k.fillRect(x - 6 + w * 5, y - 2 + (rr() > 0.5 ? 0 : 4), 2.5, 3); }); } }
    /* Korallenmeer: turquoise shallows with a ring of coral reefs */
    blob(-62, -38, 60, 14, 26, '#3fc7d8', null, 1.1); blob(-62, -38, 40, 10, 27, '#7fe7ef', null);
    dots(-62, -38, 52, 26, 28, '#ff6f9c', '#808080', 2.6); dots(-62, -38, 52, 18, 29, '#ffb347', '#808080', 2.2); dots(-62, -38, 30, 10, 30, '#ffffff', null, 1.4);
    /* Schokoladenland: a chocolate continent with a river of hot chocolate, cream caps and sprinkles */
    blob(102, -24, 70, 26, 31, '#7a4425', '#808080'); blob(108, -18, 40, 12, 32, '#a8643a', '#808080'); dots(102, -24, 60, 20, 33, '#fff1dc', null, 3);
    dots(102, -24, 62, 40, 34, '#ff6f9c', null, 1.4); dots(102, -24, 62, 30, 35, '#9be7a5', null, 1.4);
    both('#4a2210', '#000', k => { k.lineWidth = 5; k.strokeStyle = k.fillStyle; k.beginPath(); const [ax, ay] = px(84, -10); k.moveTo(ax, ay); const [bx, by] = px(96, -22), [cx2, cy2] = px(110, -30), [dx, dy] = px(122, -38); k.bezierCurveTo(bx, by, cx2, cy2, dx, dy); k.stroke(); });
    /* south polar ice */
    both('#f4f8ff', '#808080', k => { k.fillRect(0, H * 0.92, W, H * 0.08); const rr = rng(25); for (let i = 0; i < 30; i++) { const x = rr() * W, y = H * (0.9 + rr() * 0.04), r2 = 6 + rr() * 14; k.beginPath(); k.ellipse(x, y, r2 * 2, r2 * 0.5, 0, 0, Math.PI * 2); k.fill(); } });
    return {color: cc, mask: mc};
  }

  /* ---------- camera math (matches the shader) ---------- */
  const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]]; };
  const rotX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]; };
  function project(key) {
    if (!POS[key]) {   /* space and the finale: markers orbiting the globe on opposite sides */
      const a = (performance.now() - startT) / 1000 * 0.45 + (key === 'finale' ? Math.PI : 0), r = (st.zoom / Math.sqrt(D * D - 1)) * cssH / 2;
      const facing = 0.5 + 0.5 * Math.sin(a + 1.2);
      return {x: cssW / 2 + Math.cos(a) * r * 1.6, y: cssH / 2 + Math.sin(a) * r * 0.42 - r * 0.9, facing: 0.3 + facing * 0.7};
    }
    const [lon, lat] = POS[key], l = [Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat)), Math.cos(rad(lat)) * Math.cos(rad(lon))];
    const w = rotX(rotY(l, st.yaw), st.pitch), v = [w[0], w[1], w[2] + D], asp = cssW / cssH;
    const nx = v[0] / v[2] * st.zoom / asp, ny = v[1] / v[2] * st.zoom;
    const toCam = [-w[0], -w[1], -D - w[2]], len = Math.hypot(toCam[0], toCam[1], toCam[2]);
    const facing = (w[0] * toCam[0] + w[1] * toCam[1] + w[2] * toCam[2]) / len;
    return {x: (nx + 1) / 2 * cssW, y: (1 - ny) / 2 * cssH, facing};
  }
  const targetFor = key => POS[key] ? ({yaw: Math.PI - rad(POS[key][0]), pitch: -rad(POS[key][1])}) : ({yaw: st.yaw, pitch: st.pitch});
  const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('GLOBE shader: ' + gl.getShaderInfoLog(s)); return null; } return s; }
  function texture(cv, unit) { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cv); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }

  const globe = G.globe = {
    ok: false, onPick: null, progress: null,
    init(cv, uiEl) {
      canvas = cv; ui = uiEl;
      try { gl = cv.getContext('webgl', {antialias: false, alpha: false, preserveDrawingBuffer: true}); } catch (e) { gl = null; }
      if (!gl) { console.warn('GLOBE: no WebGL'); return false; }
      const vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return false;
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('GLOBE link: ' + gl.getProgramInfoLog(prog)); return false; }
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aP = gl.getAttribLocation(prog, 'aP'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uRes', 'uTime', 'uZoom', 'uFlash', 'uRot', 'uSel', 'uTex', 'uMask']) uni[n] = gl.getUniformLocation(prog, n);
      const tx = paint(); texture(tx.color, 0); texture(tx.mask, 1); gl.uniform1i(uni.uTex, 0); gl.uniform1i(uni.uMask, 1);
      /* markers */
      const mk = ui.querySelector('#markers') || ui; mk.innerHTML = '';
      markers = G.WORLDS.map((W, wi) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'wm' + (POS[W.key] ? '' : ' space'); b.innerHTML = `<b>${POS[W.key] ? wi + 1 : (W.key === 'finale' ? '🕳️' : '🚀')}</b><span>${W.name}</span><i></i>`; b.addEventListener('click', e => { e.stopPropagation(); if (st.dragged) return; globe.select(wi); globe.pick(); }); b.addEventListener('mouseenter', () => { if (!st.fly) globe.select(wi, true); }); mk.appendChild(b); return b; });
      /* drag to turn */
      cv.addEventListener('pointerdown', e => { st.drag = {x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch}; st.dragged = false; st.auto = false; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => { if (!st.drag || st.fly) return; const dx = e.clientX - st.drag.x, dy = e.clientY - st.drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) st.dragged = true; st.yaw = st.drag.yaw + dx * 0.008; st.pitch = Math.max(-1.3, Math.min(1.3, st.drag.pitch + dy * 0.008)); });
      const up = () => { st.drag = null; setTimeout(() => { st.auto = true; }, 2500); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      this.ok = true; return true;
    },
    resize(w, h) { cssW = w; cssH = h; if (!gl) return; const dpr = Math.min(devicePixelRatio || 1, 1600 / Math.max(1, w)); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; gl.viewport(0, 0, canvas.width, canvas.height); },
    show(sel) { st.visible = true; st.fly = null; st.flash = 0; st.zoom = 1.55; st.auto = true; if (sel !== undefined) { st.sel = sel; const t = targetFor(G.WORLDS[sel].key); st.yaw = t.yaw; st.pitch = t.pitch * 0.6 + 0.2; } canvas.hidden = false; ui.hidden = false; this.refreshMarkers(); },
    hide() { st.visible = false; canvas.hidden = true; ui.hidden = true; },
    refreshMarkers() { markers.forEach((b, wi) => { const p = this.progress ? this.progress(wi) : {done: 0, stars: 0}; b.querySelector('i').textContent = p.done + '/4 · ' + p.stars + '★'; b.classList.toggle('done', p.done >= 4); }); },
    select(wi, soft) { st.sel = (wi + G.WORLDS.length) % G.WORLDS.length; if (!soft) { const t = targetFor(G.WORLDS[st.sel].key); st.fly = {yaw0: st.yaw, pitch0: st.pitch, yaw1: st.yaw + wrap(t.yaw - st.yaw), pitch1: t.pitch * 0.7, zoom0: st.zoom, zoom1: 1.55, t: 0, dur: 0.7, pick: false}; } if (G.audio) G.audio.sfx.select(); },
    move(d) { this.select(st.sel + d); },
    pick() {
      if (st.fly && st.fly.pick) return; const key = G.WORLDS[st.sel].key, t = targetFor(key), space = !POS[key];
      st.fly = {yaw0: st.yaw, pitch0: st.pitch, yaw1: st.yaw + wrap(t.yaw - st.yaw), pitch1: t.pitch, zoom0: st.zoom, zoom1: space ? 0.9 : 5.0, t: 0, dur: space ? 1.1 : 1.6, pick: true};
      if (G.audio) G.audio.sfx.globeGo();
    },
    selected() { return st.sel; },
    frame() {
      if (!gl || !st.visible) return;
      const now = (performance.now() - startT) / 1000;
      if (st.fly) {
        const f = st.fly; f.t += 1 / 60; const k = Math.min(1, f.t / f.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        st.yaw = f.yaw0 + (f.yaw1 - f.yaw0) * e; st.pitch = f.pitch0 + (f.pitch1 - f.pitch0) * e;
        st.zoom = f.zoom0 + (f.zoom1 - f.zoom0) * (f.pick ? Math.pow(k, 2.2) : e);
        if (f.pick) st.flash = Math.max(0, (k - 0.72) / 0.28);
        if (k >= 1) { st.fly = null; if (f.pick) { const wi = st.sel; this.hide(); if (this.onPick) this.onPick(wi); return; } }
      } else if (st.auto && !st.drag) { st.yaw += 0.0022; st.pitch += (0.3 - st.pitch) * 0.01; }
      gl.useProgram(prog);
      gl.uniform2f(uni.uRes, canvas.width, canvas.height); gl.uniform1f(uni.uTime, now); gl.uniform1f(uni.uZoom, st.zoom); gl.uniform1f(uni.uFlash, st.flash);
      gl.uniform2f(uni.uRot, st.yaw, st.pitch);
      const sp = POS[G.WORLDS[st.sel].key] || [0, 0]; gl.uniform3f(uni.uSel, rad(sp[0]), rad(sp[1]), (st.fly && st.fly.pick) || !POS[G.WORLDS[st.sel].key] ? 0 : 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      /* markers follow their worlds */
      const rect = canvas.getBoundingClientRect(), uiRect = ui.getBoundingClientRect();
      markers.forEach((b, wi) => {
        const p = project(G.WORLDS[wi].key), vis = p.facing > 0.08 && !(st.fly && st.fly.pick);
        b.style.opacity = vis ? String(Math.min(1, (p.facing - 0.08) * 4)) : '0'; b.style.pointerEvents = vis ? 'auto' : 'none';
        b.style.transform = `translate(${(rect.left - uiRect.left + p.x).toFixed(1)}px, ${(rect.top - uiRect.top + p.y).toFixed(1)}px) translate(-50%, -100%) scale(${(0.7 + p.facing * 0.4).toFixed(2)})`;
        b.classList.toggle('sel', wi === st.sel);
      });
    },
  };
})();

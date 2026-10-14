const CACHE = 'pookie-202610141910';
const FILES = ['index.html','manifest.webmanifest','p/audio.js','p/brand.js','p/draw.js','p/engine.js','p/entities.js','p/fx.js','p/gadgets.js','p/game.js','p/globe.js','p/hub.js','p/levels.js','p/voice/v00.mp3','p/voice/v01.mp3','p/voice/v02.mp3','p/voice/v03.mp3','p/voice/v04.mp3','p/voice/v05.mp3','p/voice/v06.mp3','p/voice/v07.mp3','p/voice/v08.mp3','p/voice/v09.mp3','p/voice/v10.mp3','p/voice/v11.mp3','p/voice/v12.mp3','p/voice/v13.mp3','p/voice/v14.mp3','p/voice/v15.mp3','p/voice/v16.mp3','p/voice/v17.mp3','p/voice/v18.mp3','p/voice/v19.mp3','p/voice/v20.mp3','p/voice/v21.mp3','p/voice/v22.mp3','p/voice/v23.mp3','p/voice/v24.mp3','p/voice/v25.mp3','p/voice/v26.mp3','p/voice/v27.mp3','p/voice/v28.mp3','p/voice/v29.mp3','p/voice/v30.mp3','p/voice/v31.mp3','p/voice/v32.mp3','p/voice/v33.mp3','p/voice/v34.mp3','p/voicelines.js','p/worlds.js','./'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => r)));
});

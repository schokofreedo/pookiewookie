/* The Starway Home: puzzle host. Every puzzle is a self-contained mini-game registered with G.PZ.register(def) from its own file
   (p/pz/<id>.js). The host shows the #puzzle overlay, mounts the puzzle into #pz-root and handles hints, buying the solution and closing.

   def = {
     id: 'wiese-waage', world: 'wiese', slot: 0|1, title, intro,
     letter: 'Mallo's hint (also printed in her letter)', hint: 'stronger hint (costs Taler)',
     mount(root, api) -> handle {destroy(), autoSolve()}
   }
   api = {solved(), wrong(msg), msg(text), sfx(name), rng(), attempts(), isTouch, letters()} */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  const $ = s => document.querySelector(s);
  const PRICE_HINT = 150, PRICE_SOLVE = 600;
  let cur = null;   /* {def, handle, opts, attempts, done} */
  const paid = {};   /* 'hint:<id>' / 'solve:<id>' already bought: re-opening that puzzle does not charge again */

  const PZ = G.PZ = {
    defs: {}, PRICE_HINT, PRICE_SOLVE,
    register(def) { if (!def || !def.id) return; PZ.defs[def.id] = def; },
    get current() { return cur; },
    isOpen() { return !!cur; },
    msg(text, kind) { const m = $('#pz-msg'); if (!m) return; m.textContent = text || ''; m.className = kind || ''; },
    open(id, opts) {
      opts = opts || {};
      const def = PZ.defs[id];
      if (!def) { console.warn('PZ missing ' + id); if (opts.onSolved) setTimeout(opts.onSolved, 50); return false; }
      if (cur) PZ.close(true);
      const ov = $('#puzzle'), root = $('#pz-root');
      $('#pz-world').textContent = opts.label || (tr('Rätsel · ', 'Puzzle · ') + (((G.WORLDS || []).find(w => w.key === def.world) || {}).name || def.world || ''));
      $('#pz-title').textContent = def.title || tr('Rätsel', 'Puzzle');
      $('#pz-intro').textContent = def.intro || '';
      root.innerHTML = ''; root.className = 'pz-' + id;
      PZ.msg('');
      const price = n => (opts.pay ? opts.pay(n) : true);
      for (const b of ['#pz-tip2', '#pz-solve']) $(b).removeAttribute('data-en');   /* the label with the price is set here, a later applyLang must not reset it */
      $('#pz-tip2').textContent = paid['hint:' + id] ? tr('Großer Tipp · gekauft', 'Big hint · bought') : tr(`Großer Tipp · ${PRICE_HINT} Taler`, `Big hint · ${PRICE_HINT} coins`);
      $('#pz-solve').textContent = paid['solve:' + id] ? tr('Lösung · gekauft', 'Solution · bought') : tr(`Lösung · ${PRICE_SOLVE} Taler`, `Solution · ${PRICE_SOLVE} coins`);
      ov.hidden = false;
      const state = cur = {def, opts, handle: null, attempts: 0, done: false};
      const api = {
        isTouch: !!opts.isTouch || document.body.classList.contains('touch'),
        sfx(name) { try { const a = G.audio; if (a && a.sfx && a.sfx[name]) a.sfx[name](); } catch (e) {} },
        rng: Math.random,
        attempts: () => state.attempts,
        letters: () => (opts.letters ? opts.letters() : (G.LETTERS || [])),
        msg: (t, kind) => { if (cur === state) PZ.msg(t, kind); },
        wrong(text) {
          if (cur !== state || state.done) return; state.attempts++;
          api.sfx('wrong'); const box = $('#puzzle .pzbox'); if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
          PZ.msg(text || tr('Leider falsch. Versuch es nochmal!', 'Not quite. Try again!'), 'bad');
          if (state.attempts === 3) setTimeout(() => { if (cur === state && !state.done) PZ.msg(tr('Tipp: Lies Mallos Brief oder tippe auf „Mallos Tipp“.', 'Tip: Read Mallo\'s letter or tap "Mallo\'s hint".'), 'info'); }, 1600);
        },
        solved() {
          if (cur !== state || state.done) return; state.done = true;
          api.sfx('puzzleSolved'); PZ.msg(tr('Gelöst!', 'Solved!'), 'good');
          const box = $('#puzzle .pzbox'); if (box) box.classList.add('won');
          console.log('PZ_SOLVED ' + def.id);
          setTimeout(() => { if (cur === state) PZ.close(true); if (opts.onSolved) opts.onSolved(); }, 1300);
        },
      };
      try { state.handle = def.mount(root, api) || {}; }
      catch (e) { console.error('PZ_MOUNT_ERROR ' + id + ' ' + e.message); state.handle = {}; }
      $('#pz-tip').onclick = () => { api.sfx('select'); PZ.msg(tr('Mallo: „' + (def.letter || '…') + '“', 'Mallo: "' + (def.letter || '…') + '"'), 'info'); };
      $('#pz-tip2').onclick = () => { if (!def.hint) return; if (!paid['hint:' + id]) { if (!price(PRICE_HINT)) { PZ.msg(tr('Dafür fehlen dir Taler. Sammle Herzen und besiege Gegner!', 'You don\'t have enough coins. Collect hearts and beat enemies!'), 'bad'); return; } paid['hint:' + id] = true; api.sfx('coin'); } PZ.msg(def.hint, 'info'); };
      $('#pz-solve').onclick = () => {
        if (state.done || state.solving) return;   /* autoSolve animates before solved(): a second tap must not charge or restart it */
        if (!paid['solve:' + id]) { if (!price(PRICE_SOLVE)) { PZ.msg(tr(`Die Lösung kostet ${PRICE_SOLVE} Taler. So viele hast du noch nicht.`, `The solution costs ${PRICE_SOLVE} coins. You don't have that many yet.`), 'bad'); return; } paid['solve:' + id] = true; }
        state.solving = true; api.sfx('coin'); if (state.handle && state.handle.autoSolve) state.handle.autoSolve(); else api.solved();
      };
      $('#pz-close').onclick = () => { api.sfx('select'); PZ.close(); if (opts.onClose && !state.done) opts.onClose(); };   /* solved: the pending onSolved resumes the game */
      console.log('PZ_MOUNTED ' + id + ' ' + Math.round(root.clientWidth) + 'x' + Math.round(root.clientHeight));
      return true;
    },
    close(silent) {
      if (!cur) return; const state = cur; cur = null;
      try { if (state.handle && state.handle.destroy) state.handle.destroy(); } catch (e) {}
      const root = $('#pz-root'); if (root) root.innerHTML = '';
      const ov = $('#puzzle'); if (ov) ov.hidden = true;
      const box = $('#puzzle .pzbox'); if (box) box.classList.remove('won', 'shake');
    },
  };
  /* Escape closes an open puzzle */
  document.addEventListener('keydown', e => { if (cur && e.code === 'Escape') { e.stopPropagation(); const c = cur; PZ.close(); if (c.opts.onClose && !c.done) c.opts.onClose(); } }, true);
})();

/* Pookiewookie: Taler. Earned from hearts, star cookies, defeated enemies, level clears, the rocket and the chase; spent in the shop
   on rocket parts and outfits. The wallet lives in G.S.money and is persisted by game.js through G.flow.moneyChanged. */
(function () {
  const G = window.PW = window.PW || {};
  const S = () => G.S, A = () => G.audio, E = () => G.eng;
  const eco = G.eco = {
    owned: {},            /* set by game.js from the save: {shield: true, laser2: true, outfit:wiese: true, ...} */
    add(n, x, y, quiet) {
      const s = S(); s.money = Math.max(0, (s.money || 0) + n); s.moneyRun = (s.moneyRun || 0) + Math.max(0, n);
      if (!quiet && n > 0 && E() && E().toast) { if (G.parts) G.parts.push({kind: 'text', text: '+' + n + ' ¤', x: x !== undefined ? x : G.P.x, y: y !== undefined ? y : G.P.y - 14, vy: -0.5, t: 1.0}); }
      if (n > 0 && A() && !quiet) A().sfx.cash();
      if (G.flow && G.flow.moneyChanged) G.flow.moneyChanged();
    },
    has(id) { return !!this.owned[id]; },
    price(item) { return item.price; },
    canBuy(item) { return !this.has(item.id) && (S().money || 0) >= item.price && (!item.needs || this.has(item.needs)); },
    buy(item) {
      if (!this.canBuy(item)) return false;
      S().money -= item.price; this.owned[item.id] = true; if (A()) A().sfx.buy();
      if (G.flow && G.flow.bought) G.flow.bought(item.id);
      return true;
    },
    /* rocket loadout derived from what is owned */
    loadout() { const o = this.owned; return {shield: !!o.shield, fat: !!o.fat, laser: o.laser3 ? 3 : (o.laser2 ? 2 : 1), turbo: !!o.turbo, magnet: !!o.magnet, paint: !!o.paint}; },
  };
})();

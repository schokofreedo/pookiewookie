/* Toffo & Mallo: language (German / English). Every visible text is written as tr('Deutsch', 'English') at the place it is used.
   The choice is stored; switching reloads the page so data built at load time (worlds, letters, puzzles) is rebuilt in the new language.
   Static HTML carries data-en (innerHTML), data-en-aria (aria-label) and data-en-title (title) attributes. Loaded before every other script. */
(function () {
  const G = window.PW = window.PW || {};
  let lang = null;
  try { lang = localStorage.getItem('pookie-lang'); } catch (e) {}
  const q = /[#&]lang=(de|en)\b/.exec(location.hash); if (q) lang = q[1];   /* tests: #anything&lang=en */
  if (lang !== 'de' && lang !== 'en') lang = /^de\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '') ? 'de' : 'en';
  G.lang = lang;
  try { document.documentElement.lang = lang; } catch (e) {}
  const tr = G.tr = (de, en) => (lang === 'en' && en !== undefined) ? en : de;
  G.fmt = n => Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
  G.setLang = l => { if (l !== 'de' && l !== 'en') return; try { localStorage.setItem('pookie-lang', l); } catch (e) {} if (l !== lang) location.reload(); };
  G.applyLang = root => {
    if (lang !== 'en') return;
    const r = root || document;
    r.querySelectorAll('[data-en]').forEach(el => { el.innerHTML = el.getAttribute('data-en'); });
    r.querySelectorAll('[data-en-aria]').forEach(el => { el.setAttribute('aria-label', el.getAttribute('data-en-aria')); });
    r.querySelectorAll('[data-en-title]').forEach(el => { el.setAttribute('title', el.getAttribute('data-en-title')); });
  };
  /* the cast, so every file names them the same way */
  G.NAMES = {
    game: 'Toffo & Mallo', hero: 'Toffo', partner: 'Mallo', studio: 'Schokofreedo Games',
    pirate: tr("Käpt'n Bitterbart", 'Captain Bitterbeard'), cloudKing: tr('Wolkenkönig', 'Cloud King'),
    mafia: tr('Schoko-Mafia', 'Choco Mafia'), don: tr('der Pate', 'the Chocfather'), Don: tr('Der Pate', 'The Chocfather'),
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => G.applyLang()); else G.applyLang();
})();

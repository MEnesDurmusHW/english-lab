/* ============================================================
   English Lab — shared top app bar (two-tier navigation)
   Set window.LAB_SECTION before this script loads:
     'vocabulary' | 'collocations' | 'articles' | 'progress'
   Injects: brand · main sections · tools (Progress/share/theme/sync).
   Also tags <html data-section> so lab.css can recolor per section.
   Sub-tabs live in each page (a .subbar row), wired by that page.
   ============================================================ */
(function () {
  'use strict';
  var S = window.LAB_SECTION || 'vocabulary';
  document.documentElement.setAttribute('data-section', S);

  var MAIN = [
    { id: 'vocabulary',   label: 'Vocabulary',   href: 'vocabulary.html' },
    { id: 'collocations', label: 'Collocations', href: 'collocations.html' },
    { id: 'articles',     label: 'Articles',     href: 'articles.html' }
  ];

  var ICON = {
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    caret:    '<svg class="mm-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    flag:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    check:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    award:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
    share:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    moon:     '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun:      '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
  };

  var nav = MAIN.map(function (m) {
    var on = m.id === S;
    return '<a class="mtab' + (on ? ' active' : '') + '" href="' + m.href + '"' +
           (on ? ' aria-current="page"' : '') + '>' + m.label + '</a>';
  }).join('');

  var bar = document.createElement('header');
  bar.className = 'appbar';
  bar.innerHTML =
    '<div class="appbar-inner">' +
      '<a class="brand" href="index.html" aria-label="English Lab home">' +
        '<span class="brand-mark">NS</span>' +
        '<span class="brand-text"><span class="brand-name">English Lab</span><span class="brand-sub">by NS</span></span>' +
      '</a>' +
      '<nav class="mainnav" aria-label="Sections">' + nav + '</nav>' +
      '<div class="appbar-tools">' +
        '<div class="more-menu" id="statsMenu">' +
          '<button class="more-btn" id="statsBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Statistics">' +
            ICON.progress + '<span>Stats</span>' + ICON.caret +
          '</button>' +
          '<div class="more-pop" id="statsPop" role="menu" hidden>' +
            '<a class="more-item" role="menuitem" href="progress.html">' + ICON.progress + '<span>General</span></a>' +
            '<a class="more-item" role="menuitem" href="vocabulary.html?filter=flagged">' + ICON.flag + '<span>Flagged</span></a>' +
            '<a class="more-item" role="menuitem" href="vocabulary.html?filter=known">' + ICON.check + '<span>Known</span></a>' +
            '<a class="more-item" role="menuitem" href="vocabulary.html?filter=hidden">' + ICON.award + '<span>Learned</span></a>' +
          '</div>' +
        '</div>' +
        '<button class="tool-btn" type="button" onclick="openShare()" aria-label="Share this page">' + ICON.share + '</button>' +
        '<button class="tool-btn" type="button" onclick="toggleTheme()" aria-label="Toggle theme">' + ICON.moon + ICON.sun + '</button>' +
        '<span id="syncHost" class="sync-host"></span>' +
      '</div>' +
    '</div>';

  document.body.insertBefore(bar, document.body.firstChild);

  // Stats dropdown (General / Flagged / Known)
  var sb = document.getElementById('statsBtn'), sp = document.getElementById('statsPop');
  if (sb && sp) {
    function closeStats() { sp.hidden = true; sb.setAttribute('aria-expanded', 'false'); }
    function openStats() { sp.hidden = false; sb.setAttribute('aria-expanded', 'true'); }
    sb.addEventListener('click', function (e) { e.stopPropagation(); sp.hidden ? openStats() : closeStats(); });
    document.addEventListener('click', function (e) { if (!e.target.closest('#statsMenu')) closeStats(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeStats(); });
  }
})();

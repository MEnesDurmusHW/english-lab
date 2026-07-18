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
        '<a class="tool-btn' + (S === 'progress' ? ' active' : '') + '" href="progress.html" aria-label="Progress" title="Progress">' + ICON.progress + '</a>' +
        '<button class="tool-btn" type="button" onclick="openShare()" aria-label="Share this page">' + ICON.share + '</button>' +
        '<button class="tool-btn" type="button" onclick="toggleTheme()" aria-label="Toggle theme">' + ICON.moon + ICON.sun + '</button>' +
        '<span id="syncHost" class="sync-host"></span>' +
      '</div>' +
    '</div>';

  document.body.insertBefore(bar, document.body.firstChild);
})();

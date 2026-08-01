(function () {
  var stored = localStorage.getItem('ns-theme');
  var theme;

  if (stored === 'dark' || stored === 'light') {
    theme = stored;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  } else {
    theme = 'light';
  }

  document.documentElement.setAttribute('data-theme', theme);

  // Keep the browser/PWA chrome (address bar, iOS status bar) on the page's
  // own background instead of the system's, since the toggle can disagree
  // with prefers-color-scheme.
  var BG = { light: '#F4F5F8', dark: '#0B0E14' };
  var metaTag = null;
  function paintChrome(t) {
    if (!metaTag) {
      metaTag = document.querySelector('meta[name="theme-color"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'theme-color');
        (document.head || document.documentElement).appendChild(metaTag);
      }
    }
    metaTag.setAttribute('content', BG[t] || BG.light);
  }
  paintChrome(theme);

  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ns-theme', next);
    paintChrome(next);
  };
})();

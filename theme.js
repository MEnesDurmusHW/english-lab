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

  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ns-theme', next);
  };
})();

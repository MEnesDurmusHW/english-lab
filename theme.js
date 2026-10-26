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

  // Touch screens: a tapped element keeps :hover until something else is
  // tapped, and whatever re-renders under the finger inherits it. The button
  // just pressed stays lit, the next quiz option looks pre-picked, and the
  // real selected state reads wrong. Where the main input can't hover, drop
  // every :hover selector, including ones in pages' own <style> blocks.
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
    var splitSel = function (text) {   // commas outside :not(...) / :is(...)
      var out = [], depth = 0, cur = '';
      for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (c === '(') depth++;
        else if (c === ')') depth--;
        if (c === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += c;
      }
      out.push(cur);
      return out;
    };
    var strip = function (owner) {
      var rules;
      try { rules = owner.cssRules; } catch (e) { return; }   // cross-origin (fonts)
      if (!rules) return;
      for (var i = rules.length - 1; i >= 0; i--) {
        var r = rules[i];
        if (r.selectorText === undefined) { if (r.cssRules) strip(r); continue; }   // @media, @supports
        if (r.selectorText.indexOf(':hover') < 0) continue;
        var keep = splitSel(r.selectorText).filter(function (s) { return s.indexOf(':hover') < 0; });
        if (keep.length) r.selectorText = keep.join(',');
        else owner.deleteRule(i);
      }
    };
    var stripAll = function () {
      for (var i = 0; i < document.styleSheets.length; i++) strip(document.styleSheets[i]);
    };
    document.addEventListener('DOMContentLoaded', stripAll);
    window.addEventListener('load', stripAll);
    // stylesheets that finish loading later, and <style> scripts add to <head>
    document.addEventListener('load', function (e) { if (e.target.tagName === 'LINK') stripAll(); }, true);
    if (document.head) new MutationObserver(stripAll).observe(document.head, { childList: true });
  }
})();

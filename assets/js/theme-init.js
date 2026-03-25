(function () {
  var saved = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // Use || not ?? for broad browser compatibility (Safari < 13.1 lacks ??)
  // localStorage.getItem returns null when absent, so || is safe here
  document.documentElement.setAttribute(
    'data-theme',
    saved || (prefersDark ? 'dark' : 'light')
  );
})();

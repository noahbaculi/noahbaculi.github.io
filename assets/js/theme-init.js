(function () {
  var saved = localStorage.getItem("theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  // Use || not ?? for broad browser compatibility (Safari < 13.1 lacks ??)
  // localStorage.getItem returns null when absent, so || is safe here
  document.documentElement.setAttribute(
    "data-theme",
    saved || (prefersDark ? "dark" : "light"),
  );
})();

// Delegated, since this runs in <head> before any toggle button exists
document.addEventListener("click", function (event) {
  if (!event.target.closest(".theme-toggle-btn")) return;
  var root = document.documentElement;
  var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

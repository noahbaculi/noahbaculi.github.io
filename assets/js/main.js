String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
};

const body = document.body;

initMenu();

// Play initial animations on page load.
window.addEventListener("load", function () {
  window.setTimeout(function () {
    body.classList.remove("is-preload");
  }, 100);
});

// Auto-resizing textareas
document.querySelectorAll("form textarea").forEach(function (textarea) {
  const wrapper = document.createElement("div");
  wrapper.className = "textarea-wrapper";
  textarea.parentNode.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);

  textarea.setAttribute("rows", 1);
  textarea.style.overflow = "hidden";
  textarea.style.resize = "none";

  function autoResize() {
    wrapper.style.height = textarea.offsetHeight + "px";
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  textarea.addEventListener("keydown", function (event) {
    if (event.keyCode === 13 && event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      textarea.blur();
    }
  });

  textarea.addEventListener("blur", function () {
    textarea.value = textarea.value.trim();
  });

  textarea.addEventListener("focus", function () {
    textarea.value = textarea.value.trim();
  });

  textarea.addEventListener("input", autoResize);
  textarea.addEventListener("blur", autoResize);
  textarea.addEventListener("focus", autoResize);

  textarea.addEventListener("keyup", function (event) {
    if (event.keyCode === 9) textarea.select();
  });

  // Initial resize
  autoResize();

  // Fix for IE/mobile
  if (browser.name === "ie" || browser.mobile) {
    textarea.style.maxHeight = "10em";
    textarea.style.overflowY = "auto";
  }
});

// Menu functionality
function initMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  let menuLocked = false;

  function lockMenu() {
    if (menuLocked) return false;
    menuLocked = true;
    window.setTimeout(function () {
      menuLocked = false;
    }, 350);
    return true;
  }

  function showMenu() {
    if (lockMenu()) body.classList.add("is-menu-visible");
  }

  function hideMenu() {
    if (lockMenu()) body.classList.remove("is-menu-visible");
  }

  function toggleMenu() {
    if (lockMenu()) body.classList.toggle("is-menu-visible");
  }

  // Menu click handling
  menu.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  menu.addEventListener("click", function (event) {
    const target = event.target.closest("a");
    if (!target) return;

    const href = target.getAttribute("href");
    event.preventDefault();
    event.stopPropagation();

    hideMenu();

    if (href === "#menu") return;

    window.setTimeout(function () {
      window.location.href = href;
    }, 350);
  });

  // Menu toggle button
  document.body.addEventListener("click", function (event) {
    const target = event.target.closest('a[href="#menu"]');
    if (!target) return;

    event.stopPropagation();
    event.preventDefault();
    toggleMenu();
  });

  // Escape key to close menu
  document.body.addEventListener("keydown", function (event) {
    if (event.keyCode === 27) hideMenu();
  });
}

// Image modal
(function initImageModal() {
  const SELECTOR =
    ".image-gallery img, .row--1fr-1fr > .row__media > img, .masonry > img, img.enlargeable";

  document.addEventListener("click", function (event) {
    const target = event.target.closest(SELECTOR);
    if (!target) return;

    const src = target.getAttribute("src");
    if (!src) return;

    const modal = document.createElement("div");
    modal.innerHTML = `<img
      loading="lazy"
      decoding="async"
      src="${src}"
      style="
        max-width: 95vw;
        max-height: 95vh;
        border-radius: 5px;
      "
    />`;

    Object.assign(modal.style, {
      background: "RGBA(0,0,0,0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      position: "fixed",
      zIndex: 10000,
      top: 0,
      left: 0,
      cursor: "zoom-out",
    });

    document.body.appendChild(modal);

    function removeModal() {
      modal.remove();
      document.body.removeEventListener("keyup", handleEscape);
    }

    function handleEscape(e) {
      if (e.key === "Escape") removeModal();
    }

    modal.addEventListener("click", removeModal);
    document.body.addEventListener("keyup", handleEscape);
  });
})();

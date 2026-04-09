String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
};

const body = document.body;

initMenu();
initThemeToggle();

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
    if (event.key === "Enter" && event.ctrlKey) {
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
    if (event.key === "Tab") textarea.select();
  });

  // Initial resize
  autoResize();
});

// Theme toggle
function initThemeToggle() {
  document.querySelectorAll(".theme-toggle-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var current =
        document.documentElement.getAttribute("data-theme") || "light";
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  });
}

// Menu functionality
function initMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  const hamburgerBtn = document.querySelector(".hamburger-btn");
  const closeBtn = menu.querySelector(".menu-close-btn");
  const chevronBtns = menu.querySelectorAll(".menu-chevron-btn");

  function showMenu() {
    body.classList.add("is-menu-visible");
    menu.setAttribute("aria-hidden", "false");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "true");
    autoExpandCurrentSection();
    if (closeBtn) closeBtn.focus();
  }

  function hideMenu() {
    body.classList.remove("is-menu-visible");
    menu.setAttribute("aria-hidden", "true");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
    collapseAllSections();
    if (hamburgerBtn) hamburgerBtn.focus();
  }

  function collapseSection(btn) {
    btn.setAttribute("aria-expanded", "false");
    const sublinks = btn
      .closest(".menu-nav-item--expandable")
      .querySelector(".menu-sublinks");

    if (sublinks.hidden) return;

    sublinks.style.maxHeight = "0";
    sublinks.addEventListener(
      "transitionend",
      function (event) {
        if (event.propertyName !== "max-height") return;
        // Guard: don't hide if section was re-opened during transition
        if (btn.getAttribute("aria-expanded") === "true") return;
        sublinks.hidden = true;
      },
      { once: true },
    );
  }

  function collapseAllSections() {
    chevronBtns.forEach(collapseSection);
  }

  function expandSection(btn) {
    const item = btn.closest(".menu-nav-item--expandable");
    const sublinks = item.querySelector(".menu-sublinks");
    btn.setAttribute("aria-expanded", "true");
    sublinks.style.maxHeight = "0";
    sublinks.hidden = false;
    // Reading scrollHeight forces layout commit at max-height: 0,
    // ensuring a transition plays even on the first expand
    sublinks.style.maxHeight = sublinks.scrollHeight + "px";
  }

  function toggleSection(btn) {
    const isExpanded = btn.getAttribute("aria-expanded") === "true";

    // Collapse all first (accordion behavior)
    collapseAllSections();

    if (!isExpanded) {
      expandSection(btn);
    }
  }

  function autoExpandCurrentSection() {
    chevronBtns.forEach(function (btn) {
      const item = btn.closest(".menu-nav-item--expandable");
      const sublinks = item.querySelector(".menu-sublinks");
      if (sublinks.querySelector(".current-page")) {
        expandSection(btn);
      }
    });
  }

  // Focus trap: Tab cycles through visible interactive elements inside the menu
  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const visible = [...menu.querySelectorAll("button, a[href]")].filter(
      (el) => !el.closest("[hidden]"),
    );
    if (visible.length === 0) return;
    const first = visible[0];
    const last = visible[visible.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  // Hamburger opens menu
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", showMenu);
  }

  // Close button
  if (closeBtn) closeBtn.addEventListener("click", hideMenu);

  // Chevron buttons toggle sub-links
  chevronBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      toggleSection(btn);
    });
  });

  // Escape key closes menu
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && body.classList.contains("is-menu-visible")) {
      hideMenu();
    }
  });

  // Focus trap while menu is open
  menu.addEventListener("keydown", trapFocus);

  // Close menu if viewport resizes into desktop width while menu is open
  const desktopMQ = window.matchMedia("(min-width: 801px)");
  desktopMQ.addEventListener("change", function (event) {
    if (event.matches && body.classList.contains("is-menu-visible")) {
      hideMenu();
    }
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

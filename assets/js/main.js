String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
};

const body = document.body;

/**
 * Asynchronously loads an HTML fragment into the given element.
 */
async function loadSection(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  const response = await fetch(url);
  if (response.ok) {
    el.innerHTML = await response.text();
  }
}

/**
 * Replaces an element with fetched HTML content.
 */
async function replaceWithSection(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  const response = await fetch(url);
  if (response.ok) {
    const html = await response.text();
    el.outerHTML = html;
  }
}

async function initNavbars() {
  try {
    // Always load header
    await loadSection("#headers", "/assets/html/header.html");
    await loadSection("#navbar", "/assets/html/navbar.html");

    // Optionally load subnavbars
    if (window.location.pathname.includes("/hobbies")) {
      await loadSection("#subnavbar", "/assets/html/subnavbar_hobbies.html");
    } else if (window.location.pathname.includes("/professional")) {
      await loadSection(
        "#subnavbar",
        "/assets/html/subnavbar_professional.html",
      );
    }

    await loadSection("#side-menu", "/assets/html/side_menu.html");

    // Move menu to body
    const menu = document.getElementById("menu");
    if (menu) {
      body.appendChild(menu);
    }

    // Finally highlight once
    highlightCurrentPages();

    // Initialize menu after it's loaded
    initMenu();

    // Wire theme toggle buttons
    initThemeToggle();
  } catch (error) {
    console.error("Error loading navigation:", error);
  }
}

function highlightCurrentPages() {
  const crumbs = window.location.pathname.replace(".html", "").split("/");
  crumbs.shift(); // Remove first empty element

  crumbs.forEach((page, idx) => {
    // Only add current-page to 'index' if it's the first element
    if (page === "index" && idx !== 0) return;
    const navBarElements = document.getElementsByClassName(page);
    for (const navBarElement of navBarElements) {
      navBarElement.classList.add("current-page");
    }
  });
}

// Load homepage sections
async function loadHomepageSections() {
  await loadSection("#top_professional", "/assets/html/top_professional.html");
  await replaceWithSection("#top_projects", "/assets/html/top_projects.html");
  await loadSection("#footer", "/assets/html/footer.html");
}

loadHomepageSections();
initNavbars();

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

  // Click outside menu to close
  document.body.addEventListener("click", function () {
    if (body.classList.contains("is-menu-visible")) {
      hideMenu();
    }
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

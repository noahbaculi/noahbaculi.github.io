String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
};

$("#top_professional").load("/assets/html/top_professional.html");
$("#footer").load("/assets/html/footer.html");
$("#independent_projects").load("/assets/html/top_projects.html");

const breadcrumbs = window.location.pathname
  .replace("/", "")
  .replace(".html", "")
  .split("-");

var $window = $(window),
  $body = $("body");

/**
 * Asynchronously loads an HTML fragment into the given element.
 *
 * If the element matching `selector` exists, its content will be replaced
 * with the contents of the file at `url`. The returned Promise resolves
 * when the load succeeds, and rejects if the request fails. If no matching
 * element is found, the Promise resolves immediately with no action taken.
 *
 * @param {string} selector - jQuery selector for the target element.
 * @param {string} url - Path or URL of the HTML file to load.
 * @returns {Promise<void>} Promise that resolves when the section is loaded.
 */
function loadSection(selector, url) {
  return new Promise((resolve, reject) => {
    const $el = $(selector);
    if ($el.length === 0) {
      resolve(); // nothing to do
      return;
    }

    $el.load(url, function (response, status) {
      if (status === "error") {
        reject(new Error(`Failed to load ${url}`));
      } else {
        resolve();
      }
    });
  });
}

async function initNavbars(crumbs) {
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
    $("#menu").appendTo($("body"));

    // Finally highlight once
    highlightCurrentPages(crumbs);
  } catch (error) {
    console.error("Error loading navigation:", error);
  }
}

function highlightCurrentPages(crumbs) {
  for (const page of crumbs) {
    const navBarElements = document.getElementsByClassName(page);
    for (const navBarElement of navBarElements) {
      navBarElement.classList.add("current_page");
    }
  }

  // Stick navbar on scroll
  const navbar = document.getElementById("navbar");
  const stickThreshold = navbar.offsetTop;
  let paddingValue = "0vh";
  window.onscroll = function () {
    stickNavbar();
  };
  function stickNavbar() {
    const main = document.getElementById("main");
    const scroll_down_elements = document.getElementsByClassName("scroll_down"); // home page
    const scroll_down = scroll_down_elements[0]; // home page

    let subnavbar = document.getElementById("subnavbar");

    if (
      (window.pageYOffset >= stickThreshold) &
      window.matchMedia("(min-width: 736px)").matches
    ) {
      navbar.classList.add("sticky");
      if (subnavbar) {
        subnavbar.classList.add("stickysubnavbar");
        paddingValue = "12vh";
      } // only for pages with subnavbars

      if (window.location.pathname.includes("/contact")) {
        paddingValue = "7vh";
      }

      scroll_down.style.visibility = "hidden";

      main.style.paddingTop = paddingValue;
    } else {
      navbar.classList.remove("sticky");
      if (subnavbar) {
        subnavbar.classList.remove("stickysubnavbar");
      } // only for pages with subnavbars

      scroll_down.style.visibility = "visible";
      main.style.paddingTop = "0vh";
    }
  }
}

initNavbars(breadcrumbs);

// Breakpoints.
breakpoints({
  xlarge: ["1281px", "1680px"],
  large: ["981px", "1280px"],
  medium: ["737px", "980px"],
  small: ["481px", "736px"],
  xsmall: ["361px", "480px"],
  xxsmall: [null, "360px"],
});

// Play initial animations on page load.
$window.on("load", function () {
  window.setTimeout(function () {
    $body.removeClass("is-preload");
  }, 100);
});

// Touch?
if (browser.mobile) $body.addClass("is-touch");

// Forms.
var $form = $("form");

// Auto-resizing textareas.
$form.find("textarea").each(function () {
  var $this = $(this),
    $wrapper = $('<div class="textarea-wrapper"></div>'),
    $submits = $this.find('input[type="submit"]');

  $this
    .wrap($wrapper)
    .attr("rows", 1)
    .css("overflow", "hidden")
    .css("resize", "none")
    .on("keydown", function (event) {
      if (event.keyCode == 13 && event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();

        $(this).blur();
      }
    })
    .on("blur focus", function () {
      $this.val($.trim($this.val()));
    })
    .on("input blur focus --init", function () {
      $wrapper.css("height", $this.height());

      $this
        .css("height", "auto")
        .css("height", $this.prop("scrollHeight") + "px");
    })
    .on("keyup", function (event) {
      if (event.keyCode == 9) $this.select();
    })
    .triggerHandler("--init");

  // Fix.
  if (browser.name == "ie" || browser.mobile)
    $this.css("max-height", "10em").css("overflow-y", "auto");
});

// Menu.
var $menu = $("#menu");

$menu._locked = false;

$menu._lock = function () {
  if ($menu._locked) return false;

  $menu._locked = true;

  window.setTimeout(function () {
    $menu._locked = false;
  }, 350);

  return true;
};

$menu._show = function () {
  if ($menu._lock()) $body.addClass("is-menu-visible");
};

$menu._hide = function () {
  if ($menu._lock()) $body.removeClass("is-menu-visible");
};

$menu._toggle = function () {
  if ($menu._lock()) $body.toggleClass("is-menu-visible");
};

$menu
  .appendTo($body)
  .on("click", function (event) {
    event.stopPropagation();
  })
  .on("click", "a", function (event) {
    var href = $(this).attr("href");

    event.preventDefault();
    event.stopPropagation();

    // Hide.
    $menu._hide();

    // Redirect.
    if (href == "#menu") return;

    window.setTimeout(function () {
      window.location.href = href;
    }, 350);
  });

$body
  .on("click", 'a[href="#menu"]', function (event) {
    event.stopPropagation();
    event.preventDefault();
    // Toggle.
    $menu._toggle();
  })
  // .on('click', function (event) {
  // 	// Hide.
  // 	$menu._hide();
  // })
  .on("keydown", function (event) {
    // Hide on escape.
    if (event.keyCode == 27) $menu._hide();
  });

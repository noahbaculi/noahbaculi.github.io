String.prototype.toProperCase = function () {
	return this.replace(/\w\S*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
	});
};

const breadcrumbs = window.location.pathname.replace("/", "").replace(".html", "").split("-");

if (window.location.pathname == "/" || window.location.pathname.includes("/index")) {
	$.get("./_header_html.html", null, function (text) {
		const HTML = new DOMParser().parseFromString(text, "text/html");
		const navbarHTML = HTML.getElementById("navbar").innerHTML;
		document.getElementById("navbar").innerHTML = navbarHTML;

		const menuButtonHTML = HTML.getElementById("header").innerHTML;
		document.getElementById("header").innerHTML = menuButtonHTML;

		const menuHTML = HTML.getElementById("menu").innerHTML;
		document.getElementById("menu").innerHTML = menuHTML;

		onNavbarsLoad(["index"]);
	});
}

// Load template HTML sections
$("#headers").load("./_header_html.html", null, function () {
	// Callback code to be executed once HTML is loaded ▼

	// Insert sub nav bars and highlight current pages once loaded
	if (window.location.pathname.includes("/about")) {
		$("#subnavbars").load("./_about_subnavbar.html", null, onNavbarsLoad);
	} else if (window.location.pathname.includes("/portfolio")) {
		$("#subnavbars").load("./_portfolio_subnavbar.html", null, onNavbarsLoad);
	} else {
		onNavbarsLoad();
	}

	// Add the side menu to the bottom of the body tag, outside of the wrapper div to avoid opacity change issues
	$("#menu").appendTo($body);
});

$("#top_portfolio").load("./_top_portfolio.html");
$("#footer").load("./_footer.html");
$("#independent_projects").load("./_independent_projects.html");

function onNavbarsLoad(crumbs = null) {
	// Highlight current pages
	if (typeof crumbs != Array) {
		crumbs = breadcrumbs;
	}

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

		if ((window.pageYOffset >= stickThreshold) & window.matchMedia("(min-width: 736px)").matches) {
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

var $window = $(window),
	$body = $("body");

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

			$this.css("height", "auto").css("height", $this.prop("scrollHeight") + "px");
		})
		.on("keyup", function (event) {
			if (event.keyCode == 9) $this.select();
		})
		.triggerHandler("--init");

	// Fix.
	if (browser.name == "ie" || browser.mobile) $this.css("max-height", "10em").css("overflow-y", "auto");
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

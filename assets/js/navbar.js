// Add Nav Bars
$("#navbar").load("assets/html/navbar.html")
$("#portfolio_subnavbar").load("assets/html/portfolio_subnavbar.html")
$("#about_subnavbar").load("assets/html/about_subnavbar.html")


// Highlight Current Nav Bar Page
function highlightNavBars(pages) {
	for (const page of pages){
		const navBarElement = document.getElementById(page);
		navBarElement.classList.add("current_page");
	}
}

// Stick Nav Bar On Scroll
window.onscroll = function () { stickNavbar() };
const stickThreshold = navbar.offsetTop;
function stickNavbar() {
	const navbar = document.getElementById("navbar");
	const scroll_down_elements = document.getElementsByClassName("scroll_down");  // home page
	const scroll_down = scroll_down_elements[0];  // home page
	
	
	let subnavbar = document.getElementById("portfolio_subnavbar");
	if (!subnavbar) {subnavbar = document.getElementById("about_subnavbar");};
	const main = document.getElementById("main");

	console.log(subnavbar)
	

	if (window.pageYOffset >= stickThreshold) {
		navbar.classList.add("sticky")
		if (subnavbar) {subnavbar.classList.add("stickysubnavbar");};  // only for pages with subnavbars

		scroll_down.style.visibility = "hidden";
		main.classList.add("page_scroll_down_top_padding");


	} else {
		navbar.classList.remove("sticky");
		if (subnavbar) {subnavbar.classList.remove("stickysubnavbar");};  // only for pages with subnavbars

		scroll_down.style.visibility = "visible";
		main.classList.remove("page_scroll_down_top_padding");
	}
}

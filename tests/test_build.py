import pathlib
import importlib.util
from bs4 import BeautifulSoup

# Load build.py as a module
spec = importlib.util.spec_from_file_location("build", pathlib.Path(__file__).parent.parent / "build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def test_copy_static_assets(tmp_path):
    """Static asset dirs are copied verbatim to _site."""
    src = tmp_path / "src"
    out = tmp_path / "_site"
    (src / "assets" / "css").mkdir(parents=True)
    (src / "assets" / "css" / "main.css").write_text("body {}")
    (src / "images").mkdir()
    (src / "images" / "photo.webp").write_bytes(b"fake")

    build.copy_static_assets(src_dir=src, out_dir=out)

    assert (out / "assets" / "css" / "main.css").read_text() == "body {}"
    assert (out / "images" / "photo.webp").exists()


def test_get_source_html_files(tmp_path):
    """Discovers page HTML files, excluding partials and node_modules."""
    (tmp_path / "index.html").write_text("<html></html>")
    (tmp_path / "contact.html").write_text("<html></html>")
    (tmp_path / "professional").mkdir()
    (tmp_path / "professional" / "enterprisedb.html").write_text("<html></html>")
    (tmp_path / "assets" / "html").mkdir(parents=True)
    (tmp_path / "assets" / "html" / "navbar.html").write_text("<ul></ul>")
    (tmp_path / "node_modules" / "pkg").mkdir(parents=True)
    (tmp_path / "node_modules" / "pkg" / "index.html").write_text("<html></html>")

    files = build.get_source_html_files(src_dir=tmp_path)
    rel = {f.relative_to(tmp_path) for f in files}

    assert pathlib.Path("index.html") in rel
    assert pathlib.Path("contact.html") in rel
    assert pathlib.Path("professional/enterprisedb.html") in rel
    assert pathlib.Path("assets/html/navbar.html") not in rel
    assert not any("node_modules" in str(p) for p in rel)


def test_load_partial():
    """load_partial returns BeautifulSoup with partial content."""
    result = build.load_partial("footer.html")
    assert result.find("head") is None
    assert result.find("div") is not None


def test_inject_partials_injects_navbar():
    """inject_partials replaces #navbar placeholder with navbar content."""
    html = """<!doctype html><html><body>
        <div id="headers"></div>
        <div id="navbar" class="desktop-only"></div>
        <div id="mobile-menu"></div>
        <footer id="footer"></footer>
    </body></html>"""

    result = build.inject_partials(html, pathlib.Path("index.html"))
    soup = BeautifulSoup(result, "html.parser")

    navbar_div = soup.find(id="navbar")
    # After injection the div should have child content (the nav ul)
    assert navbar_div is not None
    assert navbar_div.find("ul") is not None


def test_inject_partials_professional_subnavbar():
    """Professional pages get the professional subnavbar."""
    html = """<!doctype html><html><body>
        <div id="headers"></div>
        <div id="navbar"></div>
        <div id="subnavbar" class="desktop-only"></div>
        <div id="mobile-menu"></div>
        <footer id="footer"></footer>
    </body></html>"""

    result = build.inject_partials(html, pathlib.Path("professional/enterprisedb.html"))
    soup = BeautifulSoup(result, "html.parser")
    subnavbar = soup.find(id="subnavbar")
    assert subnavbar is not None
    assert subnavbar.get_text()  # has content


def test_highlight_nav_homepage():
    """index.html highlights the 'index' nav link."""
    html = """<!doctype html><html><body>
        <div id="navbar"><ul>
            <li><a href="/index.html" class="index">Home</a></li>
            <li><a href="/professional/index.html" class="professional">Pro</a></li>
        </ul></div>
        <div id="mobile-menu"></div>
        <footer id="footer"></footer>
    </body></html>"""

    result = build.inject_partials(html, pathlib.Path("index.html"))
    soup = BeautifulSoup(result, "html.parser")

    index_link = soup.find(class_="index")
    assert "current-page" in index_link.get("class", [])
    pro_link = soup.find(class_="professional")
    assert "current-page" not in pro_link.get("class", [])


def test_highlight_nav_professional_page():
    """professional/enterprisedb.html highlights 'professional' and 'enterprisedb'."""
    html = """<!doctype html><html><body>
        <div id="navbar"><ul>
            <li><a href="/index.html" class="index">Home</a></li>
            <li><a href="/professional/index.html" class="professional">Pro</a></li>
        </ul></div>
        <div id="mobile-menu"><nav id="menu"><ul>
            <li><a href="/professional/enterprisedb.html" class="enterprisedb">EDB</a></li>
        </ul></nav></div>
        <footer id="footer"></footer>
    </body></html>"""

    result = build.inject_partials(html, pathlib.Path("professional/enterprisedb.html"))
    soup = BeautifulSoup(result, "html.parser")

    pro_link = soup.find(class_="professional")
    assert "current-page" in pro_link.get("class", [])
    edb_link = soup.find(class_="enterprisedb")
    assert "current-page" in edb_link.get("class", [])


def test_highlight_nav_professional_index():
    """professional/index.html highlights 'professional' but not 'index'."""
    html = """<!doctype html><html><body>
        <div id="navbar"><ul>
            <li><a href="/index.html" class="index">Home</a></li>
            <li><a href="/professional/index.html" class="professional">Pro</a></li>
        </ul></div>
        <div id="mobile-menu"></div>
        <footer id="footer"></footer>
    </body></html>"""

    result = build.inject_partials(html, pathlib.Path("professional/index.html"))
    soup = BeautifulSoup(result, "html.parser")

    pro_link = soup.find(class_="professional")
    assert "current-page" in pro_link.get("class", [])
    index_link = soup.find(class_="index")
    assert "current-page" not in index_link.get("class", [])


def test_build_minifies_html_in_prod(tmp_path):
    """Prod build (minify=True) strips unnecessary whitespace from HTML output."""
    src = tmp_path / "src"
    src.mkdir()
    out = tmp_path / "_site"
    (src / "assets" / "html").mkdir(parents=True)

    # Write minimal partials
    for name in ["header.html", "navbar.html", "mobile_menu.html", "footer.html"]:
        (src / "assets" / "html" / name).write_text("<div>x</div>")

    (src / "index.html").write_text(
        "<!doctype html>\n<html>\n  <body>\n    <p>   hello   </p>\n  </body>\n</html>"
    )

    build.build(minify=True, src_dir=src, out_dir=out)

    output = (out / "index.html").read_text()
    # Minified output should not have the original multi-line indentation
    assert "  <body>" not in output


def test_build_does_not_minify_in_dev(tmp_path):
    """Dev build (minify=False) writes non-minified HTML."""
    src = tmp_path / "src"
    src.mkdir()
    out = tmp_path / "_site"
    (src / "assets" / "html").mkdir(parents=True)

    for name in ["header.html", "navbar.html", "mobile_menu.html", "footer.html"]:
        (src / "assets" / "html" / name).write_text("<div>x</div>")

    content = "<!doctype html>\n<html>\n  <body>\n    <p>   hello   </p>\n  </body>\n</html>"
    (src / "index.html").write_text(content)

    build.build(minify=False, src_dir=src, out_dir=out)

    output = (out / "index.html").read_text()
    # Should still have the multi-line structure (not minified)
    assert "\n" in output


def test_minify_text_assets(tmp_path):
    """minify=True minifies external CSS and JS files."""
    src = tmp_path / "src"
    out = tmp_path / "_site"
    (src / "assets" / "html").mkdir(parents=True)
    (src / "assets" / "css").mkdir(parents=True)
    (src / "assets" / "js").mkdir(parents=True)

    for name in ["header.html", "navbar.html", "mobile_menu.html", "footer.html"]:
        (src / "assets" / "html" / name).write_text("<div>x</div>")

    (src / "assets" / "css" / "main.css").write_text("body  {  color:  red;  }\n\n")
    (src / "assets" / "js" / "main.js").write_text("var x  =  1 ;\n\n")
    (src / "index.html").write_text("<!doctype html><html><body></body></html>")

    build.build(minify=True, src_dir=src, out_dir=out)

    css = (out / "assets" / "css" / "main.css").read_text()
    js = (out / "assets" / "js" / "main.js").read_text()
    assert "  " not in css
    assert css.strip().endswith("}")
    assert "\n\n" not in js


def test_build_clean_false_preserves_extra_files(tmp_path):
    """build(clean=False) overwrites output but doesn't delete pre-existing files."""
    src = tmp_path / "src"
    src.mkdir()
    out = tmp_path / "_site"
    out.mkdir()
    (src / "assets" / "html").mkdir(parents=True)

    for name in ["header.html", "navbar.html", "mobile_menu.html", "footer.html"]:
        (src / "assets" / "html" / name).write_text("<div>x</div>")

    (src / "index.html").write_text("<!doctype html><html><body></body></html>")

    # Pre-existing file in output that should survive clean=False
    (out / "survivor.txt").write_text("I should survive")

    build.build(minify=False, clean=False, src_dir=src, out_dir=out)

    assert (out / "index.html").exists()
    assert (out / "survivor.txt").read_text() == "I should survive"


def test_render_html_file(tmp_path):
    """render_html_file renders a single page with partials injected."""
    src = tmp_path / "src"
    out = tmp_path / "_site"
    out.mkdir()
    (src / "assets" / "html").mkdir(parents=True)

    for name in ["header.html", "navbar.html", "mobile_menu.html", "footer.html"]:
        (src / "assets" / "html" / name).write_text("<div>x</div>")

    page = src / "index.html"
    page.write_text(
        '<!doctype html><html><body><div id="navbar"></div></body></html>'
    )

    partials_dir = src / "assets" / "html"
    cache = {
        name: (partials_dir / name).read_text()
        for name in build.PARTIAL_NAMES
        if (partials_dir / name).exists()
    }

    build.render_html_file(
        src_file=page,
        src_dir=src,
        out_dir=out,
        partials_dir=partials_dir,
        cache=cache,
        minify=False,
    )

    output = (out / "index.html").read_text()
    soup = BeautifulSoup(output, "html.parser")
    assert soup.find(id="navbar").find("div") is not None


def test_copy_changed_asset(tmp_path):
    """copy_changed_asset copies a single file preserving relative path."""
    src = tmp_path / "src"
    out = tmp_path / "_site"
    out.mkdir()
    (src / "assets" / "css").mkdir(parents=True)
    css_file = src / "assets" / "css" / "main.css"
    css_file.write_text("body { color: red; }")

    build.copy_changed_asset(src_file=css_file, src_dir=src, out_dir=out)

    assert (out / "assets" / "css" / "main.css").read_text() == "body { color: red; }"


def test_copy_changed_asset_with_minify_css(tmp_path):
    """copy_changed_asset minifies CSS when minify=True."""
    src = tmp_path / "src"
    out = tmp_path / "_site"
    out.mkdir()
    (src / "assets" / "css").mkdir(parents=True)
    css_file = src / "assets" / "css" / "main.css"
    css_file.write_text("body  {  color:  red;  }\n\n")

    build.copy_changed_asset(src_file=css_file, src_dir=src, out_dir=out, minify=True)

    output = (out / "assets" / "css" / "main.css").read_text()
    assert "  " not in output


def test_copy_changed_asset_with_minify_js(tmp_path):
    """copy_changed_asset minifies JS when minify=True."""
    src = tmp_path / "src"
    out = tmp_path / "_site"
    out.mkdir()
    (src / "assets" / "js").mkdir(parents=True)
    js_file = src / "assets" / "js" / "main.js"
    js_file.write_text("var x  =  1 ;\n\n")

    build.copy_changed_asset(src_file=js_file, src_dir=src, out_dir=out, minify=True)

    output = (out / "assets" / "js" / "main.js").read_text()
    assert "\n\n" not in output

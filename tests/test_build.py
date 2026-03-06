import pathlib
import shutil
import tempfile
import pytest
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
        <div id="side-menu"></div>
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
        <div id="side-menu"></div>
        <footer id="footer"></footer>
    </body></html>"""

    result = build.inject_partials(html, pathlib.Path("professional/enterprisedb.html"))
    soup = BeautifulSoup(result, "html.parser")
    subnavbar = soup.find(id="subnavbar")
    assert subnavbar is not None
    assert subnavbar.get_text()  # has content

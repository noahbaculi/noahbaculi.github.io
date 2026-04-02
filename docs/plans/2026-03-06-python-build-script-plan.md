# Python Build Script Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace runtime `fetch()`-based partial loading with a Python build script that pre-renders partials at build time, minifies HTML for prod, and provides live reload for dev.

**Architecture:** `build.py` at repo root reads source HTML files, uses BeautifulSoup to find placeholder elements by ID and replace them with content from `assets/html/` partials, then writes output to `_site/`. Active nav highlighting (currently done by `highlightCurrentPages()` in JS at runtime) is replicated at build time using the file path. Static assets are copied verbatim.

**Tech Stack:** Python 3.13, `beautifulsoup4` (HTML parsing/injection), `minify-html` (Rust-backed HTML minifier), `livereload` (dev server + file watcher), `uv` (dependency management)

---

### Task 1: Add dependencies, update config files

**Files:**
- Modify: `pyproject.toml`
- Modify: `.gitignore`
- Modify: `netlify.toml`

**Step 1: Add Python dependencies to pyproject.toml**

Replace the `dependencies` list:

```toml
dependencies = [
    "pillow>=11.3.0",
    "beautifulsoup4>=4.13",
    "minify-html>=0.15",
    "livereload>=2.7",
]
```

**Step 2: Sync dependencies**

```bash
uv sync
```

Expected: lockfile updates, packages install with no errors.

**Step 3: Add _site to .gitignore**

Append to `.gitignore`:

```
/_site
```

**Step 4: Add build config to netlify.toml**

Add before the existing `[[plugins]]` block:

```toml
[build]
command = "pip install uv && uv run python build.py"
publish = "_site"
```

**Step 5: Commit**

```bash
git add pyproject.toml uv.lock .gitignore netlify.toml
git commit -m "feat: add build script dependencies and config"
```

---

### Task 2: Create build.py — core structure and static asset copying

**Files:**
- Create: `build.py`
- Create: `tests/test_build.py`

**Step 1: Write the failing test**

```python
# tests/test_build.py
import pathlib
import shutil
import tempfile
import pytest
import importlib.util

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
```

**Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_build.py::test_copy_static_assets -v
```

Expected: FAIL — `build.py` does not exist yet.

**Step 3: Create build.py with static copy**

```python
#!/usr/bin/env python3
"""Build script for noahbaculi.github.io.

Dev:  uv run python build.py --watch
Prod: uv run python build.py
"""
import argparse
import pathlib
import shutil

REPO_ROOT = pathlib.Path(__file__).parent
SRC_DIR = REPO_ROOT
PARTIALS_DIR = SRC_DIR / "assets" / "html"
OUT_DIR = REPO_ROOT / "_site"

STATIC_ASSETS = [
    "assets",
    "images",
    "app",
    "family_tree.json",
    "_redirects",
    "robots.txt",
    "sitemap.xml",
]

EXCLUDED_DIRS = {"_site", "node_modules", ".venv", ".git", "public", "tests",
                 "images", "docs", "_data"}


def copy_static_assets(src_dir: pathlib.Path = SRC_DIR,
                       out_dir: pathlib.Path = OUT_DIR) -> None:
    """Copy static asset directories and files verbatim to out_dir."""
    for name in STATIC_ASSETS:
        src = src_dir / name
        dst = out_dir / name
        if not src.exists():
            continue
        if src.is_dir():
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)


def build(minify: bool = True,
          src_dir: pathlib.Path = SRC_DIR,
          out_dir: pathlib.Path = OUT_DIR) -> None:
    """Run a full build."""
    out_dir.mkdir(exist_ok=True)
    copy_static_assets(src_dir=src_dir, out_dir=out_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build noahbaculi.github.io")
    parser.add_argument("--watch", action="store_true",
                        help="Start dev server with live reload (no minification)")
    args = parser.parse_args()

    if args.watch:
        build(minify=False)
    else:
        build(minify=True)


if __name__ == "__main__":
    main()
```

**Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_build.py::test_copy_static_assets -v
```

Expected: PASS

**Step 5: Smoke-test manually**

```bash
uv run python build.py
ls _site/
```

Expected: `_site/assets/`, `_site/images/`, etc. present.

**Step 6: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat: add build.py with static asset copying"
```

---

### Task 3: Add HTML file discovery

**Files:**
- Modify: `build.py`
- Modify: `tests/test_build.py`

**Step 1: Write the failing test**

```python
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
```

**Step 2: Run to verify it fails**

```bash
uv run pytest tests/test_build.py::test_get_source_html_files -v
```

Expected: FAIL — `get_source_html_files` not defined.

**Step 3: Add function to build.py**

Add after `EXCLUDED_DIRS`:

```python
def get_source_html_files(src_dir: pathlib.Path = SRC_DIR) -> list[pathlib.Path]:
    """Return all page HTML files, excluding partials and generated dirs."""
    files = []
    for path in src_dir.rglob("*.html"):
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        # Exclude assets/html partials
        if path.is_relative_to(src_dir / "assets" / "html"):
            continue
        files.append(path)
    return files
```

**Step 4: Run to verify it passes**

```bash
uv run pytest tests/test_build.py::test_get_source_html_files -v
```

Expected: PASS

**Step 5: Wire into build() — copy HTML files to _site without injection yet**

In `build()`, after `copy_static_assets(...)`:

```python
    for src_file in get_source_html_files(src_dir=src_dir):
        rel = src_file.relative_to(src_dir)
        dst = out_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(src_file.read_text())
```

**Step 6: Run all tests and smoke-test**

```bash
uv run pytest tests/test_build.py -v
uv run python build.py
ls _site/
```

Expected: tests pass; `_site/index.html`, `_site/professional/enterprisedb.html`, etc. present.

**Step 7: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat: add HTML file discovery and copy to build"
```

---

### Task 4: Add partial loading with head-stripping

**Files:**
- Modify: `build.py`
- Modify: `tests/test_build.py`

**Background:** Every partial in `assets/html/` begins with `<head><meta name="robots" content="noindex" /></head>` to prevent the raw fragment from being indexed. This must be stripped before injection.

**Step 1: Write the failing test**

```python
def test_load_partial_strips_head():
    """load_partial returns BeautifulSoup with <head> removed."""
    result = build.load_partial("footer.html")
    assert result.find("head") is None
    # Footer has actual content
    assert result.find("div") is not None
```

**Step 2: Run to verify it fails**

```bash
uv run pytest tests/test_build.py::test_load_partial_strips_head -v
```

Expected: FAIL

**Step 3: Add load_partial to build.py**

Add after imports:

```python
from bs4 import BeautifulSoup
```

Add function:

```python
def load_partial(name: str,
                 partials_dir: pathlib.Path = PARTIALS_DIR) -> BeautifulSoup:
    """Load a partial HTML file, stripping the noindex <head> block."""
    html = (partials_dir / name).read_text()
    soup = BeautifulSoup(html, "html.parser")
    for head in soup.find_all("head"):
        head.decompose()
    return soup
```

**Step 4: Run to verify it passes**

```bash
uv run pytest tests/test_build.py::test_load_partial_strips_head -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat: add partial loader with head-stripping"
```

---

### Task 5: Add partial injection

**Files:**
- Modify: `build.py`
- Modify: `tests/test_build.py`

**Background:** Each source page has placeholder elements filled by ID:

| Placeholder | Partial | Notes |
|---|---|---|
| `<div id="headers">` | `header.html` | always |
| `<div id="navbar">` | `navbar.html` | always |
| `<div id="subnavbar">` | `subnavbar_professional.html` or `subnavbar_hobbies.html` | by section |
| `<div id="side-menu">` | `side_menu.html` | always |
| `<footer id="footer">` | `footer.html` | always |
| `<div id="top_professional">` | `top_professional.html` | homepage only |
| `<placeholder id="top_projects">` | `top_projects.html` | homepage, replace outer element |

`top_projects` uses `replace_with()` (outer element replaced) because the source uses a `<placeholder>` tag.

**Step 1: Write the failing test**

```python
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
```

**Step 2: Run to verify they fail**

```bash
uv run pytest tests/test_build.py::test_inject_partials_injects_navbar tests/test_build.py::test_inject_partials_professional_subnavbar -v
```

Expected: FAIL

**Step 3: Add inject_partials to build.py**

```python
def inject_partials(html: str,
                    rel_path: pathlib.Path,
                    partials_dir: pathlib.Path = PARTIALS_DIR) -> str:
    """Inject partials into a page's HTML by replacing placeholder elements."""
    soup = BeautifulSoup(html, "html.parser")
    section = rel_path.parts[0] if len(rel_path.parts) > 1 else ""

    def _inject(element_id: str, partial_name: str) -> None:
        el = soup.find(id=element_id)
        if el is None:
            return
        partial = load_partial(partial_name, partials_dir)
        el.clear()
        for child in list(partial.children):
            el.append(child.__copy__())

    def _replace(element_id: str, partial_name: str) -> None:
        """Replace the element's outer HTML (for <placeholder> tags)."""
        el = soup.find(id=element_id)
        if el is None:
            return
        partial = load_partial(partial_name, partials_dir)
        el.replace_with(partial)

    _inject("headers", "header.html")
    _inject("navbar", "navbar.html")
    _inject("side-menu", "side_menu.html")
    _inject("footer", "footer.html")
    _inject("top_professional", "top_professional.html")
    _replace("top_projects", "top_projects.html")

    if section == "professional":
        _inject("subnavbar", "subnavbar_professional.html")
    elif section == "hobbies":
        _inject("subnavbar", "subnavbar_hobbies.html")

    return str(soup)
```

**Step 4: Wire into build() — replace the plain copy with injection**

Replace the HTML loop in `build()`:

```python
    for src_file in get_source_html_files(src_dir=src_dir):
        rel = src_file.relative_to(src_dir)
        dst = out_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        html = src_file.read_text()
        html = inject_partials(html, rel, partials_dir=src_dir / "assets" / "html")
        dst.write_text(html)
```

**Step 5: Run all tests**

```bash
uv run pytest tests/test_build.py -v
```

Expected: all PASS

**Step 6: Smoke-test visually**

```bash
uv run python build.py
# Open _site/professional/enterprisedb.html in browser or check with grep
grep -c "desktop-only" _site/professional/enterprisedb.html
```

Expected: navbar content is present (the `<ul>` with nav links).

**Step 7: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat: inject partials into HTML pages at build time"
```

---

### Task 6: Add active nav and subnavbar highlighting

**Files:**
- Modify: `build.py`
- Modify: `tests/test_build.py`

**Background:** `highlightCurrentPages()` in main.js adds `current-page` class to elements whose class matches path segments. For `/professional/enterprisedb.html`, it adds `current-page` to elements with class `professional` and class `enterprisedb`. For `/professional/index.html`, it adds `current-page` only to `professional` (skips `index` when not the first segment). Same logic applies for subnavbar links and side menu links — they use the same class-name convention.

**Step 1: Write the failing tests**

```python
def test_highlight_nav_homepage():
    """index.html highlights the 'index' nav link."""
    html = """<!doctype html><html><body>
        <div id="navbar"><ul>
            <li><a href="/index.html" class="index">Home</a></li>
            <li><a href="/professional/index.html" class="professional">Pro</a></li>
        </ul></div>
        <div id="side-menu"></div>
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
        <div id="side-menu"><nav id="menu"><ul>
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
        <div id="side-menu"></div>
        <footer id="footer"></footer>
    </body></html>"""

    result = build.inject_partials(html, pathlib.Path("professional/index.html"))
    soup = BeautifulSoup(result, "html.parser")

    pro_link = soup.find(class_="professional")
    assert "current-page" in pro_link.get("class", [])
    index_link = soup.find(class_="index")
    assert "current-page" not in index_link.get("class", [])
```

**Step 2: Run to verify they fail**

```bash
uv run pytest tests/test_build.py::test_highlight_nav_homepage tests/test_build.py::test_highlight_nav_professional_page tests/test_build.py::test_highlight_nav_professional_index -v
```

Expected: FAIL

**Step 3: Add highlight_current_pages and wire into inject_partials**

Add function:

```python
def highlight_current_pages(soup: BeautifulSoup, rel_path: pathlib.Path) -> None:
    """Add current-page class to nav elements matching the current path.

    Replicates the runtime highlightCurrentPages() JS function logic.
    For /professional/index.html -> highlights 'professional' only.
    For /professional/enterprisedb.html -> highlights 'professional' and 'enterprisedb'.
    For /index.html -> highlights 'index'.
    """
    crumbs = list(rel_path.with_suffix("").parts)

    for idx, crumb in enumerate(crumbs):
        # Skip 'index' unless it's the only/first crumb
        if crumb == "index" and idx != 0:
            continue
        for el in soup.find_all(class_=crumb):
            classes = el.get("class", [])
            if "current-page" not in classes:
                el["class"] = classes + ["current-page"]
```

In `inject_partials`, add a call to `highlight_current_pages(soup, rel_path)` after all `_inject` / `_replace` calls, before `return str(soup)`.

**Step 4: Run all tests**

```bash
uv run pytest tests/test_build.py -v
```

Expected: all PASS

**Step 5: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat: add build-time nav highlighting"
```

---

### Task 7: Add HTML minification for prod builds

**Files:**
- Modify: `build.py`
- Modify: `tests/test_build.py`

**Step 1: Write the failing test**

```python
def test_build_minifies_html_in_prod(tmp_path):
    """Prod build (minify=True) strips unnecessary whitespace from HTML output."""
    src = tmp_path / "src"
    src.mkdir()
    out = tmp_path / "_site"
    (src / "assets" / "html").mkdir(parents=True)

    # Write minimal partials
    for name in ["header.html", "navbar.html", "side_menu.html", "footer.html"]:
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

    for name in ["header.html", "navbar.html", "side_menu.html", "footer.html"]:
        (src / "assets" / "html" / name).write_text("<div>x</div>")

    content = "<!doctype html>\n<html>\n  <body>\n    <p>   hello   </p>\n  </body>\n</html>"
    (src / "index.html").write_text(content)

    build.build(minify=False, src_dir=src, out_dir=out)

    output = (out / "index.html").read_text()
    # Should still have the multi-line structure (not minified)
    assert "\n" in output
```

**Step 2: Run to verify they fail**

```bash
uv run pytest tests/test_build.py::test_build_minifies_html_in_prod tests/test_build.py::test_build_does_not_minify_in_dev -v
```

Expected: FAIL

**Step 3: Add minification to build()**

Add import at top:

```python
import minify_html
```

In `build()`, replace the `dst.write_text(html)` line:

```python
        if minify:
            html = minify_html.minify(html, minify_js=False, minify_css=False)
        dst.write_text(html)
```

**Step 4: Run all tests**

```bash
uv run pytest tests/test_build.py -v
```

Expected: all PASS

**Step 5: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat: add HTML minification for prod builds"
```

---

### Task 8: Add dev watch mode with live reload

**Files:**
- Modify: `build.py`

No automated test for live reload — verify manually.

**Step 1: Add watch() to build.py**

```python
def watch(src_dir: pathlib.Path = SRC_DIR,
          out_dir: pathlib.Path = OUT_DIR) -> None:
    """Run a dev build then start a live reload server watching for changes."""
    from livereload import Server

    def rebuild() -> None:
        print("Rebuilding...")
        build(minify=False, src_dir=src_dir, out_dir=out_dir)
        print("Done.")

    rebuild()

    server = Server()

    # Watch all source HTML files
    for f in get_source_html_files(src_dir=src_dir):
        server.watch(str(f), rebuild)

    # Watch all partials
    for f in (src_dir / "assets" / "html").glob("*.html"):
        server.watch(str(f), rebuild)

    # Watch CSS
    for f in (src_dir / "assets" / "css").rglob("*.css"):
        server.watch(str(f), rebuild)

    server.serve(root=str(out_dir), port=8080, open_url_delay=1)
```

**Step 2: Wire --watch into main()**

Replace the `if args.watch:` block:

```python
    if args.watch:
        watch()
    else:
        build(minify=True)
```

**Step 3: Manual verification**

```bash
uv run python build.py --watch
```

Expected: Server starts at `http://localhost:8080`. Open in browser, edit a source file, verify browser reloads automatically.

**Step 4: Commit**

```bash
git add build.py
git commit -m "feat: add dev watch mode with live reload"
```

---

### Task 9: Clean up main.js

**Files:**
- Modify: `assets/js/main.js`

**Background:** With partials pre-rendered at build time, the following are no longer needed:
- `loadSection()` (lines 12–20)
- `replaceWithSection()` (lines 25–34)
- `initNavbars()` (lines 36–68) — includes the `body.appendChild(menu)` call
- `highlightCurrentPages()` (lines 70–82)
- `loadHomepageSections()` (lines 85–89)
- Module-level calls: `loadHomepageSections()` and `initNavbars()` (lines 91–92)

`initMenu()` must be called directly since it's no longer called from `initNavbars()`.

**Step 1: Remove the fetch-based functions and add direct initMenu() call**

Remove lines 12–92 (everything from `loadSection` through `initNavbars()` call).

Replace with a direct call at module level where the two call sites were:

```javascript
initMenu();
```

The remaining `main.js` should be (in order):
1. `String.prototype.toProperCase`
2. `const body = document.body`
3. `initMenu()` call (new, replaces the two old call sites)
4. `window.addEventListener("load", ...)` (preload animation)
5. Auto-resizing textareas block
6. `function initMenu() { ... }` definition
7. Image modal IIFE

**Step 2: Verify the build output works**

```bash
uv run python build.py --watch
```

Open `http://localhost:8080` in browser. Verify:
- Nav appears immediately (no flash of empty nav)
- Hamburger menu opens/closes
- Current page is highlighted in nav
- Homepage shows professional snapshot and projects snapshot

**Step 3: Commit**

```bash
git add assets/js/main.js
git commit -m "feat: remove runtime fetch calls from main.js"
```

---

### Task 10: Update README and verify full workflow

**Files:**
- Modify: `README.md`

**Step 1: Update the dev workflow section**

Replace:

```shell
bunx live-server
```

With:

```shell
uv run python build.py --watch
```

Add a prod build entry:

```shell
uv run python build.py
```

**Step 2: Run full test suite**

```bash
uv run pytest tests/ -v
```

Expected: all tests pass.

**Step 3: Run a prod build and spot-check output**

```bash
uv run python build.py
wc -c _site/index.html _site/professional/enterprisedb.html
```

Expected: files are present and reasonably sized (minification reduces size vs source).

**Step 4: Check nav highlighting across pages**

Open `_site/index.html` — "Home" link should have `current-page` class.
Open `_site/professional/index.html` — "Professional" link should have `current-page`.
Open `_site/hobbies/music.html` — "Hobbies" and "music" links should have `current-page`.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update dev workflow for Python build script"
```

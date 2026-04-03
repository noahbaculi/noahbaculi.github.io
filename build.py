#!/usr/bin/env python3
"""Build script for noahbaculi.github.io.

Dev:  uv run python build.py --watch
Prod: uv run python build.py
"""

import argparse
import pathlib
import shutil

import minify_html
import rcssmin
import rjsmin
from bs4 import BeautifulSoup

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

EXCLUDED_DIRS = {
    "_site",
    "node_modules",
    ".venv",
    ".git",
    "public",
    "tests",
    "images",
    "docs",
    "_data",
}

PARTIAL_NAMES = (
    "header.html",
    "navbar.html",
    "side_menu.html",
    "footer.html",
    "top_professional.html",
    "top_projects.html",
    "subnavbar_professional.html",
    "subnavbar_hobbies.html",
)


def load_partial(
    name: str,
    partials_dir: pathlib.Path = PARTIALS_DIR,
    cache: dict[str, str] | None = None,
) -> BeautifulSoup:
    """Load a partial HTML file and return it as a BeautifulSoup object."""
    html = cache[name] if (cache is not None and name in cache) else (partials_dir / name).read_text()
    return BeautifulSoup(html, "html.parser")


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


def inject_partials(
    html: str,
    rel_path: pathlib.Path,
    partials_dir: pathlib.Path = PARTIALS_DIR,
    cache: dict[str, str] | None = None,
) -> str:
    """Inject partials into a page's HTML by replacing placeholder elements."""
    soup = BeautifulSoup(html, "html.parser")
    section = rel_path.parts[0] if len(rel_path.parts) > 1 else ""

    def _inject(element_id: str, partial_name: str) -> None:
        el = soup.find(id=element_id)
        if el is None:
            return
        partial = load_partial(partial_name, partials_dir, cache=cache)
        el.clear()
        for child in list(partial.children):
            el.append(child.__copy__())

    def _replace(element_id: str, partial_name: str) -> None:
        """Replace the element's outer HTML (for <placeholder> tags)."""
        el = soup.find(id=element_id)
        if el is None:
            return
        partial = load_partial(partial_name, partials_dir, cache=cache)
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

    highlight_current_pages(soup, rel_path)

    return str(soup)


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


def copy_static_assets(
    src_dir: pathlib.Path = SRC_DIR, out_dir: pathlib.Path = OUT_DIR
) -> None:
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


def copy_changed_asset(
    src_file: pathlib.Path,
    src_dir: pathlib.Path,
    out_dir: pathlib.Path,
    minify: bool = False,
) -> None:
    """Copy a single asset file to its corresponding output path."""
    rel = src_file.relative_to(src_dir)
    dst = out_dir / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if minify and src_file.suffix == ".css":
        dst.write_text(rcssmin.cssmin(src_file.read_text()))
    elif minify and src_file.suffix == ".js":
        dst.write_text(rjsmin.jsmin(src_file.read_text()))
    else:
        shutil.copy2(src_file, dst)


def minify_text_assets(out_dir: pathlib.Path) -> None:
    """Minify CSS and JS files in the output directory in place."""
    for css_file in (out_dir / "assets" / "css").rglob("*.css"):
        css_file.write_text(rcssmin.cssmin(css_file.read_text()))
    for js_file in (out_dir / "assets" / "js").rglob("*.js"):
        js_file.write_text(rjsmin.jsmin(js_file.read_text()))


def render_html_file(
    src_file: pathlib.Path,
    src_dir: pathlib.Path,
    out_dir: pathlib.Path,
    partials_dir: pathlib.Path,
    cache: dict[str, str],
    minify: bool = False,
) -> None:
    """Render a single HTML source file with partials injected."""
    rel = src_file.relative_to(src_dir)
    dst = out_dir / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    html = src_file.read_text()
    html = inject_partials(html, rel, partials_dir=partials_dir, cache=cache)
    if minify:
        html = minify_html.minify(html, minify_js=True, minify_css=True)
    dst.write_text(html)


def build(
    minify: bool = False,
    clean: bool = True,
    src_dir: pathlib.Path = SRC_DIR,
    out_dir: pathlib.Path = OUT_DIR,
) -> None:
    """Run a full build."""
    if clean:
        if out_dir.exists():
            shutil.rmtree(out_dir)
        out_dir.mkdir()
        copy_static_assets(src_dir=src_dir, out_dir=out_dir)
    else:
        out_dir.mkdir(exist_ok=True)

    partials_dir = src_dir / "assets" / "html"
    cache: dict[str, str] = {
        name: (partials_dir / name).read_text()
        for name in PARTIAL_NAMES
        if (partials_dir / name).exists()
    }

    for src_file in get_source_html_files(src_dir=src_dir):
        render_html_file(
            src_file=src_file,
            src_dir=src_dir,
            out_dir=out_dir,
            partials_dir=partials_dir,
            cache=cache,
            minify=minify,
        )

    if minify:
        minify_text_assets(out_dir=out_dir)


def watch(
    minify: bool = False,
    src_dir: pathlib.Path = SRC_DIR,
    out_dir: pathlib.Path = OUT_DIR,
) -> None:
    """Run a dev build then start a live reload server watching for changes."""
    from livereload import Server

    # Initial clean build
    build(minify=minify, clean=True, src_dir=src_dir, out_dir=out_dir)

    partials_dir = src_dir / "assets" / "html"
    cache: dict[str, str] = {
        name: (partials_dir / name).read_text()
        for name in PARTIAL_NAMES
        if (partials_dir / name).exists()
    }

    def rebuild_page(src_file: pathlib.Path) -> None:
        """Re-render a single source page using the cached partials."""
        print(f"Rebuilding {src_file.relative_to(src_dir)}...")
        render_html_file(
            src_file=src_file,
            src_dir=src_dir,
            out_dir=out_dir,
            partials_dir=partials_dir,
            cache=cache,
            minify=minify,
        )
        print("Done.")

    def rebuild_all_html() -> None:
        """Refresh partial cache and re-render all HTML pages."""
        print("Partial changed, rebuilding all HTML...")
        cache.clear()
        cache.update({
            name: (partials_dir / name).read_text()
            for name in PARTIAL_NAMES
            if (partials_dir / name).exists()
        })
        for src_file in get_source_html_files(src_dir=src_dir):
            render_html_file(
                src_file=src_file,
                src_dir=src_dir,
                out_dir=out_dir,
                partials_dir=partials_dir,
                cache=cache,
                minify=minify,
            )
        print("Done.")

    def on_asset_change(src_file: pathlib.Path) -> None:
        """Copy a single changed asset file to output, or remove it if deleted."""
        rel = src_file.relative_to(src_dir)
        if not src_file.exists():
            dst = out_dir / rel
            if dst.exists():
                dst.unlink()
                print(f"Removed {rel}.")
            return
        print(f"Copying {rel}...")
        copy_changed_asset(
            src_file=src_file, src_dir=src_dir, out_dir=out_dir, minify=minify,
        )
        print("Done.")

    server = Server()

    # Source page changes -> rebuild just that page
    for f in get_source_html_files(src_dir=src_dir):
        def _rebuild_page(fp=f):
            rebuild_page(fp)
        _rebuild_page.__name__ = f"rebuild:{f.relative_to(src_dir)}"
        server.watch(str(f), _rebuild_page)

    # Partial changes -> rebuild all HTML
    for f in (src_dir / "assets" / "html").glob("*.html"):
        server.watch(str(f), rebuild_all_html)

    # CSS/JS changes -> copy single file
    for f in (src_dir / "assets" / "css").rglob("*.css"):
        def _sync_asset(fp=f):
            on_asset_change(fp)
        _sync_asset.__name__ = f"sync_asset:{f.relative_to(src_dir)}"
        server.watch(str(f), _sync_asset)
    for f in (src_dir / "assets" / "js").rglob("*.js"):
        def _sync_asset(fp=f):
            on_asset_change(fp)
        _sync_asset.__name__ = f"sync_asset:{f.relative_to(src_dir)}"
        server.watch(str(f), _sync_asset)

    # Image changes -> sync entire images directory
    def sync_images() -> None:
        print("Syncing images...")
        src_images = src_dir / "images"
        dst_images = out_dir / "images"
        if dst_images.exists():
            shutil.rmtree(dst_images)
        shutil.copytree(src_images, dst_images)
        print("Done.")

    server.watch(str(src_dir / "images"), sync_images)

    print(f"Dev server running at http://localhost:8080")
    server.serve(root=str(out_dir), port=8080, open_url_delay=None)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build noahbaculi.github.io")
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Start dev server with live reload",
    )
    parser.add_argument(
        "--minify",
        action="store_true",
        help="Minify HTML, CSS, and JS output",
    )
    args = parser.parse_args()
    print(
        f"Building noahbaculi.github.io (watch={args.watch}, minify={args.minify})..."
    )

    if args.watch:
        watch(minify=args.minify)
    else:
        build(minify=args.minify)


if __name__ == "__main__":
    main()

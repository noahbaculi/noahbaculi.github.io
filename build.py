#!/usr/bin/env python3
"""Build script for noahbaculi.github.io.

Dev:  uv run python build.py --watch
Prod: uv run python build.py
"""

import argparse
import pathlib
import shutil

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


def load_partial(name: str,
                 partials_dir: pathlib.Path = PARTIALS_DIR) -> BeautifulSoup:
    """Load a partial HTML file and return it as a BeautifulSoup object."""
    html = (partials_dir / name).read_text()
    return BeautifulSoup(html, "html.parser")


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


def build(
    minify: bool = True,
    src_dir: pathlib.Path = SRC_DIR,
    out_dir: pathlib.Path = OUT_DIR,
) -> None:
    """Run a full build."""
    out_dir.mkdir(exist_ok=True)
    copy_static_assets(src_dir=src_dir, out_dir=out_dir)

    for src_file in get_source_html_files(src_dir=src_dir):
        rel = src_file.relative_to(src_dir)
        dst = out_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        html = src_file.read_text()
        html = inject_partials(html, rel, partials_dir=src_dir / "assets" / "html")
        dst.write_text(html)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build noahbaculi.github.io")
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Start dev server with live reload (no minification)",
    )
    args = parser.parse_args()
    print(f"Building noahbaculi.github.io (watch={args.watch})...")

    if args.watch:
        build(minify=False)
    else:
        build(minify=True)


if __name__ == "__main__":
    main()

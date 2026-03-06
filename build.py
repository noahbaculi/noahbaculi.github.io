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
        dst.write_text(src_file.read_text())


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

#!/usr/bin/env python3
"""
Update <img> tags in HTML files:
1. Change underscore naming to dash naming (image_400_w.webp -> image-400_w.webp)
2. Fix srcset width descriptors to match actual image widths
3. Update src to use highest resolution webp thumbnail (for standard folders)
4. Standardize widths to [400, 800, 1600, 2400] for standard image folders
"""

import re
from pathlib import Path

# Folders that should use standard widths [400, 800, 1600, 2400]
STANDARD_FOLDERS = {"images/hobbies", "images/professional", "images/projects"}
STANDARD_WIDTHS = [400, 800, 1600, 2400]


def get_base_image_name(srcset_line: str) -> tuple[str, int] | None:
    """Extract base image path and width from a srcset line."""
    # Match: /path/to/image_400_w.webp or /path/to/image-400_w.webp
    match = re.search(r"(/[\w/.-]+?)[-_](\d+)_w\.webp", srcset_line)
    if match:
        return match.group(1), int(match.group(2))
    return None


def is_standard_folder(path: str) -> bool:
    """Check if path is in a standard folder."""
    return any(folder in path for folder in STANDARD_FOLDERS)


def find_actual_webp_files(base_path: str, images_root: Path) -> list[int]:
    """Find actual webp files on disk and return their widths."""
    # Convert URL path to filesystem path
    # /images/icons/icon_scroll_up -> images/icons/icon_scroll_up
    fs_base = base_path.lstrip("/")

    parent = images_root / Path(fs_base).parent
    stem = Path(fs_base).name

    if not parent.exists():
        return []

    widths = []
    for f in parent.iterdir():
        # Match both old (underscore) and new (dash) naming
        match = re.match(rf"{re.escape(stem)}[-_](\d+)_w\.webp", f.name)
        if match:
            widths.append(int(match.group(1)))

    return sorted(widths)


def transform_img_tag(img_tag: str, images_root: Path) -> str:
    """Transform a single <img> tag."""
    # Extract srcset content
    srcset_match = re.search(r'srcset="([^"]*)"', img_tag, re.DOTALL)
    if not srcset_match:
        return img_tag

    srcset_content = srcset_match.group(1)
    srcset_lines = [
        line.strip() for line in srcset_content.strip().split(",") if line.strip()
    ]

    if not srcset_lines:
        return img_tag

    # Get base image path from first srcset entry
    first_entry = get_base_image_name(srcset_lines[0])
    if not first_entry:
        return img_tag

    base_path, _ = first_entry

    # Determine widths to use
    if is_standard_folder(base_path):
        # Use standard widths, but check which ones actually exist
        actual_widths = find_actual_webp_files(base_path, images_root)
        if actual_widths:
            # Use standard widths that exist, or closest matches
            widths = [w for w in STANDARD_WIDTHS if w <= max(actual_widths)]
            if not widths:
                widths = [min(actual_widths)]
            # Add the max actual width if it's not a standard width
            max_actual = max(actual_widths)
            if max_actual not in STANDARD_WIDTHS and max_actual > max(widths):
                widths.append(max_actual)
            widths = sorted(set(widths))
        else:
            # Fall back to existing srcset widths
            widths = sorted(
                set(
                    get_base_image_name(line)[1]
                    for line in srcset_lines
                    if get_base_image_name(line)
                )
            )
    else:
        # Non-standard folder: keep existing widths, just fix descriptors
        widths = []
        for line in srcset_lines:
            entry = get_base_image_name(line)
            if entry:
                widths.append(entry[1])
        widths = sorted(set(widths))

    if not widths:
        return img_tag

    # Build new srcset with dash naming and correct width descriptors
    max_width = max(str(w) for w in widths)
    width_padding = len(max_width)

    new_srcset_lines = []
    for w in widths:
        path = f"{base_path}-{w}_w.webp"
        new_srcset_lines.append(f"{path} {w:>{width_padding}}w")

    # Preserve original indentation
    indent_match = re.search(r'srcset="\s*\n?(\s*)', img_tag)
    line_indent = indent_match.group(1) if indent_match else "                "

    new_srcset = ",\n".join(f"{line_indent}{line}" for line in new_srcset_lines)
    new_srcset = f'srcset="\n{new_srcset}\n{line_indent[:-2]}"'

    # Replace srcset
    new_img_tag = re.sub(r'srcset="[^"]*"', new_srcset, img_tag, flags=re.DOTALL)

    # Update src attribute
    if is_standard_folder(base_path):
        # Use highest resolution webp as src
        highest_width = max(widths)
        new_src = f"{base_path}-{highest_width}_w.webp"
        new_img_tag = re.sub(r'src="[^"]*"', f'src="{new_src}"', new_img_tag)
    else:
        # Keep original src but update naming if it's a webp
        src_match = re.search(r'src="([^"]*)"', new_img_tag)
        if src_match:
            old_src = src_match.group(1)
            # Update underscore to dash in webp files
            if "_w.webp" in old_src:
                new_src = re.sub(r"_(\d+)_w\.webp", r"-\1_w.webp", old_src)
                new_img_tag = re.sub(r'src="[^"]*"', f'src="{new_src}"', new_img_tag)

    return new_img_tag


def process_html_file(file_path: Path, images_root: Path, dry_run: bool = False) -> int:
    """Process a single HTML file. Returns number of img tags modified."""
    content = file_path.read_text()

    # Find all img tags with srcset
    img_pattern = re.compile(r"<img\s[^>]*srcset=[^>]*>", re.DOTALL)

    modifications = 0

    def replace_img(match):
        nonlocal modifications
        old_tag = match.group(0)
        new_tag = transform_img_tag(old_tag, images_root)
        if old_tag != new_tag:
            modifications += 1
        return new_tag

    new_content = img_pattern.sub(replace_img, content)

    if not dry_run and modifications > 0:
        file_path.write_text(new_content)

    return modifications


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Update img tags in HTML files")
    parser.add_argument(
        "images_root",
        help="Root directory for images",
    )
    parser.add_argument(
        "--html_dir",
        default="./",
        help="Directory containing HTML files (default: current dir)",
    )
    parser.add_argument(
        "--dry_run", action="store_true", help="Preview changes without modifying files"
    )

    args = parser.parse_args()

    html_dir = Path(args.html_dir)
    images_root = Path(args.images_root)

    if not html_dir.exists():
        print(f"Error: {html_dir} does not exist")
        return

    html_files = list(html_dir.rglob("*.html"))
    print(f"Found {len(html_files)} HTML files")

    total_modifications = 0
    for file_path in html_files:
        modifications = process_html_file(file_path, images_root, args.dry_run)
        if modifications > 0:
            print(
                f"  {file_path}: {modifications} img tag(s) {'would be ' if args.dry_run else ''}modified"
            )
            total_modifications += modifications

    action = "Would modify" if args.dry_run else "Modified"
    print(f"\n{action} {total_modifications} img tag(s) total")


if __name__ == "__main__":
    main()

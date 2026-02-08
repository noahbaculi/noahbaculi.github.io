from pathlib import Path
from PIL import Image


# Responsive image widths for srcset generation.
#
# These widths provide good coverage across devices and pixel densities:
#   - 400w  : Small thumbnails, quarter-width images, low-DPI fallback
#   - 800w  : Half-width on tablets, full-width on mobile at 2x DPR
#   - 1600w : Full-width on ~1440px laptops at 2x DPR
#   - 2400w : Full-width on 4K/large displays at 2x DPR (~2560px viewport)
#
# The ~2x jumps between sizes give browsers good options without
# redundant files. If a source image is smaller than a target width,
# that width is skipped to avoid upscaling (see convert_img logic).
#
# Usage in HTML:
#   srcset="image_400_w.webp 400w, image_800_w.webp 800w, ..."
#   sizes="(max-width: 740px) 100vw, 50vw"  <- Adjust per layout
#
# The `sizes` attribute tells the browser the display size, and it
# picks the smallest srcset image that still looks sharp at that size
# multiplied by the device's pixel ratio.
IMAGE_WIDTHS = [400, 800, 1600, 2400]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic"}


def convert_img(
    file_path: Path, widths: list[int], exclude: list[str], include: list[str]
) -> str | None:
    """
    Generate resized WebP images for responsive srcset usage.

    Returns the file path string if conversion fails, None on success.
    """
    file_path_str = str(file_path)

    if include and not any(inc in file_path_str for inc in include):
        print(f"\tSkipping not included {file_path} with include list = {include}.")
        return None

    if any(exc in file_path_str for exc in exclude):
        print(f"\tSkipping excluded {file_path} with exclude list = {exclude}.")
        return None

    try:
        img = Image.open(file_path)
    except Exception as e:
        print(f"\tFailed to open {file_path}: {e}")
        return file_path_str

    if file_path.suffix.lower() == ".png":
        img = img.convert("RGBA")

    original_width, original_height = img.size

    for width in widths:
        if width > original_width:
            width = original_width

        output_path = file_path.with_name(f"{file_path.stem}_{width}_w.webp")

        if output_path.exists():
            # Skip existing output file
            if width >= original_width:
                break
            continue

        size_ratio = width / original_width
        new_size = (
            round(original_width * size_ratio),
            round(original_height * size_ratio),
        )

        new_img = img.resize(new_size, Image.Resampling.LANCZOS)
        new_img.save(output_path, "webp")

        if width >= original_width:
            break

    print(f"\tGenerated images for '{file_path}'.")
    return None


def convert_folder(
    base_path: str,
    widths: list[int],
    exclude: list[str] | None = None,
    include: list[str] | None = None,
) -> None:
    """Convert all images in a directory to responsive WebP sizes."""
    print(f"Converting images in '{base_path}'")

    base = Path(base_path)

    if not base.is_dir():
        raise ValueError(f"{base_path} is not a valid directory")

    exclude = exclude or []
    include = include or []
    invalid_files = {}

    for root, _, files in base.walk():
        image_files = [
            f
            for f in files
            if Path(f).suffix.lower() in IMAGE_EXTENSIONS and "_w." not in f
        ]
        print(image_files)

        for file in image_files:
            file_path = root / file
            result = convert_img(file_path, widths, exclude, include)
            if result:
                invalid_files.append(result)

    if invalid_files:
        raise ValueError("Failed to convert:\n\t" + "\n\t".join(invalid_files))


if __name__ == "__main__":
    convert_folder(r"images/hobbies/diy", IMAGE_WIDTHS)

    ## PROFESSIONAL
    # convert_folder(r"images/professional/enterprisedb", [400, 1000], exclude=["_orig"])
    # convert_folder(r"images/professional/carium", [400, 1000], exclude=["_orig"])
    # convert_folder(r"images/professional/salesforce", [400, 800], exclude=["team_lunch_orig.png"])
    # convert_folder(r"images/professional/aldras", [400, 1000], exclude=["logo", "inspiration", "business", "application_icon"])
    # convert_folder(r"images/professional/aldras", [200], include=["logo", "inspiration", "business", "application_icon"])
    # convert_folder(r"images/professional/asme", [400, 1000])
    # convert_folder(r"images/professional/trane", [400, 1000])
    # convert_folder(r"images/professional/itw", [400, 1000])
    # convert_folder(r"images/professional/caffinator", [400], include=["drill", "foam", "mechatronics", "shop"])
    # convert_folder(r"images/professional/caffinator", [400, 1000], exclude=["drill", "foam", "mechatronics", "shop"])
    # convert_folder(r"images/professional/nanofluidics", [400, 1000])
    # convert_folder(r"images/professional/science_camp", [400, 1000])
    # convert_folder(r"images/professional/other", [400, 1000])

    ## PROJECTS
    # convert_folder(r"images/projects/guitar_tab_generator", [600])
    # convert_folder(r"images/projects/pet_feeder", [400, 1000])
    # convert_folder(r"images/projects/pet_feeder", [600], include=["pet_feeder_final.JPG"])
    # convert_folder(r"images/projects/busca", [600])
    # convert_folder(r"images/projects/other", [600], include=["salesforce_galaxy"])

    ## ABOUT
    # convert_folder(r"images/hobbies/music", [400, 1000])
    # convert_folder(r"images/hobbies/travel", [400, 1000])
    # convert_folder(r"images/hobbies/tech", [400, 1000])
    # convert_folder(r"images/hobbies/principles", [400, 1000])
    # convert_folder(r"images/hobbies/swim", [400, 1000])

    ## HEADERS
    # convert_folder(r"images/noah", [800], include=["header_2_by_3"])
    # convert_folder(r"images/noah", [1200], include=["header_square"])
    # convert_folder(r"images/noah", [1600], include=["header_4_by_3"])
    # convert_folder(r"images/noah", [2000], include=["header.jpg"])
    # convert_folder(r"images/noah", [400], include=["_page.jpg"])
    # convert_folder(r"images/noah", [600], include=["_page_2_by_1.jpg"])
    # convert_folder(r"images/noah", [1200], include=["_page_3_by_1.jpg"])
    # convert_folder(r"images/noah", [2000], include=["_page_5_by_1.jpg"])

    ## ICONS
    # convert_folder(r"images/icons", [25, 50])
    # convert_folder(r"images/professional/contact", [400], include=['affiliated_organizations'])

    # # CONTACT
    # convert_folder(r"images/contact", [2000], include=["affiliated"])
    # convert_folder(r"images/contact", [1], exclude=["affiliated", "salesforce"], include=["background"])
    # convert_folder(r"images/contact", [200], include=["salesforce_background"])
    # convert_folder(r"images/contact", [500], exclude=["affiliated", "background"])

    ## FAMILY TREE
    # convert_folder(r"images/family_tree", [50, 100])

    print("Done.")

from tkinter import image_types
from PIL import Image
import os


def covert_img(file_path: str, widths: list, exclude: list, include: list) -> str:
    file_name = os.path.splitext(file_path)[0]
    file_ext = os.path.splitext(file_path)[1]

    if include and not any(
        [True for include_str in include if include_str in file_path]
    ):
        print(f"\tSkipping not included {file_path} with include list = {include}.")
        return ""

    if any([True for exclude_str in exclude if exclude_str in file_path]):
        print(f"\tSkipping excluded {file_path} with exclude list = {exclude}.")
        return ""

    img = Image.open(file_path)

    if file_ext in [".png", ".PNG"]:
        img = img.convert("RGBA")

    old_size = img.size
    # img.save(f"{file_name}.webp", "webp")
    # img.save(file_name + ".avif", "avif")

    for width in widths:
        if width > old_size[0]:
            width = old_size[0]

        size_ratio = width / old_size[0]
        new_size = tuple(round(dimension * size_ratio) for dimension in old_size)

        new_img = img.resize(new_size, Image.Resampling.LANCZOS)
        new_img.save(f"{file_name}_{width}_w.webp", "webp")

        if width >= old_size[0]:
            break

    print(f"\tGenerated images for '{file_path}'.")

    return ""


def convert_folder(
    base_path: str, widths: list, exclude: list = None, include: list = None
) -> None:
    print(f"Converting images in '{base_path}'")

    if not exclude:
        exclude = []
    if not include:
        include = []
    invalid_files = []

    for root, _, files in list(os.walk(base_path)):
        img_types = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG", ".heic", ".HEIC"]
        files = [x for x in files if os.path.splitext(x)[1] in img_types]
        files = [x for x in files if "_w." not in x]
        print(files)

        for file in files:
            file_path = os.path.join(root, file)
            covert_img(file_path, widths, exclude, include)

    invalid_files = [file for file in invalid_files if file != ""]

    if invalid_files:
        invalid_files.insert(0, "")
        raise ValueError("\n\t".join(invalid_files))


if __name__ == "__main__":
    ## PORTFOLIO
    # convert_folder(r"portfolio\carium", [400, 1000], exclude=["_orig"])
    # convert_folder(r"portfolio\salesforce", [400, 800], exclude=["team_lunch_orig.png"])
    # convert_folder(r"portfolio\aldras", [400, 1000], exclude=["logo", "inspiration", "business", "application_icon"])
    # convert_folder(r"portfolio\aldras", [200], include=["logo", "inspiration", "business", "application_icon"])
    # convert_folder(r"portfolio\asme", [400, 1000])
    # convert_folder(r"portfolio\trane", [400, 1000])
    # convert_folder(r"portfolio\itw", [400, 1000])
    # convert_folder(r"portfolio\caffinator", [400], include=["drill", "foam", "mechatronics", "shop"])
    # convert_folder(r"portfolio\caffinator", [400, 1000], exclude=["drill", "foam", "mechatronics", "shop"])
    # convert_folder(r"portfolio\nanofluidics", [400, 1000])
    # convert_folder(r"portfolio\science_camp", [400, 1000])
    # convert_folder(r"portfolio\other", [400, 1000])
    # convert_folder(r"portfolio\guitar_tab_generator", [600])
    # convert_folder(r"portfolio\pet_feeder", [400, 1000])
    # convert_folder(r"portfolio\pet_feeder", [600], include=["pet_feeder_final.JPG"])
    # convert_folder(r"portfolio\busca", [600])
    # convert_folder(r"portfolio\aldras", [600], include=["aldras.png"])
    # convert_folder(r"portfolio\independent_projects", [600], include=["salesforce_galaxy"])

    ## ABOUT
    # convert_folder(r"about\travel", [400, 800, 1500])
    # convert_folder(r"about\principles", [500, 1000, 2000])
    # convert_folder(r"about\learning", [500, 1000, 2000], include=['background'])
    # convert_folder(r"about\learning", [400, 1000], exclude=["background"])
    # convert_folder(r"about\music", [400, 1000])
    # convert_folder(r"about\swim", [400, 1000])

    ## HEADERS
    # convert_folder(r"noah", [800], include=["header_2_by_3"])
    # convert_folder(r"noah", [1200], include=["header_square"])
    # convert_folder(r"noah", [1600], include=["header_4_by_3"])
    # convert_folder(r"noah", [2000], include=["header.jpg"])
    # convert_folder(r"noah", [400], include=["_page.jpg"])
    # convert_folder(r"noah", [600], include=["_page_2_by_1.jpg"])
    # convert_folder(r"noah", [1200], include=["_page_3_by_1.jpg"])
    # convert_folder(r"noah", [2000], include=["_page_5_by_1.jpg"])

    ## ICONS
    # convert_folder(r"icons", [25, 50])
    # convert_folder(r"portfolio\contact", [400], include=['affiliated_organizations'])

    # # CONTACT
    # convert_folder(r"contact", [2000], include=["affiliated"])
    # convert_folder(r"contact", [1], exclude=["affiliated", "salesforce"], include=["background"])
    # convert_folder(r"contact", [200], include=["salesforce_background"])
    # convert_folder(r"contact", [500], exclude=["affiliated", "background"])

    ## FAMILY TREE
    convert_folder(r"family_tree", [50, 100])

    print("Done.")

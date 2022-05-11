from tkinter import image_types
from PIL import Image
import os
import pillow_avif


def covert_img(file_path: str, widths: list, exclude: list, include: list) -> str:
    file_name = os.path.splitext(file_path)[0]
    file_ext = os.path.splitext(file_path)[1]
    
    if include and not any([True for include_str in include if include_str in file_name]):
        print(f"\tSkipping not included {file_path} with include list = {exclude}.")
        return ""

    if any([True for exclude_str in exclude if exclude_str in file_path]):
        print(f"\tSkipping excluded {file_path} with exclude list = {exclude}.")
        return ""

    img = Image.open(file_path)
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
        img_types = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"]
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
    # convert_folder(r".\images\noah")
    convert_folder(
        r".\images\portfolio\salesforce", [400, 800], exclude=["team_lunch_orig.png"]
    )
    convert_folder(r".\images\portfolio\aldras", [400, 1000], exclude=["logo", "inspiration", "business", "application_icon"])
    convert_folder(r".\images\portfolio\aldras", [200], include=["logo", "inspiration", "business", "application_icon"])
    convert_folder(r".\images\portfolio\asme", [400, 1000])
    convert_folder(r".\images\portfolio\trane", [400, 1000])
    convert_folder(r".\images\portfolio\itw", [400, 1000])

    # convert_folder(r".\images\portfolio\contact", [400], include=['affiliated_organizations'])

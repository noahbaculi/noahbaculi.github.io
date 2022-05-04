from PIL import Image
import os


def resize_square_jpg(file_path: str, img_size: int) -> str:
    file_ext = os.path.splitext(file_path)[1]
    if file_ext != ".jpg":  # only process .jpg files
        return ""

    img = Image.open(file_path)

    if img.size[0] != img.size[1]:
        return "The image {file_path} does not have a square aspect ratio, with dimensions {img.size}."

    # do not process files of size less than desired img_size
    if img.size[0] <= img_size:
        return ""

    old_size = img.size
    img = img.resize((img_size, img_size), Image.Resampling.LANCZOS)
    img.save(file_path)
    print(f"\tResized image at '{file_path}' from {old_size} to {img.size}.")
    return ""


def resize_img(file_path: str, img_width: int) -> str:
    file_ext = os.path.splitext(file_path)[1]
    if not file_ext in [".jpg", ".JPG", ".png", ".PNG"]:
        return ""
    
    img = Image.open(file_path)

    if img.size[0] <= img_width:
        return ""

    old_size = img.size
    size_ratio = img_width / old_size[0]
    new_size = tuple(round(dimension * size_ratio) for dimension in old_size)

    img = img.resize(new_size, Image.Resampling.LANCZOS)
    img.save(file_path)
    print(f"\tResized image at '{file_path}' from {old_size} to {img.size}.")

    return ""


def resize_images_in_folder(
    base_path: str, img_width: int, square: bool = False
) -> None:
    print(
        f"Resizing images in '{base_path}' to a width of {img_width}px with square={square}..."
    )
    invalid_files = []
    for root, _, files in list(os.walk(base_path)):
        for file in files:
            file_path = os.path.join(root, file)
            if square:
                invalid_files.append(resize_square_jpg(file_path, img_width))
            else:
                invalid_files.append(resize_img(file_path, img_width))

    invalid_files = [file for file in invalid_files if file != ""]

    if invalid_files:
        invalid_files.insert(0, "")
        raise ValueError("\n\t".join(invalid_files))


if __name__ == "__main__":
    resize_images_in_folder(r".\images\family_tree", img_width=200, square=True)
    print()
    resize_images_in_folder(r".\images\portfolio", img_width=800)

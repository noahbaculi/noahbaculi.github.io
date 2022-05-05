from PIL import Image
import os


def resize_square_jpg(file_path: str, img_size: int, exclude: list) -> str:
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


def resize_img(file_path: str, width: int, height: int, exclude: list) -> str:
    file_ext = os.path.splitext(file_path)[1]
    if any([True for exclude_str in exclude if exclude_str in file_path]):
        print(f"\tSkipping excluded {file_path} with exclude list = {exclude}.")
        return ""

    if not file_ext in [".jpg", ".JPG",".jpeg", ".JPEG", ".png", ".PNG"]:
        # print(f"\tSkipping {file_path} with bad extension = {file_ext}.")
        return ""

    img = Image.open(file_path)
    old_size = img.size

    if old_size[0] > width:
        size_ratio = width / old_size[0]
    elif old_size[1] > height:
        size_ratio = height / old_size[1]
    else:
        return ""

    new_size = tuple(round(dimension * size_ratio) for dimension in old_size)

    img = img.resize(new_size, Image.Resampling.LANCZOS)
    img.save(file_path)
    print(f"\tResized image at '{file_path}' from {old_size} to {img.size}.")

    return ""


def resize_images_in_folder(
    base_path: str,
    width: int = 0,
    height: int = 0,
    square_size: int = 0,
    exclude: list = None,
) -> None:

    print(
        f"Resizing images in '{base_path}' to width={width}px, height={height}px, and square_size={square_size}px..."
    )

    if not exclude:
        exclude = []
    invalid_files = []
    for root, _, files in list(os.walk(base_path)):
        for file in files:
            file_path = os.path.join(root, file)
            if square_size:
                invalid_files.append(resize_square_jpg(file_path, square_size, exclude))
            else:
                invalid_files.append(resize_img(file_path, width, height, exclude))

    invalid_files = [file for file in invalid_files if file != ""]

    if invalid_files:
        invalid_files.insert(0, "")
        raise ValueError("\n\t".join(invalid_files))


if __name__ == "__main__":
    resize_images_in_folder(r".\images\family_tree", square_size=200)
    print()
    resize_images_in_folder(r".\images\portfolio", width=800, height=600)
    print()
    resize_images_in_folder(r".\images\about", width=800, height=600, exclude=['background', 'principles'])

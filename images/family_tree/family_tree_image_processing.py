from PIL import Image
import os


def resize_square_images(base_path: str, img_size: int = 200) -> None:
    files_resized = False
    invalid_files = []
    for root, _, files in list(os.walk(base_path)):
        for file in files:
            if file[-4:] != ".jpg":  # only process .jpg files
                continue

            file_path = os.path.join(root, file)
            img = Image.open(file_path)

            if img.size[0] != img.size[1]:
                invalid_files.append(
                    f"The image {file_path} does not have a square aspect ratio, with dimensions {img.size}."
                )
                continue

            # do not process files of size less than desired img_size
            if img.size[0] <= img_size:
                continue

            old_size = img.size
            img = img.resize((img_size, img_size), Image.Resampling.LANCZOS)
            img.save(file_path)
            print(f"Resized image at '{file_path}' from {old_size} to {img.size}.")
            files_resized = True

    if not files_resized:
        print("No images resized.")

    if invalid_files:
        invalid_files.insert(0, "")
        raise ValueError("\n\t".join(invalid_files))


if __name__ == "__main__":
    resize_square_images(r".\images\family_tree")

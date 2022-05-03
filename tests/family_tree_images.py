import json
import os


def check_path(breadcrumbs, name_str) -> str:
    path = f"./images/family_tree/{breadcrumbs}{name_str}.jpg".lower()
    if not os.path.isfile(path):
        return f"File not found: {path}"


def check_top_tree_level(tree, breadcrumbs):
    error_log = set()
    for highest_relative, fam in tree.items():
        highest_first_name = highest_relative.split(" ")[0]
        error_log.add(check_path(breadcrumbs, highest_first_name))

        partner = fam.get("partner")
        if partner:
            error_log.add(check_path(breadcrumbs, partner.split(" ")[0]))

        children = fam.get("children")
        if children:
            sub_tree = children[0]
            error_log.update(
                check_top_tree_level(sub_tree, f"{breadcrumbs}{highest_first_name}/")
            )

    return error_log


if __name__ == "__main__":

    tree = json.load(open("./family_tree.json", "r"))

    error_log = set()
    error_log.update(check_top_tree_level(tree, ""))
    error_log.discard(None)

    if error_log:
        from pprint import pprint

        print("Files not found:")
        pprint(error_log)

        raise FileNotFoundError(error_log)

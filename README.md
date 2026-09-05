# noahbaculi.github.io

Created by Noah Baculi.

Started December 2018

Modern website and portfolio with responsive design and interface: [noahbaculi.com](https://noahbaculi.com/)

## Technologies and credits

- HTML, CSS, and JS inspired by [HTML5 UP](https://html5up.net/)
- Hosted on [Netlify](https://www.netlify.com/)
  [![Netlify Status](https://api.netlify.com/api/v1/badges/cf2b8a37-eff2-43ef-a176-e56819d1d770/deploy-status)](https://app.netlify.com/sites/noahbaculi/deploys)

## Development workflow

Install tools:

```shell
mise install
```

Run dev server with live reload:

```shell
uv run python build.py --watch [--minify]
```

Run prod build (with minification):

```shell
uv run python build.py --minify
```

Run image generator script:

```shell
uv run python ./images/image_generator.py
```

Check family tree images:

```shell
uv run python ./tests/family_tree_images.py
```

Check formatting with Prettier:

```shell
bunx prettier --check .
```

Check for broken links with [Lychee](https://github.com/lycheeverse/lychee):

```shell
lychee --root-dir . --accept '200..=204, 401, 999' --cache .
```

Convert a folder of `.HEIC` photos to `.jpg` on MacOS using fish shell:

```fish
mkdir -p jpg
for f in *.heic *.HEIC
  if not test -e "$f"
      continue
  end
  set base (string replace -r '\.[^.]+$' '' -- "$f")
  # quality: 0–100 (higher = larger). 80–90 is usually a good range.
  sips -s format jpeg -s formatOptions 85 "$f" --out "jpg/$base.jpg" >/dev/null
end
```

## Build architecture

```
source HTML files           partials
(root / professional /      (assets/html/)
 hobbies / projects)              │
        │                         │
        └──────────┬──────────────┘
                   ▼
               build.py
           inject_partials()
    highlight_current_pages()
         [minify if prod]
                   │
                   ▼
                _site/
               (served by Netlify)
```

## File layout

- `index.html`, `professional/*.html`, `hobbies/*.html`, `projects/*.html` are full pages: one per job, hobby, or project, each with its own narrative and images.
- `assets/html/*.html` are partials injected into those pages by `build.py`'s `inject_partials()`, matched by element ID:
  - `header.html`, `navbar.html`, `mobile_menu.html`, `footer.html` are structural chrome injected on every page.
  - `subnavbar_professional.html` and `subnavbar_hobbies.html` are section-specific subnavs, injected only under `professional/` or `hobbies/`.
  - `top_professional.html` holds the condensed, 3-bullet-per-job summaries shown on the homepage. It's separate from the full write-up on each `professional/*.html` page, so a resume or experience update usually touches both.
  - `top_projects.html` holds the project cards shown on the homepage, one per project, linking out to the matching `projects/*.html` page.

Re-generate the image tags in the HTML files with responsive webp thumbnails.

```shell
# Run script with dry-run first
uv run python ./images/update_img_tags.py ./images --dry_run

# Execute the main HTML regex
uv run python ./images/update_img_tags.py ./images

# Format with prettier
bunx prettier --check . --write
```

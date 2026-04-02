# Python Build Script Design

Date: 2026-03-06

## Problem

The site's Lighthouse performance score is 75 due to runtime `fetch()` calls in `main.js`
that load shared partials (navbar, header, footer, side menu, subnavbars, and homepage
content sections). Pre-rendering these at build time brings the score to 99. Assets are
also currently served unminified.

## Goals

- Pre-render all shared partials into each HTML page at build time
- Minify HTML output for production
- Provide fast live reload during development
- Slot into the existing `uv`-based workflow documented in `README.md`
- Minimize abstraction: source HTML files stay as plain HTML with no new syntax

## Non-goals

- CSS or JS bundling/minification (HTML minification is sufficient for the Lighthouse gain)
- Server-side rendering or dynamic content

## Architecture

```
source HTML files (root, professional/, hobbies/, projects/)
          +
partials (assets/html/*.html)
          |
       build.py
          |
        _site/         <- output directory (gitignored)
```

`build.py` lives at the repo root and is the single entry point for both dev and prod.

## Partial Injection

Source HTML files retain their existing placeholder structure unchanged:

```html
<div id="navbar" class="desktop-only"></div>
<div id="subnavbar" class="desktop-only"></div>
<div id="side-menu"></div>
<footer id="footer"></footer>
```

The build script uses BeautifulSoup to find each placeholder element by ID and replaces
its content with the corresponding file from `assets/html/`.

### Placeholder-to-partial mapping

| Placeholder ID      | Partial file                        | Condition              |
|---------------------|-------------------------------------|------------------------|
| `headers`           | `assets/html/header.html`           | always                 |
| `navbar`            | `assets/html/navbar.html`           | always                 |
| `subnavbar`         | `assets/html/subnavbar_professional.html` | section == professional |
| `subnavbar`         | `assets/html/subnavbar_hobbies.html`     | section == hobbies      |
| `side-menu`         | `assets/html/side_menu.html`        | always                 |
| `footer`            | `assets/html/footer.html`           | always (in footer tag) |
| `top_professional`  | `assets/html/top_professional.html` | homepage only          |
| `top_projects`      | `assets/html/top_projects.html`     | homepage only (outerHTML replace) |

### Active nav highlighting

`highlightCurrentPages()` in `main.js` currently adds `current-page` class to nav
elements at runtime based on `window.location.pathname`. The build script replicates
this at build time: for each output file, it determines the section from the file path
and adds `current-page` to the matching nav link (which already carries a class
matching the section name, e.g. `class="professional"`).

The same logic applies to subnavbar links.

## Build Modes

### Dev (`uv run python build.py --watch`)

1. Run full build to `_site/`
2. Start `livereload` server on `http://localhost:8080` serving `_site/`
3. Watch source HTML files and `assets/html/` partials for changes
4. On change: rebuild affected file(s), browser auto-reloads
5. No minification (output stays readable for debugging)

### Prod (`uv run python build.py`)

1. Run full build to `_site/`
2. Apply `minify-html` to each HTML output file
3. Copy static asset directories unchanged

## Static Asset Handling

Directories and files copied verbatim from source to `_site/`:

- `assets/` (CSS, JS, HTML fragments — the HTML fragments are source-only but copying
  them is harmless and avoids a special-case exclusion)
- `images/`
- `app/`
- `_redirects`
- `robots.txt`
- `sitemap.xml`
- `family_tree.json`

## `main.js` Changes

Remove the functions and call sites that are superseded by build-time injection:

- `loadSection()`
- `replaceWithSection()`
- `initNavbars()`
- `highlightCurrentPages()`
- `loadHomepageSections()`
- Call sites: `loadHomepageSections()` and `initNavbars()` at module level

Retain: `initMenu()`, image modal IIFE, textarea auto-resize, preload animation.

## Workflow Changes

| Before | After |
|--------|-------|
| `bunx live-server` | `uv run python build.py --watch` |
| Netlify serves root directly | Netlify runs `uv run python build.py`, serves `_site/` |

Prettier continues to run on source files unchanged.

## File and Config Changes

- `build.py` — new build script at repo root
- `pyproject.toml` — add dependencies: `beautifulsoup4`, `minify-html`, `livereload`
- `.gitignore` — add `/_site`
- `netlify.toml` — add `[build]` section: `command = "uv run python build.py"`, `publish = "_site"`
- `assets/js/main.js` — remove runtime fetch functions (listed above)
- `README.md` — update dev workflow command

## Dependencies

Added to `pyproject.toml`:

```toml
dependencies = [
    "pillow>=11.3.0",
    "beautifulsoup4>=4.13",
    "minify-html>=0.15",
    "livereload>=2.7",
]
```

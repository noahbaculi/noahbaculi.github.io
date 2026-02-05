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

Run live server:

```shell
bunx live-server
```

Run image generator script:

```shell
uv run python /images/image_generator.py
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

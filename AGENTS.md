# Project agent memory

noahbaculi.github.io: this file is the always-loaded memory for agents working in this repo.
It is kept short on purpose - every line here is paid on every session.

## Learnings

- None recorded yet. backpass adds evidence-backed entries here from real sessions.

- Dev server: `uv run python build.py --watch`. There is no `--serve` or `--dev` flag, and the port is hardcoded to 8080 (`build.py:380`).
- Before starting the dev server, kill whatever already holds port 8080, and stop the server once the check is done.
- Responsive webp variants come from `images/image_generator.py`, not from `build.py`. It skips any output path that already exists (`images/image_generator.py:78`), so delete stale variants before regenerating.
- Measure layout and scroll behavior in a browser before stating it as absolute. Reasoning from the stylesheet alone has produced overstated claims here.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

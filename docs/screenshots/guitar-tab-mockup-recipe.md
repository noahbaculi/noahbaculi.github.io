# Regenerating the guitar tab mockup

`images/projects/guitar_tab_generator/guitar_tab_macbook_mockup.png` is a screenshot of the live demo page composited into a MacBook render. The render came from a mockup-generator template and is not rebuilt here. Only the screen contents are replaced.

The recipe lives in this repo because everything it needs runs here: the dev server, the demo page, and the responsive webp pipeline. `guitar-tab-generator` only receives a copy of the output.

## Inputs

- `docs/screenshots/macbook-mockup-source.png`, the mockup art before anything was composited into it. The published image is overwritten every time this recipe runs, so the untouched render is kept here instead.
- `docs/screenshots/macbook-mockup-template.png`, that same art at 3240x2159 with the screen punched to transparency. Already checked in, rebuild only if the mockup art changes.
- `docs/screenshots/guitar-tab-demo.png`, the 1600x1000 capture of the demo page. Recapture whenever the demo UI changes.

## Rebuild the template

Only needed if the underlying mockup art changes. The screen is a slight trapezoid, drifting about 5px outward on each side from top to bottom, with no corner radius. Deriving the hole from the pixels avoids typing a rectangle that does not fit.

```shell
uv run --quiet --with numpy python - <<'EOF'
import numpy as np
from PIL import Image

SRC = "docs/screenshots/macbook-mockup-source.png"
DST = "docs/screenshots/macbook-mockup-template.png"

arr = np.array(Image.open(SRC).convert("RGBA"))
light = arr[:, :, :3].astype(int).sum(2) > 650  # separates the app background from the bezel

for y in range(270, 1619):  # 270 is the first screen row, 1618 the last full one
    cols = np.flatnonzero(light[y])
    lo, hi = int(cols.min()), int(cols.max())
    arr[y, lo : hi + 1, 3] = 0
arr[1619, lo : hi + 1, 3] = 0  # partial blend row, borrows the last full span

Image.fromarray(arr).save(DST)
EOF
```

> Note: scan rows, never columns. At x=2650 the light region runs to y=1723 because of a highlight on the laptop base, so a column scan reports a screen taller than it is.

> Note: read the source from `docs/screenshots/macbook-mockup-source.png`, not from the published image under `images/`. The published one holds a previous composite, and punching a hole out of that keys the threshold off the tab screenshot rather than the bezel.

## Capture the demo

Start the dev server and leave it running:

```shell
uv run python build.py --watch
```

The capture is 1600x1000, matching the screen's 1.6 aspect. It is taken at a CSS viewport of 1333x833 with a device pixel ratio of 1.2, which renders natively at 1600x1000 while making the UI about 20 percent larger in frame. Do not reach for CSS zoom instead. The demo page's layout fills the viewport exactly at 1.0, so zooming in only pushes the playback bar and the syntax legend out of frame, while shrinking the CSS viewport lets the layout reflow and keep everything visible.

`playwright-cli` has no flag for device pixel ratio, so the capture runs through `run-code` against a context that sets one. The example picker is wired to its `change` event and setting `.value` from script does not fire one, so dispatch it. Generation runs through WASM, so wait on the output element instead of sleeping.

Spacing 2 with a line length of 84 fills the output pane. At the default spacing Greensleeves is about 82 columns, so an 84 character line very nearly fits the whole tune and spills a bare trailing barline onto a second staff, which reads as an empty stave. Spacing 2 stretches it to about 123 columns, which divides into two staves that both carry notes. The pane holds 84 characters at 8.8px each, so 84 is the widest that does not overflow.

```shell
playwright-cli run-code 'async page => {
  const ctx = await page.context().browser().newContext({ viewport: { width: 1333, height: 833 }, deviceScaleFactor: 1.2 });
  const p = await ctx.newPage();
  await p.goto("http://localhost:8080/projects/guitar-tab-generator.html");
  await p.evaluate(() => { const s = document.getElementById("exampleSongs"); s.value = "Greensleeves"; s.dispatchEvent(new Event("change")); });
  await p.waitForFunction(() => { const o = document.getElementById("tabOutput"); return o && !o.classList.contains("is-loading") && !o.classList.contains("is-message") && o.textContent.trim().length > 40; }, null, { timeout: 30000 });
  await p.evaluate(() => { const q = document.getElementById("tabPadding"); q.value = "2"; q.dispatchEvent(new Event("input", { bubbles: true })); const r = document.getElementById("tabLineLength"); r.value = "84"; r.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.waitForTimeout(900);
  await p.evaluate(() => { const t = document.getElementById("toast"); if (t) t.hidden = true; const d = document.querySelector("details[open]"); if (d) d.open = false; document.activeElement?.blur(); window.getSelection()?.removeAllRanges(); window.scrollTo(0, 0); });
  await p.screenshot({ path: "docs/screenshots/guitar-tab-demo.png" });
  await ctx.close();
}'
```

Before trusting the capture, confirm the whole layout landed in frame. `document.documentElement.scrollWidth <= innerWidth` and the same for height should both hold, the arrangement row should still show five cards, and `document.getElementById("pitchInput").value.slice(0, 12)` should start with `A3` and contain `A2C4`. `loadExampleSong` resets the picker back to `examples` after loading, so the select itself is not evidence that anything loaded.

Pass the whole script on one line. Multi-line strings sometimes reach `run-code` mangled and it exits silently, writing no file and printing nothing.

## Composite

The capture is drawn into a box slightly larger than the screen on every side and center-cropped to fill it, which is what `ImageOps.fit` does. The box is a hair wider than the capture's 1.6, so about a pixel comes off the top and bottom. The template goes on top, and its opaque pixels crop the capture to the screen's exact shape, so there is no clip path to write. The screenshot is pasted flat rather than keyed to the laptop's perspective; at 5px of skew across 2160px that does not show.

```shell
mkdir -p .scratch/screenshots
uv run --quiet python - <<'EOF'
from PIL import Image, ImageOps

tpl = Image.open("docs/screenshots/macbook-mockup-template.png").convert("RGBA")
cap = ImageOps.fit(Image.open("docs/screenshots/guitar-tab-demo.png").convert("RGBA"), (2180, 1360))

out = Image.new("RGBA", tpl.size)
out.paste(cap, (530, 265))
out.alpha_composite(tpl)  # the template's opaque pixels crop the capture to the screen
out.save(".scratch/screenshots/demo-composited.png")
EOF
```

## Publish

`image_generator.py` skips any output that already exists, so delete the old variants first or nothing is written.

```shell
cp .scratch/screenshots/demo-composited.png images/projects/guitar_tab_generator/guitar_tab_macbook_mockup.png
rm images/projects/guitar_tab_generator/guitar_tab_macbook_mockup-*_w.webp
uv run python images/image_generator.py
cp .scratch/screenshots/demo-composited.png ~/github/guitar-tab-generator/examples/demo_mockup.png
```

The filenames and widths do not change, so `images/update_img_tags.py` does not need to run. The last line assumes `guitar-tab-generator` is checked out at `~/github`.

## Check the result

Look at the composite. A pixel diff against the previous image proves nothing, because the demo tune is picked deliberately and the new image is meant to differ.

- The screenshot sits inside the bezel with no seam and no bleed over the frame, especially at the top and bottom corners where the trapezoid drift is largest.
- The tab actually rendered, rather than the page sitting in an empty, loading, or error state.

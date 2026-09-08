/**
 * Pure helpers for the guitar tab demo. No DOM, no WASM, no audio, so each function is
 * unit-testable on its own. guitartab.js imports these and handles the wiring.
 */

/** Count plus a noun, pluralized: countNoun(1, "line") is "1 line", countNoun(2, "line") is "2 lines". */
function countNoun(count, singular, plural) {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

/** Format `{ line, label }` records as an indented list: "    line 3    H4". */
function indentLineList(records) {
  return records.map((r) => `    line ${r.line}    ${r.label}`).join("\n");
}

/**
 * Turn a typed TabError into a friendly plain-text message for the output box. Covers the
 * variants reachable from generateArrangements and render; the default arm keeps a readable
 * message for the lower-level or future variants the #[non_exhaustive] enum may add.
 */
export function formatTabError(err) {
  const kind = err && err.kind;
  switch (kind) {
    case "parse": {
      const list = indentLineList(
        err.errors.map((e) => ({ line: e.line, label: e.text })),
      );
      return `Couldn't read ${countNoun(err.errors.length, "line")} as pitches:\n\n${list}\n\nFix or remove them and the tab will update.`;
    }
    case "unplayablePitches": {
      const list = indentLineList(
        err.pitches.map((p) => ({ line: p.line, label: p.value })),
      );
      return `${countNoun(err.pitches.length, "pitch", "pitches")} can't be played with this guitar:\n\n${list}\n\nTry a different capo or tuning, or remove these notes.`;
    }
    case "noArrangementsFound":
      return "No playable arrangement was found for these notes.";
    case "tuningNameUnknown":
      return `Unknown tuning "${err.value}". Pick a listed tuning.`;
    case "capoExceedsFrets":
      return `The capo (fret ${err.capo}) can't be higher than the number of frets (${err.numFrets}).`;
    case "capoTooHigh":
      return `The capo (fret ${err.capo}) is too high. The maximum is ${err.max}.`;
    case "numFretsTooHigh":
      return `Too many frets (${err.numFrets}). The maximum is ${err.max}.`;
    case "renderWidthTooSmall":
      return "The line length is too short to draw the tab. Increase the Line Length.";
    case "inputTooManyLines":
      return `That's too many lines of input. The maximum is ${err.max}.`;
    case "difficultyWeightOutOfRange":
      return `The ${err.field} weight must be a finite number of 0 or more.`;
    default:
      return `Couldn't generate a tab${kind ? ` (${kind})` : ""}.`;
  }
}

/** parseInt with a fallback for blank or non-numeric values. */
function intOr(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

// The demo requests a small ranked set so the selector can show several arrangements. Yen's
// k-shortest-paths may return fewer (set.len), which the selector handles.
const NUM_ARRANGEMENTS = 5;

/**
 * Top notch of the Max Fret Span slider, one past the widest real span. Sitting at it means no
 * filter at all, which is the loosest setting and so belongs at the loose end of the track.
 */
export const MAX_FRET_SPAN_ANY = 7;

/**
 * Build the TabInput for generateArrangements from raw control values. The fret count is fixed
 * for this demo and the arrangement count is NUM_ARRANGEMENTS. maxFretSpanValue is the Max Fret
 * Span slider value: MAX_FRET_SPAN_ANY (or anything unparseable) omits the filter; any other
 * value is parsed to an integer and passed as maxFretSpanFilter. weights is the
 * difficulty-coefficient override; omitting it leaves the crate's built-in ranking in place.
 */
export function buildTabInput({
  pitches,
  tuningName,
  capoValue,
  maxFretSpanValue,
  weights,
}) {
  const tabInput = {
    input: pitches,
    tuningName: tuningName || "standard",
    guitarNumFrets: 18,
    guitarCapo: intOr(capoValue, 0),
    numArrangements: NUM_ARRANGEMENTS,
  };
  const span = parseInt(maxFretSpanValue, 10);
  if (!Number.isNaN(span) && span < MAX_FRET_SPAN_ANY) {
    tabInput.maxFretSpanFilter = span;
  }
  if (weights) {
    tabInput.difficultyWeights = weights;
  }
  return tabInput;
}

/**
 * Coefficient behind each priority chip, low to high. The scale is logarithmic because the
 * ranking barely moves under about 100:1, so the labels are ordinal words rather than the raw
 * numbers, which an evenly spaced row of boxes would misrepresent.
 */
export const PRIORITY_LEVELS = [
  { label: "Ignore", weight: 0 },
  { label: "Low", weight: 1 },
  { label: "Medium", weight: 10 },
  { label: "High", weight: 100 },
];

/** The three difficulty axes in wire order, labelled by the musical effect each one buys. */
export const PRIORITY_AXES = [
  { key: "movement", label: "Keep the hand still" },
  { key: "span", label: "Keep fingers together" },
  { key: "position", label: "Stay near the nut" },
];

/**
 * Named weight triples, used to label the current state rather than to set it. Each of the last
 * three pins one axis at 100 so the tradeoff it isolates stands out against the other two.
 */
export const DIFFICULTY_PRESETS = [
  {
    id: "balanced",
    label: "Balanced",
    weights: { movement: 1, span: 1, position: 1 },
  },
  {
    id: "stillHand",
    label: "Still Hand",
    weights: { movement: 100, span: 1, position: 1 },
  },
  {
    id: "easyReach",
    label: "Easy Reach",
    weights: { movement: 10, span: 100, position: 1 },
  },
  {
    id: "lowNeck",
    label: "Low Neck",
    weights: { movement: 1, span: 10, position: 100 },
  },
];

/** Scale a weight triple so its largest coefficient is 1, or null when all three are zero. */
function weightRatio({ movement, span, position }) {
  const max = Math.max(movement, span, position);
  if (max <= 0) {
    return null;
  }
  return [movement / max, span / max, position / max];
}

/**
 * Id of the preset whose ratio matches these weights, or null when none does. Compares ratios
 * rather than raw values, since 3.0.0 ranks on the ratio alone and 200 / 20 / 2 is Standard.
 */
export function matchPresetId(weights) {
  const target = weightRatio(weights);
  if (!target) {
    return null;
  }
  const hit = DIFFICULTY_PRESETS.find((preset) => {
    const ratio = weightRatio(preset.weights);
    return ratio.every((value, i) => Math.abs(value - target[i]) < 1e-9);
  });
  return hit ? hit.id : null;
}

/**
 * Summary line for the priority disclosure: the preset name over its own triple when the ratio
 * is a named one, and the bare triple otherwise. The numbers stay visible so a reader can
 * reproduce the call through `TabInput.difficultyWeights`.
 */
export function prioritySummary(weights) {
  const triple = `${weights.movement} / ${weights.span} / ${weights.position}`;
  const preset = DIFFICULTY_PRESETS.find(
    (candidate) => candidate.id === matchPresetId(weights),
  );
  return preset ? `${preset.label} (${triple})` : triple;
}

/**
 * Flatten normalizedInput into a playback schedule. Each entry is one input beat. Measure
 * breaks are kept (so playback can skip them) but do not advance the render cursor; rests and
 * playable beats each take one cursor position, matching the index ArrangementSet.render
 * expects for its playback argument (it counts non-measure-break beats).
 */
export function buildPlaybackSchedule(normalizedInput) {
  const schedule = [];
  let cursor = 0;
  for (const beat of normalizedInput) {
    if (beat.kind === "measureBreak") {
      schedule.push({ kind: "measureBreak", pitches: [], cursor: null });
    } else if (beat.kind === "rest") {
      schedule.push({ kind: "rest", pitches: [], cursor });
      cursor += 1;
    } else {
      schedule.push({ kind: "playable", pitches: beat.pitches, cursor });
      cursor += 1;
    }
  }
  return schedule;
}

/**
 * Card view-models for the arrangement selector, one per returned arrangement. `rank` is the
 * numeral printed on the card, one-based over the easiest-first set, so rank 1 is the easiest.
 * `label` spells the same position out for the button's accessible name, since the numeral
 * alone reads as nothing to a screen reader.
 */
export function buildArrangementChips({ difficulties, spans }) {
  return difficulties.map((difficulty, index) => ({
    index,
    rank: index + 1,
    label: `Arrangement ${index + 1}`,
    rawDifficulty: difficulty,
    span: spans[index],
  }));
}

/** Number of advancing beats in a schedule (cursor positions), used to size the progress bar. */
export function playbackTotalBeats(schedule) {
  return schedule.filter((entry) => entry.cursor !== null).length;
}

/**
 * Next index for an arrow, Home, or End key within a wrapping roving-tabindex list. Returns null
 * for any other key or an empty list, so callers can leave the event alone.
 */
export function nextRovingIndex(key, current, count) {
  if (count === 0) {
    return null;
  }
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

// px, the widest a card gets: "Max span 4" over "Difficulty 1085.0"
const CARD_MIN = 131;
// px, the 0.5rem grid gap
const CARD_GAP = 8;

/**
 * Returns how many arrangement cards fit across a container of this `width`, measured rather
 * than read off a viewport breakpoint list, so the input column can be resized without a table
 * going stale. A `width` of 0 (never measured) or `Infinity` (mobile, where the strip scrolls)
 * means no constraint. The count always reaches `selectedIndex`, so resizing cannot hide the
 * arrangement being viewed.
 */
export function visibleChipCount({ width, total, selectedIndex }) {
  if (total === 0) {
    return 0;
  }
  const measured = width > 0 ? width : Infinity;
  const fits = Math.floor((measured + CARD_GAP) / (CARD_MIN + CARD_GAP));
  const count = Math.min(total, Math.max(1, fits));
  return Math.max(count, selectedIndex + 1);
}

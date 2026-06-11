/**
 * Pure helpers for the guitar tab demo. No DOM, no WASM, no audio, so each function is
 * unit-testable on its own. guitartab.js imports these and handles the wiring.
 */

/** Count plus a noun, pluralized: countNoun(1, "line") is "1 line", countNoun(2, "line") is "2 lines". */
function countNoun(count, singular, plural) {
  const word = count === 1 ? singular : plural ?? `${singular}s`;
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
      const list = indentLineList(err.errors.map((e) => ({ line: e.line, label: e.text })));
      return `Couldn't read ${countNoun(err.errors.length, "line")} as pitches:\n\n${list}\n\nFix or remove them and the tab will update.`;
    }
    case "unplayablePitches": {
      const list = indentLineList(err.pitches.map((p) => ({ line: p.line, label: p.value })));
      return `${countNoun(err.pitches.length, "pitch", "pitches")} can't be played in this tuning:\n\n${list}\n\nTry a different tuning, or remove these notes.`;
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
    default:
      return `Couldn't generate a tab${kind ? ` (${kind})` : ""}.`;
  }
}

/** parseInt with a fallback for blank or non-numeric values. */
function intOr(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Build the TabInput for generateArrangements from raw control values. The fret count and
 * arrangement count are fixed for this demo. maxFretSpanValue is the Max Fret Span dropdown
 * value: the empty string (the "Any" option) omits the filter; any other value is parsed to
 * an integer and passed as maxFretSpanFilter.
 */
export function buildTabInput({ pitches, tuningName, capoValue, maxFretSpanValue }) {
  const tabInput = {
    input: pitches,
    tuningName: tuningName || "standard",
    guitarNumFrets: 18,
    guitarCapo: intOr(capoValue, 0),
    numArrangements: 1,
  };
  const span = parseInt(maxFretSpanValue, 10);
  if (!Number.isNaN(span)) {
    tabInput.maxFretSpanFilter = span;
  }
  return tabInput;
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

// Three relative difficulty labels, easiest first. The set is small (numArrangements is 3),
// so labels rank the returned arrangements against each other, not an absolute scale.
const DIFFICULTY_LABELS = ["Easiest", "Easy", "Medium"];

// Normalize a score against the set's min and max. A one-arrangement (or all-equal) set has no
// spread, so it reads as fully filled rather than dividing by zero.
function difficultyFraction(difficulties, index) {
  const lo = Math.min(...difficulties);
  const hi = Math.max(...difficulties);
  return hi === lo ? 1 : (difficulties[index] - lo) / (hi - lo);
}

// 1..4 dots: the easiest always shows one, the hardest in the set shows four.
function difficultyDotCount(fraction) {
  return Math.round(fraction * 3) + 1;
}

// Bucket by rank within the set. Ties share the lower rank, so equal scores get the same label.
function difficultyLabel(difficulties, index) {
  const sorted = [...difficulties].sort((a, b) => a - b);
  const rank = sorted.indexOf(difficulties[index]);
  const bucket = Math.min(
    DIFFICULTY_LABELS.length - 1,
    Math.floor((rank / difficulties.length) * DIFFICULTY_LABELS.length),
  );
  return DIFFICULTY_LABELS[bucket];
}

/**
 * Chip view-models for the arrangement selector, one per returned arrangement. Takes the raw
 * difficulty and span arrays the glue reads off the ArrangementSet handle and returns the label,
 * dot count, and numbers each chip shows.
 */
export function buildArrangementChips({ difficulties, spans }) {
  return difficulties.map((difficulty, index) => ({
    index,
    label: difficultyLabel(difficulties, index),
    dotCount: difficultyDotCount(difficultyFraction(difficulties, index)),
    difficulty,
    span: spans[index],
  }));
}

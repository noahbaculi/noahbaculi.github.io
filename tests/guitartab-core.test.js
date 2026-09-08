import { test, expect, describe } from "bun:test";
import { formatTabError } from "../assets/js/guitartab-core.js";

describe("formatTabError", () => {
  test("parse error lists each failing line", () => {
    const msg = formatTabError({
      kind: "parse",
      errors: [
        { line: 3, text: "H4" },
        { line: 7, text: "xyz" },
      ],
    });
    expect(msg).toContain("Couldn't read 2 lines as pitches:");
    expect(msg).toContain("    line 3    H4");
    expect(msg).toContain("    line 7    xyz");
    expect(msg).toContain("Fix or remove them");
  });

  test("parse error uses the singular for one line", () => {
    const msg = formatTabError({
      kind: "parse",
      errors: [{ line: 2, text: "Q" }],
    });
    expect(msg).toContain("Couldn't read 1 line as pitches:");
  });

  test("unplayable pitches list the offending notes", () => {
    const msg = formatTabError({
      kind: "unplayablePitches",
      pitches: [
        { value: "B0", line: 4 },
        { value: "A0", line: 9 },
      ],
    });
    expect(msg).toContain("2 pitches can't be played with this guitar:");
    expect(msg).toContain("    line 4    B0");
    expect(msg).toContain("    line 9    A0");
  });

  test("noArrangementsFound has a friendly message", () => {
    expect(formatTabError({ kind: "noArrangementsFound" })).toBe(
      "No playable arrangement was found for these notes.",
    );
  });

  test("renderWidthTooSmall points at the line length", () => {
    expect(
      formatTabError({ kind: "renderWidthTooSmall", width: 5, min: 12 }),
    ).toContain("Increase the Line Length");
  });

  test("an unknown kind names the kind in a generic message", () => {
    expect(formatTabError({ kind: "somethingNew" })).toBe(
      "Couldn't generate a tab (somethingNew).",
    );
  });

  test("a missing error object falls back to a generic message", () => {
    expect(formatTabError(null)).toBe("Couldn't generate a tab.");
  });

  // These arms interpolate payload fields, so assert the values reach the message: a
  // mistyped field name would render "undefined" and fail here rather than slip through.
  test("tuningNameUnknown names the rejected tuning", () => {
    const msg = formatTabError({ kind: "tuningNameUnknown", value: "openX" });
    expect(msg).toContain('"openX"');
    expect(msg).toContain("Pick a listed tuning");
  });

  test("capoExceedsFrets shows the capo and fret count", () => {
    const msg = formatTabError({
      kind: "capoExceedsFrets",
      capo: 20,
      numFrets: 18,
    });
    expect(msg).toContain("20");
    expect(msg).toContain("18");
  });

  test("capoTooHigh shows the capo and its maximum", () => {
    const msg = formatTabError({ kind: "capoTooHigh", capo: 30, max: 12 });
    expect(msg).toContain("30");
    expect(msg).toContain("12");
  });

  test("numFretsTooHigh shows the fret count and its maximum", () => {
    const msg = formatTabError({
      kind: "numFretsTooHigh",
      numFrets: 50,
      max: 30,
    });
    expect(msg).toContain("50");
    expect(msg).toContain("30");
  });

  test("inputTooManyLines shows the line maximum", () => {
    expect(formatTabError({ kind: "inputTooManyLines", max: 65535 })).toContain(
      "65535",
    );
  });

  test("difficultyWeightOutOfRange names the offending coefficient", () => {
    const msg = formatTabError({
      kind: "difficultyWeightOutOfRange",
      field: "span",
    });
    expect(msg).toContain("span");
    expect(msg).not.toContain("undefined");
  });
});

import {
  buildTabInput,
  MAX_FRET_SPAN_ANY,
} from "../assets/js/guitartab-core.js";

describe("buildTabInput", () => {
  const base = {
    pitches: "E4\nA2",
    tuningName: "standard",
    capoValue: "0",
    maxFretSpanValue: "",
  };

  test("omits maxFretSpanFilter when the span is Any (empty string)", () => {
    const r = buildTabInput(base);
    expect("maxFretSpanFilter" in r).toBe(false);
  });

  test("omits maxFretSpanFilter at the slider's Any notch", () => {
    const r = buildTabInput({
      ...base,
      maxFretSpanValue: String(MAX_FRET_SPAN_ANY),
    });
    expect("maxFretSpanFilter" in r).toBe(false);
  });

  test("includes maxFretSpanFilter as an integer when a span is chosen", () => {
    const r = buildTabInput({ ...base, maxFretSpanValue: "3" });
    expect(r.maxFretSpanFilter).toBe(3);
  });

  test("keeps the filter at the widest real span, one below the Any notch", () => {
    const r = buildTabInput({
      ...base,
      maxFretSpanValue: String(MAX_FRET_SPAN_ANY - 1),
    });
    expect(r.maxFretSpanFilter).toBe(MAX_FRET_SPAN_ANY - 1);
  });

  test("parses the capo and keeps the fixed fret and arrangement counts", () => {
    const r = buildTabInput({ ...base, capoValue: "2" });
    expect(r.guitarCapo).toBe(2);
    expect(r.guitarNumFrets).toBe(18);
    expect(r.numArrangements).toBe(5);
  });

  test("defaults a blank capo to 0", () => {
    expect(buildTabInput({ ...base, capoValue: "" }).guitarCapo).toBe(0);
  });

  test("passes the tuning through and defaults a blank tuning to standard", () => {
    expect(buildTabInput({ ...base, tuningName: "openD" }).tuningName).toBe(
      "openD",
    );
    expect(buildTabInput({ ...base, tuningName: "" }).tuningName).toBe(
      "standard",
    );
  });

  test("passes the raw pitch text through as input", () => {
    expect(buildTabInput(base).input).toBe("E4\nA2");
  });

  test("omits difficultyWeights when no weights are passed", () => {
    expect("difficultyWeights" in buildTabInput(base)).toBe(false);
  });

  test("passes the three weights through as difficultyWeights", () => {
    const r = buildTabInput({
      ...base,
      weights: { movement: 100, span: 10, position: 1 },
    });
    expect(r.difficultyWeights).toEqual({
      movement: 100,
      span: 10,
      position: 1,
    });
  });

  test("keeps all-zero weights, which the crate accepts", () => {
    const r = buildTabInput({
      ...base,
      weights: { movement: 0, span: 0, position: 0 },
    });
    expect(r.difficultyWeights).toEqual({ movement: 0, span: 0, position: 0 });
  });
});

import { buildPlaybackSchedule } from "../assets/js/guitartab-core.js";

describe("buildPlaybackSchedule", () => {
  test("assigns cursors to playable and rest beats, skipping measure breaks", () => {
    const schedule = buildPlaybackSchedule([
      { kind: "playable", pitches: ["E4"] },
      { kind: "measureBreak" },
      { kind: "rest" },
      { kind: "playable", pitches: ["A2", "A3"] },
    ]);
    expect(schedule).toEqual([
      { kind: "playable", pitches: ["E4"], cursor: 0 },
      { kind: "measureBreak", pitches: [], cursor: null },
      { kind: "rest", pitches: [], cursor: 1 },
      { kind: "playable", pitches: ["A2", "A3"], cursor: 2 },
    ]);
  });

  test("returns an empty schedule for empty input", () => {
    expect(buildPlaybackSchedule([])).toEqual([]);
  });
});

import { buildArrangementChips } from "../assets/js/guitartab-core.js";

describe("buildArrangementChips", () => {
  test("numbers pills by position and carries the span", () => {
    const chips = buildArrangementChips({
      difficulties: [10, 11, 13],
      spans: [2, 3, 4],
    });
    expect(chips).toEqual([
      { index: 0, rank: 1, label: "Arrangement 1", rawDifficulty: 10, span: 2 },
      { index: 1, rank: 2, label: "Arrangement 2", rawDifficulty: 11, span: 3 },
      { index: 2, rank: 3, label: "Arrangement 3", rawDifficulty: 13, span: 4 },
    ]);
  });

  test("rank is the one-based position printed on the card", () => {
    const chips = buildArrangementChips({
      difficulties: [10, 12, 14, 16, 18],
      spans: [2, 3, 4, 5, 6],
    });
    expect(chips.map((c) => c.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  test("numbers five arrangements one through five", () => {
    const chips = buildArrangementChips({
      difficulties: [10, 12, 14, 16, 18],
      spans: [2, 3, 4, 5, 6],
    });
    expect(chips.map((c) => c.label)).toEqual([
      "Arrangement 1",
      "Arrangement 2",
      "Arrangement 3",
      "Arrangement 4",
      "Arrangement 5",
    ]);
  });

  test("a single arrangement is Arrangement 1", () => {
    expect(buildArrangementChips({ difficulties: [30], spans: [3] })).toEqual([
      { index: 0, rank: 1, label: "Arrangement 1", rawDifficulty: 30, span: 3 },
    ]);
  });

  // 3.0.0 dropped the `as i32` truncation, so the raw score arrives fractional and has to reach
  // the tooltip unrounded.
  test("carries the fractional raw score through unrounded", () => {
    const chips = buildArrangementChips({
      difficulties: [412.64, 500.5],
      spans: [3, 4],
    });
    expect(chips.map((c) => c.rawDifficulty)).toEqual([412.64, 500.5]);
  });
});

import { playbackTotalBeats } from "../assets/js/guitartab-core.js";

describe("playbackTotalBeats", () => {
  test("counts cursor positions and skips measure breaks", () => {
    const schedule = [
      { kind: "playable", pitches: ["E4"], cursor: 0 },
      { kind: "measureBreak", pitches: [], cursor: null },
      { kind: "rest", pitches: [], cursor: 1 },
      { kind: "playable", pitches: ["A2", "A3"], cursor: 2 },
    ];
    expect(playbackTotalBeats(schedule)).toBe(3);
  });

  test("an empty schedule has zero beats", () => {
    expect(playbackTotalBeats([])).toBe(0);
  });
});

import {
  DIFFICULTY_PRESETS,
  PRIORITY_AXES,
  PRIORITY_LEVELS,
  matchPresetId,
  nextRovingIndex,
  prioritySummary,
} from "../assets/js/guitartab-core.js";

describe("PRIORITY_LEVELS", () => {
  test("holds the four labels in ascending order", () => {
    expect(PRIORITY_LEVELS.map((level) => level.label)).toEqual([
      "Ignore",
      "Low",
      "Medium",
      "High",
    ]);
  });

  test("carries the spec's logarithmic coefficients", () => {
    expect(PRIORITY_LEVELS.map((level) => level.weight)).toEqual([
      0, 1, 10, 100,
    ]);
  });
});

describe("PRIORITY_AXES", () => {
  test("holds the three coefficient keys in wire order", () => {
    expect(PRIORITY_AXES.map((axis) => axis.key)).toEqual([
      "movement",
      "span",
      "position",
    ]);
  });

  // The rows name the musical effect, not the coefficient, so no axis label may be the bare key.
  test("labels each axis by its musical effect", () => {
    expect(PRIORITY_AXES.map((axis) => axis.label)).toEqual([
      "Keep the hand still",
      "Keep fingers together",
      "Stay near the nut",
    ]);
  });
});

describe("DIFFICULTY_PRESETS", () => {
  test("holds the four presets in spec order", () => {
    expect(DIFFICULTY_PRESETS.map((p) => p.id)).toEqual([
      "balanced",
      "stillHand",
      "easyReach",
      "lowNeck",
    ]);
  });

  test("carries the spec's exact coefficients", () => {
    expect(DIFFICULTY_PRESETS.map((p) => p.weights)).toEqual([
      { movement: 1, span: 1, position: 1 },
      { movement: 100, span: 1, position: 1 },
      { movement: 10, span: 100, position: 1 },
      { movement: 1, span: 10, position: 100 },
    ]);
  });

  // Every preset has to be reachable by clicking, which means every coefficient has to be one of
  // the four levels the chips offer.
  test("every coefficient is a level the chips can reach", () => {
    const reachable = PRIORITY_LEVELS.map((level) => level.weight);
    for (const preset of DIFFICULTY_PRESETS) {
      for (const value of Object.values(preset.weights)) {
        expect(reachable).toContain(value);
      }
    }
  });

  test("each preset has a label", () => {
    for (const preset of DIFFICULTY_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });
});

describe("matchPresetId", () => {
  test("matches a preset on its exact values", () => {
    expect(matchPresetId({ movement: 1, span: 1, position: 1 })).toBe(
      "balanced",
    );
    expect(matchPresetId({ movement: 1, span: 10, position: 100 })).toBe(
      "lowNeck",
    );
  });

  // Only the ratio affects ranking, so a scaled triple is the same preset. High / High / High
  // and Low / Low / Low are both Balanced.
  test("matches a scaled triple, since only the ratio matters", () => {
    expect(matchPresetId({ movement: 100, span: 100, position: 100 })).toBe(
      "balanced",
    );
  });

  test("returns null when no preset matches", () => {
    expect(matchPresetId({ movement: 100, span: 100, position: 1 })).toBe(null);
  });

  test("returns null for all-zero weights, which have no ratio", () => {
    expect(matchPresetId({ movement: 0, span: 0, position: 0 })).toBe(null);
  });
});

describe("prioritySummary", () => {
  test("names the preset and shows the triple behind it", () => {
    expect(prioritySummary({ movement: 1, span: 1, position: 1 })).toBe(
      "Balanced (1 / 1 / 1)",
    );
    expect(prioritySummary({ movement: 100, span: 1, position: 1 })).toBe(
      "Still Hand (100 / 1 / 1)",
    );
  });

  test("keeps the reader's own numbers when a scaled triple names a preset", () => {
    expect(prioritySummary({ movement: 100, span: 100, position: 100 })).toBe(
      "Balanced (100 / 100 / 100)",
    );
  });

  test("falls back to the bare triple when no preset matches", () => {
    expect(prioritySummary({ movement: 100, span: 100, position: 1 })).toBe(
      "100 / 100 / 1",
    );
  });

  test("falls back to the bare triple for all-zero weights", () => {
    expect(prioritySummary({ movement: 0, span: 0, position: 0 })).toBe(
      "0 / 0 / 0",
    );
  });
});

describe("nextRovingIndex", () => {
  test("moves forward and wraps past the end", () => {
    expect(nextRovingIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextRovingIndex("ArrowDown", 2, 3)).toBe(0);
  });

  test("moves back and wraps past the start", () => {
    expect(nextRovingIndex("ArrowLeft", 1, 3)).toBe(0);
    expect(nextRovingIndex("ArrowUp", 0, 3)).toBe(2);
  });

  test("wraps at the visible count, not the full set length", () => {
    // 3 of 5 cards on screen: right from the last visible card returns to the first
    expect(nextRovingIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextRovingIndex("End", 0, 3)).toBe(2);
  });

  test("Home and End jump to the ends", () => {
    expect(nextRovingIndex("Home", 2, 3)).toBe(0);
    expect(nextRovingIndex("End", 0, 3)).toBe(2);
  });

  test("returns null for a key that is not navigation", () => {
    expect(nextRovingIndex("Enter", 0, 3)).toBe(null);
    expect(nextRovingIndex("a", 0, 3)).toBe(null);
  });

  test("returns null for an empty list", () => {
    expect(nextRovingIndex("ArrowRight", 0, 0)).toBe(null);
  });
});

import { visibleChipCount } from "../assets/js/guitartab-core.js";

describe("visibleChipCount", () => {
  test("fits as many cards as the width allows", () => {
    // CARD_MIN 131 + GAP 8: 5 cards need 687px, 4 need 548px, 3 need 409px
    expect(visibleChipCount({ width: 808, total: 5, selectedIndex: 0 })).toBe(
      5,
    );
    expect(visibleChipCount({ width: 578, total: 5, selectedIndex: 0 })).toBe(
      4,
    );
    expect(visibleChipCount({ width: 466, total: 5, selectedIndex: 0 })).toBe(
      3,
    );
    expect(visibleChipCount({ width: 394, total: 5, selectedIndex: 0 })).toBe(
      2,
    );
  });

  test("never exceeds the number of arrangements the solver returned", () => {
    expect(visibleChipCount({ width: 2000, total: 3, selectedIndex: 0 })).toBe(
      3,
    );
  });

  test("shows at least one card even in a container too narrow for one", () => {
    expect(visibleChipCount({ width: 40, total: 5, selectedIndex: 0 })).toBe(1);
  });

  test("extends the slice so the selected card is never hidden", () => {
    // 394px fits 2, but arrangement 5 is selected, so the slice runs to it
    expect(visibleChipCount({ width: 394, total: 5, selectedIndex: 4 })).toBe(
      5,
    );
    expect(visibleChipCount({ width: 394, total: 5, selectedIndex: 2 })).toBe(
      3,
    );
  });

  test("a selection inside the slice does not widen it", () => {
    expect(visibleChipCount({ width: 808, total: 5, selectedIndex: 1 })).toBe(
      5,
    );
    expect(visibleChipCount({ width: 466, total: 5, selectedIndex: 1 })).toBe(
      3,
    );
  });

  test("an unmeasured or unconstrained container shows everything", () => {
    expect(
      visibleChipCount({ width: Infinity, total: 5, selectedIndex: 0 }),
    ).toBe(5);
    expect(visibleChipCount({ width: 0, total: 5, selectedIndex: 0 })).toBe(5);
  });

  test("an empty set is zero, not one", () => {
    expect(visibleChipCount({ width: 808, total: 0, selectedIndex: 0 })).toBe(
      0,
    );
  });
});

import { hasPitchInput } from "../assets/js/guitartab-core.js";

describe("hasPitchInput", () => {
  test("blank and whitespace-only input has no notes", () => {
    expect(hasPitchInput("")).toBe(false);
    expect(hasPitchInput("   \n\t\n  ")).toBe(false);
  });

  test("rests and measure breaks alone have no notes", () => {
    expect(hasPitchInput("---\n\n---\n")).toBe(false);
    expect(hasPitchInput("  ---  ")).toBe(false);
  });

  test("a single pitch counts", () => {
    expect(hasPitchInput("\n---\nE4\n")).toBe(true);
  });

  test("undefined input has no notes", () => {
    expect(hasPitchInput(undefined)).toBe(false);
  });
});

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
    const msg = formatTabError({ kind: "parse", errors: [{ line: 2, text: "Q" }] });
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
    expect(msg).toContain("2 pitches can't be played in this tuning:");
    expect(msg).toContain("    line 4    B0");
    expect(msg).toContain("    line 9    A0");
  });

  test("noArrangementsFound has a friendly message", () => {
    expect(formatTabError({ kind: "noArrangementsFound" })).toBe(
      "No playable arrangement was found for these notes.",
    );
  });

  test("renderWidthTooSmall points at the line length", () => {
    expect(formatTabError({ kind: "renderWidthTooSmall", width: 5, min: 12 })).toContain(
      "Increase the Line Length",
    );
  });

  test("an unknown kind names the kind in a generic message", () => {
    expect(formatTabError({ kind: "somethingNew" })).toBe(
      "Couldn't generate a tab (somethingNew).",
    );
  });

  test("a missing error object falls back to a generic message", () => {
    expect(formatTabError(null)).toBe("Couldn't generate a tab.");
  });
});

import { buildTabInput } from "../assets/js/guitartab-core.js";

describe("buildTabInput", () => {
  const base = { pitches: "E4\nA2", tuningName: "standard", capoValue: "0", maxFretSpanValue: "" };

  test("omits maxFretSpanFilter when the span is Any (empty string)", () => {
    const r = buildTabInput(base);
    expect("maxFretSpanFilter" in r).toBe(false);
  });

  test("includes maxFretSpanFilter as an integer when a span is chosen", () => {
    const r = buildTabInput({ ...base, maxFretSpanValue: "3" });
    expect(r.maxFretSpanFilter).toBe(3);
  });

  test("parses the capo and keeps the fixed fret and arrangement counts", () => {
    const r = buildTabInput({ ...base, capoValue: "2" });
    expect(r.guitarCapo).toBe(2);
    expect(r.guitarNumFrets).toBe(18);
    expect(r.numArrangements).toBe(1);
  });

  test("defaults a blank capo to 0", () => {
    expect(buildTabInput({ ...base, capoValue: "" }).guitarCapo).toBe(0);
  });

  test("passes the tuning through and defaults a blank tuning to standard", () => {
    expect(buildTabInput({ ...base, tuningName: "openD" }).tuningName).toBe("openD");
    expect(buildTabInput({ ...base, tuningName: "" }).tuningName).toBe("standard");
  });

  test("passes the raw pitch text through as input", () => {
    expect(buildTabInput(base).input).toBe("E4\nA2");
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

import init, { generateArrangements } from "../wasm_guitar_tab_generator/guitar_tab_generator.js";
import {
  formatTabError,
  buildTabInput,
  buildPlaybackSchedule,
  buildArrangementChips,
  playbackTotalBeats,
} from "./guitartab-core.js";

await init();

// ---- cached arrangement state -------------------------------------------------------------
// generateArrangements returns an opaque ArrangementSet handle. We keep one cached set and
// re-render it cheaply for display-setting and playback changes; pathfinding only re-runs when
// the input, tuning, capo, or fret-span filter changes. The handle must be freed before it is
// replaced or it leaks WASM memory.
const state = { set: null, normalizedInput: null, selectedIndex: 0 };

// ---- playback state -----------------------------------------------------------------------
let playbackSchedule = null;
let playbackStep = 0;
let playbackInterval = null;
let playbackSynth = null;
let playbackTotal = 0;

// ---- small DOM helpers --------------------------------------------------------------------
function el(id) {
  return document.getElementById(id);
}
function intValue(id, fallback) {
  const n = parseInt(el(id).value, 10);
  return Number.isNaN(n) ? fallback : n;
}

// ---- toast ---------------------------------------------------------------------------------
let toastTimer = null;
function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2000);
}

// ---- generation scheduling ----------------------------------------------------------------
// Pathfinding runs synchronously in WASM, so back-to-back input events would each block the UI.
// Debounce them, and keep a token so a superseded run never renders. When the previous run was
// slow (> ~300ms), show a skeleton and yield one frame so it paints before the next blocking run.
let pendingTimer = null;
let generationToken = 0;
let lastRunMs = 0;

function requestRegenerate() {
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    const token = ++generationToken;
    if (lastRunMs > 300) {
      setLoading(true);
      requestAnimationFrame(() => {
        if (token !== generationToken) return; // a newer request superseded this one
        runGeneration();
        setLoading(false);
      });
    } else {
      runGeneration();
    }
  }, 200);
}

function runGeneration() {
  const start = performance.now();
  newTab();
  lastRunMs = performance.now() - start;
}

function setLoading(on) {
  el("arrangementSelector").classList.toggle("is-loading", on);
  el("tabOutput").classList.toggle("is-loading", on);
}

function regenerate() {
  const startTime = performance.now();

  // Free the previous handle before replacing it.
  if (state.set) {
    state.set.free();
    state.set = null;
  }
  state.normalizedInput = null;

  const tabInput = buildTabInput({
    pitches: el("pitchInput").value,
    tuningName: el("guitarTuning").value,
    capoValue: el("guitarCapo").value,
    maxFretSpanValue: el("maxFretSpan").value,
  });

  try {
    state.set = generateArrangements(tabInput);
  } catch (error) {
    console.warn(error);
    showMessage(formatTabError(error));
    return;
  }

  state.normalizedInput = state.set.normalizedInput;
  const duration = (performance.now() - startTime).toFixed(1);
  console.info(`Arrangement generated in ${duration} ms`, state.set);

  // An aggressive Max Fret Span can filter out every arrangement. That returns Ok with an
  // empty set, not an error.
  if (state.set.isEmpty) {
    const span = el("maxFretSpan").value;
    showMessage(
      `No playable arrangement fits within a ${span}-fret span.\nRaise the Max Fret Span (or set it to Any) to see results.`,
    );
    return;
  }

  state.selectedIndex = 0;
  renderSelector();
  renderTab(null);
}

// ---- arrangement selector -----------------------------------------------------------------
// Read each arrangement's difficulty and span off the handle, then render a chip per result.
// The chip is a radio in a radiogroup: aria-checked carries selection for assistive tech, and
// the violet fill plus the keyboard focus ring carry it visually.
function renderSelector() {
  if (!state.set || state.set.isEmpty) return;
  const difficulties = [];
  const spans = [];
  for (let i = 0; i < state.set.len; i += 1) {
    difficulties.push(state.set.difficulty(i));
    spans.push(state.set.maxFretSpan(i));
  }
  const chips = buildArrangementChips({ difficulties, spans });

  const container = el("arrangementSelector");
  container.setAttribute("role", "radiogroup");
  container.setAttribute("aria-label", "Arrangements, easiest to hardest");
  container.innerHTML = chips.map((chip) => chipMarkup(chip, chip.index === state.selectedIndex)).join("");

  for (const button of container.querySelectorAll("[data-index]")) {
    button.addEventListener("click", () => selectArrangement(Number(button.dataset.index)));
  }
  container.onkeydown = (event) => handleSelectorKeydown(event);
  el("arrangementLegend").hidden = false;
}

// Arrow/Home/End move the selection within the radiogroup and place focus on the new chip, so
// the row behaves as a single roving-tabindex control rather than three separate tab stops.
function handleSelectorKeydown(event) {
  const count = state.set ? state.set.len : 0;
  if (count === 0) return;
  let next = state.selectedIndex;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      next = (state.selectedIndex + 1) % count;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      next = (state.selectedIndex - 1 + count) % count;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = count - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  selectArrangement(next);
  el("arrangementSelector").querySelector(`[data-index="${next}"]`).focus();
}

// Markup for one chip: the numbered label and a metrics line carrying the fret span and the
// relative difficulty index.
function chipMarkup(chip, selected) {
  return `<button type="button" role="radio" class="chip" data-index="${chip.index}"
      aria-checked="${selected}" tabindex="${selected ? 0 : -1}">
      <span class="chip__label">${chip.label}</span>
      <span class="chip__meta">
        <span class="chip__span">&#8596; ${chip.span}-fret span</span>
        <span class="chip__score">difficulty ${chip.relativeDifficulty}</span>
      </span>
    </button>`;
}

// Select an arrangement: stop playback, re-render the tab at the new index, update chip state.
// Selection does not re-run pathfinding; the cached set re-renders cheaply at the new index.
function selectArrangement(index) {
  if (index === state.selectedIndex) return;
  state.selectedIndex = index;
  stopPlayback();
  playbackSchedule = null;
  playbackStep = 0;
  el("playbackProgress").style.width = "0%";
  renderTab(null);
  for (const button of el("arrangementSelector").querySelectorAll("[data-index]")) {
    const isSelected = Number(button.dataset.index) === index;
    button.setAttribute("aria-checked", String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  }
}

// Cheap re-render of the cached set at the current display settings and selected arrangement,
// with an optional playback cursor. No pathfinding.
function renderTab(playbackCursor) {
  if (!state.set || state.set.isEmpty) return;
  const width = intValue("tabLineLength", 60);
  const padding = intValue("tabPadding", 1);
  try {
    el("tabOutput").textContent = state.set.render(
      state.selectedIndex,
      width,
      padding,
      playbackCursor,
    );
    el("tabOutput").classList.remove("is-message");
    el("transportBar").hidden = false;
    el("copyButton").disabled = false;
    el("exportButton").disabled = false;
  } catch (error) {
    console.warn(error);
    showMessage(formatTabError(error));
  }
}

// Show an error or empty-state message in the output box, clear the selector, and hide playback.
function showMessage(message) {
  el("tabOutput").textContent = message;
  el("tabOutput").classList.add("is-message");
  el("arrangementSelector").innerHTML = "";
  el("arrangementLegend").hidden = true;
  el("transportBar").hidden = true;
  el("copyButton").disabled = true;
  el("exportButton").disabled = true;
}

// Full reset: stop playback, drop the schedule, regenerate from current inputs.
function newTab() {
  stopPlayback();
  playbackSchedule = null;
  playbackStep = 0;
  el("playbackProgress").style.width = "0%";
  regenerate();
}

// Empty the input and return the page to its initial state: no set, no chips, the hint message.
function resetToEmpty() {
  stopPlayback();
  playbackSchedule = null;
  playbackStep = 0;
  if (state.set) {
    state.set.free();
    state.set = null;
  }
  state.normalizedInput = null;
  state.selectedIndex = 0;
  el("pitchInput").value = "";
  el("playbackProgress").style.width = "0%";
  showMessage("Enter pitches on the left to generate a tab.");
}

// ---- playback -----------------------------------------------------------------------------
function startPlayback() {
  if (!state.normalizedInput) return;
  // Build the schedule once per arrangement; reuse it across pause/resume.
  if (!playbackSchedule) {
    playbackSchedule = buildPlaybackSchedule(state.normalizedInput);
    playbackTotal = playbackTotalBeats(playbackSchedule);
  }
  // If the last run reached the end, a fresh Play restarts from the top.
  if (playbackStep >= playbackSchedule.length) {
    playbackStep = 0;
  }

  // Created lazily; exports.Tone is provided by the Tone.js script in the HTML.
  playbackSynth ??= new exports.Tone.PolySynth().toDestination();
  playbackSynth.set({ detune: -1200 });

  const bpm = intValue("tempoControl", 120);
  playbackInterval = setInterval(playbackTick, 60000 / bpm);
}

function playbackTick() {
  // Skip measure breaks without spending a time slot on them.
  while (
    playbackStep < playbackSchedule.length &&
    playbackSchedule[playbackStep].kind === "measureBreak"
  ) {
    playbackStep += 1;
  }

  if (playbackStep >= playbackSchedule.length) {
    stopPlayback();
    renderTab(null); // clear the playback cursor from the tab
    return;
  }

  const beat = playbackSchedule[playbackStep];
  if (beat.kind === "playable") {
    playbackSynth.triggerAttackRelease(beat.pitches, "8n");
  }
  renderTab(beat.cursor);
  if (beat.cursor !== null && playbackTotal > 0) {
    el("playbackProgress").style.width = `${((beat.cursor + 1) / playbackTotal) * 100}%`;
  }
  playbackStep += 1;
}

function stopPlayback() {
  el("resetPlaybackButton").disabled = false;
  el("pauseButton").style.display = "none";
  el("playButton").style.display = "flex";

  if (playbackSynth !== null) {
    playbackSynth.releaseAll();
  }
  if (playbackInterval !== null) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
}

// Rewind playback to the start without re-running pathfinding (Reset, distinct from regenerate).
function resetPlayback() {
  stopPlayback();
  playbackStep = 0;
  el("playbackProgress").style.width = "0%";
  renderTab(null);
}

// ---- display-setting label ----------------------------------------------------------------
function updateLineLengthLabel() {
  const width = intValue("tabLineLength", 80);
  el("tabLineLengthLabel").innerHTML = `Line Length - ${width}`;
}

// ---- example songs ------------------------------------------------------------------------
// loadExampleSong appends the chosen example song's pitches to the input and triggers newTab().
// The exSongs note text uses tab indentation that is stripped before parsing; element access
// goes through el() to match the rest of this module.
function loadExampleSong() {
  const exSongs = {
    "Fur Elise": `E4
					Eb4
					E4
					Eb4
					E4
					B3
					D4
					C4
					---
					A2A3
					E3
					A3
					C3
					E3
					A3
					---
					E3B3
					E3
					Ab3
					E3
					Ab3
					B3
					---
					A2C4
					E3
					A3
					E3
					---
					E4
					Eb4
					E4
					Eb4
					E4
					B3
					D4
					C4
					---
					A2A3
					E3
					A3
					C3
					E3
					A3
					---
					E3B3
					E3
					Ab3
					E3
					C4
					B3
					A3
					---
					C4
					C4
					C4
					C4
					F4
					E4
					E4
					D4
					---
					Bb4
					A4
					A4
					G4
					F4
					E4
					D4
					C4
					---
					Bb3
					Bb3
					A3
					G3
					A3
					Bb3
					C4
					---
					D4
					Eb4
					Eb4
					E4
					F4
					A3
					C4
					---
					D4
					B3
					C4`,
    Greensleeves: `A3
						A2C4
						A3D4
						E4
						F4
						E4
						G2G3D4
						B3
						G3
						A3
						B3
						A2C4
						---
						A3
						A3
						G#3
						A3
						B3
						G#3
						E3
						---
						A3
						A2C4
						A3D4
						E4
						F#4
						E4
						G2G3D4
						B3
						G3
						A3
						B3
						A2C4
						B3
						---
						A3
						A2G#3
						F#3
						G#3
						A2A3
						A2A3
						`,
    "Silent Night": `C3G3
						A3
						G3
						C3E3
						---
						C3G3
						A3
						G3
						C3E3
						---
						G2D4
						D4
						B3
						---
						C3C4
						C4
						E3G3
						---
						F3A3
						A3
						C4
						B3
						A3
						---
						C3G3
						A3
						G3
						C3E3
						---
						C3A3
						A3
						C4
						B3
						A3
						---
						C3G3
						A3
						C3G3
						A3
						G3
						C3D3
						E3
						---
						G2D4
						D4
						F4
						D4
						B3
						---
						C3C4
						E2A2E3A3C4E4
						---
						C3C4
						G3
						E3
						G3
						---
						F3
						D3
						C3`,
    "Twinkle Twinkle": `G3
							G3
							D4
							D4
							---
							E4
							E4
							D4
							---
							C4
							C4
							B3
							B3
							---
							A3
							A3
							G3
							---
							D4
							D4
							C4
							C4
							---
							B3
							B3
							A3
							---
							D4
							D4
							C4
							C4
							---
							B3
							B3
							A3
							---
							G3
							G3
							D4
							D4
							---
							E4
							E4
							D4
							---
							C4
							C4
							B3
							B3
							---
							A3
							A3
							G3`,
    "Hey Jude": `C4
					A3
					A3
					C4
					D4
					G3
					---
					G3
					A3
					Bb3
					F4
					F4
					E4
					C4
					D4
					C4
					Bb3
					A3
					---
					C4
					D4
					D4
					D4
					D4
					G4
					F4
					E4
					F4
					D4
					C4
					---
					F3
					G3
					A3
					D4
					C4
					C4
					Bb3
					A3
					E3
					F3
					---
					---
					C4
					A3
					A3
					C4
					D4
					G3
					---
					G3
					A3
					Bb3
					F4
					F4
					E4
					C4
					D4
					C4
					Bb3
					A3
					---
					C4
					D4
					D4
					D4
					D4
					G4
					F4
					E4
					F4
					D4
					C4
					---
					F3
					G3
					A3
					D4
					C4
					C4
					Bb3
					A3
					E3
					F3
					---
					---
					F3
					F4
					D4
					D4
					C4
					C4
					Bb3
					D4
					---
					F4
					D4
					F4
					Bb3
					---
					F4
					D4
					C4
					Bb3
					C4
					D4
					C4
					Bb3
					A3
					G3
					F3`,
  };
  const exSongInputName = el("exampleSongs").value;

  if (!(exSongInputName in exSongs)) return;

  const exSongNotes = exSongs[exSongInputName].replaceAll("\t", "");
  el("pitchInput").value = exSongNotes;
  el("exampleSongs").value = "examples"; // reset the picker so the same song can be re-picked
  newTab();
}

// ---- event wiring -------------------------------------------------------------------------
// Pathfinding-tier inputs regenerate the set.
el("pitchInput").addEventListener("input", requestRegenerate);
for (const settingId of ["guitarTuning", "guitarCapo", "maxFretSpan"]) {
  el(settingId).addEventListener("change", requestRegenerate);
}
el("exampleSongs").addEventListener("change", loadExampleSong);
el("clearInputButton").addEventListener("click", resetToEmpty);

// Display-tier inputs only need a cheap re-render.
for (const displayId of ["tabLineLength", "tabPadding"]) {
  el(displayId).addEventListener("input", () => {
    updateLineLengthLabel();
    renderTab(null);
  });
}

el("copyButton").addEventListener("click", async () => {
  const text = el("tabOutput").textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers without the async clipboard API or a non-secure context.
    const scratch = document.createElement("textarea");
    scratch.value = text;
    document.body.appendChild(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
  }
  showToast("Tab copied to clipboard");
});

el("exportButton").addEventListener("click", () => {
  const blob = new Blob([el("tabOutput").textContent], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "guitar-tab.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  showToast("Saved guitar-tab.txt");
});

el("playButton").addEventListener("click", () => {
  el("resetPlaybackButton").disabled = false;
  el("pauseButton").style.display = "flex";
  el("playButton").style.display = "none";
  startPlayback();
});

el("pauseButton").addEventListener("click", stopPlayback);
el("resetPlaybackButton").addEventListener("click", resetPlayback);

el("tempoControl").addEventListener("input", () => {
  el("tempoValue").textContent = el("tempoControl").value;
  // Re-arm the interval at the new tempo if a song is mid-play.
  if (playbackInterval !== null) {
    clearInterval(playbackInterval);
    playbackInterval = setInterval(playbackTick, 60000 / intValue("tempoControl", 120));
  }
});

// Free the cached handle when the page goes away.
window.addEventListener("pagehide", () => {
  if (state.set) {
    state.set.free();
    state.set = null;
  }
});

// Initial label paint. The output keeps its placeholder until the user enters pitches.
updateLineLengthLabel();

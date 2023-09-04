/**
 * Console Log objects to full depth
 * @param objs Objects to print
 */
function print(...objs) {
	for (const obj of objs) {
		console.dir(obj, { depth: null });
	}
}

import init, {
	wasm_create_guitar_compositions,
	get_tuning_names,
} from "../wasm_guitar_tab_generator/guitar_tab_generator.js";
async function run() {
	await init();
}
run();

function playBeatAudio(pitches) {
	// Iterate beat number
	if (playbackBeatNumber === null) {
		playbackBeatNumber = 0;
	} else {
		playbackBeatNumber++;
	}

	const beatPitches = pitches[playbackBeatNumber];

	console.log(beatPitches);

	if (playbackBeatNumber >= pitches.length) {
		// Done playing
		stopPlayback();
		return;
	}
	// Skip measure breaks
	if (beatPitches[0] == "MEASURE_BREAK") {
		numMeasureBreaks++;
		console.log("Skipping playback");
		playBeatAudio(pitches);
		return;
	}
	if (beatPitches[0] !== "REST") {
		playbackSynth.triggerAttackRelease(beatPitches, "8n");
	}

	generateTab();
}

let playbackBeatNumber = null;
let numMeasureBreaks = 0;
let playbackSynth = null;
let currentlyPlayingAudioFunctionRepeatInterval = null;
function playTabAudio() {
	// // Pluck single note
	// const plucky = new exports.Tone.PluckSynth().toDestination();
	// plucky.set({ attackNoise: 0.8, dampening: 2000, resonance: 0.95, release:
	// 1 });

	// Create playbackSynth if it does not exist
	playbackSynth ??= new exports.Tone.PolySynth().toDestination();
	playbackSynth.set({ detune: -1200 });

	console.info("Playing tab audio");

	let pitches = generateTab();

	currentlyPlayingAudioFunctionRepeatInterval = setInterval(playBeatAudio, 500, pitches);
}

function updateLineLengthLabel() {
	let tabLineLength = 80;
	try {
		tabLineLength = parseInt(document.getElementById("tabLineLength").value);
	} catch (error) {
		console.warn(`Something went wrong... Using default tabLineLength = ${tabLineLength} | Error = ${error}`);
	}

	document.getElementById("tabLineLengthLabel").innerHTML = `Line Length - ${tabLineLength}`;
}
updateLineLengthLabel(); // update line length label with initial default value

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
	const exSongInputName = exampleSongsInput.value;

	if (!(exSongInputName in exSongs)) return;

	const exSongNotes = exSongs[exSongInputName].replaceAll("\t", "");
	pitchInput.value = `${pitchInput.value}\n\n// Example\n// ${exSongInputName}\n${exSongNotes}`;

	newTab();
}

function stopPlayback() {
	document.getElementById("resetPlaybackButton").disabled = false;
	document.getElementById("pauseButton").style.display = "none";
	document.getElementById("playButton").style.display = "flex";

	// Silence the synth
	if (playbackSynth !== null) {
		playbackSynth.releaseAll();
	}
	// Stop updating the TAB with the visual playing indicator
	clearInterval(currentlyPlayingAudioFunctionRepeatInterval);
}

const pitchInput = document.getElementById("pitchInput");
pitchInput.addEventListener("input", () => {
	// deactivateTabOutput();
	newTab();
});

// Add event listeners to generate TAB output after changes
// pitchInput.addEventListener("change", createArrangement);
for (const settingSelectId of ["guitarTuning", "guitarCapo"]) {
	document.getElementById(settingSelectId).addEventListener("change", () => {
		newTab();
	});
}

// Add event listeners to add song pitches for example songs
const exampleSongsInput = document.getElementById("exampleSongs");
exampleSongsInput.addEventListener("change", loadExampleSong);

// Add event listeners to reformat TAB string output after changes
for (const displaySettingId of ["tabLineLength", "tabPadding"]) {
	document.getElementById(displaySettingId).addEventListener("input", () => {
		updateLineLengthLabel();
		newTab();
	});
}

// Add event listener to export tab output when export button is pressed
document.getElementById("exportButton").addEventListener("click", () => {
	// playbackSynth ??= new exports.Tone.PolySynth().toDestination();
	// playbackSynth.triggerAttackRelease(["A2", "A3"], "8n");
	// console.log("Good");

	// Download tab output
	const fileContent = document.getElementById("tabOutput").value;
	const temporaryDownloadElement = document.createElement("a");
	temporaryDownloadElement.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(fileContent));
	temporaryDownloadElement.setAttribute("download", "guitar_tab_output");
	temporaryDownloadElement.style.display = "none";
	document.body.appendChild(temporaryDownloadElement);
	temporaryDownloadElement.click();
	document.body.removeChild(temporaryDownloadElement);

	alert("Tab output saved to your downloads! 🎉");
});

document.getElementById("playButton").addEventListener("click", () => {
	document.getElementById("resetPlaybackButton").disabled = false;
	document.getElementById("pauseButton").style.display = "flex";
	document.getElementById("playButton").style.display = "none";
	playTabAudio();
});

document.getElementById("pauseButton").addEventListener("click", () => {
	stopPlayback();
});

document.getElementById("resetPlaybackButton").addEventListener("click", () => {
	newTab();
});

function newTab() {
	// Reset playback
	playbackBeatNumber = null;
	numMeasureBreaks = 0;
	stopPlayback();
	generateTab();
}

function generateTab() {
	let startTime = performance.now();

	let input = getInput();

	console.log(input);
	try {
		let compositions = wasm_create_guitar_compositions(input);
		document.getElementById("tabOutput").value = compositions[0].tab;

		// console.log(`Tab:\n${tabOutput}`);
		let endTime = performance.now();
		let duration = (endTime - startTime).toFixed(1);
		console.info(`Arrangement generated in ${duration} milliseconds:`, compositions[0]);

		document.getElementById("tabOutput").disabled = false;
		document.getElementById("playbackMenu").hidden = false;

		let pitches = compositions[0].pitches;
		return pitches;
	} catch (error) {
		console.warn(error);
		document.getElementById("tabOutput").value = error;

		document.getElementById("tabOutput").disabled = true;
		document.getElementById("playbackMenu").hidden = true;
	}
	return null;
}

function getInput() {
	const pitchInput = document.getElementById("pitchInput").value;

	let guitarTuning = "standard";
	try {
		guitarTuning = document.getElementById("guitarTuning").value;
	} catch (error) {
		console.warn(`Something went wrong... Using default guitarTuning = ${guitarTuning} | Error = ${error}`);
	}

	let guitarCapo = 0;
	try {
		guitarCapo = parseInt(document.getElementById("guitarCapo").value);
	} catch (error) {
		console.warn(`Something went wrong... Using default guitarCapo = ${guitarCapo} | Error = ${error}`);
	}

	let tabLineLength = 80;
	try {
		tabLineLength = parseInt(document.getElementById("tabLineLength").value);
	} catch (error) {
		console.warn(`Something went wrong... Using default tabLineLength = ${tabLineLength} | Error = ${error}`);
	}

	let tabPadding = 1;
	try {
		tabPadding = parseInt(document.getElementById("tabPadding").value);
	} catch (error) {
		console.warn(`Something went wrong... Using default tabPadding = ${tabPadding} | Error = ${error}`);
	}

	let playback_index = null;
	if (playbackBeatNumber !== null) {
		playback_index = playbackBeatNumber - numMeasureBreaks;
	}

	return {
		pitches: pitchInput,
		tuning_name: guitarTuning,
		guitar_num_frets: 18,
		guitar_capo: guitarCapo,
		num_arrangements: 1,
		width: tabLineLength,
		padding: tabPadding,
		playback_index: playback_index,
	};
}

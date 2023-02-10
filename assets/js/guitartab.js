/**
 * Console Log objects to full depth
 * @param objs Objects to print
 */
function print(...objs) {
	for (const obj of objs) {
		console.dir(obj, { depth: null });
	}
}

let playbackBeatNumber = -1;
let allowPlayback = false;

// Maintain latest guitar so formatting settings can update output without
// recomputing tabData
let guitar;
function createGuitar() {
	// Get settings
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

	guitar = new exports.Guitar(guitarTuning, guitarCapo);
}
createGuitar(); // create default standard guitar

// Maintain latest tabData so formatting settings can update output without
// recomputing tabData
let tabData;
function createArrangement() {
	const pitchInput = document.getElementById("pitchInput");

	playbackBeatNumber = -1;
	stopPlayback();

	try {
		const arrangement = new exports.Arrangement(guitar, pitchInput.value);
		tabData = arrangement.bestFingerings;
	} catch (error) {
		console.error(error);
		document.getElementById("tabOutput").value = error;
		document.getElementById("tabOutput").disabled = true;
		document.getElementById("playbackMenu").hidden = true;
		return;
	}
	displayTab(tabData);
	document.getElementById("playbackMenu").hidden = false;
}

// Create global web audio api context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const pitchToFrequency = {
	C0: 16.35,
	"C#0": 17.32,
	Db0: 17.32,
	D0: 18.35,
	"D#0": 19.45,
	Eb0: 19.45,
	E0: 20.6,
	F0: 21.83,
	"F#0": 23.12,
	Gb0: 23.12,
	G0: 24.5,
	"G#0": 25.96,
	Ab0: 25.96,
	A0: 27.5,
	"A#0": 29.14,
	Bb0: 29.14,
	B0: 30.87,
	C1: 32.7,
	"C#1": 34.65,
	Db1: 34.65,
	D1: 36.71,
	"D#1": 38.89,
	Eb1: 38.89,
	E1: 41.2,
	F1: 43.65,
	"F#1": 46.25,
	Gb1: 46.25,
	G1: 49.0,
	"G#1": 51.91,
	Ab1: 51.91,
	A1: 55.0,
	"A#1": 58.27,
	Bb1: 58.27,
	B1: 61.74,
	C2: 65.41,
	"C#2": 69.3,
	Db2: 69.3,
	D2: 73.42,
	"D#2": 77.78,
	Eb2: 77.78,
	E2: 82.41,
	F2: 87.31,
	"F#2": 92.5,
	Gb2: 92.5,
	G2: 98.0,
	"G#2": 103.83,
	Ab2: 103.83,
	A2: 110.0,
	"A#2": 116.54,
	Bb2: 116.54,
	B2: 123.47,
	C3: 130.81,
	"C#3": 138.59,
	Db3: 138.59,
	D3: 146.83,
	"D#3": 155.56,
	Eb3: 155.56,
	E3: 164.81,
	F3: 174.61,
	"F#3": 185.0,
	Gb3: 185.0,
	G3: 196.0,
	"G#3": 207.65,
	Ab3: 207.65,
	A3: 220.0,
	"A#3": 233.08,
	Bb3: 233.08,
	B3: 246.94,
	C4: 261.63,
	"C#4": 277.18,
	Db4: 277.18,
	D4: 293.66,
	"D#4": 311.13,
	Eb4: 311.13,
	E4: 329.63,
	F4: 349.23,
	"F#4": 369.99,
	Gb4: 369.99,
	G4: 392.0,
	"G#4": 415.3,
	Ab4: 415.3,
	A4: 440.0,
	"A#4": 466.16,
	Bb4: 466.16,
	B4: 493.88,
	C5: 523.25,
	"C#5": 554.37,
	Db5: 554.37,
	D5: 587.33,
	"D#5": 622.25,
	Eb5: 622.25,
	E5: 659.26,
	F5: 698.46,
	"F#5": 739.99,
	Gb5: 739.99,
	G5: 783.99,
	"G#5": 830.61,
	Ab5: 830.61,
	A5: 880.0,
	"A#5": 932.33,
	Bb5: 932.33,
	B5: 987.77,
	C6: 1046.5,
	"C#6": 1108.73,
	Db6: 1108.73,
	D6: 1174.66,
	"D#6": 1244.51,
	Eb6: 1244.51,
	E6: 1318.51,
	F6: 1396.91,
	"F#6": 1479.98,
	Gb6: 1479.98,
	G6: 1567.98,
	"G#6": 1661.22,
	Ab6: 1661.22,
	A6: 1760.0,
	"A#6": 1864.66,
	Bb6: 1864.66,
	B6: 1975.53,
	C7: 2093.0,
	"C#7": 2217.46,
	Db7: 2217.46,
	D7: 2349.32,
	"D#7": 2489.02,
	Eb7: 2489.02,
	E7: 2637.02,
	F7: 2793.83,
	"F#7": 2959.96,
	Gb7: 2959.96,
	G7: 3135.96,
	"G#7": 3322.44,
	Ab7: 3322.44,
	A7: 3520.0,
	"A#7": 3729.31,
	Bb7: 3729.31,
	B7: 3951.07,
	C8: 4186.01,
	"C#8": 4434.92,
	Db8: 4434.92,
	D8: 4698.64,
	"D#8": 4978.03,
	Eb8: 4978.03,
};

let noteAudioOscillator = null;

// noteAudioOscillator.frequency.setValueAtTime(pitchToFrequency["E2"]);
// pitchAudioOscillator.frequency.setValueAtTime(110, 1); // value in hertz
// pitchAudioOscillator.frequency.setValueAtTime(440, 2); // value in hertz
// pitchAudioOscillator.frequency.setValueAtTime(110, 3); // value in hertz
// noteAudioOscillator.connect(audioContext.destination);
// pitchAudioOscillator.start();

function playTabAudio() {
	noteAudioOscillator = audioContext.createOscillator();
	noteAudioOscillator.connect(audioContext.destination);

	console.log(tabData);
	const tabDataNoBreaks = tabData.filter((beatData) => beatData !== "break");
	let beatStartTime;
	const intervalBetweenBeats = 0.5;
	for (let beatIndex = 0; beatIndex < tabDataNoBreaks.length; beatIndex++) {
		const beatData = tabDataNoBreaks[beatIndex];
		if (beatData === "break") {
			continue;
		}
		const beatPitches = beatData.get("pitches");
		const noteName = beatPitches.slice(-1);
		beatStartTime = intervalBetweenBeats * beatIndex + audioContext.currentTime;
		console.log(noteName, pitchToFrequency[noteName], beatStartTime);
		noteAudioOscillator.frequency.setValueAtTime(pitchToFrequency[noteName], beatStartTime);
		noteAudioOscillator.frequency.setValueAtTime(0, beatStartTime + 0.8 * intervalBetweenBeats);
	}

	noteAudioOscillator.start();
	const beatStopTime = beatStartTime + 2 * intervalBetweenBeats;
	noteAudioOscillator.stop(beatStopTime);
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

function displayTab(tabData, currentlyPlayingIndex = -1) {
	let tabLineLength = 80;
	try {
		tabLineLength = parseInt(document.getElementById("tabLineLength").value);
	} catch (error) {
		console.warn(`Something went wrong... Using default tabLineLength = ${tabLineLength} | Error = ${error}`);
	}

	let numBeatSeparators = 1;
	try {
		numBeatSeparators = parseInt(document.getElementById("numBeatSeparators").value);
	} catch (error) {
		console.warn(`Something went wrong... Using default numBeatSeparators = ${numBeatSeparators} | Error = ${error}`);
	}

	/**
	 * Format TAB data to plain text string
	 */
	function generateTabString(tabData, lineLength = 80, numBeatSeparators = 1, currentlyPlayingIndex = -1) {
		/**
		 * Create single long bare TAB plain text string
		 */
		function generateTabStringData(tabData, currentlyPlayingIndex = -1) {
			const stringOutputs = new Map([
				[1, []],
				[2, []],
				[3, []],
				[4, []],
				[5, []],
				[6, []],
				["playbackIndicator", []],
			]);

			// for (const beatData of tabData) {
			tabData.forEach((beatData, beatIndex) => {
				// Add measure breaks
				if (beatData === "break") {
					for (const stringNum of [1, 2, 3, 4, 5, 6]) {
						stringOutputs.get(stringNum).push("|");
					}
					stringOutputs.get("playbackIndicator").push(" ");
					return;
				}

				// Calculate the max width of the fret fingerings
				const beatStringToFret = beatData.get("stringToFretFingering");
				const fretValues = Array.from(beatStringToFret.values()).filter((fretVal) => fretVal !== null);
				const fretValueLengths = fretValues.map((fretVal) => fretVal.toString().length);
				const maxFretValueLength = Math.max(...fretValueLengths);

				// Add the fret numbers for each of the fingerings for the beat
				beatStringToFret.forEach((fret, stringNum) => {
					let fretOutput = "";
					if (fret === null) {
						// If no fret for that string
						fretOutput = "-".repeat(maxFretValueLength);
					} else {
						fretOutput += fret;

						// Add additional dashes if there is a wider fingering
						// in the same beat
						const currFretWidthDelta = maxFretValueLength - fretOutput.length;

						fretOutput += "-".repeat(currFretWidthDelta);
					}
					stringOutputs.get(stringNum).push(fretOutput);
				});

				let playbackIndicatorOutput = " ".repeat(maxFretValueLength);
				if (beatIndex === currentlyPlayingIndex) {
					playbackIndicatorOutput = " ".repeat(maxFretValueLength - 1) + "↑";
				}
				stringOutputs.get("playbackIndicator").push(playbackIndicatorOutput);
			});
			return stringOutputs;
		}
		const tabStringData = generateTabStringData(tabData, currentlyPlayingIndex);

		// Add dash separators
		const beatSeparator = "-".repeat(numBeatSeparators); // to customize spacing
		const playbackBeatSeparator = " ".repeat(numBeatSeparators); // to customize spacing
		let tabCombinedStrings = new Map();
		tabStringData.forEach((value, key) => {
			if (key === "playbackIndicator") {
				tabCombinedStrings.set(key, playbackBeatSeparator + value.join(playbackBeatSeparator) + playbackBeatSeparator);
			} else {
				tabCombinedStrings.set(key, beatSeparator + value.join(beatSeparator) + beatSeparator);
			}
		});

		// Apply line length
		let outputString = "";
		while (tabCombinedStrings.get(1).length > 0) {
			for (const stringNum of tabCombinedStrings.keys()) {
				outputString += tabCombinedStrings.get(stringNum).substring(0, lineLength);

				// Remove handled beats
				tabCombinedStrings.set(stringNum, tabCombinedStrings.get(stringNum).slice(lineLength));
				outputString += "\n";

				if (stringNum === "playbackIndicator") {
					outputString += "\n\n";
				}
			}
		}

		return outputString;
	}

	const tabString = generateTabString(tabData, tabLineLength, numBeatSeparators, currentlyPlayingIndex);
	document.getElementById("tabOutput").value = tabString;
	document.getElementById("tabOutput").disabled = false;
}

function deactivateTabOutput() {
	document.getElementById("tabOutput").disabled = true;
}

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

					A2A3
					E3
					A3
					C3
					E3
					A3

					E3B3
					E3
					Ab3
					E3
					Ab3
					B3

					A2C4
					E3
					A3
					E3

					E4
					Eb4
					E4
					Eb4
					E4
					B3
					D4
					C4

					A2A3
					E3
					A3
					C3
					E3
					A3

					E3B3
					E3
					Ab3
					E3
					C4
					B3
					A3

					C4
					C4
					C4
					C4
					F4
					E4
					E4
					D4

					Bb4
					A4
					A4
					G4
					F4
					E4
					D4
					C4

					Bb3
					Bb3
					A3
					G3
					A3
					Bb3
					C4

					D4
					Eb4
					Eb4
					E4
					F4
					A3
					C4

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

						A3
						A3
						G#3
						A3
						B3
						G#3
						E3

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

						C3G3
						A3
						G3
						C3E3

						G2D4
						D4
						B3

						C3C4
						C4
						E3G3

						F3A3
						A3
						C4
						B3
						A3

						C3G3
						A3
						G3
						C3E3

						C3A3
						A3
						C4
						B3
						A3

						C3G3
						A3
						C3G3
						A3
						G3
						C3D3
						E3

						G2D4
						D4
						F4
						D4
						B3

						C3C4
						E2A2E3A3C4E4

						C3C4
						G3
						E3
						G3

						F3
						D3
						C3`,
		"Twinkle Twinkle": `G3
							G3
							D4
							D4

							E4
							E4
							D4

							C4
							C4
							B3
							B3

							A3
							A3
							G3

							D4
							D4
							C4
							C4

							B3
							B3
							A3

							D4
							D4
							C4
							C4

							B3
							B3
							A3

							G3
							G3
							D4
							D4

							E4
							E4
							D4

							C4
							C4
							B3
							B3

							A3
							A3
							G3`,
		"Hey Jude": `C4
					A3
					A3
					C4
					D4
					G3

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


					C4
					A3
					A3
					C4
					D4
					G3

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


					F3
					F4
					D4
					D4
					C4
					C4
					Bb3
					D4

					F4
					D4
					F4
					Bb3

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

	createArrangement();
}

function stopPlayback() {
	allowPlayback = false;
	document.getElementById("resetPlaybackButton").disabled = false;
	document.getElementById("pauseButton").style.display = "none";
	document.getElementById("playButton").style.display = "flex";
}

const pitchInput = document.getElementById("pitchInput");
// Add event listener for the pitch input text area to deactivate TAB output
pitchInput.addEventListener("input", deactivateTabOutput);

// Add event listeners to generate TAB output after changes
pitchInput.addEventListener("change", createArrangement);
for (const settingSelectId of ["guitarTuning", "guitarCapo"]) {
	document.getElementById(settingSelectId).addEventListener("change", () => {
		createGuitar();
		createArrangement();
	});
}

// Add event listeners to add song pitches for example songs
const exampleSongsInput = document.getElementById("exampleSongs");
exampleSongsInput.addEventListener("change", loadExampleSong);

// Add event listeners to reformat TAB string output after changes
for (const displaySettingId of ["tabLineLength", "numBeatSeparators"]) {
	document.getElementById(displaySettingId).addEventListener("input", () => {
		updateLineLengthLabel();
		if (tabData !== undefined) {
			displayTab(tabData, playbackBeatNumber);
		}
	});
}

// Add event listener to export tab output when export button is pressed
document.getElementById("exportButton").addEventListener("click", () => {
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

// Add event listener to export tab output when export button is pressed
document.getElementById("playButton").addEventListener("click", () => {
	if (!(Symbol.iterator in Object(tabData))) {
		return;
	}
	document.getElementById("resetPlaybackButton").disabled = false;
	document.getElementById("pauseButton").style.display = "flex";
	document.getElementById("playButton").style.display = "none";
	allowPlayback = true;
	playTabAudio();
});

// Add event listener to export tab output when export button is pressed
document.getElementById("pauseButton").addEventListener("click", () => {
	stopPlayback();
});

// Add event listener to export tab output when export button is pressed
document.getElementById("resetPlaybackButton").addEventListener("click", () => {
	playbackBeatNumber = -1;
	stopPlayback();
	displayTab(tabData);
});

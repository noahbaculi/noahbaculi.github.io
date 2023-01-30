/**
 * Console Log objects to full depth
 * @param objs Objects to print
 */
function print(...objs) {
	for (const obj of objs) {
		console.dir(obj, { depth: null });
	}
}

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

	try {
		const arrangement = new exports.Arrangement(guitar, pitchInput.value);
		tabData = arrangement.bestFingerings;
		print("Create arrangement");
	} catch (error) {
		console.error(error);
		document.getElementById("tabOutput").value = error;
		document.getElementById("tabOutput").disabled = true;
		return;
	}
	displayTab(tabData);
	playTabAudio();
}

async function playTabAudio() {
	print(tabData);
	let beatNumber = -1;
	for (const beatData of tabData) {
		// Iterate beat number
		beatNumber += 1;

		// Skip breaks
		if (beatData === "break") {
			continue;
		}

		const beatPitches = beatData.get("pitches");
		for (const beatPitch of beatPitches) {
			print(beatPitch);
			playPitchAudio(beatPitch.replaceAll("#", "sharp"));
		}

		displayTab(tabData, beatNumber);

		const delayDurationMillisecond = 800;
		await new Promise((r) => setTimeout(r, delayDurationMillisecond));
	}
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
		function generateTabStringData(tabData) {
			const stringOutputs = new Map([
				[1, []],
				[2, []],
				[3, []],
				[4, []],
				[5, []],
				[6, []],
			]);

			const beatStrings = new Set(stringOutputs.keys());
			for (const beatData of tabData) {
				// Add measure breaks
				if (beatData === "break") {
					for (const stringNum of beatStrings) {
						stringOutputs.get(stringNum).push("|");
					}
					continue;
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
						const currFretWidthDelta = maxFretValueLength - fret.length;
						fretOutput += "-".repeat(currFretWidthDelta);
					}
					stringOutputs.get(stringNum).push(fretOutput);
				});
			}
			return stringOutputs;
		}
		const tabStringData = generateTabStringData(tabData);

		// Add dash separators
		const beatSeparator = "-".repeat(numBeatSeparators); // to customize spacing
		let tabCombinedStrings = new Map();
		tabStringData.forEach((value, key) => {
			tabCombinedStrings.set(key, beatSeparator + value.join(beatSeparator) + beatSeparator);
		});

		// Apply line length
		let startBeatLineIndex = 0;
		const numBeatsPerLine = Math.floor(lineLength / (numBeatSeparators + 1));
		let endBeatLineIndex = numBeatsPerLine - 1;
		let outputString = "";
		while (tabCombinedStrings.get(1).length > 0) {
			for (const stringNum of tabCombinedStrings.keys()) {
				outputString += tabCombinedStrings.get(stringNum).substring(0, lineLength);

				// Remove handled beats
				tabCombinedStrings.set(stringNum, tabCombinedStrings.get(stringNum).slice(lineLength));
				outputString += "\n";
				if (stringNum === 6) {
					if (startBeatLineIndex <= currentlyPlayingIndex && currentlyPlayingIndex <= endBeatLineIndex) {
						const currentlyPlayingIndexInLine = currentlyPlayingIndex % numBeatsPerLine;
						const numSpaces =
							numBeatSeparators + currentlyPlayingIndexInLine + currentlyPlayingIndexInLine * numBeatSeparators;
						console.log(startBeatLineIndex, currentlyPlayingIndex, endBeatLineIndex);
						outputString += " ".repeat(numSpaces) + "↑";
					}
					outputString += "\n\n";
					startBeatLineIndex += numBeatsPerLine;
					endBeatLineIndex += numBeatsPerLine;
				}
			}
		}

		return outputString;
	}

	const start = performance.now();
	const tabString = generateTabString(tabData, tabLineLength, numBeatSeparators, currentlyPlayingIndex);
	const end = performance.now();
	console.log(`Execution time: ${end - start} ms`);

	document.getElementById("tabOutput").value = tabString;
	document.getElementById("tabOutput").disabled = false;

	// // Resize tabOutput if on mobile
	// if (document.body.clientWidth < 736) {
	// 	document.getElementById("tabOutput").style.height = "auto";
	// 	document.getElementById("tabOutput").style.height = document.getElementById("tabOutput").scrollHeight + 3 + "px";
	// }
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

function playPitchAudio(noteName) {
	const audio = new Audio("./assets/guitar_notes/" + noteName.trim() + ".mp3");
	audio.play();
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
			displayTab(tabData);
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

// const testNotesString = `E4
// Eb4
// E4
// Eb4
// E4
// B3
// D4
// C4

// A2A3
// E3
// A3
// C3
// E3
// A3`;

/**
 * Console Log objects to full depth
 * @param objs Objects to print
 */
function print(...objs) {
	for (const obj of objs) {
		console.dir(obj, { depth: null });
	}
}

// Maintain latest tabData so formatting settings can update output without
// recomputing tabData
let tabData;
function generateTab() {
	const tabOutput = document.getElementById("tabOutput");
	const pitchInput = document.getElementById("pitchInput");

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

	const guitar = new exports.Guitar(guitarTuning, guitarCapo);
	try {
		tabData = guitar.generateTab(pitchInput.value);
	} catch (error) {
		console.error(error);
		tabOutput.value = error;
		tabOutput.disabled = true;
		return;
	}
	displayTab(tabData);
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

/**
 * Format TAB data to plain text string
 */
function generateTabString(tabData, lineLength = 80, numBeatSeparators = 1) {
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
			if (beatData === "break") {
				for (const stringNum of beatStrings) {
					stringOutputs.get(stringNum).push("|");
				}
			} else {
				// Add the fret numbers for each of the fingerings for the beat

				const maxFingeringWidth = beatData.reduce(
					(max, stringDatum) => Math.max(max, stringDatum["fret"].toString().length),
					0
				);

				const beatStringToFret = beatData.reduce(
					(map, stringDatum) => map.set(stringDatum["stringNum"], stringDatum["fret"].toString()),
					new Map([
						[1, null],
						[2, null],
						[3, null],
						[4, null],
						[5, null],
						[6, null],
					])
				);

				beatStringToFret.forEach((fret, stringNum) => {
					let fretOutput = "";
					if (fret === null) {
						// If no fret for that string
						fretOutput = "-".repeat(maxFingeringWidth);
					} else {
						fretOutput += fret;

						// Add additional dashes if there is a wider fingering
						// in the same beat
						const currFretWidthDelta = maxFingeringWidth - fret.length;
						fretOutput += "-".repeat(currFretWidthDelta);
					}
					stringOutputs.get(stringNum).push(fretOutput);
				});
			}
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
	let outputString = "";
	while (tabCombinedStrings.get(1).length > 0) {
		for (const stringNum of tabCombinedStrings.keys()) {
			outputString += tabCombinedStrings.get(stringNum).substring(0, lineLength);

			// Remove handled beats
			tabCombinedStrings.set(stringNum, tabCombinedStrings.get(stringNum).slice(lineLength));
			outputString += "\n";
			if (stringNum === 6) {
				outputString += "\n";
			}
		}
	}

	return outputString;
}

function displayTab(tabData) {
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

	const tabString = generateTabString(tabData, tabLineLength, numBeatSeparators);
	tabOutput.value = tabString;
	tabOutput.disabled = false;
}

function deactivateTabOutput() {
	const tabOutput = document.getElementById("tabOutput");
	tabOutput.disabled = true;
}

const pitchInput = document.getElementById("pitchInput");
// Add event listener for the pitch input text area to deactivate TAB output
pitchInput.addEventListener("input", () => {
	deactivateTabOutput();
});

// Add event listeners to generate TAB output after changes
pitchInput.addEventListener("change", () => {
	generateTab();
});
for (const settingSelectId of ["guitarTuning", "guitarCapo"]) {
	document.getElementById(settingSelectId).addEventListener("change", () => {
		generateTab();
	});
}

// Add event listeners to reformat TAB string output after changes
for (const displaySettingId of ["tabLineLength", "numBeatSeparators"]) {
	document.getElementById(displaySettingId).addEventListener("input", () => {
		updateLineLengthLabel();
		if (tabData !== undefined) {
			displayTab(tabData);
		}
	});
}

document.getElementById("generateTabButton").addEventListener("click", generateTab);

const testNotesString = `E4
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
A3`;

updateLineLengthLabel();

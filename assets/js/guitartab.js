/**
 * Console Log objects to full depth
 * @param objs Objects to print
 */
function print(...objs) {
	for (const obj of objs) {
		console.dir(obj, { depth: null });
	}
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

function deactivateTabOutput() {
	const tabOutput = document.getElementById("tabOutput");
	tabOutput.disabled = true;
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

		for (const beatData of tabData) {
			let beatStrings = new Set(stringOutputs.keys());
			if (beatData === "break") {
				for (const stringNum of beatStrings) {
					stringOutputs.get(stringNum).push("|");
				}
			} else {
				// Add the fret numbers for each of the fingerings for the beat
				for (const stringDatum of beatData) {
					const stringNum = stringDatum["stringNum"];
					stringOutputs.get(stringNum).push(stringDatum["fret"]);
					beatStrings.delete(stringNum);
				}

				// Add dashes for remaining guitar strings in the beat
				for (const remainingStringNum of beatStrings) {
					stringOutputs.get(remainingStringNum).push("-");
				}
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

updateLineLengthLabel();

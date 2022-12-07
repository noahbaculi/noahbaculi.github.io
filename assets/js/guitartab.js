// import { Guitar } from "./guitar_object.js";
// import { Guitar } from "https:///cdn.jsdelivr.net/gh/noahbaculi/guitar-tab/src/guitar_object.js";

/**
 * Console Log objects to full depth
 * @param objs Objects to print
 */
function print(...objs) {
	for (const obj of objs) {
		console.dir(obj, { depth: null });
	}
}

// Add event listener for the pitch input text area to deactivate TAB output
const pitchInput = document.getElementById("pitchInput");
if (pitchInput.addEventListener) {
	pitchInput.addEventListener(
		"input",
		function () {
			deactivateTabOutput();
		},
		false
	);
	pitchInput.addEventListener(
		"change",
		function () {
			generateTab();
		},
		false
	);
}

function deactivateTabOutput() {
	const tabOutput = document.getElementById("tabOutput");
	tabOutput.disabled = true;
}

function generateTab() {
	const tabOutput = document.getElementById("tabOutput");
	const pitchInput = document.getElementById("pitchInput");

	// Get settings
	const guitarTuning = document.getElementById("guitarTuning");
	print(guitarTuning.value);

	const guitar = new exports.Guitar(guitarTuning.value);

	let tabData;
	try {
		tabData = guitar.generateTab(pitchInput.value);
	} catch (error) {
		tabOutput.value = error;
		console.error(error);
		return;
	}

	const tabString = generateTabString(tabData, 9);

	tabOutput.disabled = false;
	tabOutput.value = tabString;
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
			[1, ""],
			[2, ""],
			[3, ""],
			[4, ""],
			[5, ""],
			[6, ""],
		]);

		for (const beatData of tabData) {
			let beatStrings = new Set(stringOutputs.keys());
			if (beatData === "break") {
				for (const stringNum of beatStrings) {
					stringOutputs.set(stringNum, stringOutputs.get(stringNum) + "|");
				}
			} else {
				// Add the fret numbers for each of the fingerings for the beat
				for (const stringDatum of beatData) {
					const stringNum = stringDatum["stringNum"];
					stringOutputs.set(
						stringNum,
						stringOutputs.get(stringNum) + stringDatum["fret"]
					);
					beatStrings.delete(stringNum);
				}

				// Add dashes for remaining guitar strings in the beat
				for (const remainingStringNum of beatStrings) {
					stringOutputs.set(
						remainingStringNum,
						stringOutputs.get(remainingStringNum) + "-"
					);
				}
			}
		}
		return stringOutputs;
	}

	const tabStringData = generateTabStringData(tabData);

	let outputString = "";
	const beatSeparator = "-".repeat(numBeatSeparators); // to customize spacing

	while (tabStringData.get(1).length > 0) {
		for (const stringNum of tabStringData.keys()) {
			// Add dash separators
			outputString += beatSeparator;
			// ! TODO fix bug where fret values longer than one character are being interrupted
			outputString += tabStringData
				.get(stringNum)
				.substring(0, lineLength)
				.replace(/(.{1})/g, `$&${beatSeparator}`);

			// Remove handled beats
			tabStringData.set(
				stringNum,
				tabStringData.get(stringNum).slice(lineLength)
			);
			outputString += "\n";
			if (stringNum === 6) {
				outputString += "\n";
			}
		}
	}

	return outputString;
}
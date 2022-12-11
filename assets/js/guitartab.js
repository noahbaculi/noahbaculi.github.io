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
    const tabOutput = document.getElementById("tabOutput");
    const pitchInput = document.getElementById("pitchInput");

    try {
        const arrangement = new exports.Arrangement(guitar, pitchInput.value);
        tabData = arrangement.bestFingerings;
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
updateLineLengthLabel(); // update line length label with initial default value

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
        console.warn(
            `Something went wrong... Using default numBeatSeparators = ${numBeatSeparators} | Error = ${error}`
        );
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

    const tabString = generateTabString(tabData, tabLineLength, numBeatSeparators);
    tabOutput.value = tabString;
    tabOutput.disabled = false;
}

function deactivateTabOutput() {
    const tabOutput = document.getElementById("tabOutput");
    tabOutput.disabled = true;
}

function playGuitarAudio(noteName) {
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

// Add event listeners to reformat TAB string output after changes
for (const displaySettingId of ["tabLineLength", "numBeatSeparators"]) {
    document.getElementById(displaySettingId).addEventListener("input", () => {
        updateLineLengthLabel();
        if (tabData !== undefined) {
            displayTab(tabData);
        }
    });
}

document.getElementById("generateTabButton").addEventListener("click", createArrangement);

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

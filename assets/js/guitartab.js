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

console.log("HI");
console.log(exports);

const guitar = new exports.Guitar("");
console.log(guitar.strings);

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
const output = guitar.generateTab(testNotesString);
console.log("-----------------------------");
console.log(output);
print(output);

function generateTab() {
	print("Hi");
	const tabOutput = document.getElementById("tabOutput");
	tabOutput.value = "hi";
}

// Add event listener for the pitch input text area to regenerate updated TAB
const pitchInput = document.getElementById("pitchInput");
if (pitchInput.addEventListener) {
	pitchInput.addEventListener(
		"input",
		function () {
			generateTab();
		},
		false
	);
} else if (pitchInput.attachEvent) {
	pitchInput.attachEvent("onpropertychange", function () {
		generateTab();
	});
}

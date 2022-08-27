const thisForm = document.getElementById("documentToolForm");
thisForm.addEventListener("submit", async function (e) {
	e.preventDefault();

	const formData = new FormData();
	formData.append(
		"template_file",
		document.getElementById("template_file").files[0]
	);
	formData.append(
		"replacements_file",
		document.getElementById("replacements_file").files[0]
	);
	formData.append(
		"output_base_fn",
		document.getElementById("output_base_fn").value
	);

	const output_zip_fn = "generated_documents.zip";
	formData.append("output_zip_fn", output_zip_fn);

	const request = new XMLHttpRequest();
	request.open("POST", "https://doc-find-replace.herokuapp.com/", true);
	request.responseType = "blob";
	request.onload = function (e) {
		var blob = request.response;
		var link = document.createElement("a");
		link.href = window.URL.createObjectURL(blob);
		link.download = output_zip_fn;
		link.click();
	};
	request.send(formData);
});

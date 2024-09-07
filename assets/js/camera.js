async function tryFetch(url, timeout = 3000) {
  const controller = new AbortController();
  const signal = controller.signal;

  const fetchTimeout = setTimeout(() => {
    console.log(`Fetch to ${url} timed out.`);
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, { signal });
    clearTimeout(fetchTimeout);
    console.log(`Fetched: ${url} with status ${response.status}`);
    if (response.ok) {
      // Success (status 200-299)
      return true;
    } else if (response.status === 401) {
      // 401 Unauthorized detected
      console.log(`Unauthorized (401): ${url}`);
      return true; // Still reachable, but unauthorized
    } else {
      // Failed with other status codes
      console.log(`Failed to fetch: ${url} with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`Failed to fetch: ${url} with error: ${error.message}`);
    return false;
  }
}

async function insertCameraLinks() {
  const cameraPaths = ["opti_cam_1", "wansview"];
  const localUrl = "http://192.168.0.201:8888";
  const globalUrl = "http://home.noahbaculi.com:8888";

  const canContactLocal = await tryFetch(`${localUrl}/${cameraPaths[0]}`);
  const workingUrl = canContactLocal ? localUrl : globalUrl;
  console.log("Working URL: ", workingUrl);

  // Get the container element where the new elements will be added
  const container = document.getElementById("camera_links");

  // Loop through the array of camera paths
  cameraPaths.forEach((cameraPath) => {
    // Create the div element
    const div = document.createElement("div");
    div.classList.add("project_tile_more");
    div.style.paddingBottom = "10px";

    // Create the anchor element
    const anchor = document.createElement("a");
    anchor.href = `${workingUrl}/${cameraPath}`;
    anchor.setAttribute("target", "_blank");
    anchor.textContent = `${cameraPath.replaceAll("_", " ")} →`;
    anchor.style.textTransform = "capitalize";

    // Append the anchor to the div
    div.appendChild(anchor);

    // Append the div to the container
    container.appendChild(div);
  });
}

window.onload = insertCameraLinks();

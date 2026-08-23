import { actions } from "./settings.js";
import Storage from "./storage.js";

document.addEventListener("DOMContentLoaded", async () => {
	try {
		const { nextImage } = await Storage.getLocal(actions.NEXT_IMAGE);

		const body = document.getElementById("body");

		if (body && nextImage.base64) {
			body.style.backgroundImage = `url(${nextImage.base64})`;
		}

		chrome.runtime.sendMessage({ command: "nextImage" });
	} catch (err) {
		console.error(err);
	}
});

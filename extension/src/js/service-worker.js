import { setNextImage } from "./actions.js";
import { setDefaultExtensionSettings } from "./settings.js";

chrome.runtime.onInstalled.addListener(async (details) => {
	if (details.reason === "install") {
		await setDefaultExtensionSettings();
		await setNextImage();
	}
});

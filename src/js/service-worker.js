import { setNextImage } from "./actions.js";
import { actions, setDefaultExtensionSettings } from "./settings.js";

chrome.runtime.onInstalled.addListener(async (details) => {
	try {
		if (details.reason === "install") {
			await setDefaultExtensionSettings();
			await setNextImage();
		}
	} catch (err) {
		console.error(err);
	}
});

chrome.runtime.onMessage.addListener((request, sender) => {
	const listeners = {
		[actions.NEXT_IMAGE]: async () => await setNextImage(),
	};

	try {
		listeners[request.command]();
	} catch (err) {
		console.error(err);
	}
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
	chrome.runtime.sendMessage({ command: alarm.name });
});

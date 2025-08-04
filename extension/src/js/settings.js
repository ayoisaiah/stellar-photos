import Storage from "./storage.js";

const stellarCollection = "998309";

const imageFrequency = Object.freeze({
	NEW_TAB: "newtab",
	EVERY_15_MINUTES: "every15minutes",
	EVERY_HOUR: "everyhour",
	EVERY_DAY: "everyday",
});

const imageResolution = Object.freeze({
	STANDARD: "standard",
	HIGH: "high",
	MAX: "max",
});

const syncSettingKeys = Object.freeze({
	IMAGE_RESOLUTION: "imageResolution",
	IMAGE_FREQUENCY: "imageFrequency",
	IMAGE_SOURCE: "imageSource",
});

const endpointKeys = Object.freeze({
	GET_NEXT_IMAGE: "getNextImage",
});

async function setDefaultExtensionSettings() {
	const syncSettings = {
		[syncSettingKeys.IMAGE_FREQUENCY]: imageFrequency.NEW_TAB,
		[syncSettingKeys.IMAGE_RESOLUTION]: imageResolution.STANDARD,
		[syncSettingKeys.IMAGE_SOURCE]: "official",
	};

	const endpoints = {
		[endpointKeys.GET_NEXT_IMAGE]: `/random-photo/?collections=${stellarCollection}&resolution=${imageResolution.STANDARD}`,
	};

	await Storage.setSync(syncSettings);
	await Storage.setLocal(endpoints);
}

export { setDefaultExtensionSettings, syncSettingKeys, endpointKeys };

import { api } from "./requests.js";
import { endpointKeys } from "./settings.js";
import Storage from "./storage.js";

async function setNextImage() {
	const endpoint = await Storage.getLocal(endpointKeys.GET_NEXT_IMAGE);

	const response = await api.getRandomPhoto(endpoint);
	const data = await response.json();

	const nextImage = {
		timestamp: Date.now(),
		...data,
	};

	console.log(nextImage);

	Storage.setLocal({ nextImage });

	// const history = storageData.history || [];
	//
	// if (history.length >= 10) {
	//   history.pop();
	// }
	//
	// history.unshift(nextImage);
	//
	// chrome.storage.local.set({ history });
	//
	// chrome.runtime.sendMessage({ command: 'update-history' });
}

export { setNextImage };

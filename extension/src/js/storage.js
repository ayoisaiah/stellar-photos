class Storage {
	static #get(area, keys) {
		return new Promise((resolve, reject) => {
			chrome.storage[area].get(keys, (result) => {
				if (chrome.runtime.lastError) {
					return reject(chrome.runtime.lastError.message);
				}
				return resolve(result);
			});
		});
	}

	static #set(area, data) {
		return new Promise((resolve, reject) => {
			chrome.storage[area].set(data, () => {
				if (chrome.runtime.lastError) {
					return reject(chrome.runtime.lastError.message);
				}
				return resolve();
			});
		});
	}

	static getLocal(keys) {
		return Storage.#get("local", keys);
	}

	static getSync(keys) {
		return Storage.#get("sync", keys);
	}

	static setLocal(data) {
		return Storage.#set("local", data);
	}

	static setSync(data) {
		return Storage.#set("sync", data);
	}

	static async getAll() {
		const localData = await Storage.getLocal(null);
		const syncData = await Storage.getSync(null);
		return { ...syncData, ...localData };
	}
}

export default Storage;

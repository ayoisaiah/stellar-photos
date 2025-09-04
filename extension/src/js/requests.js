class ApiClient {
	#baseUrl;

	// TODO: set baseUrl dynamically
	constructor(baseUrl = "http://localhost") {
		this.#baseUrl = baseUrl;
	}

	#validateResponse(response) {
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return response;
	}

	async #getRequest(endpoint) {
		const response = await fetch(`${this.#baseUrl}${endpoint}`);
		return this.#validateResponse(response);
	}

	async #postRequest(endpoint, body) {
		const response = await fetch(`${this.#baseUrl}${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		return this.#validateResponse(response);
	}

	getRandomImage(endpoint) {
		return this.#getRequest(endpoint);
	}

	searchUnsplash(key, page) {
    return this.#getRequest(`/unsplash/search?key=${key}&page=${page}`);
	}

	trackDownload(id) {
		return this.#getRequest(`/unsplash/download?id=${id}`);
	}

	dropbox = {
		getKey: () => this.#getRequest("/dropbox/key/"),
		save: (imageId, token, url) =>
			this.#postRequest("/dropbox/save", { image_id: imageId, token, url }),
	};

	googleDrive = {
		getKey: () => this.#getRequest("/googledrive/key/"),
		authorize: (code) => this.#postRequest("/gdrive/auth", { code }),
		refreshToken: (token) =>
			this.#postRequest("/gdrive/refresh", { refresh_token: token }),
		save: (imageId, token, url) =>
			this.#postRequest("/gdrive/save", { image_id: imageId, token, url }),
	};

	oneDrive = {
		getId: () => this.#getRequest("/onedrive/id"),
		authorize: (code) => this.#postRequest("/onedrive/auth", { code }),
		refreshToken: (token) => this.#postRequest("/onedrive/refresh", { token }),
		save: (imageId, token, url) =>
			this.#postRequest("/onedrive/save", { image_id: imageId, token, url }),
	};
}

export const api = new ApiClient();

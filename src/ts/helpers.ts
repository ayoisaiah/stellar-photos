import { ChromeLocalStorage, ChromeStorage, ChromeSyncStorage } from './types';

interface Classlist {
  toggle(this: HTMLElement, c: string): HTMLElement;
  add(this: HTMLElement, c: string): HTMLElement;
  remove(this: HTMLElement, c: string): HTMLElement;
}

/* Because the native implementation of the classList API is not chainable */
function chainableClassList(element: HTMLElement): Classlist {
  const { classList } = element;

  return {
    toggle: function toggle(c: string) {
      classList.toggle(c);
      return this;
    },

    add: function add(c: string) {
      classList.add(c);
      return this;
    },

    remove: function remove(c: string) {
      classList.remove(c);
      return this;
    },
  };
}

const $ = document.getElementById.bind(document);

function removeChildElements(element: HTMLElement): void {
  while (element.hasChildNodes()) {
    if (element.lastChild) element.removeChild(element.lastChild);
  }
}

// Make invalid responses throw an error since fetch does not reject for bad
// responses
function validateResponse(response: Response): Response {
  if (!response.ok) {
    throw Error(response.statusText);
  }

  return response;
}

function lessThanTimeAgo(
  timestamp = Date.now(),
  timeInSeconds: number
): boolean {
  const timeInMilliseconds = 1000 * timeInSeconds;
  const timeAgo = Date.now() - timeInMilliseconds;
  return timestamp > timeAgo;
}

// Retrieve data from Chrome's Local storage area
async function getFromChromeLocalStorage(
  keys: string | string[] | Object | null
): Promise<ChromeLocalStorage> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(result);
      }
    });
  });
}

// Retrieve data from Chrome's sync storage area
async function getFromChromeSyncStorage(
  keys: string | string[] | Object | null
): Promise<ChromeSyncStorage> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(result);
      }
    });
  });
}

async function getChromeStorageData(): Promise<ChromeStorage> {
  const localData = await getFromChromeLocalStorage(null);

  const syncData = await getFromChromeSyncStorage(null);

  return Object.assign(syncData, localData);
}

export {
  chainableClassList,
  $,
  removeChildElements,
  validateResponse,
  lessThanTimeAgo,
  getFromChromeLocalStorage,
  getFromChromeSyncStorage,
  getChromeStorageData,
};

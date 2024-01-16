import { ChromeLocalStorage } from '../types';

const options = {
  bubbles: true,
  composed: true,
};

const toggleHistoryEvent = new CustomEvent('toggle-history', options);

const openSearchEvent = new CustomEvent('open-search', options);

const fadeInEvent = new CustomEvent('fade-in', options);

const togglePausedEvent = new CustomEvent('toggle-paused', options);

const openInfoEvent = new CustomEvent('open-info', options);

interface DownloadEvent extends CustomEvent {
  detail: {
    imageID: string;
    downloadURL: string;
  };
}

interface SetBackgroundEvent extends CustomEvent {
  detail: {
    imageID: string;
  };
}

interface SaveToCloudEvent extends CustomEvent {
  detail: {
    imageID: string;
    downloadURL: string;
    cloudService: ChromeLocalStorage['cloudService'];
  };
}

function getCloudSaveEvent(
  imageID: string,
  downloadURL: string,
  cloudService: ChromeLocalStorage['cloudService']
): SaveToCloudEvent {
  return new CustomEvent(
    'save-to-cloud',
    Object.assign(
      {
        detail: {
          imageID,
          downloadURL,
          cloudService,
        },
      },
      options
    )
  );
}

function getDownloadEvent(imageID: string, downloadURL: string): DownloadEvent {
  return new CustomEvent(
    'download',
    Object.assign(
      {
        detail: {
          imageID,
          downloadURL,
        },
      },
      options
    )
  );
}

function getSetBackgroundEvent(imageID: string): SetBackgroundEvent {
  return new CustomEvent(
    'set-background',
    Object.assign(
      {
        detail: {
          imageID,
        },
      },
      options
    )
  );
}

export {
  toggleHistoryEvent,
  openSearchEvent,
  fadeInEvent,
  togglePausedEvent,
  openInfoEvent,
  getDownloadEvent,
  getCloudSaveEvent,
  getSetBackgroundEvent,
};

export type { DownloadEvent, SaveToCloudEvent, SetBackgroundEvent };

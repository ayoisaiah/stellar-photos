import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import tailwind from 'sass:../../sass/tailwind.global.scss';
import { saveToDropbox } from '../cloud';
import { saveToOneDrive } from '../cloud';
import { saveToGoogleDrive } from '../googledrive';
import { getChromeStorageData } from '../helpers';
import { trackDownload } from '../requests';
import { ChromeStorage } from '../types';
import {
  DownloadEvent,
  SaveToCloudEvent,
  SetBackgroundEvent,
} from './custom-events';
import './footer';
import './header';
import './history';
import './loader';
import './settings';

@customElement('stellar-main')
class Main extends LitElement {
  static override styles = [unsafeCSS(tailwind)];

  @property({ type: Boolean })
  historyOpen = false;

  @property({ type: Boolean })
  infoOpen = false;

  @property({ type: Boolean })
  settingsOpen = false;

  @property({ type: Boolean })
  controlsShown = false;

  @property({ type: Object })
  data: ChromeStorage | null = null;

  @property({ type: Boolean })
  imagePaused = false;

  @property({ type: Boolean })
  loading = false;

  #toggleHistory(): void {
    this.historyOpen = !this.historyOpen;
  }

  // #showControls(): void {
  //   this.controlsShown = true;
  // }
  //
  // #hideControls(): void {
  //   if (this.historyOpen) return;
  //
  //   this.controlsShown = false;
  // }

  #openInfo(): void {
    this.infoOpen = true;
  }

  #togglePaused(): void {
    this.imagePaused = !this.imagePaused;
  }

  async #downloadImage(event: DownloadEvent): Promise<void> {
    const { imageID, downloadURL } = event.detail;

    trackDownload(imageID).catch((err) => console.error(err));

    window.open(downloadURL, '_blank');
  }

  async #saveToCloud(event: SaveToCloudEvent): Promise<void> {
    this.loading = true;

    const { imageID, downloadURL, cloudService } = event.detail;

    try {
      switch (cloudService) {
        case 'dropbox':
          await saveToDropbox(imageID, downloadURL);
          break;
        case 'onedrive':
          await saveToOneDrive(imageID, downloadURL);
          break;
        case 'googledrive':
          await saveToGoogleDrive(imageID, downloadURL);
          break;
      }
    } catch (err) {
      // snackbar('Download failed', 'error');
      // TODO: Dispatch error event
    } finally {
      this.loading = false;
    }
  }

  #setBackground(event: SetBackgroundEvent) {
    const { imageID } = event.detail;
    const index = this.data!.history?.findIndex((e) => e.id === imageID);
    const image = this.data!.history![index!];

    const body = document.getElementById('body');
    if (body) {
      body.style.backgroundImage = `url(${image.base64})`;
    }

    chrome.storage.local.set({ nextImage: image, imagePaused: true });

    (async () => {
      try {
        this.data = await getChromeStorageData();
      } catch (err) {
        console.error(err);
      }
    })();

    const overlay = document.getElementById('js-overlay');
    if (overlay) {
      overlay.animate(
        [
          {
            opacity: 1,
          },
          {
            opacity: 0,
          },
        ],
        {
          duration: 500,
        }
      );
    }
  }

  #openSettings() {
    this.settingsOpen = true;
  }

  #handleScrollWheel(event: WheelEvent) {
    if (event.deltaY < 0) {
      this.historyOpen = true;
    } else if (event.deltaY > 0) {
      this.historyOpen = false;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();

    (async () => {
      try {
        this.data = await getChromeStorageData();
      } catch (err) {
        console.error(err);
      }
    })();

    this.addEventListener('toggle-history', this.#toggleHistory);
    this.addEventListener('toggle-paused', this.#togglePaused);
    this.addEventListener('open-info', this.#openInfo);
    this.addEventListener('close-settings', this.#openSettings);
    this.addEventListener(
      'download',
      this.#downloadImage as unknown as EventListener
    );
    this.addEventListener(
      'save-to-cloud',
      this.#saveToCloud as unknown as EventListener
    );
    this.addEventListener(
      'set-background',
      this.#setBackground as unknown as EventListener
    );
  }

  override render() {
    if (!this.data) {
      return html``;
    }

    return html`<main
      class="h-screen leading-relaxed"
      id="js-main"
      @wheel=${this.#handleScrollWheel}
    >
      <stellar-loader .active=${this.loading}></stellar-loader>
      <stellar-header
        class="s-ui ${this.controlsShown ? 'show' : ''}"
        .historyOpen=${this.historyOpen}
      ></stellar-header>
      <stellar-footer
        class="s-ui ${this.controlsShown ? 'show' : ''}"
        .data=${this.data}
        .imagePaused=${this.imagePaused}
        .historyOpen=${this.historyOpen}
      ></stellar-footer>
      <stellar-history
        .historyOpen=${this.historyOpen}
        .data=${this.data}
      ></stellar-history>
      <stellar-settings></stellar-settings>
    </main>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-main': Main;
  }
}

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { saveToDropbox } from '../cloud';
import { saveToGoogleDrive } from '../googledrive';
import { getChromeStorageData } from '../helpers';
import { saveToOneDrive } from '../onedrive';
import { trackDownload } from '../requests';
import { ChromeStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import {
  DownloadEvent,
  SaveToCloudEvent,
  SetBackgroundEvent,
} from './custom-events';
import './footer';
import './header';
import './history';

@customElement('stellar-main')
class Main extends LitElement {
  @property({ type: Boolean })
  searchOpen = false;

  @property({ type: Boolean })
  historyOpen = false;

  @property({ type: Boolean })
  infoOpen = false;

  @property({ type: Boolean })
  controlsShown = false;

  @property({ type: Object })
  data: ChromeStorage | null = null;

  @property({ type: Object })
  currentImage!: UnsplashImage;

  @property({ type: Boolean })
  imagePaused = false;

  @property({ type: Boolean })
  loading = false;

  #toggleHistory(): void {
    this.historyOpen = !this.historyOpen;
  }

  #openSearch(): void {
    this.searchOpen = !this.searchOpen;
  }

  #showControls(): void {
    this.controlsShown = true;
  }

  #hideControls(): void {
    if (this.historyOpen) return;

    this.controlsShown = false;
  }

  #openInfo(): void {
    this.infoOpen = true;
  }

  #togglePaused(): void {
    this.imagePaused = !this.imagePaused;
  }

  async #downloadImage(event: DownloadEvent): Promise<void> {
    this.loading = true;

    const { imageID, downloadURL } = event.detail;

    try {
      await trackDownload(imageID);

      const a = document.createElement('a');
      a.href = downloadURL || '';
      a.setAttribute('download', `photo-${imageID}`);
      a.setAttribute('style', 'opacity: 0;');

      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      // snackbar('Download failed', 'error');
      // TODO: Dispatch error event
    } finally {
      this.loading = false;
    }
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
    const index = this.data!.history?.findIndex((e) => (e.id = imageID));
    const image = this.data!.history![index!];

    const body = document.getElementById('body');
    if (body) {
      body.style.backgroundImage = `url(${image.base64})`;
    }

    this.currentImage = image;

    chrome.storage.local.set({ nextImage: image, imagePaused: true });

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

  override connectedCallback(): void {
    super.connectedCallback();

    (async () => {
      try {
        this.data = await getChromeStorageData();
        this.currentImage = this.data.nextImage!;
      } catch (err) {
        console.error(err);
      }
    })();

    this.addEventListener('toggle-history', this.#toggleHistory);
    this.addEventListener('open-search', this.#openSearch);
    this.addEventListener('toggle-paused', this.#togglePaused);
    this.addEventListener('open-info', this.#openInfo);
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

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    this.removeEventListener('toggle-history', this.#toggleHistory);
    this.removeEventListener('open-search', this.#openSearch);
    this.removeEventListener('toggle-paused', this.#togglePaused);
    this.removeEventListener('open-info', this.#openInfo);
    this.removeEventListener(
      'download',
      this.#downloadImage as unknown as EventListener
    );
    this.removeEventListener(
      'save-to-cloud',
      this.#saveToCloud as unknown as EventListener
    );
    this.removeEventListener(
      'set-background',
      this.#setBackground as unknown as EventListener
    );
  }

  override createRenderRoot(): this {
    return this;
  }

  override render() {
    if (!this.data) {
      return html``;
    }

    return html`<main
      class="s-main"
      id="js-main"
      @mouseenter=${() => this.#showControls()}
      @mouseleave=${() => window.setTimeout(() => this.#hideControls(), 2000)}
    >
      <div class="loader ${this.loading ? 'loader-active' : ''}"></div>
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
    </main>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stellar-main': Main;
  }
}

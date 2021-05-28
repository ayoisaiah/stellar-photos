import { html, TemplateResult } from 'lit-html';
import { search } from './search';
import { $ } from '../helpers';
import { footer } from './footer';
import { photoCard } from './photo-card';
import { fadeInControls, hideControls } from './utils';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import { imageInfo } from './image-info';

function loadHistory(
  history: UnsplashImage[],
  cloudService?: ChromeLocalStorage['cloudService']
): TemplateResult {
  let h = html`${history.map((photo: UnsplashImage) =>
    photoCard(photo, cloudService)
  )}`;
  if (history.length < 10) {
    let historyLength = history.length;
    let placeholders = html``;
    while (historyLength < 10) {
      placeholders = html`${placeholders}
        <div class="history-placeholder">
          <svg>
            <use href="#icon-image"></use>
          </svg>
        </div>`;
      historyLength += 1;
    }

    h = html`${h} ${placeholders}`;
  }

  return h;
}

type ClassListActions = 'toggle' | 'add' | 'remove';

function toggleHistoryPane(action: ClassListActions): void {
  if (action === 'add') fadeInControls();
  $('js-history')?.classList[action]('open');
  $('js-footer')?.classList[action]('history-open');
  $('js-hamburger')?.classList[action]('transform');
}

function handleScrollWheel(
  event: WheelEvent & { target: HTMLButtonElement }
): void {
  const searchResults = $('js-search-results');
  if (searchResults && searchResults.hasChildNodes()) return;

  if (event.target?.matches('.s-history *')) return;

  if (event.deltaY < 0) {
    toggleHistoryPane('add');
  } else if (event.deltaY > 0) {
    toggleHistoryPane('remove');
  }
}

function openSearch(): void {
  $('js-open-search')?.classList.add('hidden');
  $('js-search')?.classList.add('search--open');
  $('js-search-input')?.focus();
}

function hamburgerMenu(): TemplateResult {
  return html`
    <button
      @click=${() => toggleHistoryPane('toggle')}
      id="js-hamburger"
      class="historyButton historyButton-open"
      title="toggle history menu"
      aria-label="Toggle History Menu"
    >
      <div>
        <i class="bar1"></i>
        <i class="bar2"></i>
        <i class="bar3"></i>
      </div>
    </button>
  `;
}

function searchButton(): TemplateResult {
  return html`
    <button
      @click=${openSearch}
      title="Find free hi-res photos"
      id="js-open-search"
      class="searchButton searchButton-open"
      aria-label="Open search form"
    >
      <svg class="icon icon--search">
        <use href="#icon-search"></use>
      </svg>
    </button>
  `;
}

function ui(data: ChromeLocalStorage): TemplateResult {
  return html`
    <main
      @mouseenter=${fadeInControls}
      @mouseleave=${hideControls}
      @wheel=${handleScrollWheel}
      class="s-main"
      id="js-main"
    >
      <header class="header s-ui" id="header">
        <div class="header-content" id="header-content">
          ${hamburgerMenu()} ${searchButton()}
        </div>
      </header>

      <div class="loader" id="js-loader"></div>

      ${search()}

      <ul class="s-history" id="js-history">
        ${data.history
          ? loadHistory(data.history, data.cloudService)
          : loadHistory([])}
      </ul>

      <div id="js-dialog-container">
        ${data.nextImage ? imageInfo(data.nextImage) : ''}
      </div>

      <div id="js-footer-container">${footer(data)}</div>
    </main>
  `;
}

export { ui, loadHistory };

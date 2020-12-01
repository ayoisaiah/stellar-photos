import { html, TemplateResult } from 'lit-html';
import { search } from './search';
import { $ } from '../helpers';
import { footer } from './footer';
import { photoCard } from './photo-card';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import { imageInfo } from './image-info';

function loadHistory(history: UnsplashImage[]): TemplateResult {
  return html`${history.map((photo: UnsplashImage) => photoCard(photo))} `;
}

function toggleHistoryPane(): void {
  $('js-history')?.classList.toggle('open');
  $('js-footer')?.classList.toggle('history-open');
  $('js-hamburger')?.classList.toggle('transform');
}

function openSearch(): void {
  $('js-open-search')?.classList.add('hidden');
  $('js-search')?.classList.add('search--open');
  $('js-search-input')?.focus();
}

function hamburgerMenu(): TemplateResult {
  return html`
    <button
      @click=${toggleHistoryPane}
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
    <main class="s-main" id="s-main">
      <header class="header s-ui hide-ui" id="header">
        <div class="header-content" id="header-content">
          ${hamburgerMenu()} ${searchButton()}
        </div>
      </header>

      <div class="loader" id="js-loader"></div>

      ${search()}

      <ul class="s-history" id="js-history">
        ${data.history ? loadHistory(data.history) : ''}
      </ul>

      ${data.nextImage ? imageInfo(data.nextImage) : ''} ${footer(data)}
    </main>
  `;
}

export { ui };

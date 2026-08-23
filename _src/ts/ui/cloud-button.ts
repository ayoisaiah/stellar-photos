import { html, TemplateResult } from 'lit-html';
import { saveToDropbox } from '../dropbox';
import { saveToGoogleDrive } from '../googledrive';
import { saveToOneDrive } from '../onedrive';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';

function encodeURL(url: string): string {
  const [base, params] = url.split('?');
  return `${base}${encodeURIComponent(`?${params!}`)}`;
}

function onedriveButton(photo: UnsplashImage): TemplateResult {
  return html`
    <button
      @click=${() => saveToOneDrive(photo.id, photo.urls.full)}
      class="control-button cloud-button onedrive-button"
      title="Save photo to OneDrive"
    >
      <svg class="icon icon-cloud"><use href="#icon-onedrive"></use></svg>
    </button>
  `;
}

function googledriveButton(photo: UnsplashImage): TemplateResult {
  return html`
    <button
      @click=${() => saveToGoogleDrive(photo.id, encodeURL(photo.urls.raw))}
      class="control-button cloud-button googledrive-button"
      title="Save photo to Google Drive"
    >
      <svg class="icon icon-cloud"><use href="#icon-google-drive"></use></svg>
    </button>
  `;
}

function dropboxButton(photo: UnsplashImage): TemplateResult {
  return html`
    <button
      @click=${() => saveToDropbox(photo.id, encodeURL(photo.urls.full))}
      class="control-button cloud-button dropbox-button"
      title="Save photo to Dropbox"
    >
      <svg class="icon icon-cloud"><use href="#icon-dropbox"></use></svg>
    </button>
  `;
}

function cloudButton(
  photo: UnsplashImage,
  cloudService?: ChromeLocalStorage['cloudService']
): TemplateResult | void {
  if (cloudService === 'dropbox') {
    return dropboxButton(photo);
  }

  if (cloudService === 'onedrive') {
    return onedriveButton(photo);
  }

  if (cloudService === 'googledrive') {
    return googledriveButton(photo);
  }
}

export { cloudButton };

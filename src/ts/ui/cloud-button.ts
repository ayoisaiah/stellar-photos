import { html, TemplateResult } from 'lit-html';
import { saveToDropbox } from '../dropbox';
import { saveToOneDrive } from '../onedrive';
import { UnsplashImage } from '../types/unsplash';

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

function dropboxButton(photo: UnsplashImage): TemplateResult {
  return html`
    <button
      @click=${() => saveToDropbox(photo.id, photo.urls.full)}
      class="control-button cloud-button dropbox-button"
      title="Save photo to Dropbox"
    >
      <svg class="icon icon-cloud"><use href="#icon-dropbox"></use></svg>
    </button>
  `;
}

function cloudButton(
  photo: UnsplashImage,
  cloudService?: 'dropbox' | 'onedrive'
): TemplateResult | void {
  if (cloudService === 'dropbox' || document.querySelector('.dropbox-button')) {
    return dropboxButton(photo);
  }

  if (
    cloudService === 'onedrive' ||
    document.querySelector('.onedrive-button')
  ) {
    return onedriveButton(photo);
  }
}

export { cloudButton };

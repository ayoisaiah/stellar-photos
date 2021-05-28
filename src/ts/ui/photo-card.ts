import { html, TemplateResult, nothing, render } from 'lit-html';
import { $, getFromChromeLocalStorage } from '../helpers';
import { ChromeLocalStorage } from '../types';
import { UnsplashImage } from '../types/unsplash';
import { cloudButton } from './cloud-button';
import { downloadButton } from './download';
import { footer } from './footer';
import { imageInfo } from './image-info';

function fadeInBackground(): void {
  const overlay = $('js-overlay');
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

async function updateImageInfo(image: UnsplashImage): Promise<void> {
  const localData = await getFromChromeLocalStorage(null);

  localData.nextImage = image;
  const f = $('js-footer-container');
  if (f) {
    render(footer(localData), f);
    $('js-footer')?.classList.add('history-open', 'show');
  }

  const d = $('js-dialog-container');
  if (d) render(imageInfo(image), d);
}

async function setBackgroundFromHistory(
  event: MouseEvent & { target: HTMLButtonElement }
): Promise<void> {
  try {
    const { imageid } = event.target.dataset;
    const localData = await getFromChromeLocalStorage(null);
    const arr = localData.history?.filter(
      (e: UnsplashImage) => e.id === imageid
    );

    if (!arr || arr.length <= 0) return;

    const image = arr[0];
    if (!image) return;

    const body = $('body');
    if (body && image.base64) {
      body.style.backgroundImage = `url(${image.base64})`;
      // ensure portrait images are place correctly in the frame
      if (image.height - image.width > 500) {
        body.style.backgroundPosition = '50% 20%';
      } else {
        body.style.backgroundPosition = '50%';
      }
      fadeInBackground();
    }

    chrome.storage.local.set({ nextImage: image, imagePaused: true });

    const playButton = $('js-play-button');
    if (playButton) {
      playButton.classList.remove('is-hidden');
    }

    updateImageInfo(image);
  } catch (err) {
    console.error(err);
  }
}

function photoCard(
  photo: UnsplashImage,
  cloudService?: ChromeLocalStorage['cloudService']
): TemplateResult {
  const backgroundPhoto = photo.base64 || photo.urls.small;
  const { width, height, id } = photo;
  const linkToPhoto = photo.links?.html ?? 'https://unsplash.com';
  const photographer = photo.user?.links?.html;
  const photographerPicture =
    photo.user?.profile_image?.small || '../images/profile_pic.svg';
  const photographerName = `${photo.user?.first_name || ''}
    ${photo.user?.last_name || ''}`;

  return html`
    <li
      class="s-photo"
      id="photo-${id}"
      style="background: url(${backgroundPhoto}) rgb(239, 239, 239)
      top center no-repeat; background-size: cover;"
    >
      <div class="s-photo-actions">
        <div class="top">
          <a
            class="user"
            aria-label="View photographer profile"
            target="_blank"
            rel="noopener"
            title="View photographer profile"
            href="${photographer}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
          >
            <img class="user-dp" src="${photographerPicture}" />
            <span class="username">${photographerName}</span>
          </a>

          <a
            href="${linkToPhoto}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
            data-imageid=${id}
            target="_blank"
            rel="noopener"
            aria-label="View photo on Unsplash.com"
            title="View photo on Unsplash.com"
          >
            <svg style="fill: #fafafa;" class="icon icon--anchor">
              <use xlink:href="#icon-anchor"></use>
            </svg>
          </a>
        </div>

        <div class="middle">${cloudButton(photo, cloudService)}</div>

        <div class="bottom">
          <span class="s-photo-dimension">${width} x ${height}</span>

          <div>
            ${downloadButton(photo)}
            ${photo.base64
              ? html`
                  <button
                    title="Set as background image"
                    class="control-button bg-button"
                    data-imageid=${id}
                    @click=${setBackgroundFromHistory}
                  >
                    <svg style="fill: #fafafa;" class="icon icon--image">
                      <use xlink:href="#icon-image"></use>
                    </svg>
                  </button>
                `
              : nothing}
          </div>
        </div>
      </div>
    </li>
  `;
}

export { photoCard };

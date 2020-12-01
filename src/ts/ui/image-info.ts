import { html, TemplateResult } from 'lit-html';
import { $ } from '../helpers';
import { UnsplashImage } from '../types/unsplash';

function closeDialog(event: MouseEvent & { target: HTMLDivElement }): void {
  const { target } = event;
  if (target) {
    if (target.matches('.dialog *')) return;
  }

  const dialog = $('js-dialog');
  if (dialog) {
    dialog.classList.remove('is-open');
  }
}

function imageInfo(nextImage: UnsplashImage): TemplateResult {
  const { description } = nextImage;
  const location = nextImage.location?.name || '';
  const { downloads, likes } = nextImage;
  const resolution = `${nextImage.width} x ${nextImage.height}`;
  const cameraModel = `${nextImage.exif?.make} ${nextImage.exif?.model}`;
  const specs = `${nextImage.exif?.focal_length}mm · ƒ/${nextImage.exif?.aperture} · ISO ${nextImage.exif?.exposure_time}s · ${nextImage.exif?.iso}`;

  return html`
    <div class="dialog" id="js-dialog" @click=${closeDialog}>
      <div class="dialog-content">
        <div class="image-info">
          <div class="general-info">
            <h2 class="title">Info</h2>
            <p class="description">${description}</p>
            <p class="location">${location}</p>

            <div class="stats">
              <div class="downloads">
                <h3 class="subtitle">Downloads</h3>
                <p class="count">${downloads}</p>
              </div>
              <div class="likes">
                <h3 class="subtitle">Likes</h3>
                <p class="count">${likes}</p>
              </div>
              <div class="resolution">
                <h3 class="subtitle">Resolution</h3>
                <p class="count">${resolution}</p>
              </div>
            </div>
          </div>

          <div class="technical-info">
            <div class="camera-model">
              <p>${cameraModel}</p>
            </div>
            <div class="specs">
              <p>${specs}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export { imageInfo };

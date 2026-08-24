import { html, TemplateResult } from 'lit-html';
import { $ } from '../helpers';
import { UnsplashImage } from '../types/unsplash';

function closeDialog(event: MouseEvent & { target: HTMLDivElement }): void {
  const { target } = event;
  if (target && target.matches('.dialog *')) return;

  const dialog = $('js-dialog');
  if (dialog) {
    dialog.classList.remove('is-open');
  }
}

function imageInfo(nextImage: UnsplashImage): TemplateResult {
  const downloads = nextImage.downloads?.toLocaleString() || '--';
  const likes = nextImage.likes?.toLocaleString() || '--';
  const resolution = `${nextImage.width} × ${nextImage.height}`;
  const cameraMake = `${nextImage.exif?.make || '--'}`;
  const cameraModel = `${nextImage.exif?.model || '--'}`;
  const focalLength = `${
    nextImage.exif?.focal_length ? `${nextImage.exif.focal_length}mm` : '--'
  }`;
  const aperture = `${
    nextImage.exif?.aperture ? `ƒ/${nextImage.exif.aperture}` : '--'
  }`;
  const shutterSpeed = `${nextImage.exif?.exposure_time || '--'}`;
  const ISO = `${nextImage.exif?.iso || '--'}`;

  return html`
    <div class="dialog" id="js-dialog" @click=${closeDialog}>
      <div class="dialog-content">
        <div class="image-info">
          <div class="general-info">
            <h2 class="title">About this photo</h2>

            <div class="stats">
              <div class="downloads">
                <dt>
                  <svg>
                    <use href="#icon-download"></use>
                  </svg>
                  <span>Downloads</span>
                </dt>
                <dd class="count">${downloads}</dd>
              </div>
              <div class="likes">
                <dt>
                  <svg>
                    <use href="#icon-heart"></use>
                  </svg>
                  <span>Likes</span>
                </dt>
                <dd class="count">${likes}</dd>
              </div>
              <div class="resolution">
                <dt>
                  <svg>
                    <use href="#icon-image"></use>
                  </svg>
                  <span>Resolution</span>
                </dt>
                <dd class="count">${resolution}</dd>
              </div>
            </div>
          </div>

          <hr />

          <div class="technical-info">
            <div class="camera-make">
              <dt>Camera Make</dt>
              <dd>${cameraMake}</dd>
            </div>
            <div class="camera-model">
              <dt>Camera Model</dt>
              <dd>${cameraModel}</dd>
            </div>
            <div class="focal-length">
              <dt>Focal Length</dt>
              <dd>${focalLength}</dd>
            </div>
            <div>
              <dt>Aperture</dt>
              <dd>${aperture}</dd>
            </div>
            <div class="shutter-speed">
              <dt>Shutter Speed</dt>
              <dd>${shutterSpeed}</dd>
            </div>
            <div class="iso">
              <dt>ISO</dt>
              <dd>${ISO}</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export { imageInfo };

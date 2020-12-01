import { html, TemplateResult } from 'lit-html';
import { loadingIndicator } from './loading';
import { trackDownload } from '../requests';
import { snackbar } from './snackbar';
import { UnsplashImage } from '../types/unsplash';

async function handleDownload(
  event: MouseEvent & {
    target: HTMLButtonElement;
  }
) {
  const { imageid, downloadurl } = event.target.dataset;

  if (!imageid) return;

  loadingIndicator().start();

  try {
    await trackDownload(imageid);

    const a = document.createElement('a');
    a.href = downloadurl || '';
    a.setAttribute('download', `photo-${imageid}`);
    a.setAttribute('style', 'opacity: 0;');

    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    snackbar('Download failed', 'error');
  } finally {
    loadingIndicator().stop();
  }
}

function downloadButton(nextImage: UnsplashImage): TemplateResult {
  return html`
    <button
      data-imageid=${nextImage.id}
      data-downloadurl=${nextImage.urls?.full}
      class="control-button download-button"
      title="Download photo"
      @click=${handleDownload}
    >
      <svg class="icon icon-download">
        <use href="#icon-download"></use>
      </svg>
    </button>
  `;
}

export { downloadButton };

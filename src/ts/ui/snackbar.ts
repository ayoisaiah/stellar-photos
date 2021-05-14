import { $ } from '../helpers';

function snackbar(message: string, className = ''): void {
  const main = $('js-main');

  if (main) {
    main.insertAdjacentHTML(
      'beforeend',
      `<div id="js-snackbar" class="snackbar ${className}">${message}</div>`
    );

    setTimeout(() => {
      const s = $('js-snackbar');
      if (s) s.parentNode?.removeChild(s);
    }, 3500);
  }
}

export { snackbar };

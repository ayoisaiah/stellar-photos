import { $ } from '../helpers';

interface Loader {
  start(): void;
  stop(): void;
}

function loadingIndicator(): Loader {
  const loader = $('js-loader');
  return {
    start: () => loader?.classList.add('loader-active'),
    stop: () => loader?.classList.remove('loader-active'),
  };
}

export { loadingIndicator };

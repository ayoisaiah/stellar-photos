import { $ } from './helpers';

const loadingIndicator = () => {
  const loader = $('loader');
  return {
    start: () => loader.classList.add('loader-active'),
    stop: () => loader.classList.remove('loader-active'),
  };
};

export default loadingIndicator;

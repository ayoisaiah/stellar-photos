import purify from '../libs/purify-dom';
import footer from '../components/footer';

/*
 * This component loads the footer and all the controls
 */

const loadFooter = () => {
  const main = document.getElementById('s-main');
  main.insertAdjacentHTML('beforeend', purify.sanitize(footer()));
};

export default loadFooter;

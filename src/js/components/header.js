import { html } from 'lit-html';
import hamburgerMenu from './hamburger-menu';

/*
 * This is where the search and hambuger buttons live
 */

const header = () => html`
  <header class="header s-ui hide-ui" id="header">
    <div class="header-content" id="header-content">
      ${hamburgerMenu()}
    </div>
  </header>
`;

export default header;

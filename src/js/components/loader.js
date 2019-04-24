import { html } from 'lit-html';

/*
 * This component represents the loader used to show that a request is
 * processing
 */

const loader = () =>
  html`
    <div class="loader" id="loader"></div>
  `;

export default loader;

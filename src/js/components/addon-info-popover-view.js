import { store } from '../modules/BUILD_PLATFORM'; // eslint-disable-line

/*
 * General information about the addon
 */

const addonInfoPopoverView = () => `
  <section id="addon-info" class="addon-info">
    <p>Stellar is made by <a href="https://github.com/ayoisaiah">Ayo Isaiah</a> and
    <a href="https://github.com/ayoisaiah/stellar-photos/graphs/contributors">
    other contributors</a>. You can submit feedback or feature requests by tweeting
    <a href="https://twitter.com/ayisaiah">@ayisaiah</a></p>

    <div class="links">
      <a class="button github-button"
        target="_blank"
        rel="noopener"
        href="https://github.com/ayoisaiah/stellar-photos">
        Star on Github
      </a>

      <a class="button"
        target="_blank"
        rel="noopener"
        href="https://github.com/ayoisaiah/stellar-photos/issues">
       File a bug report</a> <br>

       <a class="button"
        target="_blank"
        rel="noopener"
       href="https://twitter.com/intent/tweet/?text=Replace your boring browser new tab page with a random hi-res photo from Unsplash. Get it here: https://stellarapp.photos">Share on Twitter</a>

        <a class="button"
        target="_blank"
        rel="noopener"
        href="${store}">
          Write a review
        </a>
    </div>

    <div class="credit-libraries">
      <h3>Awesome libraries used</h3>
      <ul>
        <li><a href="https://github.com/cure53/DOMPurify">DOMPurify</a></li>
        <li><a href="http://timeago.org/">Timeago</a></li>
        <li><a href="https://github.com/hakimel/Ladda">Ladda</a></li>
      </ul>
    </div>

    <p>Stellar is free and open source under the terms of the
    <a href="https://opensource.org/licenses/MIT">MIT Licence</a></p>

  </section>
`;

export default addonInfoPopoverView;

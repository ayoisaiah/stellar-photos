import { html, TemplateResult } from 'lit-html';

function addonInfo(): TemplateResult {
  return html`
    <section id="addon-info" class="addon-info">
      <h3 class="settings-heading">Info & Credits</h3>
      <p>
        Stellar is made by
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/ayoisaiah"
          >Ayooluwa Isaiah</a
        >
        and
        <a
          href="https://github.com/ayoisaiah/stellar-photos/graphs/contributors"
        >
          other contributors</a
        >. You can submit feedback or feature requests by tweeting
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://twitter.com/ayisaiah"
          >@ayisaiah</a
        >
      </p>

      <div class="links">
        <a
          class="button github-button"
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/ayoisaiah/stellar-photos"
        >
          Star on Github
        </a>

        <a
          class="button"
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/ayoisaiah/stellar-photos/issues"
        >
          File a bug report</a
        >
        <a
          class="button"
          target="_blank"
          rel="noopener noreferrer"
          href="https://twitter.com/intent/tweet/?text=Replace your boring browser new tab page with a random hi-res photo from Unsplash. Get it here: https://ayoisaiah.github.io/stellar-photos"
          >Share on Twitter</a
        >

        <!-- /* CHROME_START */ -->
        <a
          class="button"
          target="_blank"
          rel="noopener"
          href="https://chrome.google.com/webstore/detail/stellar-photos/dgjeipdebjigeaanhogpdjdjigogpjmo/reviews?hl=en"
        >
          Write a review
        </a>
        <!-- /* CHROME_END */ -->

        <!-- prettier-ignore -->
        <!-- /* FIREFOX_START */ -->
        <a
          class="button"
          target="_blank"
          rel="noopener"
          href="https://addons.mozilla.org/en-US/firefox/addon/stellar-photos/"
        >
          Write a review
        </a>
        <!-- /* FIREFOX_END */ -->
      </div>

      <div class="credit-libraries">
        <h3>Awesome libraries used</h3>
        <ul>
          <li>
            <a href="https://github.com/PolymerLabs/lit-html">lit-html</a>
          </li>
          <li><a href="https://github.com/cure53/DOMPurify">DOMPurify</a></li>
          <li><a href="http://timeago.org/">Timeago</a></li>
          <li><a href="https://github.com/hakimel/Ladda">Ladda</a></li>
        </ul>
      </div>

      <p>
        Stellar is free and open source under the terms of the
        <a href="https://opensource.org/licenses/MIT">MIT Licence</a>
      </p>
    </section>
  `;
}

export default addonInfo;

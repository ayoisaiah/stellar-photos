import { html, TemplateResult } from 'lit-html';

function addonInfo(): TemplateResult {
  return html`
    <section id="addon-info" class="addon-info">
      <h3 class="subtitle is-4">About this extension</h3>
      <p>
        Stellar is made by
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/ayoisaiah"
          >Ayooluwa Isaiah</a
        >
        and released under the terms of the MIT Licence.
      </p>

      <div class="links">
        <a
          class="button is-link is-fullwidth"
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/ayoisaiah/stellar-photos"
        >
          Star on GitHub
        </a>

        <a
          class="button is-danger is-fullwidth"
          target="_blank"
          rel="noopener"
          href="https://github.com/ayoisaiah/stellar-photos/issues"
        >
          File a bug report</a
        >
        <a
          class="button twitter is-fullwidth"
          target="_blank"
          rel="noopener"
          href="https://twitter.com/intent/tweet/?text=Replace your boring browser new tab page with a random hi-res photo from Unsplash. Get it here: https://ayoisaiah.github.io/stellar-photos"
          >Share Stellar Photos on Twitter</a
        >

        <!-- /* CHROME_START */ -->
        <a
          class="button review is-fullwidth"
          target="_blank"
          rel="noopener"
          href="https://chrome.google.com/webstore/detail/stellar-photos/dgjeipdebjigeaanhogpdjdjigogpjmo/reviews?hl=en"
        >
          Write a review on the Chrome Webstore
        </a>
        <!-- /* CHROME_END */ -->

        <!-- prettier-ignore -->
        <!-- /* FIREFOX_START */ -->
        <a
          class="button review is-fullwidth"
          target="_blank"
          rel="noopener"
          href="https://addons.mozilla.org/en-US/firefox/addon/stellar-photos/"
        >
          Write a review on the Firefox Addons Store
        </a>
        <!-- /* FIREFOX_END */ -->
      </div>
    </section>
  `;
}

export default addonInfo;

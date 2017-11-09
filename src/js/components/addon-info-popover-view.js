/*
 * General information about the addon
 */

const addonInfoPopoverView = () => `
  <section id="addon-info" class="addon-info">
    <span class="label">Star this extension on Github</span>

    <a class="button github-button" 
      href="https://github.com/ayoisaiah/stellar-photos">
        Star on Github
      </a>

    <div class="leave-a-review">
      <span class="label">Leave a (5 star &#128521;) reveiw</span>

      <a href="https://chrome.google.com/webstore/detail/stellar-photos/dgjeipdebjigeaanhogpdjdjigogpjmo/reviews?hl=en">
        Google Chrome</a>

      <br><br>

      <a href="https://addons.mozilla.org/en-US/firefox/addon/stellar-photos/reviews/">Firefox</a>
    </div>

    <div class="report-issue">
      <span class="label">Having trouble?</span>
      <a class="button" href="https://github.com/ayoisaiah/stellar-photos/issues">
       Report an issue!</a> 
    </div>

    <div class="share-addon">
      <span class="label">Spread the word about the extension</span>
      <a href="https://facebook.com/sharer/sharer.php?u=https://stellarapp.photos" 
        aria-label="Share on Facebook">
        
        <svg class="icon icon-facebook">
          <use href="#icon-facebook"></use>
        </svg>
        
        Share on Facebook
      </a>

      <br>

      <a href="https://twitter.com/intent/tweet/?text=Replace your boring browser new tab page with a random hi-res photo from Unsplash. Get it here: https://stellarapp.photos." 
        aria-label="Share on Twitter">
        <svg class="icon icon-twitter">
          <use href="#icon-twitter"></use>
        </svg>

        Share on Twitter
      </a>
    </div>

  </section>
`;

export default addonInfoPopoverView;

import { html } from 'lit-html';

/**
 * Photo credit
 */

const unsplashCredit = nextImage => html`
  <span
    >Photo by
    <a
      rel="noopener"
      href="${nextImage.user.links
        .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
    >
      ${nextImage.user.first_name || ''} ${nextImage.user.last_name || ''}
    </a>
    on
    <a
      rel="noopener"
      href="${nextImage.links
        .html}?utm_source=stellar-photos&utm_medium=referral&utm_campaign=api-credit"
      >Unsplash</a
    >
  </span>
`;

export default unsplashCredit;

import optionsSidebar from './options-sidebar';

/*
 * The options popover
 */

const optionsPopover = () => `
  <div class="popover options-popover">
    <button
      class="control-button js-options-button options-button"
      title="Options"
      aria-label="Toggle Options Popover">

      <svg class="icon icon-settings">
        <use href="#icon-settings"></use>
      </svg>

    </button>

    <div class="popover-content">
      ${optionsSidebar()}

      <div class="popover-view" id="popover-view"></div>
    </div>
  </div>
`;

export default optionsPopover;

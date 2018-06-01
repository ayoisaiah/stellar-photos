/*
 * This component is for the hamburger menu that toggles the history pane
 */

const hamburgerMenu = () => `
    <button id="historyButton" class="historyButton historyButton-open js-track-click"
    data-label="Toggle history menu"
    data-track="click-history-menu"
    title="toggle history menu" aria-label="Toggle History Menu">
      <div>
        <i class="bar1"></i>
        <i class="bar2"></i>
        <i class="bar3"></i>
      </div>
    </button>
`;

export default hamburgerMenu;

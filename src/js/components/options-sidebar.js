/*
 * This is the sidebar for switching between the different option views
 */

const optionsSidebar = () => `
  <ul class="options-sidebar">
   <li class="options-sidebar__item js-options-sidebar__item active-option" data-option="general">General</li>
   <li class="options-sidebar__item js-options-sidebar__item" data-option="cloud">Cloud</li>
   <li class="options-sidebar__item js-options-sidebar__item" data-option="weather">Weather</li>
   <li class="options-sidebar__item js-options-sidebar__item" data-option="info">Info</li>
  </ul>
`;

export default optionsSidebar;

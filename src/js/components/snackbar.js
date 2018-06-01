/**
 * Snackbar for in-app notifications
 */

const snackbar = (message, className) => `
  <div id="snackbar" class="snackbar ${className}">${message}</div>
`;

export default snackbar;

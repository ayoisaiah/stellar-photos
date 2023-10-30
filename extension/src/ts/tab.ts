const urlParams = new URLSearchParams(window.location.hash);
const accessToken = urlParams.get('#access_token');

if (accessToken) {
  chrome.runtime.sendMessage({
    command: 'set-dropbox-token',
    token: accessToken,
  });

  chrome.runtime.sendMessage({ command: 'close-tab' });
}

const getUrlParams = new URLSearchParams(window.location.search);

const code = getUrlParams.get('code');
if (code) {
  chrome.runtime.sendMessage({
    command: 'code-flow',
    code,
  });
}

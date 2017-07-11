const authorizeDropbox = () => new Promise((resolve) => {
  const key = 'bhhwtocg0f586ax';
  // TODO: Use Chrome Identity API to authenticate Dropbox https://developer.chrome.com/extensions/app_identity#non
  chrome.tabs.create({ url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://ayoisaiah.com/stellar-photos/` });

  const interval = setInterval(() => {
    const token = localStorage.getItem('dropbox-token');
    if (token) {
      clearInterval(interval);
      console.log(token);
      resolve(token);
    }
  }, 100);
});

const select = document.querySelector('.chooseCloudStorage');

const cloudStatus = () => {
  const selected = select[select.selectedIndex].value;
  const action = document.querySelector('.action');
  action.innerHTML = '';

  if (!localStorage.getItem(`${selected}`)) {
    action.insertAdjacentHTML('beforeend', '<button class="authorize">Authorize</button>');
    const authorize = document.querySelector('.authorize');
    if (selected === 'dropbox-token') {
      authorize.addEventListener('click', () => {
        authorizeDropbox().then(() => cloudStatus());
      });
    }
  } else {
    action.insertAdjacentHTML('beforeend', '<span class="success-message">Successfully Authenticated</span>');
  }
};

select.addEventListener('change', () => {
  cloudStatus();
});

cloudStatus();

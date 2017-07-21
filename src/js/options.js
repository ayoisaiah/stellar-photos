const authorizeDropbox = () => new Promise((resolve) => {
  const key = 'gscbxcjhou1jx21';
  // TODO: Use Chrome Identity API to authenticate Dropbox https://developer.chrome.com/extensions/app_identity#non
  chrome.tabs.create({ url: `https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=https://stellarapp.photos/` });

  const interval = setInterval(() => {
    const token = localStorage.getItem('dropbox-token');
    if (token) {
      clearInterval(interval);
      resolve(token);
    }
  }, 100);
});

const selectCloud = document.querySelector('.chooseCloudStorage');

const cloudStatus = () => {
  const selected = selectCloud[selectCloud.selectedIndex].value;
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

selectCloud.addEventListener('change', () => {
  cloudStatus();
});

cloudStatus();

const selectTempUnit = document.querySelector('.chooseTempUnit');

const tempUnit = () => {
  const selected = selectTempUnit[selectTempUnit.selectedIndex].value;
  localStorage.setItem('s-tempUnit', selected);
  chrome.runtime.sendMessage({ command: 'update-weather' });
};

selectTempUnit.addEventListener('change', () => {
  tempUnit();
});

if (!localStorage.getItem('s-tempUnit')) {
  tempUnit();
} else {
  const unit = localStorage.getItem('s-tempUnit');
  selectTempUnit.value = unit;
}

const longitudeInput = document.querySelector('.longitude');
const latitudeInput = document.querySelector('.latitude');
const coords = localStorage.getItem('s-coords');
if (coords) {
  const longitude = JSON.parse(coords).longitude;
  const latitude = JSON.parse(coords).latitude;
  longitudeInput.value = longitude;
  latitudeInput.value = latitude;
}

const updateCoords = () => {
  console.log('Updating coords');
  const obj = {
    longitude: longitudeInput.value,
    latitude: latitudeInput.value,
  };
  chrome.storage.sync.set({
    's-coords': obj,
  }, () => {
    localStorage.setItem('s-coords', JSON.stringify(obj));
  });
};

longitudeInput.addEventListener('change', () => {
  const longitude = longitudeInput.value;
  if (typeof Number(longitude) === 'number' && longitude <= 180 && longitude >= -180) {
    updateCoords();
  }
});

latitudeInput.addEventListener('change', () => {
  const latitude = latitudeInput.value;
  if (typeof Number(latitude) === 'number' && latitude <= 90 && latitude >= -90) {
    updateCoords();
  }
});

chrome.runtime.connect({ name: 'options' });

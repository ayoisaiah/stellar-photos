chrome.storage.local.get('nextImage', (result) => {
  const { nextImage } = result;
  if (nextImage) {
    const body = document.querySelector('body');
    body.style.backgroundImage = `url(${nextImage.base64})`;
  }
});

const loadCss = url => new Promise((resolve, reject) => {
  const link = document.createElement('link');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  link.href = url;
  link.onload = resolve;
  link.onerror = reject;
  document.getElementsByTagName('head')[0].appendChild(link);
});

const loadJs = url => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = url;
  script.onload = resolve;
  script.onerror = reject;
  document.getElementsByTagName('head')[0].appendChild(script);
});

const loadControls = () => {
  document.removeEventListener('mousemove', loadControls);
  document.removeEventListener('focus', loadControls);

  // CSS first to avoid flash of unstyled content
  loadCss('css/main.css')
    .then(() => loadJs('js/index.js'))
    .catch(error => console.log(error));
};

document.addEventListener('mousemove', loadControls);
document.addEventListener('focus', loadControls);


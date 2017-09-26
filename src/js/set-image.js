chrome.storage.local.get('nextImage', (result) => {
    const { nextImage } = result;
    if (nextImage) {
      const body = document.querySelector('body');
      body.style.backgroundImage = `url(${nextImage.base64})`;
    }
});

performance.mark('wastedTimeBegin');

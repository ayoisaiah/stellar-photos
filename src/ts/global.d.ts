type nextImage = {};

type Stellar = {
  nextImage: nextImage;
};

export interface CustomWindow extends Window {
  stellar: Stellar;
}

import initializeGeneralOptions from '../modules/general-options';
import { initializeCloudOptions } from '../modules/cloud-options';
import { initializeWeatherOptions } from '../modules/weather-options';
// import initializeAddonInfo from '../modules/addon-options';

function initializeOptions() {
  initializeGeneralOptions();
  initializeCloudOptions();
  initializeWeatherOptions();
}

export default initializeOptions;

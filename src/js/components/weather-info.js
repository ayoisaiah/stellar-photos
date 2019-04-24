import { html } from 'lit-html';
import timeago from 'timeago.js';

/*
 * This compoment displays the weather information in the footer
 * */

const weatherInfo = forecast => {
  const location = forecast.name;
  const temperature = Math.round(forecast.main.temp);
  const { description } = forecast.weather[0];
  const lastUpdatedTime = timeago().format(new Date(forecast.timestamp));

  return html`
    <span class="location">
      <svg class="icon location-icon"><use href="#icon-location"></use></svg>
      <span class="location-text">${location}</span>
    </span>
    <span class="temperature">
      <svg class="icon temperature-icon">
        <use href="#icon-temperature"></use>
      </svg>
      <span class="temperature-text">${temperature}° - ${description}</span>
    </span>
    <span class="last-updated">${lastUpdatedTime}</span>
  `;
};

export default weatherInfo;

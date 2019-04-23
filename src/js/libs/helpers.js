const convertTimeStamp = timestamp => {
  const date = new Date(timestamp * 1000),
    days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    currentDay = days[date.getDay()],
    year = date.getFullYear(),
    month = `0${date.getMonth() + 1}`.slice(-2),
    day = `0${date.getDate()}`.slice(-2),
    hours = `0${date.getHours()}`.slice(-2),
    minutes = `0${date.getMinutes()}`.slice(-2),
    seconds = `0${date.getSeconds()}`.slice(-2);

  return {
    currentDay,
    fullDate: `${day}.${month}.${year}`,
    time: `${hours}:${minutes}:${seconds}`,
  };
};

function togglePopover() {
  const p = document.getElementsByClassName('popover-content--is-visible')[0];
  if (p && this.nextElementSibling !== p) {
    p.classList.remove('popover-content--is-visible');
  }

  const popoverContent = this.nextElementSibling;
  popoverContent.classList.toggle('popover-content--is-visible');
}

/* Because the native implementation of the classList API is not chainable */
const chainableClassList = element => {
  const { classList } = element;

  return {
    toggle: function toggle(c) {
      classList.toggle(c);
      return this;
    },

    add: function add(c) {
      classList.add(c);
      return this;
    },

    remove: function remove(c) {
      classList.remove(c);
      return this;
    },
  };
};

const $ = document.getElementById.bind(document);

const removeChildElements = element => {
  while (element.hasChildNodes()) {
    element.removeChild(element.lastChild);
  }
};

// Make invalid responses throw an error since fetch does not reject for bad
// responses
const validateResponse = response => {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response.json();
};

const lessThanTimeAgo = (timestamp, timeInSeconds) => {
  const timeInMilliseconds = 1000 * timeInSeconds;
  const timeAgo = Date.now() - timeInMilliseconds;
  return timestamp > timeAgo;
};

export {
  convertTimeStamp,
  togglePopover,
  chainableClassList,
  $,
  removeChildElements,
  validateResponse,
  lessThanTimeAgo,
};

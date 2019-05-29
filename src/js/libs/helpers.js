const convertTimeStamp = timestamp => {
  const date = new Date(timestamp * 1000);
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const currentDay = days[date.getDay()];
  const year = date.getFullYear();
  const month = `0${date.getMonth() + 1}`.slice(-2);
  const day = `0${date.getDate()}`.slice(-2);
  const hours = `0${date.getHours()}`.slice(-2);
  const minutes = `0${date.getMinutes()}`.slice(-2);
  const seconds = `0${date.getSeconds()}`.slice(-2);

  return {
    currentDay,
    fullDate: `${day}.${month}.${year}`,
    time: `${hours}:${minutes}:${seconds}`,
  };
};

function togglePopover(event) {
  const popover = event.target.nextElementSibling.firstElementChild;
  popover.classList.toggle('popover-content--is-visible');
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

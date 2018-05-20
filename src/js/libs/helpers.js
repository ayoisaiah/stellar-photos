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

const togglePopover = element => {
  const popover = document.querySelectorAll('.popover-content--is-visible');
  if (popover) {
    popover.forEach(e => {
      if (e.matches(`${element} .popover-content--is-visible`)) return;
      e.classList.remove('popover-content--is-visible');
    });
  }
  const popoverContent = document.querySelector(`${element} .popover-content`);
  popoverContent.classList.toggle('popover-content--is-visible');
};

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

const lessThanOneHourAgo = timestamp => {
  const oneHour = 1000 * 60 * 60;
  const oneHourAgo = Date.now() - oneHour;
  return timestamp > oneHourAgo;
};

const lessThan24HoursAgo = timestamp => {
  const twentyFourHours = 1000 * 60 * 60 * 24;
  const twentyFourHoursAgo = Date.now() - twentyFourHours;
  return timestamp > twentyFourHoursAgo;
};

export {
  convertTimeStamp,
  togglePopover,
  chainableClassList,
  $,
  removeChildElements,
  validateResponse,
  lessThanOneHourAgo,
  lessThan24HoursAgo,
};

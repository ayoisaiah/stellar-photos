const convertTimeStamp = (timestamp) => {
  const date = new Date(timestamp * 1000),
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    currentDay = days[date.getDay()],
    year = date.getFullYear(),
    month = (`0${date.getMonth() + 1}`).slice(-2),
    day = (`0${date.getDate()}`).slice(-2),
    hours = (`0${date.getHours()}`).slice(-2),
    minutes = (`0${date.getMinutes()}`).slice(-2),
    seconds = (`0${date.getSeconds()}`).slice(-2);

  return {
    currentDay,
    fullDate: `${day}.${month}.${year}`,
    time: `${hours}:${minutes}:${seconds}`,
  };
};

const getMinutesUntilNextHour = () => 60 - new Date().getMinutes();

const getMinutesUntilMidNight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return (midnight - now) / 6e4;
};

const togglePopover = (element) => {
  const popover = document.querySelectorAll('.popover-content--is-visible');
  if (popover) {
    popover.forEach((e) => {
      if (e.matches(`${element} .popover-content--is-visible`)) return;
      e.classList.remove('popover-content--is-visible');
    });
  }
  const popoverContent = document.querySelector(`${element} .popover-content`);
  popoverContent.classList.toggle('popover-content--is-visible');
};

/* Because the native implementation of the classList API is not chainable */
const chainableClassList = (element) => {
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

const removeChildElements = (element) => {
  while (element.hasChildNodes()) {
    element.removeChild(element.lastChild);
  }
};

export { convertTimeStamp, togglePopover,
  chainableClassList, $, removeChildElements, getMinutesUntilNextHour,
  getMinutesUntilMidNight };

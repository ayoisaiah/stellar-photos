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

export default convertTimeStamp;

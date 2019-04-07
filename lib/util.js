const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

exports.removeNewLine = function(str) {
  return str.replace(/\r?\n|\r/g, '');
};

exports.isValidUrl = function(url) {
  url = url.trim();

  // URL should always start with http[,s]
  // todo - find a decent url validator
  const regExp = /^(http(s)?:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]+$/gi;

  return regExp.test(url);
};

// http[,s]://node.gq => http[,s]
exports.extractSchemeFromUrl = function(url) {
  return url.substr(0, url.indexOf(':'));
};

// http[,s]://node.gq => node.gq
exports.extractUrlWithoutScheme = function(url) {
  return url.substr(url.lastIndexOf('/') + 1);
};

exports.formatTimestampToDate = function(timestamp) {
  const date = new Date(timestamp);
  const day = date
    .getDate()
    .toString()
    .padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date
    .getMinutes()
    .toString()
    .padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour = (hours > 12 ? hours - 12 : hours).toString().padStart(2, '0');

  return `${month} ${day}, ${year} ${hour}:${minutes} ${ampm}`;
};

exports.formatMs = function(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 24)) % 60);
  let formattedTime = '';

  if (hours) formattedTime += hours.toString(10).padStart(2, '0') + 'hrs, ';
  if (minutes) formattedTime += minutes.toString(10).padStart(2, '0') + ' min, ';
  if (seconds) formattedTime += seconds.toString(10).padStart(2, '0') + ' sec';

  return formattedTime;
};

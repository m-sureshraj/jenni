const { URL } = require('url');

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
  'Dec',
];

exports.removeNewLine = function(str) {
  return str.replace(/\r?\n|\r/g, '');
};

exports.isValidUrl = function(url) {
  url = url.trim();

  const validProtocolRegExp = /^(http|https):\/\/(.*)/i;
  if (!validProtocolRegExp.test(url)) return false;

  try {
    new URL(url);

    return true;
  } catch (err) {
    return false;
  }
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
  if (ms < 1) return `00`;

  if (ms < 1000) return `${ms.toString().padStart(2, '0')} ms`;

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const formattedTime = [];

  if (hours) formattedTime.push(`${hours.toString(10).padStart(2, '0')} hrs`);
  if (minutes) formattedTime.push(`${minutes.toString(10).padStart(2, '0')} min`);
  if (seconds) formattedTime.push(`${seconds.toString(10).padStart(2, '0')} sec`);

  return formattedTime.join(', ');
};

exports.removeTrailingSlash = function(str = '') {
  return str.endsWith('/') ? str.substr(0, str.length - 1) : str;
};

// Credits to https://github.com/sindresorhus/ansi-escapes library

const ESC = '\u001B[';
const eraseLine = `${ESC}2K`;
const cursorUp = `${ESC}1A`;
const cursorLeft = `${ESC}G`;
const hideCursor = `${ESC}?25l`;

exports.eraseLines = function(count) {
  let clear = '';

  for (let i = 0; i < count; i++) {
    clear += eraseLine + (i < count - 1 ? cursorUp : '');
  }

  if (count) {
    clear += cursorLeft;
  }

  return clear;
};

exports.hideCursor = function() {
  process.stdout.write(hideCursor);
};

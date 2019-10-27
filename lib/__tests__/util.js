const { formatMs } = require('../util');

describe('util', () => {
  test('formatMs - Format milliseconds to human readable format', () => {
    const hourInMs = 3600000;
    const thirtyMinutesInMs = 1800000;
    const thirtySecondsInMs = 30000;

    expect(formatMs(hourInMs)).toBe('01 hrs');
    expect(formatMs(thirtyMinutesInMs)).toBe('30 min');
    expect(formatMs(thirtySecondsInMs)).toBe('30 sec');
    expect(formatMs(hourInMs + thirtyMinutesInMs)).toBe('01 hrs, 30 min');
    expect(formatMs(hourInMs + thirtySecondsInMs)).toBe('01 hrs, 30 sec');
    expect(formatMs(thirtyMinutesInMs + thirtySecondsInMs)).toBe('30 min, 30 sec');
    expect(formatMs(hourInMs + thirtyMinutesInMs + thirtySecondsInMs)).toBe(
      '01 hrs, 30 min, 30 sec'
    );
  });
});

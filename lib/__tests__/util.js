const { formatMs, isValidUrl, removeTrailingSlash } = require('../util');

describe('formatMs', () => {
  it('should format milliseconds to human readable format', () => {
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

describe('isValidUrl', () => {
  test('URL should starts with http or https protocol', () => {
    expect(isValidUrl('http://bingo.com')).toBe(true);
    expect(isValidUrl('https://bingo.com')).toBe(true);
    expect(isValidUrl('localhost:8080')).toBe(false);
    expect(isValidUrl('file://localhost:8080')).toBe(false);
  });

  test('URL can ends with `/`', () => {
    expect(isValidUrl('https://hello.com/')).toBe(true);
  });
});

describe('removeTrailingSlash', () => {
  it('should remove trailing slash from string', () => {
    expect(removeTrailingSlash('foo.com/')).toBe('foo.com');
    expect(removeTrailingSlash('foo.com')).toBe('foo.com');
  });
});

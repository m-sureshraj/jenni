const { eraseLines, hideCursor } = require('../ansi-escapes');

const ESC = '\u001B[';
const eraseLine = `${ESC}2K`;
const cursorUp = `${ESC}1A`;
const cursorLeft = `${ESC}G`;
const hideCursorEscCode = `${ESC}?25l`;

describe('eraseLines', () => {
  it('should return ANSI escape codes to clear the lines', () => {
    const codes = eraseLines(3);

    const expectedCodes = [
      `${eraseLine}${cursorUp}`,
      `${eraseLine}${cursorUp}`,
      `${eraseLine}`,
      `${cursorLeft}`,
    ];

    expect(codes).toBe(expectedCodes.join(''));
  });
});

describe('hideCursor', () => {
  it('should hide the cursor', () => {
    jest.spyOn(process.stdout, 'write').mockImplementationOnce(() => {});

    hideCursor();

    expect(process.stdout.write).toHaveBeenCalledWith(hideCursorEscCode);
  });
});

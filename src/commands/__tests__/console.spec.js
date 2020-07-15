const { Readable, PassThrough } = require('stream');

const { getCurrentBranchName } = require('../../lib/git-cmd');
const { getConsoleText } = require('../../lib/jenkins');
const { streamToString } = require('../../test-helper');

jest.mock('../../lib/jenkins');
jest.mock('../../lib/git-cmd');

const spinner = {
  start: jest.fn(),
  stop: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};
jest.doMock('ora', () => {
  return jest.fn().mockImplementation(() => spinner);
});

const buildConsole = require('../console');

describe('console', () => {
  const branchName = 'foo';
  beforeAll(() => {
    getCurrentBranchName.mockImplementation(() => branchName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle the exception when given build id does not exist', async () => {
    const errorMessage = 'build does not exist';
    getConsoleText.mockImplementation(() => Promise.reject(new Error(errorMessage)));

    const consoleOptions = { build: 404 };
    await buildConsole(consoleOptions);

    expect(spinner.start).toHaveBeenCalled();
    expect(getConsoleText).toHaveBeenCalledWith(branchName, consoleOptions.build);
    expect(spinner.fail).toHaveBeenCalledWith(errorMessage);
  });

  it('should stream content to writable stream', async () => {
    const rs = new Readable();
    rs.push('hello ');
    rs.push('my name ');
    rs.push('is foo');
    rs.push(null);
    getConsoleText.mockImplementation(() => Promise.resolve(rs));

    const st = PassThrough();
    const consoleOptions = { writeTo: st };
    await buildConsole(consoleOptions);

    expect(spinner.start).toHaveBeenCalled();
    expect(spinner.stop).toHaveBeenCalled();
    expect(await streamToString(st)).toBe('hello my name is foo');
  });

  it('should handle errors while streaming build console', async done => {
    const spiedConsole = jest.spyOn(console, 'log').mockImplementationOnce(() => {});

    const streamingError = new Error('streaming failed');
    const rs = new Readable();
    rs._read = () => {
      rs.destroy(streamingError);
    };
    getConsoleText.mockImplementation(() => Promise.resolve(rs));

    const st = PassThrough();
    const consoleOptions = { writeTo: st };
    await buildConsole(consoleOptions);

    setTimeout(() => {
      expect(spiedConsole).toHaveBeenCalledWith(streamingError);
      expect(spinner.fail).not.toHaveBeenCalled();
      done();
    });
  });
});

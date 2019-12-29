const fs = require('fs');

const Conf = require('conf');
const { red, yellow } = require('kleur');

jest.mock('fs');
jest.mock('conf');

const fakePath = 'some/fake/path';
// mock Conf constructor fn
Conf.mockImplementation(() => {
  return {
    path: fakePath,
  };
});

const removeConfigDir = require('./pre-uninstall');

describe('pre-uninstall', () => {
  beforeEach(() => {
    fs.unlinkSync.mockClear();
    fs.rmdirSync.mockClear();
  });

  it('should delete the configuration file and the directory', () => {
    fs.existsSync = jest.fn(() => true);
    removeConfigDir();

    expect(fs.unlinkSync).toHaveBeenCalledWith(fakePath);
    expect(fs.rmdirSync).toHaveBeenCalledWith('some/fake');
  });

  it('should only delete the configuration directory if there is no configuration file', () => {
    fs.existsSync = jest.fn(() => false);
    removeConfigDir();

    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(fs.rmdirSync).toHaveBeenCalledWith('some/fake');
  });

  it("should log the message if it couldn't delete the configuration file or directory", () => {
    const spy = jest.spyOn(global.console, 'log').mockImplementation();
    fs.existsSync = jest.fn().mockImplementation(() => {
      throw new Error('some error');
    });
    removeConfigDir();

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log.mock.calls[0][0]).toBe(
      red('Failed to remove local configuration file.')
    );
    expect(console.log.mock.calls[1][0]).toBe(
      `Delete the following directory ${yellow('some/fake')}`
    );

    spy.mockRestore();
  });
});

const path = require('path');

const Conf = require('conf');
const { yellow, green } = require('kleur');

const { getGitRootDirPath } = require('../../lib/git-cmd');
const { printConfig } = require('../../lib/cli-table');
const config = require('../config');

jest.mock('../../lib/git-cmd');
jest.mock('../../lib/cli-table');
jest.mock('conf');

const gitRootDirPath = 'some/path/to/git';
const oldConfig = {
  username: 'bingo',
  token: 'abc468&*&$$--rtu',
  url: 'http://localhost:3000',
  job: {
    name: 'foo',
    path: '/some/path',
    type: 'jobType',
  },
};

beforeAll(() => {
  getGitRootDirPath.mockImplementation(() => gitRootDirPath);

  const projectConfig = new Map();
  projectConfig.set(gitRootDirPath, oldConfig);

  Conf.prototype.get.mockImplementation(key => projectConfig.get(key));
  jest.spyOn(global.console, 'log').mockImplementation();
  jest.spyOn(process, 'exit').mockImplementation();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('config', () => {
  it('should print the old config if updated config argument is empty', () => {
    config();

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log.mock.calls[0][0]).toBe(
      yellow(`Configuration of ${path.basename(gitRootDirPath)}`)
    );
    expect(printConfig).toHaveBeenCalledWith(oldConfig);
  });

  it('should update the old configuration', () => {
    const updatedConfig = {
      username: 'bar',
      jobName: 'car',
      jobPath: '/some/path',
      jobType: 'bingo',
    };
    config(updatedConfig);

    const mergedConfig = {
      ...oldConfig,
      username: updatedConfig.username,
      job: {
        name: updatedConfig.jobName,
        type: updatedConfig.jobType,
        path: updatedConfig.jobPath,
      },
    };

    expect(Conf.prototype.set).toHaveBeenCalledWith(gitRootDirPath, mergedConfig);
    expect(console.log.mock.calls[0][0]).toBe(
      green('Configuration successfully updated')
    );
    expect(printConfig).toHaveBeenCalledWith(mergedConfig);
  });

  it('should throw an error if updated config values are invalid', () => {
    const updatedConfigOne = {
      url: 'invalid url',
    };
    config(updatedConfigOne);

    expect(console.log.mock.calls[0][0]).toBe(`Invalid URL: ${updatedConfigOne.url}`);
    expect(process.exit).toHaveBeenCalled();

    jest.clearAllMocks();

    const updatedConfigTwo = {
      jobName: '  ',
    };
    config(updatedConfigTwo);

    expect(console.log.mock.calls[0][0]).toBe(
      `Argument "${yellow('name')}" value is invalid ${updatedConfigTwo.jobName}`
    );
    expect(process.exit).toHaveBeenCalled();
  });
});

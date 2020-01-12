const { red } = require('kleur');

const { getCurrentBranchName } = require('../../lib/git-cmd');
const { triggerNewBuild, getRunningBuilds } = require('../../lib/jenkins');
const { logNetworkErrors } = require('../../lib/log');
const { askConfirmationBeforeTriggeringNewBuild } = require('../../lib/prompt');

jest.mock('../../lib/git-cmd');
jest.mock('../../lib/log');
jest.mock('../../lib/jenkins');
jest.mock('../../lib/prompt');

const spinner = {
  start: jest.fn(),
  stop: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};
jest.doMock('ora', () => {
  return jest.fn().mockImplementation(() => spinner);
});

const build = require('../build');

describe('build', () => {
  const branchName = 'foo';
  beforeAll(() => {
    getCurrentBranchName.mockImplementation(() => branchName);
  });

  beforeEach(() => {
    getRunningBuilds.mockImplementation(() =>
      Promise.resolve(['some', 'running', 'builds'])
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger a new build', async () => {
    getRunningBuilds.mockImplementation(() => Promise.resolve([]));

    await build();

    expect(spinner.start).toHaveBeenCalled();
    expect(getRunningBuilds).toHaveBeenCalledWith(branchName);
    expect(triggerNewBuild).toHaveBeenCalledWith(branchName);
    expect(spinner.succeed).toHaveBeenCalledWith('Build successfully created');
  });

  it('should ask confirmation when job has already running builds', async () => {
    await build();

    expect(spinner.stop).toHaveBeenCalled();
    expect(askConfirmationBeforeTriggeringNewBuild).toHaveBeenCalled();
  });

  it('should trigger a new build if confirmation accepted', async () => {
    askConfirmationBeforeTriggeringNewBuild.mockImplementation(() =>
      Promise.resolve({ confirmation: true })
    );

    await build();

    expect(spinner.start).toHaveBeenCalledTimes(2);
    expect(triggerNewBuild).toHaveBeenCalledWith(branchName);
    expect(spinner.succeed).toHaveBeenCalledWith('Build successfully created');
  });

  it('should cancel the flow if confirmation rejected', async () => {
    jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(global.console, 'log').mockImplementation();
    askConfirmationBeforeTriggeringNewBuild.mockImplementation(() =>
      Promise.resolve({ confirmation: false })
    );

    await build();

    expect(console.log.mock.calls[0][0]).toBe(red('Aborted'));
    expect(process.exit).toHaveBeenCalledTimes(1);
  });

  it('should log the error messages when triggering new build fails', async () => {
    const error = 'some error';
    getRunningBuilds.mockImplementation(() => Promise.reject(error));

    await build();

    expect(spinner.fail).toHaveBeenCalled();
    expect(logNetworkErrors).toHaveBeenCalledWith(error);
  });
});

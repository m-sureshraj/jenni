const { red, yellow } = require('kleur');

const { getCurrentBranchName } = require('../../../lib/git-cmd');
const { triggerNewBuild, getRunningBuilds } = require('../../../lib/jenkins');
const { logNetworkErrors } = require('../../../lib/log');
const { askConfirmationBeforeTriggeringNewBuild } = require('../../../lib/prompt');
const { WatchError } = require('../../../lib/errors');
const reportBuildProgress = require('../watch-option');
const reportBuildStages = require('../stage-option');

jest.mock('../../../lib/git-cmd');
jest.mock('../../../lib/log');
jest.mock('../../../lib/jenkins');
jest.mock('../../../lib/prompt');
jest.mock('../watch-option');
jest.mock('../stage-option');

const spinner = {
  start: jest.fn(),
  stop: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};
jest.doMock('ora', () => {
  return jest.fn().mockImplementation(() => spinner);
});

const build = require('../index');

describe('build', () => {
  const branchName = 'foo';
  let spiedStdWrite;
  beforeAll(() => {
    getCurrentBranchName.mockImplementation(() => branchName);
    spiedStdWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterAll(() => {
    spiedStdWrite.mockRestore();
  });

  beforeEach(() => {
    getRunningBuilds.mockImplementation(() =>
      Promise.resolve(['some', 'running', 'builds'])
    );

    triggerNewBuild.mockImplementation(() =>
      Promise.resolve({
        headers: {
          location: 'http://localhost:8080/queue/item/100',
        },
      })
    );

    jest.spyOn(global.console, 'log').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation();
  });

  afterEach(jest.clearAllMocks);

  it('should throw an error when the watch, stage options are enabled together', async () => {
    const options = { watch: true, stage: true };
    await build(options);

    expect(console.log).toHaveBeenCalledWith(
      yellow(
        "Invalid options usage! Can't view the build console, stages together. Retry the command with a single option."
      )
    );
    expect(process.exit).toHaveBeenCalledTimes(1);
  });

  it('should trigger a new build', async () => {
    getRunningBuilds.mockImplementation(() => Promise.resolve([]));

    await build();

    expect(spinner.start).toHaveBeenCalled();
    expect(getRunningBuilds).toHaveBeenCalledWith(branchName);
    expect(triggerNewBuild).toHaveBeenCalledWith(branchName);
    expect(spinner.succeed).toHaveBeenCalledWith('Build successfully created');
  });

  it('should ask confirmation when the job has running builds', async () => {
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
    askConfirmationBeforeTriggeringNewBuild.mockImplementation(() =>
      Promise.resolve({ confirmation: false })
    );

    await build();

    expect(console.log.mock.calls[0][0]).toBe(red('Aborted'));
    expect(process.exit).toHaveBeenCalledTimes(1);
  });

  it('should handle the exception when it fails to trigger a build', async () => {
    const error = 'some error';
    getRunningBuilds.mockImplementation(() => Promise.reject(error));

    await build();

    expect(spinner.fail).toHaveBeenCalledWith('Failed to create the build');
    expect(logNetworkErrors).toHaveBeenCalledWith(error);
  });

  describe('report build progress', () => {
    const options = { watch: true };

    beforeEach(() => {
      getRunningBuilds.mockImplementation(() => Promise.resolve([]));
    });

    it('should invoke `reportBuildProgress` method with the correct arguments', async () => {
      await build(options);

      expect(reportBuildProgress).toHaveBeenCalledWith(branchName, '100', spinner);
    });

    it('should handle exceptions while retrieving in progress build console', async () => {
      reportBuildProgress.mockImplementationOnce(() =>
        Promise.reject(new WatchError('Hello..'))
      );

      await build(options);

      expect(spinner.fail).toHaveBeenCalledWith('Hello..');
    });
  });

  describe('report build stages', () => {
    const options = { stage: true };

    beforeEach(() => {
      getRunningBuilds.mockImplementation(() => Promise.resolve([]));
    });

    it('should invoke `reportBuildStages` method with the correct arguments', async () => {
      await build(options);

      expect(reportBuildStages).toHaveBeenCalledWith(branchName, '100', spinner);
    });

    it('should handle exceptions while retrieving in progress build stages', async () => {
      reportBuildStages.mockImplementationOnce(() =>
        Promise.reject(new WatchError('Hello..'))
      );

      await build(options);

      expect(spinner.fail).toHaveBeenCalledWith('Hello..');
    });
  });
});

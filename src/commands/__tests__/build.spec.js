const EventEmitter = require('events');

const { red } = require('kleur');

const { getCurrentBranchName } = require('../../lib/git-cmd');
const {
  triggerNewBuild,
  getRunningBuilds,
  getQueueItem,
  createProgressiveTextStream,
} = require('../../lib/jenkins');
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
    jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(global.console, 'log').mockImplementation();
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
    const buildId = 200;

    beforeEach(() => {
      getRunningBuilds.mockImplementation(() => Promise.resolve([]));

      getQueueItem.mockImplementation(() =>
        Promise.resolve({
          executable: {
            number: buildId,
          },
        })
      );
    });

    it('should handle the exception when it fails to report the build progress', async () => {
      getQueueItem.mockImplementation(() => Promise.reject('failed'));

      await build(options);

      expect(getQueueItem).toHaveBeenCalledWith('100', true);
      expect(spinner.fail).toHaveBeenCalledWith(
        'An error occurred while retrieving in progress build console'
      );
    });

    it('should report when the queued job gets cancelled', async () => {
      getQueueItem.mockImplementationOnce(() =>
        Promise.resolve({
          cancelled: true,
        })
      );

      await build(options);

      expect(spinner.fail).toHaveBeenCalledWith(
        'Build has been cancelled. Unable to report the build progress.'
      );
    });

    it('should report the build progress', async () => {
      const emitter = new EventEmitter();
      createProgressiveTextStream.mockImplementation(() => emitter);

      await build(options);

      expect(createProgressiveTextStream).toHaveBeenCalledWith(branchName, buildId);
      expect(emitter.eventNames()).toEqual(['data', 'end', 'error']);
    });

    it('should handle any exceptions while retrieving in progress build console', async () => {
      const emitter = new EventEmitter();
      createProgressiveTextStream.mockImplementation(() => emitter);

      await build(options);

      emitter.emit('error', new Error('boom!'));

      expect(spinner.fail).toHaveBeenCalledWith(
        'An error occurred while retrieving in progress build console'
      );
    });
  });
});

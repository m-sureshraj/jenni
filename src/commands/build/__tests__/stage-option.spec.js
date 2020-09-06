const EventEmitter = require('events');

const { yellow, gray, green, red } = require('kleur');

const { createBuildStageStream, getQueueItem } = require('../../../lib/jenkins');
const { WatchError } = require('../../../lib/errors');
const { STATUS_TYPES, BUILD_STATUS } = require('../../../lib/build-status');
const reportBuildStages = require('../stage-option');
const { hideCursor } = require('../../../lib/ansi-escapes');

jest.mock('../../../lib/jenkins');
jest.mock('../../../lib/ansi-escapes');

describe('reportBuildStages', () => {
  afterEach(jest.clearAllMocks);

  describe('throws a watch error when', () => {
    test('it could not find the queued item', async () => {
      getQueueItem.mockImplementationOnce(() => Promise.reject(new Error('Boom')));

      const branchName = 'foo';
      const queuedItemNumber = 100;

      try {
        await reportBuildStages(branchName, queuedItemNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(WatchError);
        expect(error.message).toBe('An error occurred while retrieving build stages');
      }
    });

    test('the build gets cancelled', async () => {
      getQueueItem.mockImplementationOnce(() => Promise.resolve({ cancelled: true }));

      const branchName = 'foo';
      const queuedItemNumber = 100;

      try {
        await reportBuildStages(branchName, queuedItemNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(WatchError);
        expect(error.message).toBe(
          'Build has been cancelled. Unable to report the build stages.'
        );
      }
    });
  });

  describe('gracefully handles', () => {
    const buildId = 200;
    const branchName = 'foo';
    const queuedItemNumber = 100;
    const timerId = 'some-timer';
    const stageStub = {
      id: 100,
      name: 'foo',
      duration: 1000,
      status: STATUS_TYPES.inProgress,
    };
    let emitter;
    let spinnerStub;

    beforeEach(() => {
      emitter = new EventEmitter();
      createBuildStageStream.mockImplementationOnce(() => emitter);

      getQueueItem.mockImplementationOnce(() =>
        Promise.resolve({ executable: { number: buildId } })
      );

      spinnerStub = {
        start: jest.fn(),
        stop: jest.fn(() => {
          spinnerStub.isSpinning = false;
        }),
        fail: jest.fn(),
        succeed: jest.fn(),
        isSpinning: true,
      };

      jest.spyOn(global.console, 'log').mockImplementation(() => {});
      jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
      jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
      jest.spyOn(global, 'setInterval').mockImplementation(() => timerId);
    });

    test('when the build status is unknown', async () => {
      await reportBuildStages(branchName, queuedItemNumber, spinnerStub);

      const status = '__no_idea__';
      emitter.emit('end', status);

      expect(spinnerStub.stop).toHaveBeenCalledTimes(1);
      expect(clearInterval).not.toHaveBeenCalled();
      expect(process.stdout.write.mock.calls[0][0]).toEqual(
        expect.stringContaining(red('Unknown build status'))
      );
    });

    test('when the build has failed', async () => {
      await reportBuildStages(branchName, queuedItemNumber, spinnerStub);

      // 1st set of data arrived
      emitter.emit('data', { status: STATUS_TYPES.inProgress, stages: [stageStub] });

      // 2nd set of data arrived, but unfortunately build has failed
      emitter.emit('data', {
        status: STATUS_TYPES.failed,
        stages: [{ ...stageStub, status: STATUS_TYPES.failed }],
      });
      emitter.emit('end', STATUS_TYPES.failed);

      expect(console.log).toHaveBeenCalledWith(yellow('Build Stages'));
      expect(process.stdout.write.mock.calls[1][0]).toEqual(
        expect.stringContaining(`foo ${gray('(Duration 01 sec)')}`)
      );
      expect(process.stdout.write.mock.calls[3][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.FAILED.icon} foo ${gray('(Duration 01 sec)')}`
        )
      );
      expect(process.stdout.write.mock.calls[4][0]).toEqual(
        expect.stringContaining(`${BUILD_STATUS.FAILED.icon} Build has ${red('FAILED')}`)
      );
    });

    test('when the build is successful', async () => {
      await reportBuildStages(branchName, queuedItemNumber, spinnerStub);

      // 1st set of data arrived
      emitter.emit('data', { status: STATUS_TYPES.inProgress, stages: [stageStub] });

      // then
      expect(spinnerStub.stop).toHaveBeenCalled();
      expect(hideCursor).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(yellow('Build Stages'));
      expect(clearInterval).not.toHaveBeenCalled();
      expect(process.stdout.write.mock.calls[1][0]).toEqual(
        expect.stringContaining(`foo ${gray('(Duration 01 sec)')}`)
      );
      expect(setInterval).toHaveBeenCalled();

      // 2nd set of data arrived
      emitter.emit('data', {
        status: STATUS_TYPES.success,
        stages: [{ ...stageStub, status: STATUS_TYPES.success }],
      });

      // then
      expect(spinnerStub.stop).toHaveBeenCalledTimes(1);
      expect(hideCursor).toHaveBeenCalledTimes(1);
      expect(clearInterval).toHaveBeenCalledWith(timerId);
      expect(process.stdout.write.mock.calls[3][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.SUCCESS.icon} foo ${gray('(Duration 01 sec)')}`
        )
      );
      expect(setInterval).toHaveBeenCalledTimes(2);

      // Build successfully ended
      emitter.emit('end', STATUS_TYPES.success);

      // then
      expect(process.stdout.write.mock.calls[4][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.SUCCESS.icon} Build ${green('SUCCESSFUL')}`
        )
      );
    });

    test('when the build has been aborted', async () => {
      await reportBuildStages(branchName, queuedItemNumber, spinnerStub);

      // 1st set of data arrived
      emitter.emit('data', { status: STATUS_TYPES.inProgress, stages: [stageStub] });

      // 2nd set of data arrived, but unfortunately build has been aborted
      emitter.emit('data', {
        status: STATUS_TYPES.aborted,
        stages: [{ ...stageStub, status: STATUS_TYPES.aborted }],
      });
      emitter.emit('end', STATUS_TYPES.aborted);

      expect(console.log).toHaveBeenCalledWith(yellow('Build Stages'));
      expect(process.stdout.write.mock.calls[1][0]).toEqual(
        expect.stringContaining(`foo ${gray('(Duration 01 sec)')}`)
      );
      expect(process.stdout.write.mock.calls[3][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.ABORTED.icon} foo ${gray('(Duration 01 sec)')}`
        )
      );
      expect(process.stdout.write.mock.calls[4][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.ABORTED.icon} Build has been ${yellow('ABORTED')}`
        )
      );
    });

    test('when the build has not been executed', async () => {
      await reportBuildStages(branchName, queuedItemNumber, spinnerStub);

      emitter.emit('end', STATUS_TYPES.notExecuted);

      expect(spinnerStub.stop).toHaveBeenCalledTimes(1);
      expect(clearInterval).not.toHaveBeenCalled();
      expect(process.stdout.write.mock.calls[0][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.NOT_EXECUTED.icon} The build has not been executed yet`
        )
      );
    });

    test('when the build is unstable', async () => {
      await reportBuildStages(branchName, queuedItemNumber, spinnerStub);

      // 1st set of data arrived
      emitter.emit('data', { status: STATUS_TYPES.inProgress, stages: [stageStub] });

      // 2nd set of data arrived, but unfortunately build is unstable
      emitter.emit('data', {
        status: STATUS_TYPES.unstable,
        stages: [{ ...stageStub, status: STATUS_TYPES.unstable }],
      });
      emitter.emit('end', STATUS_TYPES.unstable);

      expect(console.log).toHaveBeenCalledWith(yellow('Build Stages'));
      expect(process.stdout.write.mock.calls[1][0]).toEqual(
        expect.stringContaining(`foo ${gray('(Duration 01 sec)')}`)
      );
      expect(process.stdout.write.mock.calls[3][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.UNSTABLE.icon} foo ${gray('(Duration 01 sec)')}`
        )
      );
      expect(process.stdout.write.mock.calls[4][0]).toEqual(
        expect.stringContaining(
          `${BUILD_STATUS.UNSTABLE.icon} Build is ${yellow('UNSTABLE')}`
        )
      );
    });

    test('exceptions while retrieving build stages', async () => {
      await reportBuildStages(branchName, queuedItemNumber, spinnerStub);

      // 1st set of data arrived
      emitter.emit('data', { status: STATUS_TYPES.inProgress, stages: [stageStub] });

      // but unfortunately an error occurred
      emitter.emit('error', new Error('boom!'));

      expect(clearInterval).toHaveBeenCalledTimes(1);
      expect(spinnerStub.fail).toHaveBeenCalledWith(
        'An error occurred while retrieving build stages'
      );
    });
  });
});

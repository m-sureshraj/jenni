const EventEmitter = require('events');

const { createProgressiveTextStream, getQueueItem } = require('../../../lib/jenkins');
const { WatchError } = require('../../../lib/errors');
const reportBuildProgress = require('../watch-option');

jest.mock('../../../lib/jenkins');

const spinnerStub = {
  start: jest.fn(),
  stop: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};

describe('reportBuildProgress', () => {
  afterEach(jest.clearAllMocks);

  describe('throws a watch error when', () => {
    test('it could not find the queued item', async () => {
      getQueueItem.mockImplementationOnce(() => Promise.reject(new Error('Boom')));

      const branchName = 'foo';
      const queuedItemNumber = 100;

      try {
        await reportBuildProgress(branchName, queuedItemNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(WatchError);
        expect(error.message).toBe(
          'An error occurred while retrieving in progress build console'
        );
      }
    });

    test('the build gets cancelled', async () => {
      getQueueItem.mockImplementationOnce(() => Promise.resolve({ cancelled: true }));

      const branchName = 'foo';
      const queuedItemNumber = 100;

      try {
        await reportBuildProgress(branchName, queuedItemNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(WatchError);
        expect(error.message).toBe(
          'Build has been cancelled. Unable to report the build progress.'
        );
      }
    });
  });

  describe('should', () => {
    const buildId = 200;
    const branchName = 'foo';
    const queuedItemNumber = 100;
    let emitter;

    beforeEach(() => {
      emitter = new EventEmitter();
      createProgressiveTextStream.mockImplementationOnce(() => emitter);

      getQueueItem.mockImplementationOnce(() =>
        Promise.resolve({ executable: { number: buildId } })
      );

      jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    });

    test('progressively prints logs to std output', async () => {
      // when
      await reportBuildProgress(branchName, queuedItemNumber, spinnerStub);

      emitter.emit('data', 'abc');
      emitter.emit('data', 'cde');
      emitter.emit('end');

      // then
      expect(spinnerStub.stop).toHaveBeenCalledTimes(3);
      expect(spinnerStub.start).toHaveBeenCalledTimes(2);
      expect(process.stdout.write.mock.calls[0][0]).toBe('abc');
      expect(process.stdout.write.mock.calls[1][0]).toBe('cde');

      expect(getQueueItem).toHaveBeenCalledWith(queuedItemNumber, true);
      expect(createProgressiveTextStream).toHaveBeenCalledWith(branchName, buildId);
    });

    test('gracefully handles any exceptions while retrieving in progress build console', async () => {
      // when
      await reportBuildProgress(branchName, queuedItemNumber, spinnerStub);

      emitter.emit('data', 'abc');
      emitter.emit('error', new Error('boom!'));

      // then
      expect(spinnerStub.start).toHaveBeenCalledTimes(1);
      expect(spinnerStub.stop).toHaveBeenCalledTimes(1);
      expect(spinnerStub.fail).toHaveBeenCalledWith(
        'An error occurred while retrieving in progress build console'
      );
    });
  });
});

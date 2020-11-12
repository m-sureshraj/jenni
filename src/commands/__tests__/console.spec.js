const EventEmitter = require('events');

const { gray, red, yellow } = require('kleur');

const { getCurrentBranchName } = require('../../lib/git-cmd');
const { createProgressiveTextStream, getRunningBuilds } = require('../../lib/jenkins');
const { askToSelectARunningBuild } = require('../../lib/prompt');

jest.mock('../../lib/jenkins');
jest.mock('../../lib/git-cmd');
jest.mock('../../lib/prompt');
jest.mock('../../lib/log');

const spinner = {
  start: jest.fn(),
  stop: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};
jest.doMock('ora', () => {
  return jest.fn().mockImplementation(() => spinner);
});

const printConsole = require('../console');

describe('console', () => {
  const branchName = 'foo';
  let spiedStdWrite;
  beforeEach(() => {
    spiedStdWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    getCurrentBranchName.mockImplementation(() => branchName);
    getRunningBuilds.mockImplementation(() => []);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    spiedStdWrite.mockRestore();
  });

  describe('build id not defined', () => {
    const now = new Date().getTime();
    const oneMinuteAgo = now - 1000 * 60;
    const fiveMinuteAgo = now - 1000 * 60 * 5;
    const mockedRunningBuilds = [
      { id: '10', name: '#10', startTimeMillis: now },
      { id: '11', name: '#11', startTimeMillis: oneMinuteAgo },
      { id: '12', name: '#12', startTimeMillis: fiveMinuteAgo },
    ];

    it('should select the latest build-id when there is no running builds', async () => {
      const options = {};
      await printConsole(options);

      expect(createProgressiveTextStream).toHaveBeenCalledWith(branchName, 'lastBuild');
    });

    it('should pick the running build-id when there is only one running build', async () => {
      getRunningBuilds.mockImplementation(() => [{ id: '100' }]);

      const options = {};
      await printConsole(options);

      expect(createProgressiveTextStream).toHaveBeenCalledWith(branchName, '100');
    });

    it('should ask the user to select a build when there are multiple running builds', async () => {
      const selectedBuildId = '10';
      askToSelectARunningBuild.mockImplementation(() =>
        Promise.resolve({ selectedBuildId })
      );

      getRunningBuilds.mockImplementation(() => mockedRunningBuilds);

      const options = {};
      await printConsole(options);

      expect(askToSelectARunningBuild).toHaveBeenCalledWith([
        { value: '10', title: `#10${gray(' (Started just now)')}` },
        { value: '11', title: `#11${gray(' (Started a minute ago)')}` },
        { value: '12', title: `#12${gray(' (Started 5 minutes ago)')}` },
      ]);
      expect(createProgressiveTextStream).toHaveBeenCalledWith(
        branchName,
        selectedBuildId
      );
    });

    it('should cancel the command if the user canceled the prompt', async () => {
      getRunningBuilds.mockImplementation(() => mockedRunningBuilds);
      jest.spyOn(process, 'exit').mockImplementation();

      askToSelectARunningBuild.mockImplementation(() =>
        Promise.resolve({ selectedBuildId: undefined })
      );

      const options = {};
      await printConsole(options);

      expect(spiedStdWrite).toHaveBeenCalledWith(red('Aborted\n'));
      expect(process.exit).toHaveBeenCalledTimes(1);
    });

    it('should handle exceptions when fetching running builds', async () => {
      jest.spyOn(process, 'exit').mockImplementation();

      const error = new Error('boom');
      getRunningBuilds.mockImplementation(() => Promise.reject(error));

      const options = {};
      await printConsole(options);

      expect(spinner.fail).toHaveBeenCalledWith('boom');
      expect(process.exit).toHaveBeenCalledTimes(1);
    });
  });

  it('should retrieve the build console', async done => {
    const emitter = new EventEmitter();

    let counter = 0;
    const intervalId = setInterval(() => {
      counter++;
      emitter.emit('data', `${counter}: hello`);

      if (counter === 3) {
        emitter.emit('end');
        clearInterval(intervalId);
      }
    }, 100);

    createProgressiveTextStream.mockImplementation(() => emitter);

    const options = { build: '10' };
    await printConsole(options);

    setTimeout(() => {
      expect(spiedStdWrite).toHaveBeenNthCalledWith(1, yellow('Build (#10) console\n\n'));
      expect(spiedStdWrite).toHaveBeenNthCalledWith(2, '1: hello');
      expect(spiedStdWrite).toHaveBeenNthCalledWith(3, '2: hello');
      expect(spiedStdWrite).toHaveBeenNthCalledWith(4, '3: hello');
      done();
    }, 500);
  });

  it('should handle exceptions while retrieving the build console', async done => {
    const emitter = new EventEmitter();

    const intervalId = setInterval(() => {
      emitter.emit('error', new Error('Boom'));
      clearInterval(intervalId);
    }, 100);

    createProgressiveTextStream.mockImplementation(() => emitter);

    const options = { build: '10' };
    await printConsole(options);

    setTimeout(() => {
      expect(spinner.fail).toHaveBeenCalledWith(
        'An error occurred while retrieving build console'
      );
      done();
    }, 200);
  });
});

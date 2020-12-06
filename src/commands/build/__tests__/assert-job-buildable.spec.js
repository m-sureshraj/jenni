const { enableJob, isJobBuildable } = require('../../../lib/jenkins');
const { getConfirmationToEnableTheJob } = require('../../../lib/prompt');
const { logNetworkErrors } = require('../../../lib/log');
const assertJobBuildable = require('../assert-job-buildable');

jest.mock('../../../lib/jenkins');
jest.mock('../../../lib/prompt');
jest.mock('../../../lib/log');

const spinnerStub = {
  start: jest.fn(),
  stop: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};
const branchName = 'foo';

describe('assertJobBuildable', () => {
  beforeEach(() => {
    isJobBuildable.mockImplementation(() => Promise.resolve(true));

    // Note: mocked `process.exit` wont stop the execution
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(jest.clearAllMocks);

  it('should not prompt confirmation when the job is buildable', async () => {
    await assertJobBuildable(branchName, spinnerStub);

    expect(spinnerStub.start).toHaveBeenCalledTimes(1);
    expect(isJobBuildable).toHaveBeenCalledWith(branchName);
    expect(getConfirmationToEnableTheJob).not.toHaveBeenCalled();
  });

  it('should catch all the exceptions locally', async () => {
    const error = new Error('bar');
    isJobBuildable.mockImplementation(() => Promise.reject(error));

    await assertJobBuildable(branchName, spinnerStub);

    expect(getConfirmationToEnableTheJob).not.toHaveBeenCalled();
    expect(spinnerStub.fail).toHaveBeenCalledWith(error.message);
    expect(logNetworkErrors).toHaveBeenCalledWith(error);
    expect(process.exit).toHaveBeenCalled();
  });

  it('should prompt confirmation when the job is disabled', async () => {
    isJobBuildable.mockImplementation(() => Promise.resolve(false));

    await assertJobBuildable(branchName, spinnerStub);

    expect(spinnerStub.stop).toHaveBeenCalled();
    expect(getConfirmationToEnableTheJob).toHaveBeenCalled();
  });

  it('should end the process when the confirmation gets rejected', async () => {
    getConfirmationToEnableTheJob.mockImplementation(() =>
      Promise.resolve({ confirmation: false })
    );
    isJobBuildable.mockImplementation(() => Promise.resolve(false));

    await assertJobBuildable(branchName, spinnerStub);

    expect(spinnerStub.fail).toHaveBeenCalledWith('Aborted');
    expect(process.exit).toHaveBeenCalledTimes(1);
  });

  it('should enable the job when the confirmation gets accepted', async () => {
    getConfirmationToEnableTheJob.mockImplementation(() =>
      Promise.resolve({ confirmation: false })
    );
    isJobBuildable.mockImplementation(() => Promise.resolve(false));

    await assertJobBuildable(branchName, spinnerStub);

    expect(spinnerStub.start).toHaveBeenNthCalledWith(2, 'Enabling the job');
    expect(enableJob).toHaveBeenCalledWith(branchName);
    expect(spinnerStub.succeed).toHaveBeenCalledWith('Job successfully enabled');
  });
});

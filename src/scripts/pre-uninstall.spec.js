const fs = require('fs');

const Conf = require('conf');
const { red, yellow, cyan, dim } = require('kleur');

const { getDeleteConfigConfirmation } = require('../lib/prompt');

jest.mock('fs');
jest.mock('conf');
jest.mock('../lib/prompt');

const fakePath = 'some/fake/path';
// mock Conf constructor fn
Conf.mockImplementation(() => {
  return {
    path: fakePath,
  };
});

const deleteConfig = require('./pre-uninstall');

describe('pre-uninstall', () => {
  const originalLog = console.log;
  const env = {
    npm_config_argv: JSON.stringify({ original: ['uninstall'] }),
  };

  beforeEach(() => {
    console.log = jest.fn();
    getDeleteConfigConfirmation.mockImplementation(() => ({ confirmation: false }));
    fs.existsSync = jest.fn().mockImplementation(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    console.log = originalLog;
  });

  it('should do nothing when the pre-uninstall script is triggered by other than the uninstall lifecycle hook', async () => {
    const env = {
      npm_config_argv: JSON.stringify({ original: ['update'] }),
    };

    await deleteConfig(env);

    expect(getDeleteConfigConfirmation).not.toHaveBeenCalled();
    expect(fs.rmdirSync).not.toHaveBeenCalled();
  });

  it('should not prompt delete confirmation when there is no config file to delete', async () => {
    fs.existsSync.mockImplementation(() => false);

    await deleteConfig(env);

    expect(getDeleteConfigConfirmation).not.toHaveBeenCalled();
  });

  it('should prompt delete confirmation when the config exists', async () => {
    await deleteConfig(env);

    const warningMessage = [
      cyan('App configuration exists!'),
      dim(
        'Please note if you delete the app configuration, you will lose previously initialized project settings.'
      ),
      dim(
        'That means if you install Jenni again, you have to reinitialize it on your every project again.'
      ),
    ].join('\n');

    expect(console.log).toHaveBeenNthCalledWith(1, `${warningMessage}\n`);
    expect(getDeleteConfigConfirmation).toHaveBeenCalled();
  });

  it('should not delete the config if the user decides to keep it', async () => {
    await deleteConfig(env);

    expect(console.log).toHaveBeenNthCalledWith(
      2,
      dim('\nWise choice! We will keep the app configuration for future use.')
    );
    expect(fs.rmdirSync).not.toHaveBeenCalled();
  });

  it('should delete the config if the user confirms', async () => {
    getDeleteConfigConfirmation.mockImplementation(() => ({ confirmation: true }));
    fs.existsSync = jest.fn(() => true);

    await deleteConfig(env);

    expect(fs.unlinkSync).toHaveBeenCalledWith(fakePath);
    expect(fs.rmdirSync).toHaveBeenCalledWith('some/fake');
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      dim('\nThe app configuration has been successfully deleted.')
    );
  });

  it('should handle exceptions while deleting the config', async () => {
    getDeleteConfigConfirmation.mockImplementation(() => ({ confirmation: true }));

    fs.existsSync = jest.fn().mockImplementation(() => {
      throw new Error('some error');
    });

    await deleteConfig(env);

    expect(console.log).toHaveBeenNthCalledWith(
      1,
      red('\nFailed to delete the app configuration.')
    );
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      `Manually delete the following directory: ${yellow('some/fake')}\n`
    );
  });
});

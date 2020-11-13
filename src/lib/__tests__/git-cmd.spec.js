const { spawnSync } = require('child_process');

const {
  getCurrentBranchName,
  isGitRepository,
  getGitRootDirPath,
} = require('../git-cmd');

jest.mock('child_process');

afterEach(jest.clearAllMocks);

describe('getCurrentBranchName', () => {
  it('should return the current branch name', () => {
    const branchName = 'master\n';
    spawnSync.mockImplementation(() => {
      return {
        stdout: branchName,
        stderr: null,
      };
    });

    expect(getCurrentBranchName()).toEqual('master');
    expect(spawnSync).toHaveBeenCalledWith('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
    });
  });

  it('should throw an error if it encounters an exception', () => {
    spawnSync.mockImplementation(() => {
      return {
        stdout: null,
        stderr: new Error('something not correct'),
      };
    });

    expect(() => {
      getCurrentBranchName();
    }).toThrow('Error: something not correct');
  });
});

describe('isGitRepository', () => {
  it('should return true if the directory is a git repository', () => {
    spawnSync.mockImplementation(() => {
      return {
        stdout: 'true',
      };
    });

    expect(isGitRepository()).toBeTruthy();
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      {
        encoding: 'utf8',
      }
    );
  });
});

describe('getGitRootDirPath', () => {
  it('should return git root directory path', () => {
    spawnSync.mockImplementation(() => {
      return {
        stdout: 'some/path/to\n',
        stderr: null,
      };
    });

    expect(getGitRootDirPath()).toEqual('some/path/to');
    expect(spawnSync).toHaveBeenCalledWith('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    });
  });

  it('should throw an error if it encounters an exception', () => {
    spawnSync.mockImplementation(() => {
      return {
        stdout: null,
        stderr: new Error('Boom!'),
      };
    });

    expect(() => {
      getGitRootDirPath();
    }).toThrow('Error: Boom!');
  });
});

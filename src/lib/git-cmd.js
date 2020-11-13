const { spawnSync } = require('child_process');

const { removeNewLine } = require('./util');

exports.getCurrentBranchName = function() {
  const { stdout, stderr } = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  });

  if (stderr) throw new Error(stderr);

  return removeNewLine(stdout);
};

exports.isGitRepository = function() {
  const { stdout } = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    encoding: 'utf8',
  });

  return Boolean(stdout);
};

exports.getGitRootDirPath = function() {
  const { stdout, stderr } = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  });

  if (stderr) throw new Error(stderr);

  return removeNewLine(stdout);
};

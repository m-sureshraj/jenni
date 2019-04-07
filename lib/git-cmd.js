const { spawnSync } = require('child_process');
const { removeNewLine } = require('./util');

exports.getCurrentBranchName = function() {
  const { stdout, stderr } = spawnSync('git', ['symbolic-ref', 'HEAD'], {
    encoding: 'utf8'
  });

  if (stderr) throw new Error(stderr);

  return removeNewLine(stdout.substr(stdout.lastIndexOf('/') + 1));
};

exports.isGitRepository = function() {
  const { stdout } = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    encoding: 'utf8'
  });

  // error scenario `stderr` will be handled by the application
  return Boolean(stdout);
};

exports.getGitRootDirPath = function() {
  const { stdout, stderr } = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8'
  });

  if (stderr) throw new Error(stderr);

  return removeNewLine(stdout.substr(stdout.lastIndexOf('\\') + 1));
};

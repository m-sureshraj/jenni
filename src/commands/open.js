const _open = require('open');
const { yellow, bold, blue } = require('kleur');
const Conf = require('conf');
const { isGitRepository, getGitRootDirPath, getCurrentBranchName } = require('../../lib/git-cmd');
const { getBranchJobLink } = require('../../lib/jenkins');
const { debug } = require('../../lib/log');

const store = new Conf();

module.exports = function open(buildNumber = null) {
  // not a git repository
  if (!isGitRepository()) {
    console.log(yellow('jen has no power here! Please execute jen commands inside the git dir.'));
    process.exit();
  }

  // if we couldn't find the config then jen not yet initialized
  if (!store.get(getGitRootDirPath())) {
    console.log(yellow(`Could not find the config! Introduce jen to your project via ${bold(blue('> jen init'))}`));
    process.exit();
  }

  const branchName = getCurrentBranchName();
  let url = getBranchJobLink(branchName);

  // if the argument is empty, commander will pass the default options object
  if (buildNumber && typeof buildNumber !== 'object') {
    url += '/' + option;
  }

  debug('Opening - ' + url);
  _open(url);
};

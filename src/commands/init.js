const Conf = require('conf');
const { isGitRepository, getGitRootDirPath } = require('../../lib/git-cmd');
const { yellow, green, gray } = require('kleur');
const { requestJenkinsCredentials, askConfirmation } = require('../../lib/prompt');
const { printConfig } = require('../../lib/cli-table');

const store = new Conf();

module.exports = async function init() {
  // not a git repository
  if (!isGitRepository()) {
    console.log(
      yellow('jen has no power here! Please execute jen commands inside the git dir.')
    );
    process.exit();
  }

  const res = await requestJenkinsCredentials();

  // 3 fields are required
  if (Object.keys(res).length >= 3) {
    printConfig(res);
    const { confirmation } = await askConfirmation();

    if (confirmation) {
      store.set(getGitRootDirPath(), res);
      console.log(green('Configuration successfully saved at ') + gray(store.path));
    }
  }
};

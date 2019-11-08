const Conf = require('conf');
const { green, gray } = require('kleur');

const { getGitRootDirPath } = require('../../lib/git-cmd');
const { requestJenkinsCredentials, askConfirmation } = require('../../lib/prompt');
const { printConfig } = require('../../lib/cli-table');

const store = new Conf();

module.exports = async function init() {
  const res = await requestJenkinsCredentials();

  // 3 fields are required
  if (Object.keys(res).length >= 3) {
    printConfig(res);
    const { confirmation } = await askConfirmation();

    if (confirmation) {
      store.set(getGitRootDirPath(), res);
      console.log(green('Configuration successfully saved at ') + gray(store.path));
    }

    // todo: Display a message when confirmation rejected
  }

  // todo: Display a message when required fields are missing
};

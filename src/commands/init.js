const Conf = require('conf');
const { green, gray, red } = require('kleur');

const { getGitRootDirPath } = require('../lib/git-cmd');
const { requestJenkinsCredentials, askConfirmation } = require('../lib/prompt');
const { printConfig } = require('../lib/cli-table');

const store = new Conf();

module.exports = async function init() {
  const response = await requestJenkinsCredentials();
  if (response.__cancelled__) {
    console.log(red('Aborted'));
    return;
  }

  printConfig(response);

  const { confirmation } = await askConfirmation();
  if (!confirmation) {
    console.log(red('Aborted'));
    return;
  }

  store.set(getGitRootDirPath(), response);
  console.log(green('Configuration successfully saved at ') + gray(store.path));
};

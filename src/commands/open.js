const _open = require('open');

const { getCurrentBranchName } = require('../lib/git-cmd');
const { getJobLink } = require('../lib/jenkins');
const { debug } = require('../lib/log');

module.exports = function open(buildNumber = null) {
  const branchName = getCurrentBranchName();
  let url = getJobLink(branchName);

  // if the argument is empty, commander will pass the default options object
  if (buildNumber && typeof buildNumber !== 'object') {
    url += `/${buildNumber}`;
  }

  debug(`Opening - ${url}`);
  _open(url);
};

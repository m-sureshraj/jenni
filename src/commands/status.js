const ora = require('ora');
const { yellow, gray, red } = require('kleur');
const terminalLink = require('terminal-link');

const { getCurrentBranchName } = require('../../lib/git-cmd');
const {
  getBranchBuildHistory,
  getJobLink,
  constructJobTitle,
} = require('../../lib/jenkins');
const { printBuildHistory } = require('../../lib/cli-table');
const { logNetworkErrors, debug } = require('../../lib/log');

const spinner = ora();

module.exports = async function showBuildStatus() {
  const branchName = getCurrentBranchName();
  debug(`Branch name: ${branchName}`);

  try {
    spinner.start();
    const builds = await getBranchBuildHistory(branchName);
    const jobTitle = constructJobTitle(branchName);
    const jobLink = getJobLink(branchName);
    spinner.stop();

    // title
    console.log(yellow('Build history of - ' + terminalLink(jobTitle, jobLink)));

    if (!builds.length) {
      console.log(gray('No build exists for this branch!'));
      process.exit();
    }

    printBuildHistory(builds);
    console.log(`${gray('Last ' + builds.length + ' build results.')}`);
  } catch (err) {
    spinner.stop();

    if (err.statusCode === 404) {
      console.log(
        `${red('Job not found')} - Jenkins job does not exist for branch "${branchName}"`
      );
      debug(err);
      process.exit();
    }

    logNetworkErrors(err);
    process.exit();
  }
};

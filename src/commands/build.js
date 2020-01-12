const ora = require('ora');
const { red } = require('kleur');

const { getCurrentBranchName } = require('../lib/git-cmd');
const { logNetworkErrors, debug } = require('../lib/log');
const { triggerNewBuild, getRunningBuilds } = require('../lib/jenkins');
const { askConfirmationBeforeTriggeringNewBuild } = require('../lib/prompt');

const spinner = ora();

module.exports = async function build() {
  const branchName = getCurrentBranchName();
  debug(`Branch name: ${branchName}`);

  try {
    spinner.start();

    const runningBuilds = await getRunningBuilds(branchName);
    if (runningBuilds.length) {
      spinner.stop();

      const { confirmation } = await askConfirmationBeforeTriggeringNewBuild();
      if (!confirmation) {
        console.log(red('Aborted'));
        process.exit();
      }

      spinner.start();
    }

    await triggerNewBuild(branchName);
    spinner.succeed('Build successfully created');
  } catch (err) {
    spinner.fail('Failed to create the build');
    logNetworkErrors(err);
  }
};

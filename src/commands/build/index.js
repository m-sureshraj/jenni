const ora = require('ora');
const { red, yellow } = require('kleur');

const { getCurrentBranchName } = require('../../lib/git-cmd');
const { logNetworkErrors, debug } = require('../../lib/log');
const { triggerNewBuild, getRunningBuilds } = require('../../lib/jenkins');
const { askConfirmationBeforeTriggeringNewBuild } = require('../../lib/prompt');
const { ERROR_TYPE } = require('../../lib/errors');
const reportBuildStages = require('./stage-option');
const reportBuildProgress = require('./watch-option');

const spinner = ora();

// http://localhost:8080/queue/item/11/ => 11
function extractQueueItemNumber(queueUrl = '') {
  return queueUrl
    .split('/')
    .filter(Boolean)
    .pop();
}

module.exports = async function build(options = {}) {
  if (options.watch && options.stage) {
    console.log(
      yellow(
        "Invalid options usage! Can't view the build console, stages together. Retry the command with a single option."
      )
    );
    process.exit();
  }

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

    const { headers } = await triggerNewBuild(branchName);
    spinner.succeed('Build successfully created');

    if (options.watch) {
      debug('Watch option enabled. Retrieving in progress build console');
      process.stdout.write('\n');

      await reportBuildProgress(
        branchName,
        extractQueueItemNumber(headers.location),
        spinner
      );
      return;
    }

    if (options.stage) {
      debug('Stage view option enabled. Retrieving in progress build stages');
      process.stdout.write('\n');

      spinner.start();
      await reportBuildStages(
        branchName,
        extractQueueItemNumber(headers.location),
        spinner
      );
    }
  } catch (error) {
    if (error.name === ERROR_TYPE.watchError) {
      process.stdout.write('\n');
      spinner.fail(error.message);
      debug(error);
      return;
    }

    spinner.fail('Failed to create the build');
    logNetworkErrors(error);
  }
};

const ora = require('ora');
const { red } = require('kleur');

const { getCurrentBranchName } = require('../lib/git-cmd');
const { logNetworkErrors, debug } = require('../lib/log');
const {
  triggerNewBuild,
  getRunningBuilds,
  createProgressiveTextStream,
  getQueueItem,
} = require('../lib/jenkins');
const { askConfirmationBeforeTriggeringNewBuild } = require('../lib/prompt');
const { WatchError, ERROR_TYPE } = require('../lib/errors');

const spinner = ora();

// http://localhost:8080/queue/item/11/ => 11
function extractQueueItemNumber(queueUrl = '') {
  return queueUrl
    .split('/')
    .filter(Boolean)
    .pop();
}

async function reportBuildProgress(branchName, queuedItemNumber) {
  try {
    const retryUntilBuildFound = true;
    const queueItem = await getQueueItem(queuedItemNumber, retryUntilBuildFound);

    if (queueItem.cancelled) {
      throw new WatchError(
        'Build has been cancelled. Unable to report the build progress.'
      );
    }

    // we can safely access the `executable` because `getQueueItem` retry until `executable` found
    const buildId = queueItem.executable.number;
    const stream = createProgressiveTextStream(branchName, buildId);

    stream.on('data', data => {
      spinner.stop();
      process.stdout.write(data);
      spinner.start();
    });

    stream.on('end', () => {
      spinner.stop();
    });

    stream.on('error', error => {
      process.stdout.write('\n');
      spinner.fail('An error occurred while retrieving in progress build console');
      debug(error);
    });
  } catch (error) {
    if (error.name === ERROR_TYPE.watchError) throw error;

    throw new WatchError(
      'An error occurred while retrieving in progress build console',
      error
    );
  }
}

module.exports = async function build(options = {}) {
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
      await reportBuildProgress(branchName, extractQueueItemNumber(headers.location));
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

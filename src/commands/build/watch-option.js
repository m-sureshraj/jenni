const { createProgressiveTextStream, getQueueItem } = require('../../lib/jenkins');
const { debug } = require('../../lib/log');
const { WatchError, ERROR_TYPE } = require('../../lib/errors');

module.exports = async function reportBuildProgress(
  branchName,
  queuedItemNumber,
  spinner
) {
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
};

const { enableJob, isJobBuildable } = require('../../lib/jenkins');
const { getConfirmationToEnableTheJob } = require('../../lib/prompt');
const { logNetworkErrors } = require('../../lib/log');

async function assertJobBuildable(branchName, spinner) {
  try {
    spinner.start();

    if (!(await isJobBuildable(branchName))) {
      spinner.stop();

      const { confirmation } = await getConfirmationToEnableTheJob();
      if (!confirmation) {
        spinner.fail('Aborted');
        process.exit();
      }

      spinner.start('Enabling the job');
      await enableJob(branchName);
      spinner.succeed('Job successfully enabled');
    }
  } catch (error) {
    spinner.fail(error.message);
    logNetworkErrors(error);
    process.exit();
  }
}

module.exports = assertJobBuildable;

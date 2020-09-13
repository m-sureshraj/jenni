const { red, yellow, green, gray } = require('kleur');
const ora = require('ora');

const { STATUS_TYPES, BUILD_STATUS } = require('../../lib/build-status');
const { createBuildStageStream, getQueueItem } = require('../../lib/jenkins');
const { formatMs } = require('../../lib/util');
const { eraseLines, hideCursor } = require('../../lib/ansi-escapes');
const { debug } = require('../../lib/log');
const { WatchError, ERROR_TYPE } = require('../../lib/errors');

function printFinalStatus(status) {
  const { icon } = BUILD_STATUS[status] || {};

  switch (status) {
    case STATUS_TYPES.success:
      process.stdout.write(`\n\n${icon} Build ${green('SUCCESSFUL')}\n`);
      break;

    case STATUS_TYPES.failed:
      process.stdout.write(`\n\n${icon} Build has ${red('FAILED')}\n`);
      break;

    case STATUS_TYPES.aborted:
      process.stdout.write(`\n\n${icon} Build has been ${yellow('ABORTED')}\n`);
      break;

    case STATUS_TYPES.notExecuted:
      // TODO: The output should tell the user what he/she should do next.
      process.stdout.write(`${icon} The build has not been executed yet\n`);
      break;

    case STATUS_TYPES.unstable:
      process.stdout.write(`\n\n${icon} Build is ${yellow('UNSTABLE')}\n`);
      break;

    default:
      process.stdout.write(`\n${red('Unknown build status')}\n`);
  }
}

const stageSpinner = ora();
const loadingSpinner = ora();
// recommended interval for `dots` spinner type
const spinnerInterval = 80;
let linesToClear = 0;

function printBuildStages(buildStatus, stages, isAnyStagesInProgress) {
  process.stdout.write(eraseLines(linesToClear));

  const list = [];
  let status = null;
  let icon = '';

  stages.forEach(stage => {
    status = BUILD_STATUS[stage.status];
    if (status) {
      icon =
        stage.status === STATUS_TYPES.inProgress
          ? stageSpinner.frame()
          : `${status.icon} `;
    }

    list.push(`${icon}${stage.name} ${gray(`(Duration ${formatMs(stage.duration)})`)}`);
  });

  process.stdout.write(list.join('\n'));
  linesToClear = list.length;

  // build is in-progress, but there are no in-progress stages. So display a spinner for better UX.
  if (buildStatus === STATUS_TYPES.inProgress && !isAnyStagesInProgress) {
    if (stages.length === 0) {
      process.stdout.write(`${loadingSpinner.frame()}`);
      linesToClear = 1;
      return;
    }

    process.stdout.write(`\n${loadingSpinner.frame()}`);
    linesToClear += 1;
  }
}

module.exports = async function reportBuildStages(branchName, queuedItemNumber, spinner) {
  try {
    const retryUntilBuildFound = true;
    const queueItem = await getQueueItem(queuedItemNumber, retryUntilBuildFound);

    if (queueItem.cancelled) {
      throw new WatchError(
        'Build has been cancelled. Unable to report the build stages.'
      );
    }

    const buildId = queueItem.executable.number;
    const stream = createBuildStageStream(branchName, buildId);
    let timer = null;

    stream.on('data', ({ status, stages }) => {
      if (spinner.isSpinning) {
        spinner.stop();
        hideCursor();
        console.log(yellow('Build Stages'));
      }

      // When new data arrived, cancel the previously scheduled timer.
      if (timer) clearInterval(timer);

      const isAnyStagesInProgress = stages.some(
        stage => stage.status === STATUS_TYPES.inProgress
      );
      printBuildStages(status, stages, isAnyStagesInProgress);

      // Reprint the old stages to show the loading animation
      timer = setInterval(() => {
        printBuildStages(status, stages, isAnyStagesInProgress);
      }, spinnerInterval);
    });

    stream.on('end', (buildStatus = null) => {
      if (spinner.isSpinning) spinner.stop();
      if (timer) clearInterval(timer);

      printFinalStatus(buildStatus);
    });

    stream.on('error', error => {
      if (timer) clearInterval(timer);

      process.stdout.write('\n\n');
      spinner.fail('An error occurred while retrieving build stages');
      debug(error);
    });
  } catch (error) {
    if (error.name === ERROR_TYPE.watchError) throw error;

    throw new WatchError('An error occurred while retrieving build stages', error);
  }
};

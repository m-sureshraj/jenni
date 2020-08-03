const ora = require('ora');
const { red, yellow, gray } = require('kleur');
const ago = require('s-ago');

const { getCurrentBranchName } = require('../lib/git-cmd');
const { debug, logNetworkErrors } = require('../lib/log');
const { getRunningBuilds, createProgressiveTextStream } = require('../lib/jenkins');
const { askToSelectARunningBuild } = require('../lib/prompt');

const spinner = ora();
const LAST_BUILD = 'lastBuild';

function mapRunningBuilds(runningBuilds) {
  let title = '';

  return runningBuilds.map(({ id, name, startTimeMillis }) => {
    title = name;

    if (startTimeMillis) {
      title += gray(` (Started ${ago(new Date(startTimeMillis), 'hour')})`);
    }

    return {
      value: id,
      title,
    };
  });
}

async function selectBuildIdFromRunningBuilds(runningBuilds = []) {
  // No running builds, so print the last build
  if (runningBuilds.length === 0) return LAST_BUILD;

  if (runningBuilds.length === 1) return runningBuilds[0].id;

  // Job has multiple running builds, so ask the user to select a build.
  const { selectedBuildId } = await askToSelectARunningBuild(
    mapRunningBuilds(runningBuilds)
  );

  return selectedBuildId;
}

function printStatus(buildId) {
  if (buildId === LAST_BUILD) {
    process.stdout.write(yellow('Latest build console\n\n'));
    return;
  }

  process.stdout.write(yellow(`Build (#${buildId}) console\n\n`));
}

module.exports = async function printConsole(options = {}) {
  const branchName = getCurrentBranchName();
  let buildId = options.build;
  debug(`Branch name: ${branchName}, build id: ${buildId || 'not defined'}`);

  if (!buildId) {
    debug('Build id not defined, so attempting to select a build id from running builds');

    try {
      spinner.start();
      const runningBuilds = await getRunningBuilds(branchName);
      spinner.stop();

      const selectedBuildId = await selectBuildIdFromRunningBuilds(runningBuilds);

      // user canceled the prompt
      if (!selectedBuildId) {
        process.stdout.write(red('Aborted\n'));
        process.exit();
      }

      buildId = selectedBuildId;
      debug(`Selected build id: ${buildId}`);
    } catch (error) {
      spinner.fail(error.message);
      logNetworkErrors(error);
      process.exit();
    }
  }

  try {
    printStatus(buildId);
    spinner.start();
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
      spinner.fail('An error occurred while retrieving build console');
      debug(error);
    });
  } catch (error) {
    spinner.fail(error.message);
    debug(error);
  }
};

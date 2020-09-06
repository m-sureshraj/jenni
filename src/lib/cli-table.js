const Table = require('cli-table');
const { gray } = require('kleur');

const { BUILD_STATUS, STATUS_TYPES } = require('./build-status');
const { formatTimestampToDate, formatMs } = require('./util');
const { debug } = require('./log');

function printBuildDuration(build) {
  if (build.status !== STATUS_TYPES.inProgress) {
    return gray(formatMs(build.durationMillis));
  }

  // if there any remaining time info, it will be added under __meta__ property
  if (!build.__meta__) return gray('N/A');

  return `Remaining time: ${build.__meta__.remainingTime}`;
}

function printBuildStartedTime(build) {
  if (build.status === STATUS_TYPES.notExecuted) return gray('-');

  if (build.status !== STATUS_TYPES.inProgress || !build.__meta__) {
    return gray(formatTimestampToDate(build.startTimeMillis));
  }

  return `${build.__meta__.startedTime} ago`;
}

exports.printBuildHistory = function(builds = []) {
  const table = new Table({
    head: ['', 'Name', 'Status', 'Started Time', 'Duration'],
    colWidths: [4, 10, 16, 28, 32],
    colAligns: ['middle'],
    style: {
      head: ['cyan'],
      compact: true,
    },
  });
  let status = null;

  // fixme: `build.name` should be a link but cli-table not rendering terminal links properly.
  // https://github.com/Automattic/cli-table/issues/118

  builds.forEach(build => {
    status = BUILD_STATUS[build.status];
    if (!status) status = { icon: '', label: build.status };

    table.push([
      status.icon,
      build.name,
      status.label,
      printBuildStartedTime(build),
      printBuildDuration(build),
    ]);
  });

  console.log(table.toString());
};

exports.printConfig = function(config) {
  const table = new Table({
    style: {
      head: ['cyan'],
    },
  });

  table.push(
    { Username: config.username },
    { 'API Token': config.token },
    { 'Base URL': config.url }
  );

  if (config.job) table.push({ Job: config.job.name });

  console.log(table.toString());
  debug(config);
};

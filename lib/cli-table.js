const Table = require('cli-table');
const { gray } = require('kleur');
const buildStatus = require('./build-status');
const { formatTimestampToDate, formatMs } = require('./util');

exports.printBuildHistory = function(builds = [], jobLink) {
  const table = new Table({
    head: ['', 'Name', 'Status', 'Started Time', 'Duration'],
    colWidths: [4, 10, 16, 28, 28],
    colAligns: ['middle'],
    style: {
      head: ['cyan'],
      compact: true
    }
  });
  let status = null;

  // fixme: `build.name` should be a link but cli-table not rendering terminal links properly.
  // https://github.com/Automattic/cli-table/issues/118

  builds.forEach(build => {
    status = buildStatus[build.status];

    table.push([
      status.icon,
      build.name,
      status.label,
      gray(build.status === 'NOT_EXECUTED' ? '-' : formatTimestampToDate(build.startTimeMillis)),
      build.status === 'IN_PROGRESS' ? '' : gray(formatMs(build.durationMillis))
    ]);
  });

  console.log(table.toString());
};

exports.printConfig = function(config) {
  const table = new Table({
    style: {
      head: ['cyan']
    }
  });

  table.push(
    { 'Username': config.username },
    { 'API Token': config.token },
    { 'URL': config.url }
  );

  if (config.job) table.push({ 'Base Job': config.job });

  console.log(table.toString());
};

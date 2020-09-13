#! /usr/bin/env node

const jen = require('commander');

const pkg = require('../../package.json');
const run = require('../index');
const { debug } = require('../lib/log');
const { COMMAND } = require('../config');

const args = process.argv.slice(2);

// Why manual check instead of `jen.debug`?
// Because we have to enable the debug before initializing jen: `jen.parse(process.argv);`
if (args.includes('-d') || args.includes('--debug')) {
  process.env.DEBUG_JEN = true;
}

debug(`Running jen v${pkg.version}`);

jen
  .version(pkg.version, '-v, --version')
  .description('Jenkins personal assistant')
  .option('-d, --debug', 'Enable debug mode');

jen
  .command(COMMAND.init)
  .alias('i')
  .description('Initialize jen')
  .action(() => {
    run(COMMAND.init);
  });

jen
  .command(COMMAND.status)
  .alias('s')
  .description('Print branch build status')
  .action(() => {
    run(COMMAND.status);
  });

jen
  .command(COMMAND.open)
  .alias('o')
  .description('Open jenkins build in browser')
  .action(option => {
    run(COMMAND.open, option);
  });

jen
  .command(COMMAND.build)
  .alias('b')
  .option('-w, --watch', 'Watch build console output')
  .option('-s, --stage', 'View build stages')
  .description('Trigger a new build')
  .action(option => {
    run(COMMAND.build, option);
  });

jen
  .command(COMMAND.console)
  .alias('co')
  .description('Show console output')
  .option('-b, --build <build-id>', 'Build id')
  .action(options => {
    run(COMMAND.console, options);
  });

jen
  .command(COMMAND.config)
  .alias('c')
  .description('Show or Update repository configuration')
  .option('-n, --username <username>', 'Jenkins username')
  .option('-t, --token <token>', 'Jenkins api-token')
  .option('-u, --url <url>', 'Jenkins base URL')
  .option('--job-name <jobname>', 'Job name')
  .option('--job-path <jobpath>', 'Job path')
  .option('--job-type <jobtype>', 'Job type')
  .action(options => {
    run(COMMAND.config, options);
  });

// print usage info if argument is empty.
if (!args.length) {
  jen.outputHelp();
  process.exit(0);
}

jen.parse(process.argv);

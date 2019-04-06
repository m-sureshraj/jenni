#! /usr/bin/env node

const jen = require('commander');
const pkg = require('../package.json');
const { init, status, config, open } = require('../src');
const { debug } = require('../lib/log');

debug(`jen v${pkg.version}`);

jen
  .version(pkg.version, '-v, --version')
  .description('Jenkins personal assistant');

jen
  .command('init')
  .description('Initialize jen')
  .action(() => {
    debug('Executing `init` command');
    init();
  });

jen
  .command('status')
  .alias('s')
  .description('Print branch build status')
  .action(() => {
    debug('Executing `status` command');
    status();
  });

jen
  .command('open')
  .alias('o')
  .description('Open jenkins build in the browser')
  .action(option => {
    debug('Executing `open` command');
    open(option);
  });

jen
  .command('config')
  .alias('c')
  .description('Show repository jen configuration')
  .option('-n, --username <username>', 'Jenkins username')
  .option('-t, --token <token>', 'Jenkins api-token')
  .option('-u, --url <url>', 'Jenkins url')
  .option('-j, --job <job>', 'Current repo base job')
  .action(options => {
    debug('Executing `config` command');
    config(options);
  });

// print usage info if argument is empty.
if (!process.argv.slice(2).length) {
  jen.outputHelp();
  process.exit(0);
}

jen.parse(process.argv);

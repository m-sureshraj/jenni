const ora = require('ora');

// pump is only necessary for Node.js 8.x or earlier (ATM Jenni requires 8.12).
// For Node.js 10.x or later version we can use Native `stream.pipeline` method
const pump = require('pump');

const { getCurrentBranchName } = require('../lib/git-cmd');
const { debug } = require('../lib/log');
const { getConsoleText } = require('../lib/jenkins');

const spinner = ora();

module.exports = async function buildConsole(options = {}) {
  const branchName = getCurrentBranchName();
  const buildId = options.build;
  const output = options.writeTo || process.stdout;

  debug(`Branch name: ${branchName}, build: ${buildId || 'not defined'}`);

  try {
    spinner.start();
    const consoleStream = await getConsoleText(branchName, buildId);

    spinner.stop();
    pump(consoleStream, output, error => {
      if (error) {
        debug('An error occurred while streaming build console');
        console.log(error);
      }
    });
  } catch (error) {
    spinner.fail(error.message);
    debug(error);
  }
};

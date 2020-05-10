const stream = require('stream');
const { promisify } = require('util');

const { red } = require('kleur');
const { getCurrentBranchName } = require('../lib/git-cmd');
const { debug } = require('../lib/log');
const { getConsoleText } = require('../lib/jenkins');

const pipeline = promisify(stream.pipeline);

module.exports = async function output(options = {}) {
  const branchName = getCurrentBranchName();
  debug(`Branch name: ${branchName}, build: ${options.build || 'not defined'}`);

  try {
    return pipeline(
      await getConsoleText(branchName, options.build),
      options.writeTo || process.stdout
    );
  } catch (err) {
    console.log(red(err));
  }
};

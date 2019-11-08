const Conf = require('conf');
const { yellow, blue, bold } = require('kleur');

const { isGitRepository, getGitRootDirPath } = require('../lib/git-cmd');
const { COMMAND } = require('../config');
const { debug } = require('../lib/log');
const commands = require('./commands');

const store = new Conf();

module.exports = function run(cmd, options) {
  // not a git repository
  if (!isGitRepository()) {
    console.log(
      yellow('jen has no power here! Please execute jen commands inside the git dir.')
    );
    process.exit();
  }

  // for other than `init` cmd make sure jen is initialized
  if (cmd !== COMMAND.init && !store.has(getGitRootDirPath())) {
    console.log(
      yellow(
        `Could not find the config! Introduce jen to your project via ${bold(
          blue('> jen init')
        )}`
      )
    );
    process.exit();
  }

  debug(`Executing \`${cmd}\` command`);
  commands[cmd](options);
};

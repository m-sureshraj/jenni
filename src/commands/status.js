const Conf = require('conf');
const ora = require('ora');
const { yellow, bold, blue, gray } = require('kleur');
const terminalLink = require('terminal-link');
const { getCurrentBranchName, isGitRepository, getGitRootDirPath } = require('../../lib/git-cmd');
const { getBranchBuildHistory, getBranchJobLink } = require('../../lib/jenkins');
const { printBuildHistory } = require('../../lib/cli-table');
const { debug } = require('../../lib/log');

const spinner = ora();
const store = new Conf();

module.exports = async function showBuildStatus() {
  // not a git repository
  if (!isGitRepository()) {
    console.log(yellow('jen has no power here! Please execute jen commands inside the git dir.'));
    process.exit();
  }

  // if we couldn't find the config then jen not yet initialized
  if (!store.get(getGitRootDirPath())) {
    console.log(yellow(`Could not find the config! Introduce jen to your project via ${bold(blue('> jen init'))}`));
    process.exit();
  }

  const branchName = getCurrentBranchName();

  try {
    spinner.start();
    const builds = await getBranchBuildHistory(branchName);
    const jobLink = getBranchJobLink(branchName);
    spinner.stop();

    // title
    console.log(yellow('Build history of - ' + terminalLink(branchName, jobLink)));

    if (!builds.length) {
      console.log(gray('No build exists for this branch!'));
      process.exit();
    }

    printBuildHistory(builds, jobLink);
    console.log(`${gray('Last ' + builds.length + ' build results.')}`);
  } catch (err) {
    spinner.stop();
    console.log(gray(err.statusMessage));
    debug(err);
  }
};

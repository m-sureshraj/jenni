const Conf = require('conf');
const { blue, bold, yellow, gray, red, green } = require('kleur');
const { isGitRepository, getGitRootDirPath } = require('../../lib/git-cmd');
const { printConfig } = require('../../lib/cli-table');
const { isValidUrl } = require('../../lib/util');
const { debug } = require('../../lib/log');

const store = new Conf();

function updateStoreWithNewConfiguration(storeKey, oldConfig, updatedConfig) {
  debug({ storeKey, oldConfig, updatedConfig });
  let value = '';

  // validation
  Object.entries(updatedConfig).forEach(([k, v]) => {
    value = v.trim();

    if (k === 'url') {
      if (!isValidUrl(value)) {
        console.log(red('Invalid URL ') + v);
        process.exit();
      }
    }

    if (!value) {
      console.log(red('Argument ') + yellow(`"${k}"`) + red(' is invalid ') + v);
      process.exit();
    }

    updatedConfig[k] = value;
  });

  const mergedConfig = Object.assign({}, oldConfig, updatedConfig);
  store.set(storeKey, mergedConfig);

  console.log(green('Configuration successfully updated'));
  printConfig(mergedConfig);
}

module.exports = async function config(options = {}) {
  // not a git repository
  if (!isGitRepository()) {
    console.log(yellow('jen has no power here! Please execute jen commands inside the git dir.'));
    process.exit();
  }

  const gitRootPath = getGitRootDirPath();

  if (!store.has(gitRootPath)) {
    console.log(yellow(`Config is empty! Introduce jen to your project via ${bold(blue('> jen init'))}`));
    return;
  }

  const oldConfig = store.get(gitRootPath);
  const { username, token, url, job } = options;
  const updatedConfig = {
    ...username && { username },
    ...token && { token },
    ...url && { url },
    ...job && { job }
  };

  // if options passed update configuration
  if (Object.keys(updatedConfig).length) {
    debug('updating old configuration');
    updateStoreWithNewConfiguration(gitRootPath, oldConfig, updatedConfig);
    return;
  }

  // else just print the current config
  printConfig(oldConfig);
  console.log(gray('Config path - ' + store.path));
};

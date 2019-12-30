const path = require('path');

const Conf = require('conf');
const { yellow, gray, red, green } = require('kleur');

const { getGitRootDirPath } = require('../lib/git-cmd');
const { printConfig } = require('../lib/cli-table');
const { isValidUrl } = require('../lib/util');
const { debug } = require('../lib/log');

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
  const gitRootPath = getGitRootDirPath();
  const oldConfig = store.get(gitRootPath);
  const { username, token, url, job } = options;
  const updatedConfig = {
    ...(username && { username }),
    ...(token && { token }),
    ...(url && { url }),
    ...(job && { job }),
  };

  // if options passed update configuration
  if (Object.keys(updatedConfig).length) {
    debug('updating old configuration');
    updateStoreWithNewConfiguration(gitRootPath, oldConfig, updatedConfig);
    return;
  }

  // else just print the current config
  console.log(yellow(`Configuration of ${path.basename(gitRootPath)}`));
  printConfig(oldConfig);
  console.log(gray('Config path - ' + store.path));
};

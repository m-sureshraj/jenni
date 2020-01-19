const path = require('path');

const Conf = require('conf');
const { yellow, gray, green } = require('kleur');

const { getGitRootDirPath } = require('../lib/git-cmd');
const { printConfig } = require('../lib/cli-table');
const { isValidUrl } = require('../lib/util');
const { debug } = require('../lib/log');

const store = new Conf();

function validateConfiguration(config) {
  let value = '';

  Object.entries(config).forEach(([k, v]) => {
    if (typeof v === 'object') {
      validateConfiguration(v);
    } else {
      value = v.trim();

      if (k === 'url') {
        if (!isValidUrl(value)) {
          console.log(`Invalid URL: ${v}`);
          process.exit();
        }
      }

      if (!value) {
        console.log(`Argument "${yellow(k)}" value is invalid ${v}`);
        process.exit();
      }

      config[k] = value;
    }
  });
}

function updateStoreWithNewConfiguration(storeKey, oldConfig, updatedConfig) {
  debug({ storeKey, oldConfig, updatedConfig });
  validateConfiguration(updatedConfig);
  const mergedConfig = Object.assign({}, oldConfig, {
    ...updatedConfig,
    job: Object.assign({}, oldConfig.job, updatedConfig.job),
  });

  store.set(storeKey, mergedConfig);
  console.log(green('Configuration successfully updated'));
  printConfig(mergedConfig);
}

module.exports = function config(options = {}) {
  const gitRootPath = getGitRootDirPath();
  const oldConfig = store.get(gitRootPath);
  const { username, token, url, jobName, jobPath, jobType } = options;
  const job = {
    ...(jobName && { name: jobName }),
    ...(jobPath && { path: jobPath }),
    ...(jobType && { type: jobType }),
  };
  const updatedConfig = {
    ...(username && { username }),
    ...(token && { token }),
    ...(url && { url }),
    ...(Object.keys(job).length && { job }),
  };

  if (Object.keys(updatedConfig).length) {
    debug('updating old configuration');
    updateStoreWithNewConfiguration(gitRootPath, oldConfig, updatedConfig);
    return;
  }

  // print the current config
  console.log(yellow(`Configuration of ${path.basename(gitRootPath)}`));
  printConfig(oldConfig);
  console.log(gray(`Config path - ${store.path}`));
};

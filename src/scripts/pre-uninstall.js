const fs = require('fs');
const path = require('path');

const Conf = require('conf');
const { red, yellow, dim, cyan } = require('kleur');

const { getDeleteConfigConfirmation } = require('../lib/prompt');

function printWarningMessage() {
  const warningMessage = [
    cyan('App configuration exists!'),
    dim(
      'Please note if you delete the app configuration, you will lose previously initialized project settings.'
    ),
    dim(
      'That means if you install Jenni again, you have to reinitialize it on your every project again.'
    ),
  ].join('\n');

  console.log(`${warningMessage}\n`);
}

async function deleteConfig(env = process.env) {
  const argv = env.npm_config_argv || '{}';
  const { original = [] } = JSON.parse(argv);

  // The `preuninstall` hook also runs when the package gets updated to a new version (i.e. npm update -g jenni).
  // But we should Delete the config only when Jenni gets uninstalled explicitly. (i.e. npm uninstall -g jenni)

  if (!original.includes('uninstall')) return;

  // Initializing `new Conf()` will create an empty directory.
  const store = new Conf();
  const configFilePath = store.path;
  const configDirPath = path.dirname(configFilePath);

  try {
    const isConfigExists = fs.existsSync(configFilePath);
    if (isConfigExists) {
      printWarningMessage();

      const { confirmation } = await getDeleteConfigConfirmation();
      if (!confirmation) {
        console.log(
          dim('\nWise choice! We will keep the app configuration for future use.')
        );
        return;
      }

      fs.unlinkSync(configFilePath);
    }

    fs.rmdirSync(configDirPath);

    if (isConfigExists) {
      console.log(dim('\nThe app configuration has been successfully deleted.'));
    }
  } catch (err) {
    console.log(red('\nFailed to delete the app configuration.'));
    console.log(`Manually delete the following directory: ${yellow(configDirPath)}\n`);
  }
}

if (require.main === module) {
  // execute the fn only if script called from the command line. i.e. node <path/to/file>
  deleteConfig().catch(error => {
    console.log(error);
  });
} else {
  // for testing purpose export the fn
  module.exports = deleteConfig;
}

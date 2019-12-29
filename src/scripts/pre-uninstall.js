const fs = require('fs');
const path = require('path');

const Conf = require('conf');
const { red, yellow } = require('kleur');

// Initializing `new Conf()` will create a empty directory.
const store = new Conf();
const configFilePath = store.path;
const configDirPath = path.dirname(configFilePath);

function removeConfigDir() {
  try {
    if (fs.existsSync(configFilePath)) fs.unlinkSync(configFilePath);

    fs.rmdirSync(configDirPath);
  } catch (err) {
    console.log(red('Failed to remove local configuration file.'));
    console.log(`Delete the following directory ${yellow(configDirPath)}`);
  }
}

if (require.main === module) {
  // execute the fn only if script called from the command line. e.g. node <path/to/file>
  removeConfigDir();
} else {
  // for testing purpose export the fn
  module.exports = removeConfigDir;
}

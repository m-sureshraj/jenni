const { gray, red } = require('kleur');

const isDebuggingEnabled = process.env.DEBUG_JEN;

function debug(msg) {
  isDebuggingEnabled && console.log(msg);
}

function logNetworkErrors(err) {
  if (err.code === 'ETIMEDOUT') {
    console.log(red('Request timeout error!'));
    debug(err);
    return;
  }

  console.log('\n' + gray(err.statusMessage || err.name));
  debug(err);
}

module.exports = {
  debug,
  logNetworkErrors
};

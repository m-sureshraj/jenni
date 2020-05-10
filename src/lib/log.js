const { red } = require('kleur');

function debug(msg) {
  process.env.DEBUG_JEN && console.log(msg);
}

function logNetworkErrors(err = {}) {
  if (err.code === 'ETIMEDOUT') {
    console.log(red('Request timeout error!'));
    debug(err);
    return;
  }

  console.log(red(err.statusMessage || err.message || err.name));
  debug(err);
}

module.exports = {
  debug,
  logNetworkErrors,
};

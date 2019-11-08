const { COMMAND } = require('../../config');

module.exports = {
  [COMMAND.init]: require('./init'),
  [COMMAND.status]: require('./status'),
  [COMMAND.config]: require('./config'),
  [COMMAND.open]: require('./open'),
};

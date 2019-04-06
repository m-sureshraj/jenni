const isDebuggingEnabled = process.env.DEBUG_JEN;

exports.debug = function(msg) {
  isDebuggingEnabled && console.log(msg);
};

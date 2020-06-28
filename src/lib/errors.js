const ERROR_TYPE = {
  watchError: 'WatchError',
};

class WatchError extends Error {
  constructor(message, error = {}) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = ERROR_TYPE.watchError;

    // Following stacktrace manipulation logic copied from https://github.com/sindresorhus/got/blob/master/source/core/index.ts#L392
    // Recover the original stacktrace
    if (typeof error.stack !== 'undefined') {
      const indexOfMessage = this.stack.indexOf(this.message) + this.message.length;
      const thisStackTrace = this.stack
        .slice(indexOfMessage)
        .split('\n')
        .reverse();
      const errorStackTrace = error.stack
        .slice(error.stack.indexOf(error.message) + error.message.length)
        .split('\n')
        .reverse();

      // Remove duplicated traces
      while (errorStackTrace.length !== 0 && errorStackTrace[0] === thisStackTrace[0]) {
        thisStackTrace.shift();
      }

      this.stack = `${this.stack.slice(0, indexOfMessage)}${thisStackTrace
        .reverse()
        .join('\n')}${errorStackTrace.reverse().join('\n')}`;
    }
  }
}

module.exports = {
  WatchError,
  ERROR_TYPE,
};

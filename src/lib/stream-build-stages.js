const EventEmitter = require('events');

const got = require('got');

const { debug } = require('./log');
const { STATUS_TYPES } = require('./build-status');

const client = got.extend({ timeout: 3000 });

class StreamBuildStages extends EventEmitter {
  constructor({
    url,
    maxRetryAttempts = 10,
    maxRetryAttemptsOnNetworkFailure = 3,
    reFetchStagesAfterMS = 2000,
    waitForBuildToStart = 1000,
  }) {
    super();

    this.url = url;
    this.reFetchStagesAfterMS = reFetchStagesAfterMS;

    // To retry when a build has not yet started
    this.waitForBuildToStart = waitForBuildToStart;
    this.maxRetryAttempts = maxRetryAttempts;
    this.attempts = 0;

    // To recover from intermediate network failures
    this.maxRetryAttemptsOnNetworkFailure = maxRetryAttemptsOnNetworkFailure;
    this.networkFailureAttempts = 0;

    process.nextTick(async () => {
      await this.fetchBuildStages();
    });
  }

  async fetchBuildStages() {
    try {
      const { body: build } = await client.get(this.url, { json: true });

      // After a successful fetch, if there are any network failure attempts, reset it.
      if (this.networkFailureAttempts) this.networkFailureAttempts = 0;

      switch (build.status) {
        case STATUS_TYPES.notExecuted:
          this.retry(build.status);
          break;

        case STATUS_TYPES.inProgress:
          this.emit('data', this.mapBuild(build));

          setTimeout(() => {
            this.fetchBuildStages();
          }, this.reFetchStagesAfterMS);
          break;

        case STATUS_TYPES.failed:
        case STATUS_TYPES.aborted:
        case STATUS_TYPES.success:
        case STATUS_TYPES.unstable:
          this.emit('data', this.mapBuild(build));
          this.emit('end', build.status);
          break;

        default:
          this.emit('end', null);
      }
    } catch (error) {
      this.retryOnNetworkFailure(error);
    }
  }

  retry(status) {
    if (this.attempts >= this.maxRetryAttempts) {
      debug('Maximum retry attempts reached.');
      this.emit('end', status);
      return;
    }

    this.attempts++;
    const wait = this.waitForBuildToStart * this.attempts;
    debug(`The build has not yet started. Scheduling a re-fetch after: ${wait}ms`);

    setTimeout(() => {
      this.fetchBuildStages();
    }, wait);
  }

  retryOnNetworkFailure(error) {
    if (this.networkFailureAttempts >= this.maxRetryAttemptsOnNetworkFailure) {
      debug('Maximum network failure retry attempts reached.');
      this.emit('error', error);
      return;
    }

    this.networkFailureAttempts++;
    debug(
      `Network error occurred. Scheduling a re-fetch after: ${
        this.reFetchStagesAfterMS
      }ms`
    );

    setTimeout(() => {
      this.fetchBuildStages();
    }, this.reFetchStagesAfterMS);
  }

  mapBuild(build) {
    return {
      status: build.status,
      stages: build.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        status: stage.status,
        duration: stage.durationMillis,
      })),
    };
  }
}

module.exports = StreamBuildStages;

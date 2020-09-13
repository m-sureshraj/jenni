const nock = require('nock');

const { STATUS_TYPES } = require('../build-status');
const StreamBuildStages = require('../stream-build-stages');

describe('StreamBuildStages', () => {
  const host = 'http://localhost:3000';
  const path = '/api/logs';
  const url = `${host}${path}`;
  const mockServer = nock(host);
  const buildStagesOptions = {
    url,
    maxRetryAttempts: 2,
    reFetchStagesAfterMS: 10,
    waitForBuildToStart: 10,
  };

  const stageOneStub = {
    id: 100,
    name: 'foo',
    durationMillis: 1000,
    status: STATUS_TYPES.inProgress,
  };
  const stageTwoStub = {
    id: 200,
    name: 'bar',
    durationMillis: 2000,
    status: STATUS_TYPES.inProgress,
  };

  afterEach(nock.cleanAll);

  it('should end the stream when max retry attempts reached for non executed builds', done => {
    const scope = mockServer
      .persist()
      .get(path)
      .reply(200, { status: STATUS_TYPES.notExecuted });

    const stream = new StreamBuildStages(buildStagesOptions);

    let counter = 0;
    stream.on('data', () => {
      counter++;
    });

    stream.on('end', status => {
      expect(status).toBe(STATUS_TYPES.notExecuted);
      expect(counter).toBe(0);

      scope.persist(false);
      done();
    });
  });

  it('should emit build stages while the build is in progress', done => {
    mockServer
      .get(path) // 1st request, build has not yet started
      .reply(200, { status: STATUS_TYPES.notExecuted })
      .get(path) // 2nd request, build is in-progress
      .reply(200, {
        status: STATUS_TYPES.inProgress,
        stages: [stageOneStub],
      })
      .get(path) // 3rd request, build is in-progress
      .reply(200, {
        status: STATUS_TYPES.inProgress,
        stages: [{ ...stageOneStub, status: STATUS_TYPES.success }, stageTwoStub],
      })
      .get(path) // 4th request, build finished
      .reply(200, {
        status: STATUS_TYPES.success,
        stages: [
          { ...stageOneStub, status: STATUS_TYPES.success },
          { ...stageTwoStub, status: STATUS_TYPES.success },
        ],
      });

    const stream = new StreamBuildStages(buildStagesOptions);

    const buildStages = [];
    stream.on('data', build => {
      buildStages.push(build);
    });

    stream.on('end', status => {
      expect(status).toBe(STATUS_TYPES.success);
      expect(buildStages).toHaveLength(3);
      expect(buildStages.pop()).toStrictEqual({
        status: STATUS_TYPES.success,
        stages: [
          {
            id: stageOneStub.id,
            name: stageOneStub.name,
            duration: stageOneStub.durationMillis,
            status: STATUS_TYPES.success,
          },
          {
            id: stageTwoStub.id,
            name: stageTwoStub.name,
            duration: stageTwoStub.durationMillis,
            status: STATUS_TYPES.success,
          },
        ],
      });
      done();
    });
  });

  it("should retry the fetch if it's encountered network failures", done => {
    mockServer
      .get(path)
      .reply(200, {
        status: STATUS_TYPES.inProgress,
        stages: [stageOneStub],
      })
      .get(path)
      .replyWithError('boom!')
      .get(path)
      .reply(200, {
        status: STATUS_TYPES.success,
        stages: [
          {
            ...stageOneStub,
            status: STATUS_TYPES.success,
          },
        ],
      });

    const stream = new StreamBuildStages(buildStagesOptions);

    const data = [];
    stream.on('data', build => {
      data.push(build);
    });

    stream.on('end', status => {
      expect(status).toBe(STATUS_TYPES.success);
      expect(data).toHaveLength(2);
      done();
    });
  });

  it('should end the stream when max network failure attempts reached', done => {
    mockServer
      .get(path)
      .reply(200, {
        status: STATUS_TYPES.inProgress,
        stages: [stageOneStub],
      })
      .get(path)
      .replyWithError('boom!')
      .get(path)
      .replyWithError('boom!')
      .get(path)
      .replyWithError('boom!')
      .get(path)
      .replyWithError('boom!');

    const stream = new StreamBuildStages(buildStagesOptions);

    const data = [];
    stream.on('data', build => {
      data.push(build);
    });

    stream.on('error', error => {
      expect(error.message).toBe('boom!');
      expect(data).toHaveLength(1);
      done();
    });
  });

  it("should end the stream if it's received unknown build status", done => {
    mockServer.get(path).reply(200, {
      status: 'FOO_BAR_BAZ',
      stages: [],
    });

    const stream = new StreamBuildStages(buildStagesOptions);

    const data = [];
    stream.on('data', build => {
      data.push(build);
    });

    stream.on('end', status => {
      expect(status).toBeNull();
      expect(data).toHaveLength(0);
      done();
    });
  });
});

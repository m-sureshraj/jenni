const EventEmitter = require('events');
const { parse } = require('url');

const nock = require('nock');
const Conf = require('conf');

const {
  getJobs,
  getJobLink,
  constructJobTitle,
  getBranchBuildHistory,
  triggerNewBuild,
  getRunningBuilds,
  getConsoleText,
  getQueueItem,
  createProgressiveTextStream,
} = require('../jenkins');
const { getGitRootDirPath } = require('../git-cmd');
const { JOB_TYPE } = require('../../config');
const { streamToString } = require('../../test-helper');

jest.mock('../git-cmd');
jest.mock('conf');

const EXTENDED_TIMEOUT = 8000;

const jenkinsCredentials = {
  username: 'bingo',
  token: 'abc468&*&$$--rtu',
  url: 'http://localhost:3000',
};

const gitRootDirPath = 'some/path/to/git';
beforeAll(() => {
  getGitRootDirPath.mockImplementation(() => gitRootDirPath);
});

const jobConfigPath = '/api/no/where';
const jobConfigName = 'this is fake job';
let jobConfig;
beforeEach(() => {
  jobConfig = {
    name: jobConfigName,
    path: jobConfigPath,
    type: JOB_TYPE.WorkflowMultiBranchProject,
  };
  const projectConfig = new Map();
  projectConfig.set(gitRootDirPath, {
    ...jenkinsCredentials,
    job: jobConfig,
  });
  Conf.prototype.get.mockImplementation(key => projectConfig.get(key));
});

describe('getJobs', () => {
  const mockedJobs = [
    {
      _class: 'com.cloudbees.hudson.plugins.folder.Folder',
      displayName: 'sample folder',
      name: 'folder project',
      url: 'http://localhost:8080/job/folder%20project/',
      jobs: [
        {
          _class: 'com.cloudbees.hudson.plugins.folder.Folder',
          displayName: 'one more folder',
          name: 'one more folder',
          url: 'http://localhost:8080/job/folder%20project/job/one%20more%20folder/',
          jobs: [
            {
              _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
              name: 'nested',
              url:
                'http://localhost:8080/job/folder%20project/job/one%20more%20folder/job/nested/',
            },
          ],
        },
        {
          _class: 'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject',
          displayName: 'Multibranch Pipeline inside the dir',
          name: 'sample project inside the dir',
          url:
            'http://localhost:8080/job/folder%20project/job/sample%20project%20inside%20the%20dir/',
          jobs: [
            {
              _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
              name: 'bye-feature',
              url:
                'http://localhost:8080/job/folder%20project/job/sample%20project%20inside%20the%20dir/job/bye-feature/',
            },
            {
              _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
              name: 'master',
              url:
                'http://localhost:8080/job/folder%20project/job/sample%20project%20inside%20the%20dir/job/master/',
            },
          ],
        },
      ],
    },
    {
      name: 'Github type jenkins project',
      url: 'http://localhost:8080/job/Github%20type%20jenkins%20project/',
      _class: 'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject',
      displayName: 'one',
    },
    {
      name: 'Mul',
      url: 'http://localhost:8080/job/Mul/',
      _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
      displayName: 'two',
    },
  ];
  const pick = 'url,name,displayName';
  const qs = `tree=jobs[${pick},jobs[${pick},jobs[${pick}]]]`;
  const url = `/api/json?${qs}`;

  let mockServer;
  beforeEach(() => {
    mockServer = nock(jenkinsCredentials.url);
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('should fetch Jenkins base jobs', async () => {
    mockServer.get(url).reply(200, { jobs: mockedJobs });

    const jobs = await getJobs(jenkinsCredentials);
    const expectedResult = [
      {
        name: 'one',
        url: 'http://localhost:8080/job/Github%20type%20jenkins%20project/',
        type: 'WorkflowMultiBranchProject',
      },
      {
        name: 'two',
        url: 'http://localhost:8080/job/Mul/',
        type: 'WorkflowJob',
      },
      {
        name: 'sample folder → Multibranch Pipeline inside the dir',
        url:
          'http://localhost:8080/job/folder%20project/job/sample%20project%20inside%20the%20dir/',
        type: 'WorkflowMultiBranchProject',
      },
      {
        name: 'sample folder → one more folder → nested',
        url:
          'http://localhost:8080/job/folder%20project/job/one%20more%20folder/job/nested/',
        type: 'WorkflowJob',
      },
    ];

    expect(jobs).toEqual(expectedResult);
  });

  it('should throw an error when request fails', async () => {
    mockServer.get(url).replyWithError('some error');

    await expect(getJobs(jenkinsCredentials)).rejects.toThrow();
  });
});

describe('getJobLink', () => {
  it('should return the job link', () => {
    const branchName = 'feature-x';
    const jobLink = getJobLink(branchName);
    const expectedLink = `${jenkinsCredentials.url}${jobConfig.path}/job/${branchName}`;

    expect(jobLink).toBe(expectedLink);
  });

  it('should throw an error for invalid job type', () => {
    jobConfig.type = 'Invalid job';
    const branchName = 'feature-x';

    expect(() => {
      getJobLink(branchName);
    }).toThrow(`Unsupported job type: ${jobConfig.type}`);
  });
});

describe('constructJobTitle', () => {
  it(`should construct the correct job title for ${JOB_TYPE.WorkflowJob}`, () => {
    jobConfig.type = JOB_TYPE.WorkflowJob;
    const title = constructJobTitle();

    expect(title).toBe(jobConfig.name);
  });

  it(`should construct the correct job title for ${
    JOB_TYPE.WorkflowMultiBranchProject
  }`, () => {
    jobConfig.type = JOB_TYPE.WorkflowMultiBranchProject;
    const branchName = 'feature-y';
    const title = constructJobTitle(branchName);

    expect(title).toBe(`${jobConfig.name}/${branchName}`);
  });

  it('should throw an error for invalid job type', () => {
    jobConfig.type = 'Invalid job';

    expect(() => {
      constructJobTitle();
    }).toThrow(`Unsupported job type: ${jobConfig.type}`);
  });
});

describe('getBranchBuildHistory', () => {
  const now = 1576509919879;
  const branchName = 'feature-z';
  const mockedSuccessfulBuild = {
    id: '1',
    name: '#1',
    status: 'SUCCESS',
    durationMillis: 73302,
    startTimeMillis: 1573097554175,
    endTimeMillis: 1573097627477,
  };
  const mockedInProgressBuild = {
    id: '3',
    name: '#3',
    status: 'IN_PROGRESS',
    startTimeMillis: 1576723393062,
    endTimeMillis: 1576723407034,
    durationMillis: 13972,
  };

  let mockServer;
  let urlToFetchBuilds;
  let urlToFetchRemainingTime;
  beforeAll(() => {
    mockServer = nock(jenkinsCredentials.url);
    urlToFetchBuilds = `${jobConfigPath}/job/${branchName}/wfapi/runs?_=${now}`;
    urlToFetchRemainingTime = `${jobConfigPath}/job/${branchName}/buildHistory/ajax`;
  });

  beforeEach(() => {
    jest.spyOn(global.Date, 'now').mockImplementationOnce(() => now);
  });

  afterAll(() => {
    Date.now.mockReset();
  });

  it('should handle successfully completed builds', async () => {
    mockServer.get(urlToFetchBuilds).reply(200, [mockedSuccessfulBuild]);
    const builds = await getBranchBuildHistory(branchName);

    expect(builds).toEqual([
      {
        ...mockedSuccessfulBuild,
        __meta__: undefined,
      },
    ]);
  });

  it('should handle in-progress builds', async () => {
    mockServer
      .get(urlToFetchBuilds)
      .reply(200, [mockedSuccessfulBuild, mockedInProgressBuild]);

    const runningBuildsRemainingTimeResponse =
      '<table class="hasPageData"> <tr class="build-row"><td>' +
      '<a href="/job/folder%20project/job/sample%20project%20inside%20the%20dir/job/master/3/" ' +
      'class="build-link">Dec 19, 2019 2:43 AM</a>' +
      '<table tooltip="Started 14 sec ago&lt;br&gt; Estimated remaining time: 53 sec" ' +
      'class="progress-bar"><tbody><tr><td style="width:20%;" class="progress-bar-done"></td>' +
      '<td style="width:80%" class="progress-bar-left"></td></tr></tbody></table></td></tr></table>';
    mockServer
      .post(urlToFetchRemainingTime)
      .reply(200, runningBuildsRemainingTimeResponse);

    const builds = await getBranchBuildHistory(branchName);

    expect(builds).toEqual([
      { ...mockedSuccessfulBuild, __meta__: undefined },
      {
        ...mockedInProgressBuild,
        __meta__: {
          remainingTime: '53 sec',
          startedTime: '14 sec',
        },
      },
    ]);
  });

  it('should handle in-progress builds without remaining time', async () => {
    mockServer
      .get(urlToFetchBuilds)
      .reply(200, [mockedSuccessfulBuild, mockedInProgressBuild]);
    mockServer.post(urlToFetchRemainingTime).reply(200, '');

    const builds = await getBranchBuildHistory(branchName);

    expect(builds).toEqual([
      { ...mockedSuccessfulBuild, __meta__: undefined },
      { ...mockedInProgressBuild, __meta__: undefined },
    ]);
  });
});

describe('triggerNewBuild', () => {
  const branchName = 'feature-z';
  let mockServer;
  let urlToTriggerNewBuild;
  beforeAll(() => {
    mockServer = nock(jenkinsCredentials.url);
    urlToTriggerNewBuild = `${jobConfigPath}/job/${branchName}/build?delay=0sec`;
  });

  it('should trigger a new build', async () => {
    mockServer.post(urlToTriggerNewBuild).reply(201);
    await triggerNewBuild(branchName);
  });
});

describe('getRunningBuilds', () => {
  const now = 1576509919879;
  const branchName = 'feature-z';
  const mockedSuccessfulBuild = {
    id: '1',
    name: '#1',
    status: 'SUCCESS',
    durationMillis: 73302,
    startTimeMillis: 1573097554175,
    endTimeMillis: 1573097627477,
  };
  const mockedInProgressBuild = {
    id: '3',
    name: '#3',
    status: 'IN_PROGRESS',
    startTimeMillis: 1576723393062,
    endTimeMillis: 1576723407034,
    durationMillis: 13972,
  };

  let mockServer;
  let urlToFetchBuilds;
  beforeAll(() => {
    mockServer = nock(jenkinsCredentials.url);
    urlToFetchBuilds = `${jobConfigPath}/job/${branchName}/wfapi/runs?_=${now}`;
  });

  beforeEach(() => {
    jest.spyOn(global.Date, 'now').mockImplementationOnce(() => now);
  });

  afterAll(() => {
    Date.now.mockReset();
  });

  it('should fetch running builds', async () => {
    mockServer
      .get(urlToFetchBuilds)
      .reply(200, [mockedSuccessfulBuild, mockedInProgressBuild]);
    const builds = await getRunningBuilds(branchName);

    expect(builds).toEqual([mockedInProgressBuild]);
  });
});

describe('getConsoleText', () => {
  const now = 1576509919879;
  const branchName = 'feature-z';
  const mockedSuccessfulBuild = {
    id: '1',
    name: '#1',
    status: 'SUCCESS',
    durationMillis: 73302,
    startTimeMillis: 1573097554175,
    endTimeMillis: 1573097627477,
  };
  const mockedInProgressBuild = {
    id: '3',
    name: '#3',
    status: 'IN_PROGRESS',
    startTimeMillis: 1576723393062,
    endTimeMillis: 1576723407034,
    durationMillis: 13972,
  };

  let mockServer;
  let urlToFetchBuilds;
  beforeAll(() => {
    mockServer = nock(jenkinsCredentials.url);
    urlToFetchBuilds = `${jobConfigPath}/job/${branchName}/wfapi/runs?_=${now}`;
  });

  beforeEach(() => {
    jest.spyOn(global.Date, 'now').mockImplementationOnce(() => now);
  });

  afterAll(() => {
    Date.now.mockReset();
  });

  it('should return stream with text content', async () => {
    const consoleOutput = 'text output from build --here--';
    mockServer
      .get(`${jobConfigPath}/job/${branchName}/lastBuild/consoleText`)
      .reply(200, consoleOutput);

    const st = await getConsoleText(branchName);

    expect(await streamToString(st)).toEqual(consoleOutput);
  });

  it('should throw error if given build id does not exist', async () => {
    const buildId = 404;
    mockServer
      .get(urlToFetchBuilds)
      .reply(200, [mockedSuccessfulBuild, mockedInProgressBuild]);

    await expect(getConsoleText(branchName, buildId)).rejects.toThrow(
      `Cannot find build of id ${buildId}`
    );
  });
});

describe('getQueueItem', () => {
  const response = {
    _class: 'hudson.model.Queue$LeftItem',
    actions: [
      {
        _class: 'hudson.model.CauseAction',
        causes: [
          {
            _class: 'hudson.model.Cause$UserIdCause',
            shortDescription: 'Started by user M.Sureshraj',
            userId: 'suresh',
            userName: 'M.Sureshraj',
          },
        ],
      },
    ],
    blocked: false,
    buildable: false,
    id: 23,
    inQueueSince: 1592732838686,
    params: '',
    stuck: false,
    task: {
      _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
      name: 'pipeline type jenkins project',
      url: 'http://localhost:8080/job/pipeline%20type%20jenkins%20project/',
      color: 'blue',
    },
    url: 'queue/item/23/',
    why: null,
    cancelled: false,
    executable: {
      _class: 'org.jenkinsci.plugins.workflow.job.WorkflowRun',
      number: 12,
      url: 'http://localhost:8080/job/pipeline%20type%20jenkins%20project/12/',
    },
  };
  const responseWithoutBuildInfo = {
    ...response,
  };
  delete responseWithoutBuildInfo.executable;

  let mockServer;
  const queuedItemNumber = 100;
  let url;
  beforeAll(() => {
    mockServer = nock(jenkinsCredentials.url);
    url = `/queue/item/${queuedItemNumber}/api/json`;
  });

  it('should throw an error for invalid queue item number', async () => {
    const queuedItemNumber = null;

    await expect(getQueueItem(queuedItemNumber)).rejects.toThrow(
      'Invalid queue item number'
    );
  });

  it('should throw an error when request fails', async () => {
    mockServer.get(url).replyWithError('some error');

    await expect(getQueueItem(queuedItemNumber)).rejects.toThrow();
  });

  it('initial attempt should return the fetched item if it contains build information', async () => {
    mockServer.get(url).reply(200, response);
    const queueItem = await getQueueItem(queuedItemNumber);

    expect(queueItem).toEqual(response);
  });

  it(
    'initial attempt should return the fetched item regardless of the build information existence' +
      'when `retryUntilBuildFound` param is false',
    async () => {
      mockServer.get(url).reply(200, responseWithoutBuildInfo);

      const retryUntilBuildFound = false;
      const queueItem = await getQueueItem(queuedItemNumber, retryUntilBuildFound);

      expect(queueItem).toEqual(responseWithoutBuildInfo);
    }
  );

  it(
    'when `retryUntilBuildFound` param is true, it should retry when it could not find the build information',
    async () => {
      mockServer
        .get(url)
        .times(4)
        .reply(200, responseWithoutBuildInfo)
        .get(url)
        .reply(200, response);

      const retryUntilBuildFound = true;
      const queueItem = await getQueueItem(queuedItemNumber, retryUntilBuildFound);

      expect(queueItem).toEqual(response);
    },
    EXTENDED_TIMEOUT
  );

  it(
    'should throw an error if max retry attempts reached',
    () => {
      mockServer
        .get(url)
        .times(5)
        .reply(200, responseWithoutBuildInfo);

      const retryUntilBuildFound = true;
      return expect(getQueueItem(queuedItemNumber, retryUntilBuildFound)).rejects.toMatch(
        'Maximum retry attempts reached. Unable to find the build information from the queue item'
      );
    },
    EXTENDED_TIMEOUT
  );

  it('should throw an error when request fails inside the retry phase', async () => {
    mockServer
      .get(url)
      .reply(200, responseWithoutBuildInfo)
      .get(url)
      .replyWithError('some error');

    const retryUntilBuildFound = true;
    return expect(getQueueItem(queuedItemNumber, retryUntilBuildFound)).rejects.toThrow();
  });
});

describe('createProgressiveTextStream', () => {
  const branchName = 'foo';
  const buildId = 100;

  let mockServer;
  let url;
  beforeAll(() => {
    mockServer = nock(jenkinsCredentials.url);
    url = `${jobConfigPath}/job/${branchName}/${buildId}/logText/progressiveText`;
  });

  it('should throw an error for invalid id', () => {
    const branchName = 'branch-x';
    const buildId = null;

    expect(() => {
      createProgressiveTextStream(branchName, buildId);
    }).toThrow('Invalid build id');
  });

  it('should return an event emitter to retrieve the logs progressively', done => {
    mockServer
      .get(url)
      .query(true)
      .reply(200, 'hello', {
        'x-text-size': 1000,
      });

    const stream = createProgressiveTextStream(branchName, buildId);

    expect(stream).toBeInstanceOf(EventEmitter);

    process.nextTick(() => {
      done();
    });
  });

  it('should emit logs progressively', done => {
    const responses = {
      0: { text: 'foo', hasMore: true, size: 3 },
      3: { text: 'foo bar', hasMore: true, size: 6 },
      6: { text: 'foo bar baz', size: 9 },
    };

    mockServer
      .get(url)
      .times(3)
      .query(true)
      .reply(uri => {
        const { start } = parse(uri, true).query;
        const response = responses[start];

        return [
          200,
          response.text,
          {
            'x-text-size': response.size,
            ...(response.hasMore && { 'x-more-data': true }),
          },
        ];
      });

    const stream = createProgressiveTextStream(branchName, buildId);
    let logs = [];

    stream.on('data', text => {
      logs.push(text);
    });

    stream.on('end', () => {
      expect(logs).toHaveLength(3);
      expect(logs.join(', ')).toBe('foo, foo bar, foo bar baz');
      done();
    });

    stream.on('error', error => {
      done(error);
    });
  });

  it('should end the stream if it encountered any errors while emitting logs', done => {
    const responses = {
      0: { text: 'foo', hasMore: true, size: 3 },
      3: { text: 'foo bar', hasMore: true, size: 6 },
      6: { text: 'foo bar baz', size: 9 },
    };

    mockServer
      .get(url)
      .times(2)
      .query(true)
      .reply(uri => {
        const { start } = parse(uri, true).query;
        const response = responses[start];

        return [
          200,
          response.text,
          {
            'x-text-size': response.size,
            ...(response.hasMore && { 'x-more-data': true }),
          },
        ];
      })
      .get(url)
      .query(true)
      .replyWithError('boom!');

    const stream = createProgressiveTextStream(branchName, buildId);
    let logs = [];

    stream.on('data', text => {
      logs.push(text);
    });

    stream.on('error', error => {
      expect(logs).toHaveLength(2);
      expect(logs.join(', ')).toBe('foo, foo bar');
      expect(error.message).toBe('boom!');
      done();
    });
  });
});

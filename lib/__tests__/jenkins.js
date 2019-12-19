const nock = require('nock');
const Conf = require('conf');

const {
  getJobs,
  getJobLink,
  constructJobTitle,
  getBranchBuildHistory,
} = require('../jenkins');
const { getGitRootDirPath } = require('../git-cmd');
const { JOB_TYPE } = require('../../config');

jest.mock('../git-cmd');
jest.mock('conf');

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

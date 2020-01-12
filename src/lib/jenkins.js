const url = require('url');

const Conf = require('conf');
const got = require('got');
const cheerio = require('cheerio');

const { getGitRootDirPath } = require('./git-cmd');
const { JOB_TYPE } = require('../config');
const { debug } = require('./log');

const store = new Conf();
const client = got.extend({ timeout: 3000 });

function getBaseUrl(config = null, includeCredentials = true) {
  config = config || store.get(getGitRootDirPath());
  const { protocol, host } = url.parse(config.url);

  if (includeCredentials) {
    return `${protocol}//${config.username}:${config.token}@${host}`;
  }

  return `${protocol}//${host}`;
}

function getJobUrl(branchName, includeCredentials = true) {
  const config = store.get(getGitRootDirPath());
  const baseUrl = getBaseUrl(config, includeCredentials);

  // TODO: add other Jenkins job types
  switch (config.job.type) {
    case JOB_TYPE.WorkflowJob:
      return `${baseUrl}${config.job.path}`;

    case JOB_TYPE.WorkflowMultiBranchProject:
      return `${baseUrl}${config.job.path}/job/${branchName}`;

    default:
      throw new Error(`Unsupported job type: ${config.job.type}`);
  }
}

function mapBuild(build) {
  return {
    status: build.status,
    name: build.name,
    id: build.id,
    durationMillis: build.durationMillis,
    startTimeMillis: build.startTimeMillis,
    endTimeMillis: build.endTimeMillis,
    __meta__: build.__meta__,
  };
}

// job/some-job-name/19/ => 19 | null
function extractBuildIdFromTheLink(href = '') {
  const buildId = parseInt(
    href
      .split('/')
      .filter(Boolean)
      .pop(),
    10
  );

  return Number.isInteger(buildId) ? buildId : null;
}

// Started 8.7 sec ago<br> Estimated remaining time: 7 min 1 sec => { remainingTime, startedTime } | null
function extractBuildStartedAndRemainingTime(text = '') {
  const remainingTimeRegExp = /(?<=remaining time: ).*/;
  const startedTimeRegExp = /(?<=Started ).*(?= ago)/;
  const data = {};
  const remainingTime = text.match(remainingTimeRegExp);
  const startedTime = text.match(startedTimeRegExp);

  if (remainingTime && remainingTime.length) data.remainingTime = remainingTime[0];

  if (startedTime && startedTime.length) data.startedTime = startedTime[0];

  return Object.keys(data).length === 2 ? data : null;
}

// html => { id: { remainingTime, startedTime } } | null
function extractRemainingTimeFromHtml(html) {
  const $ = cheerio.load(html);

  if (!$('table').hasClass('hasPageData')) return null;

  let row,
    buildId,
    remainingTime,
    data = {};

  $('.build-row').each(function() {
    row = $('.progress-bar', this);

    if (row.length) {
      buildId = extractBuildIdFromTheLink($('.build-link', this).attr('href'));
      remainingTime = extractBuildStartedAndRemainingTime(row.attr('tooltip'));

      if (buildId && remainingTime) data[buildId] = remainingTime;
    }
  });

  return Object.keys(data).length ? data : null;
}

function getRunningBuildsRemainingTime(branchName, buildId) {
  // this api will return build history as a html response
  // with the `n` header we can control the results limit [n, ..., n + 1]
  // e.g. if the `buildId` is 520 then it will return all the build history from 520 to upwards
  const url = getJobUrl(branchName) + '/buildHistory/ajax';

  return client
    .post(url, { headers: { n: buildId } })
    .then(res => extractRemainingTimeFromHtml(res.body));
}

function extractJobType(str = '') {
  return str.split('.').pop();
}

function flattenNestedJobs(jobs) {
  function mapJobs(job) {
    return {
      ...job,
      displayName: `${this.folderName} → ${job.displayName || job.name}`,
    };
  }

  const transformedJobs = [];
  let job;
  let jobType = '';
  while (jobs.length) {
    job = jobs.shift();
    job.displayName = job.displayName || job.name;
    jobType = extractJobType(job._class);

    if (jobType === 'Folder') {
      jobs.push(
        ...job.jobs.map(mapJobs, {
          folderName: job.displayName,
        })
      );
    } else {
      transformedJobs.push({
        type: jobType,
        name: job.displayName,
        url: job.url,
      });
    }
  }

  return transformedJobs;
}

async function getBuilds(branchName) {
  const currentTimestamp = Date.now();
  const jobUrl = getJobUrl(branchName);
  const { body } = await client.get(`${jobUrl}/wfapi/runs?_=${currentTimestamp}`, {
    json: true,
  });

  return body;
}

function filterRunningBuilds(builds) {
  return builds.filter(build => build.status === 'IN_PROGRESS');
}

exports.getJobLink = function(branchName) {
  return getJobUrl(branchName, false);
};

exports.getJobs = async function(credentials) {
  const baseUrl = getBaseUrl(credentials);
  const pick = 'url,name,displayName';
  // Temporary workaround to fetch jobs inside the folder as well
  // ATM we only fetch jobs upto 3 level deep
  const qs = `tree=jobs[${pick},jobs[${pick},jobs[${pick}]]]`;

  const { body } = await client.get(`${baseUrl}/api/json?${qs}`, {
    json: true,
  });

  return flattenNestedJobs(body.jobs);
};

exports.getBranchBuildHistory = async function(branchName) {
  const builds = await getBuilds(branchName);

  const runningBuilds = filterRunningBuilds(builds);
  if (runningBuilds.length) {
    // `runningBuildsRemainingTime` can be a object | null
    const runningBuildsRemainingTime = await getRunningBuildsRemainingTime(
      branchName,
      runningBuilds.pop().id
    );

    if (runningBuildsRemainingTime) {
      Object.entries(runningBuildsRemainingTime).forEach(([key, value]) => {
        builds.find(build => build.id === key).__meta__ = value;
      });
    }
  }

  return builds.map(mapBuild);
};

exports.constructJobTitle = function(branchName = '') {
  const {
    job: { name, type },
  } = store.get(getGitRootDirPath());

  // TODO: add other Jenkins job types
  switch (type) {
    case JOB_TYPE.WorkflowJob:
      return name;

    case JOB_TYPE.WorkflowMultiBranchProject:
      return `${name}/${branchName}`;

    default:
      throw new Error(`Unsupported job type: ${type}`);
  }
};

exports.triggerNewBuild = function(branchName) {
  // `?delay=0sec` to instantly trigger the build
  const jobUrl = getJobUrl(branchName) + '/build?delay=0sec';
  debug(`Triggering a build for: ${jobUrl}`);

  return client.post(jobUrl);
};

exports.getRunningBuilds = async function(branchName) {
  const builds = await getBuilds(branchName);

  return filterRunningBuilds(builds);
};

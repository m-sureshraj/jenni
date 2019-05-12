const Conf = require('conf');
const got = require('got');
const cheerio = require('cheerio');
const { extractSchemeFromUrl, extractUrlWithoutScheme } = require('./util');
const { getGitRootDirPath } = require('./git-cmd');

const store = new Conf();
const client = got.extend({ timeout: 1000 });

function getBaseUrl(config = null) {
  config = config || store.get(getGitRootDirPath());

  const scheme = extractSchemeFromUrl(config.url);
  const url = extractUrlWithoutScheme(config.url);

  return `${scheme}://${config.username}:${config.token}@${url}`;
}

function getBranchJobUrl(branchName) {
  const config = store.get(getGitRootDirPath());
  let baseUrl = getBaseUrl(config);

  if (config.job) baseUrl += `/job/${config.job}`;

  return `${baseUrl}/job/${branchName}`;
}

function mapBuild(build) {
  return {
    status: build.status,
    name: build.name,
    id: build.id,
    durationMillis: build.durationMillis,
    startTimeMillis: build.startTimeMillis,
    endTimeMillis: build.endTimeMillis,
    __meta__: build.__meta__
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

function getRunningBuildsRemainingTime(baseUrl, buildId) {
  // this api will return build history as a html response
  // with the `n` header we can control the results limit [n, ..., n + 1]
  // e.g. if the `buildId` is 520 then it will return all the build history from 520 to upwards
  const url = baseUrl + '/buildHistory/ajax';

  return client
    .post(url, { headers: { n: buildId } })
    .then(res => extractRemainingTimeFromHtml(res.body));
}

exports.getBranchJobLink = function(branchName) {
  const config = store.get(getGitRootDirPath());
  let url = config.url;

  if (config.job) url += `/job/${config.job}`;

  return `${url}/job/${branchName}`;
};

exports.getBaseJobs = function(jenkinsCredentials) {
  const baseUrl = getBaseUrl(jenkinsCredentials);

  return client(`${baseUrl}/api/json?tree=jobs[name]`).then(res => JSON.parse(res.body));
};

exports.getBranchBuildHistory = async function(branchName) {
  const currentTimestamp = Date.now();
  const baseUrl = getBranchJobUrl(branchName);

  const builds = await client(`${baseUrl}/wfapi/runs?_=${currentTimestamp}`).then(res =>
    JSON.parse(res.body)
  );
  const runningBuilds = builds.filter(build => build.status === 'IN_PROGRESS');

  if (runningBuilds.length) {
    const runningBuildsRemainingTime = await getRunningBuildsRemainingTime(
      baseUrl,
      runningBuilds.pop().id
    );

    if (runningBuildsRemainingTime) {
      Object.keys(runningBuildsRemainingTime).forEach(key => {
        builds.find(build => build.id === key).__meta__ = runningBuildsRemainingTime[key];
      });
    }
  }

  return builds.map(mapBuild);
};

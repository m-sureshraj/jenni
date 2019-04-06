const Conf = require('conf');
const got = require('got');
const { extractSchemeFromUrl, extractUrlWithoutScheme } = require('./util');
const { getGitRootDirPath } = require('./git-cmd');

const store = new Conf();

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

exports.getBranchJobLink = function(branchName) {
  const config = store.get(getGitRootDirPath());
  let url = config.url;

  if (config.job) url += `/job/${config.job}`;

  return `${url}/job/${branchName}`;
};

exports.getBaseJobs = function(jenkinsCredentials) {
  const baseUrl = getBaseUrl(jenkinsCredentials);

  return got(`${baseUrl}/api/json?tree=jobs[name]`).then(res => JSON.parse(res.body));
};

// function foo(currentTime, endingTime) {
//   console.log(currentTime, endingTime);
//   if (currentTime >= endingTime) {
//     return 100;
//   }
//
//   return Math.floor((endingTime / currentTime) * 100);
// }

exports.getBranchBuildHistory = function(branchName) {
  const currentTimestamp = Date.now();
  const url = getBranchJobUrl(branchName) + '/wfapi/runs?_=' + currentTimestamp;

  return got(url)
    .then(res => JSON.parse(res.body))
    .then(builds => {
      return builds.map(build => {
        return {
          status: build.status,
          name: build.name,
          id: build.id,
          durationMillis: build.durationMillis,
          startTimeMillis: build.startTimeMillis,
          endTimeMillis: build.endTimeMillis
        };
      });
    });
};

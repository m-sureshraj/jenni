const url = require('url');

const prompts = require('prompts');
const ora = require('ora');

const { getJobs } = require('./jenkins');
const { isValidUrl, removeTrailingSlash } = require('./util');
const { logNetworkErrors } = require('./log');

const spinner = ora('Fetching Jobs');

function mapJob(job) {
  return {
    title: job.name,
    value: {
      name: job.name,
      path: removeTrailingSlash(url.parse(job.url).path),
      type: job.type,
    },
  };
}

function getJobPromptConfig() {
  let choices = null;

  return {
    type: async (prev, answers) => {
      spinner.start();

      try {
        const jobs = await getJobs(answers);

        // skip the prompt if the jobs list is empty
        if (!jobs.length) return null;

        choices = jobs.map(mapJob);
        spinner.stop();

        // prompt `type`
        return 'select';
      } catch (err) {
        spinner.stop();
        logNetworkErrors(err);
        process.exit();
      }
    },
    name: 'job',
    message: 'Job',
    choices: () => choices,
  };
}

exports.requestJenkinsCredentials = function() {
  const questions = [
    {
      type: 'text',
      name: 'username',
      message: 'Jenkins username',
      validate: val => val.trim() !== '',
      format: val => val.trim(),
    },
    {
      type: 'text',
      name: 'token',
      message: 'Jenkins api-token',
      validate: val => val.trim() !== '',
      format: val => val.trim(),
    },
    {
      type: 'text',
      name: 'url',
      message: 'Jenkins Base URL',
      validate: url => isValidUrl(url),
      format: url => removeTrailingSlash(url.trim()),
    },
    getJobPromptConfig(),
  ];
  const onCancel = (prompt, answers) => {
    answers.__cancelled__ = true;

    return false;
  };

  return prompts(questions, { onCancel });
};

exports.askConfirmation = function() {
  const question = {
    type: 'confirm',
    name: 'confirmation',
    message: 'Are you sure you want to save this configuration?',
    initial: true,
  };

  return prompts(question);
};

exports.askConfirmationBeforeTriggeringNewBuild = function() {
  const question = {
    type: 'confirm',
    name: 'confirmation',
    message: 'A build is already in progress. Do you like to create another build?',
    initial: false,
  };

  return prompts(question);
};

exports.askToSelectARunningBuild = function(runningBuilds = []) {
  const choices = {
    type: 'select',
    name: 'selectedBuildId',
    message: 'You have multiple running builds. Select a build to retrieve its console.',
    choices: runningBuilds,
  };

  return prompts(choices);
};

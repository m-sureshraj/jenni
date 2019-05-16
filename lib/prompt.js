const prompts = require('prompts');
const ora = require('ora');
const qs = require('querystring');
const { getBaseJobs } = require('./jenkins');
const { isValidUrl } = require('./util');
const { logNetworkErrors } = require('./log');

const spinner = ora('Fetching Base Jobs');

function getBaseJobQuestionConfig() {
  let baseJobs = null;

  return {
    type: async (prev, answers) => {
      spinner.start();

      try {
        const { jobs } = await getBaseJobs(answers);

        // skip the prompt if the jobs list is empty
        if (!jobs.length) return null;

        baseJobs = jobs.map(job => ({ title: job.name, value: qs.escape(job.name) }));
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
    message: 'Select current repo base job', // fixme - better message
    choices: () => baseJobs
  };
}

exports.requestJenkinsCredentials = function() {
  const questions = [
    {
      type: 'text',
      name: 'username',
      message: 'Jenkins username',
      validate: val => val.trim() !== '',
      format: val => val.trim()
    },
    {
      type: 'text',
      name: 'token',
      message: 'Jenkins api-token',
      validate: val => val.trim() !== '',
      format: val => val.trim()
    },
    {
      type: 'text',
      name: 'url',
      message: 'Jenkins url',
      validate: val => isValidUrl(val),
      format: val => {
        // todo - do this part on part of validation
        if (val.endsWith('/')) {
          // remove ending forward slash
          return val.substr(0, val.length - 1);
        }

        return val;
      }
    },
    getBaseJobQuestionConfig()
  ];

  // todo: show banner message about jenkins credentials

  return prompts(questions);
};

exports.askConfirmation = function() {
  const question = {
    type: 'confirm',
    name: 'confirmation',
    message: 'Are you sure you want to save this configuration?',
    initial: true
  };

  return prompts(question);
};

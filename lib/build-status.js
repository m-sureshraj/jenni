const figures = require('figures');
const { yellow, blue, red, green, magenta } = require('kleur');

module.exports = {
  FAILED: {
    icon: red(figures.cross),
    label: red('Failed'),
  },
  SUCCESS: {
    icon: green(figures.tick),
    label: green('Success'),
  },
  ABORTED: {
    icon: yellow(figures.warning),
    label: yellow('Aborted'),
  },
  IN_PROGRESS: {
    icon: blue(figures.play),
    label: blue('In Progress'),
  },
  NOT_EXECUTED: {
    icon: magenta(figures.checkboxOn),
    label: magenta('Not executed'),
  },
  UNSTABLE: {
    icon: yellow(figures.checkboxOff),
    label: yellow('Unstable'),
  },
};

const { getCurrentBranchName } = require('../../lib/git-cmd');
const { getConsoleText } = require('../../lib/jenkins');
const { streamToString } = require('../../lib/util');

const { Readable, PassThrough } = require('stream');

jest.mock('../../lib/jenkins');
jest.mock('../../lib/git-cmd');

const output = require('../output');

describe('output', () => {
  const branchName = 'foo';
  beforeAll(() => {
    getCurrentBranchName.mockImplementation(() => branchName);
  });

  beforeEach(() => {
    getConsoleText.mockImplementation(() =>
      Promise.resolve(Readable.from('mock stream'))
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should stream content to writable stream', async () => {
    const st = PassThrough();
    await output({ writeTo: st });

    expect(await streamToString(st)).toBe('mock stream');
  });
});

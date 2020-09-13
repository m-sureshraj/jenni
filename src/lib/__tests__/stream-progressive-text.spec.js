const { parse } = require('url');

const nock = require('nock');

const StreamProgressiveText = require('../stream-progressive-text');

describe('createProgressiveTextStream', () => {
  const host = 'http://localhost:3000';
  const path = '/api/logs';
  const url = `${host}${path}`;
  const mockServer = nock(host);

  afterEach(nock.cleanAll);

  it('should emit logs progressively', done => {
    const responses = {
      0: { text: 'foo', hasMore: true, size: 3 },
      3: { text: 'foo bar', hasMore: true, size: 6 },
      6: { text: 'foo bar baz', size: 9 },
    };

    mockServer
      .get(path)
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

    const stream = new StreamProgressiveText(url);
    let logs = [];

    stream.on('data', text => {
      logs.push(text);
    });

    stream.on('end', () => {
      expect(logs).toHaveLength(3);
      expect(logs.join(', ')).toBe('foo, foo bar, foo bar baz');
      done();
    });
  });

  it('should end the stream if it encountered any errors while emitting logs', done => {
    const responses = {
      0: { text: 'foo', hasMore: true, size: 3 },
      3: { text: 'foo bar', hasMore: true, size: 6 },
      6: { text: 'foo bar baz', size: 9 },
    };

    mockServer
      .get(path)
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
      .get(path)
      .query(true)
      .replyWithError('boom!');

    const stream = new StreamProgressiveText(url);
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

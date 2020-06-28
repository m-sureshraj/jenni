const EventEmitter = require('events');

const got = require('got');

const client = got.extend({ timeout: 3000 });

class StreamProgressiveText extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    const initialOffset = 0;

    process.nextTick(async () => {
      await this.fetchConsoleTextProgressively(initialOffset);
    });
  }

  async fetchConsoleTextProgressively(offset) {
    try {
      const {
        body,
        headers: { 'x-text-size': size, 'x-more-data': more },
      } = await client.get(`${this.url}?start=${offset}`);

      if (typeof body === 'string' && body.length) {
        this.emit('data', body);
      }

      if (more === 'true') {
        setTimeout(() => {
          this.fetchConsoleTextProgressively(size);
        }, 1000);
      } else {
        this.emit('end');
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
}

module.exports = StreamProgressiveText;

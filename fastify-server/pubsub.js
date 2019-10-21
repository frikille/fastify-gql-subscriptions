class AsyncQueue {
  constructor(options) {
    this.options = options;

    this.values = [];
    this.createPromise();

    this.closed = false;
    this.iterator = this.createIterator();
    this.close = this.close.bind(this);
  }

  createPromise() {
    this.promise = new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }

  async createIterator() {
    const iterator = this.createIteratorRaw();

    // Wait for setup.
    await iterator.next();
    return iterator;
  }

  async *createIteratorRaw() {
    if (this.options.setup) {
      this.setupPromise = this.options.setup();
    }

    if (this.setupPromise) {
      await this.setupPromise;
    }

    yield null;

    while (true) {
      await this.promise;

      for (const value of this.values) {
        if (this.closed) {
          return;
        }

        yield value;
      }

      this.values.length = 0;
      this.createPromise();
    }
  }

  push(value) {
    this.values.push(value);
    this.resolvePromise();
  }

  async close() {
    if (this.setupPromise) {
      await this.setupPromise;
    }

    if (this.options.teardown) {
      await this.options.teardown();
    }

    this.closed = true;
    this.push(null);
  }
}

module.exports = class Subscriber {
  constructor(emitter) {
    this.emitter = emitter;
    this._queues = new Map();
    this._listeners = new Map();
  }
  _listen(event) {
    if (this._listeners.has(event)) return;

    const listener = (message, callback) => {
      const { topic, payload } = message;
      const queues = this._queues.get(topic);
      if (!queues) return;
      queues.forEach(queue => {
        queue.push(payload);
      });

      if (callback) {
        callback();
      }
    };

    this.emitter.on(event, listener);
    this._listeners.set(event, listener);
  }
  /**
   * @event: string representing the subscription topic
   */
  subscribe(event) {
    let eventQueues = this._queues.get(event);

    if (!eventQueues) {
      eventQueues = new Set();
      this._queues.set(event, eventQueues);
    }

    const queue = new AsyncQueue({
      setup: () => this._listen(event),
      teardown: () => {
        const innerQueues = this._queues.get(event);
        if (!innerQueues) return;

        innerQueues.delete(queue);

        if (!innerQueues.size) {
          this._queues.delete(event);
        }
      }
    });

    eventQueues.add(queue);
    return queue;
  }
};

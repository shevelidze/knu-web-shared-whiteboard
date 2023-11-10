class LongPollIO {
  constructor() {
    this.eventListeners = {};
    this.pollListeners = [];
  }

  handleEvent(event, data) {
    this.eventListeners[event]?.(data);
  }

  on(event, callback) {
    this.eventListeners[event] = callback;
  }

  emit(event, data) {
    for (const pollListener of this.pollListeners) {
      pollListener({ event, data });
    }
  }
}

export { LongPollIO };

class LongPollIO {
  constructor(emitURL, pollURL) {
    this.emitURL = emitURL;
    this.pollURL = pollURL;

    this.eventListeners = {};
    this.isPolling = false;
  }

  on(event, callback) {
    this.eventListeners[event] = callback;
  }

  async emit(event, data) {
    const response = await fetch(this.emitURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        data,
      }),
    });

    return response.json();
  }

  async poll() {
    this.isPolling = true;

    while (this.isPolling) {
      const response = await fetch(this.pollURL);
      const { event, data } = await response.json();

      this.eventListeners[event]?.(data);
    }
  }

  stopPolling() {
    this.isPolling = false;
  }
}

export { LongPollIO };

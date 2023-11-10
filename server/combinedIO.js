class CombinedIO {
  constructor(longPollIO, socketIO) {
    this.eventListeners = {};
    this.longPollIO = longPollIO;
    this.socketIO = socketIO;
  }

  on(event, callback) {
    this.eventListeners[event] = callback;
  }

  emit(event, data) {
    this.longPollIO.emit(event, data);
    this.socketIO.emit(event, data);
  }

  init() {
    this.socketIO.on("connection", (socket) => {
      for (const [event, listener] of Object.entries(this.eventListeners)) {
        socket.on(event, listener);
        this.longPollIO.on(event, listener);
      }
    });
  }
}

export { CombinedIO };

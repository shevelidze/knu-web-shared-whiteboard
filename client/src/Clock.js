class Clock {
  constructor(framesPerSecond) {
    this.framesPerSecond = framesPerSecond;
    this.lastTickTime = new Date().getTime();
    this.callback = null;
  }

  async tick(callback) {
    const callbackWasSet = this.callback !== null;
    this.callback = callback;

    if (callbackWasSet) {
      return;
    }

    const nowTime = new Date().getTime();

    const timeSinceLastTick = nowTime - this.lastTickTime;
    const timeToSleep = 1000 / this.framesPerSecond - timeSinceLastTick;

    if (timeToSleep > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeToSleep));
    }

    this.callback();
    this.callback = null;

    this.lastTickTime = new Date().getTime();
  }
}

export { Clock };

let lineId = 0;

function getLineId() {
  return lineId++;
}

class Line {
  constructor(startPoint, color) {
    this.points = [startPoint];
    this.color = color;
    this.id = getLineId();
  }

  addPoint(point) {
    this.points.push(point);
  }
}

export { Line };

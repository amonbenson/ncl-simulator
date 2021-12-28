import * as math from "mathjs";

export default class Transformer {
  constructor(sketch) {
    if (!sketch) throw new Error("No sketch provided.");
    this.sketch = sketch;

    this.stack = [math.identity(3)];
    this.currentTransformInverse = math.identity(3);
  }

  get stackSize() {
    return this.stack.length;
  }

  set _currentTransform(matrix) {
    this.stack[this.stackSize - 1] = matrix;
  }

  get currentTransform() {
    return this.stack[this.stackSize - 1];
  }

  _calculateInverse() {
    this.currentTransformInverse = math.inv(this.currentTransform);
  }

  _transform(matrix) {
    // update the current transform and inverse
    this._currentTransform = math.multiply(this.currentTransform, matrix);
    this._calculateInverse();
  }

  get() {
    // return the current transform matrix
    return this.currentTransform;
  }

  getInverse() {
    return this.currentTransformInverse;
  }

  set(matrix) {
    // use a matrix to set the transform
    this._transform(matrix);
    this.sketch.applyMatrix(...matrix._data.slice(6));
  }

  translate(delta) {
    const [x, y] = delta.resize([2])._data;
    this._transform(
      math.matrix([
        [1, 0, x],
        [0, 1, y],
        [0, 0, 1]
      ])
    );
    this.sketch.translate(x, y);
  }

  scale(factor) {
    if (!isNaN(factor)) {
      factor = math.matrix([factor, factor]);
    }

    const [x, y] = factor.resize([2])._data;
    this._transform(
      math.matrix([
        [x, 0, 0],
        [0, y, 0],
        [0, 0, 1]
      ])
    );
    this.sketch.scale(x, y);
  }

  rotate(a) {
    this._transform(
      math.matrix([
        [math.cos(a), -math.sin(a), 0],
        [math.sin(a), math.cos(a), 0],
        [0, 0, 1]
      ])
    );
    this.sketch.rotate(a);
  }

  push() {
    // store a copy of the current transform on the stack
    this.stack.push(this.currentTransform);
    this.sketch.push();
  }

  pop() {
    if (this.stackSize <= 1) throw new Error("too many calls of pop()");

    // restore the previous transform
    this.stack.pop();
    this.sketch.pop();
    this._calculateInverse();
  }

  apply(vector) {
    const v3 = math.concat(vector, math.ones(1));
    const result = math.multiply(this.currentTransform, v3);
    return math.resize(result, vector._size);
  }

  applyInverse(vector) {
    const v3 = math.resize(vector, [3], 1);
    const result = math.multiply(this.currentTransformInverse, v3);
    return math.resize(result, vector._size);
  }
}

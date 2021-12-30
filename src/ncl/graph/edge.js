import { GraphError } from ".";
import * as math from "mathjs";

export default class Edge {
  constructor(id, from, to, weight = 1, muted = false) {
    if (!from || !to) {
      throw new GraphError(
        `Cannot create graph from vertices ${from} -> ${to}.`
      );
    }

    this.id = String(id);
    this.from = from;
    this.to = to;
    this.weight = Number(weight);
    this.muted = Boolean(muted);
  }

  get circular() {
    return this.from === this.to;
  }

  get constraintSatisfied() {
    return this.from.constraintSatisfied && this.to.constraintSatisfied;
  }

  relativeDirection(vertex) {
    if (vertex === this.to) return Edge.Direction.incoming;
    if (vertex === this.from) return Edge.Direction.outgoing;

    throw new GraphError(`Cannot get edge direction in relation to {vertex}.`);
  }

  opposite(vertex) {
    return this.relativeDirection(vertex) === Edge.Direction.incoming ? this.from : this.to;
  }

  reverse() {
    // simple swap of references
    const tmp = this.from;
    this.from = this.to;
    this.to = tmp;
  }

  get center() {
    return math.dotDivide(math.add(this.from.position, this.to.position), 2);
  }

  get delta() {
    return math.subtract(this.to.position, this.from.position);
  }

  get labelPosition() {
    const center = this.center;
    const delta = this.delta;
    let direction = math.dotDivide(delta, math.norm(delta));

    // make sure the label is always on top
    if (direction._data[0] > 0) {
      direction = math.dotMultiply(direction, -1);
    } else if (direction._data[0] === 0) {
      direction = math.matrix([0, -1]);
    }

    const offset = math.rotate(direction, math.pi / 2);
    return math.add(center, math.dotMultiply(offset, 0.3));
  }

  toString() {
    return `${this.id}(${this.from.id} -> ${this.to.id})`;
  }
}

Edge.Direction = Object.freeze({
  incoming: Symbol("incoming"),
  outgoing: Symbol("outgoing")
});

Edge.Weight = Object.freeze({
  single: 1,
  double: 2
});

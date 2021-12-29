import EventEmitter from "events";
import * as math from "mathjs";
import Edge from "./edge";

export default class Vertex {
  constructor(id, position = [0, 0], visible = true) {
    this.id = String(id);
    this.position = math.matrix(position || [0, 0]);
    this.edges = {};

    this.visible = Boolean(visible);

    // default constraint validator
    this.constraintValidator = () => this.visible ? this.inflow >= 2 : true;
  }

  get incomingEdges() {
    return this.getRelativeEdges(Edge.Direction.incoming);
  }

  get outgoingEdges() {
    return this.getRelativeEdges(Edge.Direction.outgoing);
  }

  get inflow() {
    return this.incomingEdges.reduce((sum, edge) => sum + edge.weight, 0);
  }

  get outflow() {
    return this.outgoingEdges.reduce((sum, edge) => sum + edge.weight, 0);
  }

  get preferredEdgeDirection() {
    const directions = Object.values(this.edges)
      .map(e => e.opposite(this)) // get each connected vertex
      .filter(v => v !== this) // filter out circular edges
      .map(v => math.subtract(v.position, this.position)) // get the relative position of each vertex
      .map(p => math.dotDivide(p, math.norm(p))); // normalize

    if (!directions.length) return math.matrix([-1, 0]);
    const meanDirection = math.mean(directions, 0);
    const preferredDirection = math.dotMultiply(meanDirection, -1);
    return preferredDirection;
  }

  get constraintSatisfied() {
    return this.constraintValidator();
  }

  getRelativeEdges(direction) {
    return Object.values(this.edges).filter(
      (edge) => edge.relativeDirection(this) === direction
    );
  }

  toString() {
    return `${this.id}(${this.position})`;
  }
}
  
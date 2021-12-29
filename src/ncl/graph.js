import EventEmitter from "events";
import * as math from "mathjs";

export class GraphError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export default class Graph extends EventEmitter {
  constructor() {
    super();
    this.vertices = {};
    this.edges = {};
  }

  clear() {
    this.vertices = {};
    this.edges = {};
    this.emit("update", this);
  }

  hasVertex(id) {
    id = String(id);
    return this.vertices.hasOwnProperty(id);
  }

  getVertex(id) {
    id = String(id);
    if (!this.hasVertex(id)) {
      throw new GraphError(`Cannot find vertex ${id}.`);
    }

    return this.vertices[id];
  }

  addVertex(id, position = [0, 0], hidden = false) {
    id = String(id);
    if (this.hasVertex(id)) {
      throw new GraphError(`Vertex with id ${id} already exists`);
    }

    // create and add the vertex
    const vertex = new Vertex(id, position, hidden);
    this.vertices[id] = vertex;

    this.emit("update", this);
    return vertex;
  }

  removeVertex(id) {
    id = String(id);
    const vertex = this.getVertex(id);

    // remove all connected edges
    Object.values(vertex.edges).forEach((edge) => this.removeEdge(edge.id));

    // remove the vertex itself
    delete this.vertices[id];

    this.emit("update", this);
    return vertex;
  }

  hasEdge(id) {
    id = String(id);
    return this.edges.hasOwnProperty(id);
  }

  getEdge(id) {
    id = String(id);
    if (!this.hasEdge(id)) {
      throw new GraphError(`Cannot find edge ${id}.`);
    }

    return this.edges[id];
  }

  addEdge(id, fromId, toId, weight = 1) {
    id = String(id);
    fromId = String(fromId);
    toId = String(toId);
    weight = Number(weight);

    if (this.hasEdge(id)) {
      throw new GraphError(`Vertex with id ${id} already exists`);
    }
    const from = this.getVertex(fromId);
    const to = this.getVertex(toId);

    // create and add the edge to the graph and to both connecting vertices
    const edge = new Edge(id, from, to, weight);
    this.edges[id] = edge;
    from.edges[id] = edge;
    to.edges[id] = edge;

    this.emit("update", this);
    return edge;
  }

  removeEdge(id) {
    const edge = this.getEdge(id);
    const { from, to } = edge;

    // remove the edge from both connected vertices
    delete from.edges[id];
    delete to.edges[id];

    // remove the edge from the graph
    delete this.edges[id];

    this.emit("update", this);
    return edge;
  }

  reverseEdge(id) {
    const edge = this.getEdge(id);
    edge.reverse();

    this.emit("update", this);
    return edge;
  }

  get bounds() {
    const vertexPositions = Object.values(this.vertices)
      .map(vertex => vertex.position)
    const min = math.min(vertexPositions, 0);
    const max = math.max(vertexPositions, 0);
    const size = math.subtract(max, min);
    const extents = math.dotDivide(size, 2);
    const center = math.add(min, extents);
    return {
      min,
      max,
      size,
      extents,
      center
    };
  }
}

export class Vertex {
  constructor(id, position = [0, 0], hidden = false) {
    this.id = String(id);
    this.position = math.matrix(position || [0, 0]);
    this.edges = {};

    this.hidden = hidden || false;
    this.inflowMin = hidden ? 0 : 2;
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

  get constraintSatisfied() {
    return this.inflow >= this.inflowMin;
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

  getRelativeEdges(direction) {
    return Object.values(this.edges).filter(
      (edge) => edge.relativeDirection(this) === direction
    );
  }

  toString() {
    return `${this.id}(${this.position})`;
  }
}

export class Edge {
  constructor(id, from, to, weight = 1) {
    if (!from || !to) {
      throw new GraphError(
        `Cannot create graph from vertices ${from} -> ${to}.`
      );
    }

    this.id = String(id);
    this.from = from;
    this.to = to;
    this.weight = Number(weight);
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

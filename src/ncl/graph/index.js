import EventEmitter from "events";
import * as math from "mathjs";
import Vertex from "./vertex";
import Edge from "./edge";
import Component from "./component";
import Label, { CENTER } from "./label";

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
    this.components = {};
    this.labels = {};
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
      throw new GraphError(`Cannot find vertex ${id}`);
    }

    return this.vertices[id];
  }

  addVertex(id, position = [0, 0], visible = true) {
    id = String(id);
    if (this.hasVertex(id)) {
      throw new GraphError(`Vertex with id ${id} already exists`);
    }

    // create and add the vertex
    const vertex = new Vertex(id, position, visible);
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
      throw new GraphError(`Cannot find edge ${id}`);
    }

    return this.edges[id];
  }

  addEdge(id, fromId, toId, weight = 1, labelVisible = false) {
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
    const edge = new Edge(id, from, to, weight, labelVisible);
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

  hasComponent(id) {
    id = String(id);
    return this.components.hasOwnProperty(id);
  }

  getComponent(id) {
    id = String(id);
    if (!this.hasComponent(id)) {
      throw new GraphError(`Cannot find component ${id}`);
    }

    return this.components[id];
  }

  addComponent(id, position = [0, 0], ComponentClass, ...args) {
    if (!ComponentClass || !(ComponentClass.prototype instanceof Component)) {
      throw new GraphError(`ComponentClass must be a subclass of Component`);
    }
    if (this.hasComponent(id)) {
      throw new GraphError(`Component with id ${id} already exists`);
    }
    
    id = String(id);

    // create a new component of the given class
    const vertexCreator = (...args) => this.addVertex(...args);
    const component = new ComponentClass(id, position, vertexCreator, ...args);
    this.components[id] = component;

    this.emit("update", this);
    return component;
  }

  removeComponent(id) {
    const component = this.getComponent(id);

    // remove all ports and the component itself
    component.ports.forEach(port => this.removeVertex(port.id));
    delete this.components[id];

    return component;
  }

  hasLabel(id) {
    id = String(id);
    return this.labels.hasOwnProperty(id);
  }

  getLabel(id) {
    id = String(id);
    if (!this.hasLabel(id)) {
      throw new GraphError(`Cannot find label ${id}`);
    }

    return this.labels[id];
  }

  addLabel(id, position = [0, 0], text = "", halign = CENTER, valign = CENTER) {
    id = String(id);
    if (this.hasLabel(id)) {
      throw new GraphError(`Label with id ${id} already exists`);
    }

    // create and add the label
    const label = new Label(id, position, text, halign, valign);
    this.labels[id] = label;

    this.emit("update", this);
    return label;
  }

  removeLabel(id) {
    const label = this.getLabel(id);

    // remove the label
    delete this.labels[id];

    this.emit("update", this);
    return label;
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

import Graph, { GraphError } from "./graph";
import * as math from "mathjs";

let graph;

beforeEach(() => {
  graph = new Graph();

  graph.addVertex("v0");
  graph.addVertex("v1", [1, 1]);
  graph.addVertex("v2", [1, -1]);

  graph.addEdge("e0", "v0", "v1");
  graph.addEdge("e1", "v0", "v2", 1);
  graph.addEdge("e2", "v1", "v2", 2);
});

it("should add vertices", () => {
  const { v0 } = graph.vertices;

  // check if the vertex got added correctly
  expect(v0).toBeDefined();
  expect(v0.id).toBe("v0");

  // check if adding an existing vertex id throws an error
  expect(() => graph.addVertex("v0")).toThrow(GraphError);

  // check if the get vertex function performs correctly
  expect(graph.getVertex("v0")).toBe(v0);
  expect(() => graph.getVertex("v3")).toThrow(GraphError);
});

it("should set the position", () => {
  const { v0, v2 } = graph.vertices;

  // check the positions
  expect(v0.position).toStrictEqual(math.matrix([0, 0]));
  expect(v2.position).toStrictEqual(math.matrix([1, -1]));
});

it("should add edges", () => {
  const { v1, v2 } = graph.vertices;
  const { e2 } = graph.edges;

  // check if the edge got defined and linked correctly
  expect(e2).toBeDefined();
  expect(e2.from).toBe(v1);
  expect(e2.to).toBe(v2);
  expect(v1.edges.e2).toBe(e2);
  expect(v2.edges.e2).toBe(e2);
});

it("should calculate incoming and outgoing edges", () => {
  const { v1 } = graph.vertices;
  const { e0, e2 } = graph.edges;

  // check the incoming and outgoing properties
  expect(v1.incomingEdges).toContain(e0);
  expect(v1.outgoingEdges).toContain(e2);
});

it("should calculate the flow and constraints", () => {
  const { v1, v2 } = graph.vertices;

  // check the flow values
  expect(v1.inflow).toBe(1);
  expect(v1.outflow).toBe(2);
  expect(v2.inflow).toBe(3);
  expect(v2.outflow).toBe(0);

  // check the satisfied property
  expect(v1.constraintsSatisfied).toBe(false);
  expect(v2.constraintsSatisfied).toBe(true);
});

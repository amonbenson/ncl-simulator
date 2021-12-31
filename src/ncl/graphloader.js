import yaml from "js-yaml";
import * as math from "mathjs";
import { CENTER } from "./graph/label";
import Converter from "./graph/component/converter";
import Existential from "./graph/component/existential";
import Universal from "./graph/component/universal";
import CNF from "./graph/component/cnf";


const components = Object.freeze({
  converter: Converter,
  existential: Existential,
  universal: Universal,
  cnf: CNF
});


export class GraphLoaderError extends Error {
  constructor(message, internalError = undefined) {
    super(internalError ? `${message}: ${internalError.message}` : message);
    this.name = this.constructor.name;
    if (internalError) this.stack = internalError.stack;
  }
}

const parseId = (g, groupId, id, existsIn = null) => {
  // if the id exists on the graph, treat it as a global id
  if (existsIn && g[existsIn][id]) return id;

  // otherwise, treat it as a local group id
  else return `${groupId}.${id}`;
}

const parsePosition = (x, y, offset = [0, 0]) => math.add(
  math.matrix([x, y]),
  math.matrix(offset)
);

const parseConfig = (data, groupConfig) => ({
  ...groupConfig,
  ...data
    .filter(arg => typeof(arg) === "object" || typeof(arg) === "string")
    .map(arg => typeof(arg) === "string" ? { [arg]: true } : arg)
    .reduce((config, arg) => ({ ...config, ...arg }), {})
});

export const parseComponent = (g, id, data, group) => {
  try {
    let [x, y, type] = data;
    const componentId = parseId(g, group.id, id);
    const position = parsePosition(x, y, group.position);
    const { muted, ...config } = parseConfig(data, group);
    const ComponentClass = components[type];

    g.addComponent(componentId, position, ComponentClass, Boolean(muted), config);
  } catch (err) {
    console.error(new GraphLoaderError(
      `Could not create component ${group.id}.${id}`,
      err
    ));
  }
}

export const parseVertex = (g, id, data, group) => {
  try {
    let [x, y] = data;
    const vertexId = parseId(g, group.id, id);
    const position = parsePosition(x, y, group.position)
    const { hidden, muted } = parseConfig(data, group);

    g.addVertex(vertexId, position, !hidden, Boolean(muted));
  } catch (err) {
    console.error(new GraphLoaderError(
      `Could not create vertex ${group.id}.${id}`,
      err
    ));
  }
}

export const parseEdge = (g, id, data, group) => {
  try {
    let [from, to, weight] = data;
    const edgeId = parseId(g, group.id, id);
    from = parseId(g, group.id, from, "vertices");
    to = parseId(g, group.id, to, "vertices");
    weight = isNaN(weight) ? 1 : weight;
    const { muted, label, flip } = parseConfig(data, group);

    // flip the edge at creation
    if (flip) {
      [from, to] = [to, from];
    }

    // create the edge
    const edge = g.addEdge(edgeId, from, to || from, weight, muted);

    // create an optional label
    if (label) {
      const text = label === true ? id : String(label);
      g.addLabel(`${edgeId}.label`, edge.labelPosition, text, CENTER, CENTER);
    }
  } catch (err) {
    console.error(new GraphLoaderError(
      `Could not create edge ${group.id}.${id}`,
      err
    ));
  }
}

export const parseLabel = (g, id, data, group) => {
  try {
    let [x, y, text, halign, valign] = data;
    const labelId = parseId(g, group.id, id);
    const position = parsePosition(x, y, group.position);
    const { muted } = parseConfig(data, group);

    g.addLabel(labelId, position, text, String(halign || CENTER), String(valign || CENTER), muted);
  } catch (err) {
    console.error(new GraphLoaderError(
      `Could not create label ${group.id}.${id}`,
      err
    ));
  }
}

export default async (g, data) => {
  // reset the graph
  g.clear();

  // load the document
  const doc = typeof(data) === 'string' ? await yaml.load(data) : data;
  const groups = doc.groups || {};

  const position = doc.position || [0, 0];
  const components = doc.components || {};
  const vertices = doc.vertices || {};
  const edges = doc.edges || {};
  const labels = doc.labels || [];

  // add the default group
  groups.default = {
    position,
    components,
    vertices,
    edges,
    labels
  };

  // create groups
  const groupConfig = {
    id: "default",
    position: math.matrix([0, 0]),
    muted: false
  }
  Object.entries(groups).forEach(([groupId, group]) => {
    groupConfig.id = groupId;
    groupConfig.position = math.matrix(group.position || [0, 0]);
    groupConfig.muted = Boolean(group.muted);

    const components = group.components || {};
    const vertices = group.vertices || {};
    const edges = group.edges || {};
    const labels = group.labels || [];

    Object.entries(components).forEach(([id, data]) => parseComponent(g, id, data, groupConfig));
    Object.entries(vertices).forEach(([id, data]) => parseVertex(g, id, data, groupConfig));
    Object.entries(edges).forEach(([id, data]) => parseEdge(g, id, data, groupConfig));
    labels.forEach((data, index) => parseLabel(g, `label${index}`, data, groupConfig));
  });
};

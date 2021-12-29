import yaml from "js-yaml";
import * as math from "mathjs";
import Converter from "./graph/component/converter";

const components = Object.freeze({
  converter: Converter
});


export class GraphLoaderError extends Error {
  constructor(message, internalError = undefined) {
    super(internalError ? `${message}: ${internalError.message}` : message);
    this.name = this.constructor.name;
    if (internalError) this.internalError = internalError;
  }
}

export const parseComponent = (g, id, v, offset) => {
  try {
    const [x, y, type, ...args] = v;
    const position = math.add(math.resize(math.matrix([x, y]), [2]), offset);
    const ComponentClass = components[type];

    g.addComponent(id, position, ComponentClass, ...args);
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create component from "${id}: ${v}".`,
      err
    );
  }
}

export const parseVertex = (g, id, v, offset) => {
  try {
    const position = math.add(math.resize(math.matrix(v), [2]), offset);
    const visible = !v.includes('hidden');

    g.addVertex(id, position, visible);
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create vertex from "${id}: ${v}".`,
      err
    );
  }
}

export const parseEdge = (g, id, e, groupId = null) => {
  try {
    let [from, to, weight] = e;
    weight = Number(weight) || 1;
    const labelVisible = e.includes('label');

    // resolve groups
    if (groupId) {
      from = `${groupId}.${from}`;
      to = `${groupId}.${to}`;
    }

    g.addEdge(id, from, to || from, weight, labelVisible);
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create edge from "${id}: ${e}".`,
      err
    );
  }
}

export default async (g, data) => {
  // reset the graph
  g.clear();

  // load the document
  const doc = typeof(data) === 'string' ? await yaml.load(data) : data;
  const components = doc.components || {};
  const vertices = doc.vertices || {};
  const edges = doc.edges || {};
  const groups = doc.groups || {};

  // add the default group
  groups._default = {
    position: [0, 0],
    components,
    vertices,
    edges
  };

  // create groups
  Object.entries(groups).forEach(([groupId, group]) => {
    const components = group.components || {};
    const vertices = group.vertices || {};
    const edges = group.edges || {};
    const offset = math.resize(math.matrix(group.position || [0, 0]), [2]);

    Object.entries(components).forEach(([id, c]) => parseComponent(g, `${groupId}.${id}`, c, offset));
    Object.entries(vertices).forEach(([id, v]) => parseVertex(g, `${groupId}.${id}`, v, offset));
    Object.entries(edges).forEach(([id, e]) => parseEdge(g, `${groupId}.${id}`, e, groupId));
  });
};

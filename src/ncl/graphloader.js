import yaml from "js-yaml";
import * as math from "mathjs";
import { CENTER } from "./graph/label";
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

const parsePosition = (x, y, offset = [0, 0]) => math.add(
  math.matrix([x, y]),
  math.matrix(offset)
);

const parseOptions = args => args
  .filter(arg => typeof(arg) === "object" || typeof(arg) === "string")
  .map(arg => typeof(arg) === "string" ? { [arg]: true } : arg)
  .reduce((options, arg) => ({ ...options, ...arg }), {});

export const parseComponent = (g, id, data, offset) => {
  try {
    const [x, y, type, ...args] = data;
    const position = parsePosition(x, y, offset);
    const ComponentClass = components[type];

    g.addComponent(id, position, ComponentClass, ...args);
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create component ${id}`,
      err
    );
  }
}

export const parseVertex = (g, id, data, offset) => {
  try {
    const [x, y] = data;
    const position = parsePosition(x, y, offset)
    const { hidden } = parseOptions(data);

    g.addVertex(id, position, !hidden);
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create vertex ${id}`,
      err
    );
  }
}

export const parseEdge = (g, id, data, groupId = null) => {
  try {
    let [from, to, weight] = data;
    weight = Number(weight) || 1;
    const { label } = parseOptions(data);

    // resolve groups
    if (groupId) {
      from = `${groupId}.${from}`;
      to = `${groupId}.${to}`;
    }

    // create the edge
    const edge = g.addEdge(id, from, to || from, weight);

    // create an optional label
    if (label) {
      const text = label === true ? id.split(".").pop() : String(label);
      g.addLabel(`${id}.label`, edge.labelPosition, text, CENTER, CENTER);
    }
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create edge ${id}`,
      err
    );
  }
}

export const parseLabel = (g, id, data, offset) => {
  try {
    const [x, y, text, halign, valign] = data;
    const position = parsePosition(x, y, offset);

    g.addLabel(id, position, text, String(halign) || CENTER, String(valign) || CENTER);
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create label ${id}`,
      err
    );
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
  Object.entries(groups).forEach(([groupId, group]) => {
    const components = group.components || {};
    const vertices = group.vertices || {};
    const edges = group.edges || {};
    const labels = group.labels || [];
    const offset = math.resize(math.matrix(group.position || [0, 0]), [2]);

    Object.entries(components).forEach(([id, data]) => parseComponent(g, `${groupId}.${id}`, data, offset));
    Object.entries(vertices).forEach(([id, data]) => parseVertex(g, `${groupId}.${id}`, data, offset));
    Object.entries(edges).forEach(([id, data]) => parseEdge(g, `${groupId}.${id}`, data, groupId));
    labels.forEach((data, index) => parseLabel(g, `${groupId}.label${index}`, data, offset));
  });
};

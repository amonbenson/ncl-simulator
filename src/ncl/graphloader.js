import yaml from "js-yaml";
import * as math from "mathjs";

export class GraphLoaderError extends Error {
  constructor(message, internalError = undefined) {
    super(internalError ? `${message}: ${internalError.message}` : message);
    this.name = this.constructor.name;
    if (internalError) this.internalError = internalError;
  }
}

export const parseVertex = (g, id, v, offset) => {
  try {
    const position = math.add(math.resize(math.matrix(v), [2]), offset);
    const hidden = v.includes('hidden');

    g.addVertex(id, position, hidden);
  } catch (err) {
    throw new GraphLoaderError(
      `Could not create vertex from "${id}: ${v}".`,
      err
    );
  }
}

export const parseEdge = (g, id, e, groupId = null) => {
  try {
    let [from, to] = e.filter((entry) => isNaN(entry));
    const weight = e.find((entry) => !isNaN(entry)) || 1;

    // resolve groups
    if (groupId) {
      from = `${groupId}.${from}`;
      to = `${groupId}.${to}`;
    }

    g.addEdge(id, from, to || from, weight);
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
  const { vertices, edges, groups } = typeof(data) === 'string' ? await yaml.load(data) : data;

  // create global vertices and edges
  Object.entries(vertices || {}).forEach(([id, v]) => parseVertex(g, id, v));
  Object.entries(edges || {}).forEach(([id, e]) => parseEdge(g, id, e));

  // create groups
  Object.entries(groups || {}).forEach(([groupId, { position, vertices, edges }]) => {
    const offset = math.resize(math.matrix(position || [0, 0]), [2]);

    Object.entries(vertices || {}).forEach(([id, v]) => parseVertex(g, `${groupId}.${id}`, v, offset));
    Object.entries(edges || {}).forEach(([id, e]) => parseEdge(g, `${groupId}.${id}`, e, groupId));
  });
};

import yaml from "js-yaml";
import * as math from "mathjs";

export class GraphLoaderError extends Error {
  constructor(message, internalError = undefined) {
    super(internalError ? `${message}: ${internalError.message}` : message);
    this.name = this.constructor.name;
    if (internalError) this.internalError = internalError;
  }
}

const loadGraph = async (g, data) => {
  // reset the graph
  g.clear();

  // load the document
  const doc = typeof(data) === 'string' ? await yaml.load(data) : data;
  const { vertices, edges } = doc;

  if (!vertices) throw new GraphLoaderError('No "vertices" section found.');
  if (!edges) throw new GraphLoaderError('No "edges" section found.');

  // create all vertices
  Object.entries(vertices).forEach(([id, v]) => {
    try {
      const position = math.resize(math.matrix(v), [2]);

      g.addVertex(id, position);
    } catch (err) {
      throw new GraphLoaderError(
        `Could not create vertex from "${id}: ${v}".`,
        err
      );
    }
  });

  // create all edges
  Object.entries(edges).forEach(([id, e]) => {
    try {
      const [from, to] = e.filter((entry) => isNaN(entry));
      const weight = e.find((entry) => !isNaN(entry)) || 1;

      g.addEdge(id, from, to || from, weight);
    } catch (err) {
      throw new GraphLoaderError(
        `Could not create edge from "${id}: ${e}".`,
        err
      );
    }
  });
};

export default loadGraph;

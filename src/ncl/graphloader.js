import yaml from "js-yaml";
import * as math from "mathjs";
import { CENTER, LEFT } from "./graph/label";
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

export const loadYaml = async (g, data) => {
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

export const loadQbf = async (g, data) => {
  if (!/^((forall|exists)\s[a-zA-Z]\s?)+:[\s\(\)\|\&\!a-zA-Z]*$/gm.test(data)) {
    throw new GraphLoaderError(`Invalid QBF format: ${data}`);
  }
  const [quantifiers, formula] = data.split(/\s*:\s*/);
  const qlist = quantifiers
    .split(/\s/)
    .reduce((acc, cur, i) => i % 2 === 0 ? [...acc, cur] : [...acc.slice(0, -1), [...acc.slice(-1), cur]], [])

  // reset the graph
  g.clear();

  // create the quantifiers
  qlist.forEach(([quantifier, variable], i) => {
    g.addComponent(
      `q${variable}`,
      [i * 4, 0],
      quantifier === "forall" ? Universal : Existential,
      false,
      { variable }
    );
  });

  // create the cnf
  const cnf = g.addComponent(
    `cnf`,
    [0, -3],
    CNF,
    false,
    { formula }
  );

  // make sure the number of quantifiers matches the number of cnf variables
  if (cnf.formula.variables.length !== qlist.length) {
    g.clear();
    throw new GraphLoaderError(`Uneven number of quantifiers and variables: ${data}`);
  }

  // connect the literals
  cnf.formula.variables.forEach(v => {
    // create the edges
    const x = g.addEdge(`e.${v}`, `cnf.${v}`, `q${v}.out`);
    const nx = g.addEdge(`e.n${v}`, `cnf.!${v}`, `q${v}.inv`);

    // create the labels
    g.addLabel(`${x.id}.label`, x.labelPosition, v);
    g.addLabel(`${nx.id}.label`, nx.labelPosition, `¬${v}`);
  });

  // connect the quantifiers
  cnf.formula.variables.forEach((b, i, list) => {
    if (i === 0) return;
    const a = list[i - 1];

    // create the edges
    g.addEdge(`e.${a}${b}.try`, `q${b}.tryin`, `q${a}.tryout`, 2);
    g.addEdge(`e.${a}${b}.sat`, `q${a}.satin`, `q${b}.satout`, 2);
  })

  const v0 = qlist[0][1];
  const vn = qlist[qlist.length - 1][1];
  const w = cnf.formula.variables.length * 4 - 1;
  let e;

  // create the left side circuitry
  g.addVertex('tryin', [-2, 1]);
  g.addEdge('tryin.loop', 'tryin', 'tryin', 2);
  e = g.addEdge('tryin.conn', `q${v0}.tryin`, 'tryin', 2);
  g.addLabel(`tryin.conn.label`, e.labelPosition, 'try in');

  g.addVertex('satout.L', [-2, 2]);
  g.addVertex('satout.A', [-3, 1.5]);
  g.addVertex('satout.B', [-3, 2.5]);
  g.addEdge('satout.LA', 'satout.A', 'satout.L', 2);
  g.addEdge('satout.LB', 'satout.L', 'satout.B', 2);
  g.addEdge('satout.AB', 'satout.B', 'satout.A', 2);
  e = g.addEdge('satout.conn', 'satout.L', `q${v0}.satout`, 2);
  g.addLabel(`satout.conn.label`, e.labelPosition, 'satisfied out');

  // create the right side circuitry
  g.addComponent('tryout.conv', [w + 2, 1], Converter);
  g.addComponent('result.conv', [w + 3, 2], Converter);
  g.addVertex('satin.and', [w + 2, 2]);

  e = g.addEdge('tryout', 'tryout.conv', `q${vn}.tryout`, 2);
  g.addLabel(`tryout.label`, e.labelPosition, 'try out');

  e = g.addEdge('result', 'result.conv', 'cnf.satisfied', 2);
  g.addLabel(`result.label`, [w + 3.1, -0.5], 'satisfied', LEFT);

  g.addEdge('satin.and.in0', 'satin.and', 'tryout.conv', 1);
  g.addEdge('satin.and.in1', 'satin.and', 'result.conv', 1);

  e = g.addEdge('satin', `q${vn}.satin`, 'satin.and', 2);
  g.addLabel(`satin.label`, e.labelPosition, 'satified in');
}

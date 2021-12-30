import * as math from "mathjs";

export default class Component {
  constructor(id, position, vertexCreator, ports, muted = false) {
    this.id = id;
    this._position = math.matrix(position);
    this.ports = Object.fromEntries(Object
      .entries(ports)
      .map(([portId, { position: portPosition, constraintValidator }]) => {
        // if the component has only one port, use the component id as port id, otherwise use individual ids
        const vertexId = Object.keys(ports).length === 1 ? id : `${id}.${portId}`;
        const port = vertexCreator(vertexId, math.add(position, portPosition), false);
        port.constraintValidator = constraintValidator;

        return [portId, port];
      }));
    this.muted = muted;
    this.size = math.matrix([0, 0]);
    this.label = "";
  }

  get position() {
    return this._position;
  }

  set position(value) {
    // move each port to update the position
    const delta = math.subtract(value, this._position);
    this.ports.forEach(port => port.position = math.add(port.position, delta));
    this._position = value;
  }

  get constraintSatisfied() {
    return Object.values(this.ports).every(port => port.constraintSatisfied);
  }
}

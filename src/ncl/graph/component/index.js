import * as math from "mathjs";

export default class Component {
  constructor(id, position, vertexCreator, ports) {
    this.id = id;
    this._position = math.resize(math.matrix(position), [2]);
    this.ports = Object.fromEntries(Object
      .entries(ports)
      .map(([portId, { position: portPosition, constraintValidator }]) => {
        const port = vertexCreator(`${id}.${portId}`, math.add(position, portPosition), true);
        port.constraintValidator = constraintValidator;

        return [portId, port];
      }));
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
}

import Component from ".";
import Vertex from "../vertex";
import * as math from "mathjs";

export default class Converter extends Component {
  constructor(id, position, vertexCreator, muted = false, config = {}) {
    super(
      id,
      position,
      vertexCreator,
      {
        port: {
          position: [0, 0],
          constraintValidator: v => v.portConnected(1, 1) && v.portActive(Vertex.INPUT)
        }
      },
      muted
    );
  }

  get singleEdge() {
    return Object.values(this.ports.port.edges).find(e => e.weight === 1);
  }

  get doubleEdge() {
    return Object.values(this.ports.port.edges).find(e => e.weight === 2);
  }

  get orientation() {
    const { port } = this.ports;
    const { singleEdge, doubleEdge } = this;
    if (!singleEdge || !doubleEdge) return 0;

    const singleEdgeDelta = math.subtract(
      port.position,
      singleEdge.opposite(port).position
    );
    const doubleEdgeDelta = math.subtract(
      doubleEdge.opposite(port).position,
      port.position
    );

    const singleEdgeDirection = math.dotDivide(singleEdgeDelta, math.norm(singleEdgeDelta));
    const doubleEdgeDirection = math.dotDivide(doubleEdgeDelta, math.norm(doubleEdgeDelta));
    const combined = math.add(singleEdgeDirection, doubleEdgeDirection);
    const orientation = math.atan2(combined._data[1], combined._data[0]);
    return orientation;
  }
}

import Component from ".";
import * as math from "mathjs";

export default class Converter extends Component {
  constructor(id, position, vertexCreator) {
    super(id, position, vertexCreator, {
      port: {
        position: [0, 0],
        constraintValidator: () => {
          const { edges, inflow } = this.ports.port;
          const singleEdges = Object.values(edges).filter(e => e.weight === 1);
          const doubleEdges = Object.values(edges).filter(e => e.weight === 2);

          // validate the number of connected edges
          if (singleEdges.length !== 1) return false;
          if (doubleEdges.length !== 1) return false;

          // validate the inflow constraint
          return inflow >= 1;
        }
      }
    });
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

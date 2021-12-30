import Component from ".";
import Vertex from "../vertex";
import * as math from "mathjs";


export default class Existential extends Component {
  constructor(id, position, vertexCreator, muted = false, config = {}) {
    super(
      id,
      position,
      vertexCreator,
      {
        tryin: {
          position: [0, 1],
          constraintValidator: v => v.portConnected(0, 1) && this.validate()
        },
        tryout: {
          position: [3, 1],
          constraintValidator: v => v.portConnected(0, 1) && this.validate()
        },
        satin: {
          position: [3, 2],
          constraintValidator: v => v.portConnected(0, 1) && this.validate()
        },
        satout: {
          position: [0, 2],
          constraintValidator: v => v.portConnected(0, 1) && this.validate()
        },
        out: {
          position: [1, 0],
          constraintValidator: v => v.portConnected(1, 0) && this.validate()
        },
        inv: {
          position: [2, 0],
          constraintValidator: v => v.portConnected(1, 0) && this.validate()
        }
      },
      muted
    )

    this.variable = String(config.variable || "X");
    this.size = math.matrix([3, 3]);
    this.label = `∃${this.variable}`;
  }

  validate() {
    const { tryin, tryout, satin, satout, out, inv } = this.ports;

    // if tryout is active, tryin must be active too
    if (tryout.output && !tryin.input) return false;

    // if tryout is active, only out or inv, but not both may be active
    if (tryout.output && out.output && inv.output) return false;

    // if satout is active, satin must be active too
    if (satout.output && !satin.input) return false;

    return true;
  }
}
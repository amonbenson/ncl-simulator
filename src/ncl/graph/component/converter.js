import Component from ".";

export default class Converter extends Component {
  constructor(id, position, vertexCreator) {
    super(id, position, vertexCreator, {
      port: {
        position: [0, 0],
        constraintValidator: () => {
          return this.ports.port.inflow >= 1;
        }
      }
    });
  }
}

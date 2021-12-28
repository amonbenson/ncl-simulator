import EventEmitter from "events";
import Graph from "./graph";

export default class NCLMachine extends EventEmitter {
  constructor() {
    super();

    this.graph = new Graph();
  }
}

import Component from ".";
import Vertex from "../vertex";
import * as math from "mathjs";


export class CNFFormula {
  constructor(formula) {
    this.parse(formula);
  }

  parse(formula) {
    const validate = (string, pattern) => {
      if (!pattern.test(string)) throw new Error(`Invalid formula: ${string}`);
      return string;
    }

    this.formula = String(formula);
    this.variables = [];
    this.clauses = this.formula
      .replace(/\s/g, "")
      .split("&&")
      .map(clause => validate(clause, /^\(.*\)$/g)) // make sure each clause is surrounded by parentheses
      .map(clause => clause
        .replace(/[\(\)]/g, "") // remove parentheses
        .split("||")
        .map(literal => validate(literal, /^!?[a-zA-Z]$/g)) // make sure each literal is a (negated) variable
        .map(literal => {
          const negated = literal[0] === "!";
          const variable = literal.slice(-1);

          // store the variable
          if (!this.variables.includes(variable)) this.variables.push(variable);

          // return the literal as parsed object
          return { negated, variable };
        }));
  }
}


export default class CNF extends Component {
  constructor(id, position, vertexCreator, muted = false, config = {}) {
    const formula = new CNFFormula(config.formula || "(X)");
    const varcount = formula.variables.length;

    super(
      id,
      position,
      vertexCreator,
      {
        ...formula.variables.reduce((ports, variable, i) => ({
          ...ports,
          [`${variable}`]: {
            position: [i * 4 + 1, 2],
            constraintValidator: v => v.portConnected(1, 0) && this.validate()
          },
          [`!${variable}`]: {
            position: [i * 4 + 2, 2],
            constraintValidator: v => v.portConnected(1, 0) && this.validate()
          }
        }), {}),
        satisfied: {
          position: [varcount * 4 + 2, 2],
          constraintValidator: v => v.portConnected(0, 1) && this.validate()
        }
      },
      muted
    )

    this.formula = formula;
    this.label = this.formula.formula
      .replace(/\s/g, "")
      .replaceAll("!", "¬")
      .replaceAll("&&", " ∧ ")
      .replaceAll("||", " ∨ ");
    

    this.size = math.matrix([varcount * 4 + 3, 2]);
  }

  validate() {
    const variablePort = ({ variable, negated }) => this.ports[negated ? `!${variable}` : `${variable}`];

    // satisfied port can be activated when all clauses are satisfied
    // if a literal should be negated, the corresponding port shall be active and vice versa
    const formulaSatisfied = this.formula.clauses
      .every(clause => clause // check conjunkton of clauses
        .some(literal => variablePort(literal).input)); // check disjunktion of literals

    // either the output is disabled or the formula is actually true
    return !this.ports.satisfied.output || formulaSatisfied
  }
}

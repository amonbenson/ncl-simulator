import "./styles.css";
import p5 from "p5";
import * as math from "mathjs";
import NCLMachine from "./ncl";
import Transformer from "./transformer";
import loadGraph from "./ncl/graphloader";


const ncl = new NCLMachine();
const graph = ncl.graph;

const sketch = new p5((s) => {
  // sketch constants
  const COLOR_BACKGROUND = s.color(255);
  const COLOR_VERTEX = s.color(0);
  const COLOR_VERTEX_UNSATISFIED = s.color(255, 0, 0);
  const COLOR_EDGE_SINGLE = s.color(255, 128, 120);
  const COLOR_EDGE_SINGLE_ACTIVE = s.color(255, 192, 192);
  const COLOR_EDGE_DOUBLE = s.color(0, 0, 255);
  const COLOR_EDGE_DOUBLE_ACTIVE = s.color(128, 128, 255);

  // sketch globals and variables
  const t = new Transformer(s);
  let screenOffset = math.matrix([0, 0]);
  let screenScale = math.matrix([100, 100]);
  let screenToGraph = t.get();

  let activeEdge = null;

  // custom arrow function
  s.arrow = (position, size, direction) => {
    t.push();
    t.translate(position);
    t.rotate(direction);

    s.line(-size / 2, size, size / 2, 0);
    s.line(-size / 2, -size, size / 2, 0);

    t.pop();
  };

  s.setup = () => {
    s.createCanvas(s.windowWidth, s.windowHeight);

    // enable manual redraw
    s.noLoop();
    graph.on("update", () => s.redraw());
  };

  s.draw = () => {
    s.background(COLOR_BACKGROUND);

    // global transform
    t.push();
    const canvasCenter = math.dotDivide(math.matrix([s.width, s.height]), 2);
    t.translate(canvasCenter);
    t.translate(screenOffset);
    t.scale(screenScale);

    // store the screen transform
    screenToGraph = t.getInverse();

    // draw all edges
    Object.values(graph.edges).forEach(edge => {
      const { from, to, weight, center, delta } = edge;
      const active = edge === activeEdge;

      if (weight <= 1) s.stroke(active ? COLOR_EDGE_SINGLE_ACTIVE : COLOR_EDGE_SINGLE);
      else s.stroke(active ? COLOR_EDGE_DOUBLE_ACTIVE : COLOR_EDGE_DOUBLE);
      s.noFill();

      if (from !== to) {
        // draw the undirected edge
        s.strokeWeight(0.1);
        s.line(...from.position._data, ...to.position._data);

        // draw the direction arrow
        const direction = math.atan2(delta._data[1], delta._data[0]);
        s.strokeWeight(0.08);
        s.arrow(center, 0.1, direction);
      } else {
        // draw a circular edge
        const r = 0.3;
        const c = math.add(
          from.position,
          math.dotMultiply(from.preferredEdgeDirection, r)
        );
        s.strokeWeight(0.1);
        s.circle(...c._data, r * 2);
      }
    });

    // draw all vertices
    Object.values(graph.vertices).filter(v => !v.hidden).forEach(vertex => {
      const { position, constraintSatisfied } = vertex;

      // vertex transform
      t.push();
      t.translate(position);
      s.noStroke();
      s.fill(constraintSatisfied ? COLOR_VERTEX : COLOR_VERTEX_UNSATISFIED);

      // store the vertex screen position
      vertex.screenPosition = t.apply(math.zeros(2));

      // draw the vertex
      s.circle(0, 0, 0.25);

      t.pop();
    });

    t.pop();
  };

  s.windowResized = () => {
    s.resizeCanvas(s.windowWidth, s.windowHeight);
  };

  s.mouseMoved = () => {
    // transform the mouse position to graph coordinates
    const mouse = math.resize(math.multiply(screenToGraph, math.matrix([s.mouseX, s.mouseY, 1])), [2]);

    // select the active edge
    const { edge } = Object.values(graph.edges)
      .map(edge => ({ edge, distance: math.distance(edge.center, mouse) }))
      .filter(({ edge, distance }) => !edge.circular && distance <= 0.5)
      .reduce((nearest, current) => current.distance < nearest.distance ? current : nearest, {
        edge: null,
        distance: Infinity
      });

    // perform a redraw if the active edge changed
    if (edge !== activeEdge) {
      activeEdge = edge;
      s.redraw();
    }
  }

  s.mousePressed = () => {
    // flip the active edge
    if (activeEdge) {
      graph.reverseEdge(activeEdge.id);
    }
  }

  s.mouseReleased = () => {
    // flip an edge back if the vertex constraints are not satisfied
    if (activeEdge && !activeEdge.constraintSatisfied) {
      graph.reverseEdge(activeEdge.id);
    }
  }

  s.mouseDragged = () => {
    if (activeEdge) return;

    const delta = math.matrix([s.movedX, s.movedY]);
    screenOffset = math.add(screenOffset, delta);
    s.redraw();
  }

  s.mouseWheel = event => {
    const delta = event.delta * -0.0003;
    const scale = math.matrix([1 + delta, 1 + delta]);
    screenScale = math.dotPow(screenScale, scale);
    s.redraw();
  }
});

// main function
document.addEventListener("DOMContentLoaded", async () => {
  const file = await import("./graphs/andor.yml");
  await loadGraph(graph, file);
});
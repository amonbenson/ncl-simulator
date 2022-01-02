import "./styles.css";
import p5 from "p5";
import * as math from "mathjs";
import NCLMachine from "./ncl";
import Transformer from "./transformer";
import loadGraph from "./ncl/graphloader";
import Converter from "./ncl/graph/component/converter";
import graphlist from "./graphlist";


const ncl = new NCLMachine();
const graph = ncl.graph;


const sketch = (s) => {
  // sketch constants
  const COLOR_BACKGROUND = s.color("#FFFFFF");
  const COLOR_FOREGROUND = s.color("#031927");
  const COLOR_FOREGROUND_LIGHTER = s.lerpColor(COLOR_BACKGROUND, COLOR_FOREGROUND, 0.5);
  const COLOR_MUTED = s.color("#FFFFFF80");
  const COLOR_UNSATISFIED = s.color("#EF233C");
  const COLOR_EDGE_SINGLE = s.color("#FE7E6D");
  const COLOR_EDGE_SINGLE_ACTIVE = s.color("#FEA59A");
  const COLOR_EDGE_DOUBLE = s.color("#2F3A8F");
  const COLOR_EDGE_DOUBLE_ACTIVE = s.color("#5663C8");

  // sketch globals and variables
  const t = new Transformer(s);
  let screenOffset = math.matrix([0, 0]);
  let screenScale = math.matrix([90, 90]);
  let screenToGraph = t.get();

  let lastMouse = math.zeros(2);
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

    // create gui
    graphlist.forEach((g, i) => {
      const button = s.createButton(g.name);
      button.mousePressed(() => loadGraph(graph, g));
      button.parent("menu");
      button.class("menu-item");
    })
  };

  const drawEdge = edge => {
    const { from, to, weight, center, delta } = edge;
    const active = edge === activeEdge;

    const color = weight <= 1
      ? (active ? COLOR_EDGE_SINGLE_ACTIVE : COLOR_EDGE_SINGLE)
      : (active ? COLOR_EDGE_DOUBLE_ACTIVE : COLOR_EDGE_DOUBLE);
    s.stroke(color);
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
  };

  const drawVertex = vertex => {
    const { position, constraintSatisfied, visible } = vertex;

    // skip hidden vertices
    if (!visible) return;

    // vertex transform
    t.push();
    t.translate(position);

    const color = constraintSatisfied ? COLOR_FOREGROUND : COLOR_UNSATISFIED;
    s.noStroke();
    s.fill(color);

    // draw the vertex
    s.circle(0, 0, 0.25);

    t.pop();
  };

  const drawComponent = component => {
    const { position, size, label, constraintSatisfied, internalLatch } = component;

    // component transform
    const foreground = constraintSatisfied ? COLOR_FOREGROUND : COLOR_UNSATISFIED;
    t.push();
    t.translate(position);

    switch(component.constructor) {
      case Converter:
        const r = 0.4;
        s.rotate(component.orientation);

        // draw both semi circles
        s.noStroke();
        s.fill(COLOR_EDGE_SINGLE);
        s.circle(0, 0, r);
        s.fill(COLOR_EDGE_DOUBLE);
        s.arc(0, 0, r, r, -s.HALF_PI, s.HALF_PI);

        // draw the outline
        s.noFill();
        s.stroke(foreground);
        s.strokeWeight(0.05);
        s.circle(0, 0, r);

        break;
      default:
        // draw the outline
        s.fill(COLOR_BACKGROUND);
        s.stroke(foreground);
        s.strokeWeight(0.05)

        s.rect(0, 0, ...size._data);

        // draw the label
        s.noStroke();
        s.fill(foreground);
        s.textSize(0.5);
        s.textAlign(s.CENTER, s.CENTER);
    
        s.text(label, ...math.dotDivide(size, 2)._data);

        // draw an optional internal latch notifier
        if (internalLatch) {
          s.fill(COLOR_FOREGROUND_LIGHTER);
          s.textSize(0.3);
          s.text("latch set", ...math.add(math.dotDivide(size, 2), [0, 0.4])._data);
        }

        break;
    }

    t.pop();
  };

  const drawLabel = label => {
    const { position, text, halign, valign } = label;

    t.push();
    t.translate(position);

    s.noStroke();
    s.fill(COLOR_FOREGROUND);
    s.textSize(0.25);
    s.textAlign(valign, halign);

    s.text(text, 0, 0);

    t.pop();
  };

  const drawGraph = (graph, filter) => {
    // draw all graph components
    Object.values(graph.edges).filter(filter).forEach(drawEdge);
    Object.values(graph.vertices).filter(filter).forEach(drawVertex);
    Object.values(graph.components).filter(filter).forEach(drawComponent);
    Object.values(graph.labels).filter(filter).forEach(drawLabel);
  }

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

    // draw all muted content
    drawGraph(graph, c => c.muted);
    s.noStroke();
    s.fill(COLOR_MUTED);

    // draw the muted overlay in screen space coordinates
    s.rect(-100, -100, 200, 200);

    // draw all visible content
    drawGraph(graph, c => !c.muted);

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
    // reset the last mouse position
    lastMouse = math.matrix([s.mouseX, s.mouseY]);

    // flip the active edge
    if (activeEdge) {
      graph.reverseEdge(activeEdge.id);
    }
  }

  s.mouseReleased = () => {
    // flip an edge back if the vertex constraints are not satisfied anymore
    if (activeEdge && !graph.constraintSatisfied) {
      graph.reverseEdge(activeEdge.id);
    }
  }

  s.mouseDragged = () => {
    const mouse = math.matrix([s.mouseX, s.mouseY]);
    const delta = math.subtract(mouse, lastMouse);
    lastMouse = math.matrix(mouse);

    if (activeEdge) return;

    screenOffset = math.add(screenOffset, delta);
    s.redraw();
  }

  s.mouseWheel = event => {
    const mouse = math.matrix([s.mouseX, s.mouseY]);
    const screenCenter = math.matrix([s.width / 2, s.height / 2]);
    const delta = event.delta * -0.001;
    const scale = math.exp(math.matrix([delta, delta]));

    screenScale = math.dotMultiply(screenScale, scale);
    screenOffset = math.add(
      math.dotMultiply(
        screenOffset,
        scale
      ),
      math.dotMultiply(
        math.subtract(
          mouse,
          screenCenter
        ),
        math.subtract(
          math.ones(2),
          scale
        )
      )
    );

    s.redraw();
  }
};

// main function
window.onload = async () => {
  new p5(sketch);
  await loadGraph(graph, graphlist[0]);
}

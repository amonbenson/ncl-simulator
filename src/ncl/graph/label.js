import * as math from "mathjs";


export const CENTER = "center";
export const TOP = "top";
export const BOTTOM = "bottom";
export const LEFT = "left";
export const RIGHT = "right";


export default class Label {
  constructor(id, position = [0, 0], text = "", valign = CENTER, halign = CENTER) {
    this.id = String(id);
    this.position = math.matrix(position);
    this.text = String(text);
    this.halign = String(halign);
    this.valign = String(valign);
  }
}

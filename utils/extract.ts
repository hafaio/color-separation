import * as d3color from "d3-color";
import { ColorSpaceObject } from "d3-color";

export function extractBmpColors(img: ImageData): Set<string> {
  const colors = new Set<string>();
  const size = img.width * img.height * 4;
  for (let i = 0; i < size; i += 4) {
    const color = d3color.rgb(img.data[i], img.data[i + 1], img.data[i + 2]);
    colors.add(color.formatHex());
  }
  return colors;
}

export function updateBmpColors(
  img: ImageData,
  update: (css: ColorSpaceObject) => ColorSpaceObject,
) {
  const size = img.width * img.height * 4;
  for (let i = 0; i < size; i += 4) {
    const color = d3color.rgb(img.data[i], img.data[i + 1], img.data[i + 2]);
    const { r, g, b } = update(color).rgb();
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
  }
}

const COLOR_PROPS = ["fill", "stroke", "stopColor"] as const;

export function extractSvgColors(doc: Document): Set<string> {
  const colors = new Set<string>();
  for (const elem of doc.querySelectorAll("*")) {
    if (elem instanceof SVGStyleElement) {
      for (const rule of elem.sheet?.cssRules ?? []) {
        if (rule instanceof CSSStyleRule) {
          for (const prop of COLOR_PROPS) {
            try {
              colors.add(d3color.color(rule.style[prop])!.formatHex());
            } catch {
              // noop
            }
          }
        }
      }
    } else if (elem instanceof SVGElement) {
      for (const prop of COLOR_PROPS) {
        try {
          colors.add(d3color.color(elem.style[prop])!.formatHex());
        } catch {
          // noop
        }
      }
    }
  }
  return colors;
}

export function updateSvgColors(
  doc: Document,
  update: (css: ColorSpaceObject) => ColorSpaceObject,
) {
  for (const elem of doc.querySelectorAll("*")) {
    if (elem instanceof SVGStyleElement) {
      const rules = [...(elem.sheet?.cssRules ?? [])];
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          for (const prop of COLOR_PROPS) {
            try {
              rule.style[prop] = update(
                d3color.color(rule.style[prop])!,
              ).toString();
            } catch {
              // noop
            }
          }
        }
      }
      // need to actually update the style
      elem.textContent = rules.map((rule) => rule.cssText).join("\n");
    } else if (elem instanceof SVGElement) {
      for (const prop of COLOR_PROPS) {
        try {
          elem.style[prop] = update(
            d3color.color(elem.style[prop])!,
          ).toString();
        } catch {
          // noop
        }
      }
    }
  }
}

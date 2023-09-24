import * as d3color from "d3-color";

const COLOR_PROPS = ["fill", "stroke", "stopColor"] as const;

export function extractColors(doc: Document): Set<string> {
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

export function updateColors(doc: Document, update: (css: string) => string) {
  for (const elem of doc.querySelectorAll("*")) {
    if (elem instanceof SVGStyleElement) {
      const rules = [...(elem.sheet?.cssRules ?? [])];
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          for (const prop of COLOR_PROPS) {
            try {
              rule.style[prop] = update(rule.style[prop]);
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
          elem.style[prop] = update(elem.style[prop]);
        } catch {
          // noop
        }
      }
    }
  }
}

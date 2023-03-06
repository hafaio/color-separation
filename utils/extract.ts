import { parseCSS } from "./color";

const COLOR_PROPS = ["fill", "stroke", "stopColor"] as const;

export function extractColors(doc: Document): Set<string> {
  const colors = new Set<string>();
  for (const elem of doc.querySelectorAll("*")) {
    if (elem instanceof SVGStyleElement) {
      for (const rule of elem.sheet?.cssRules ?? []) {
        if (rule instanceof CSSStyleRule) {
          for (const prop of COLOR_PROPS) {
            try {
              colors.add(parseCSS(rule.style[prop]));
            } catch {
              // noop
            }
          }
        }
      }
    } else if (elem instanceof SVGElement) {
      for (const prop of COLOR_PROPS) {
        try {
          colors.add(parseCSS(elem.style[prop]));
        } catch {
          // noop
        }
      }
    }
  }
  return colors;
}

export function updateColors(doc: Document, map: Map<string, string>) {
  for (const elem of doc.querySelectorAll("*")) {
    if (elem instanceof SVGStyleElement) {
      const rules = [...(elem.sheet?.cssRules ?? [])];
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          for (const prop of COLOR_PROPS) {
            try {
              const color = parseCSS(rule.style[prop]);
              rule.style[prop] = map.get(color) ?? "";
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
          const color = parseCSS(elem.style[prop]);
          elem.style[prop] = map.get(color) ?? "";
        } catch {
          // noop
        }
      }
    }
  }
}

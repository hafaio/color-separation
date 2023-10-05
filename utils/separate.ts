// FIXME rename
import * as d3color from "d3-color";
import { ColorSpaceObject } from "d3-color";
import { blob2imgdata, blob2url, imgdata2blob } from "./conversion";
import { colorSeparation } from "./sep";

const COLOR_PROPS = ["fill", "stroke", "stopColor"] as const;

async function* extractColors(
  url: string,
): AsyncIterableIterator<ColorSpaceObject> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  if (blob.type === "image/png" || blob.type === "image/jpeg") {
    const img = await blob2imgdata(blob);
    const size = img.width * img.height * 4;
    for (let i = 0; i < size; i += 4) {
      yield d3color.rgb(img.data[i], img.data[i + 1], img.data[i + 2]);
    }
  } else if (blob.type === "image/svg+xml") {
    const text = await blob.text();
    const parser = new DOMParser();
    const svg = parser.parseFromString(text, blob.type);
    for (const elem of svg.querySelectorAll("*")) {
      if (elem instanceof SVGStyleElement) {
        for (const rule of elem.sheet?.cssRules ?? []) {
          if (rule instanceof CSSStyleRule) {
            for (const prop of COLOR_PROPS) {
              const color = d3color.color(rule.style?.[prop]);
              if (color) {
                yield color;
              }
            }
          }
        }
      } else if (elem instanceof SVGImageElement) {
        for await (const color of extractColors(elem.href.baseVal)) {
          yield color;
        }
      } else if (elem instanceof SVGElement) {
        for (const prop of COLOR_PROPS) {
          const color = d3color.color(elem.style?.[prop]);
          if (color) {
            yield color;
          }
        }
      }
    }
  } else {
    throw new Error(`unhandled url type: ${blob.type}`);
  }
}

async function updateColors(
  url: string,
  update: (css: ColorSpaceObject) => ColorSpaceObject,
): Promise<Blob> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  if (blob.type === "image/png" || blob.type === "image/jpeg") {
    const img = await blob2imgdata(blob);
    const size = img.width * img.height * 4;
    for (let i = 0; i < size; i += 4) {
      const color = d3color.rgb(img.data[i], img.data[i + 1], img.data[i + 2]);
      const { r, g, b } = update(color).rgb();
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
    }
    return await imgdata2blob(img);
  } else if (blob.type === "image/svg+xml") {
    const text = await blob.text();
    const parser = new DOMParser();
    const svg = parser.parseFromString(text, blob.type);

    const proms = [];
    for (const elem of svg.querySelectorAll("*")) {
      if (elem instanceof SVGStyleElement) {
        const rules = [...(elem.sheet?.cssRules ?? [])];
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            for (const prop of COLOR_PROPS) {
              const init = d3color.color(rule.style?.[prop]);
              if (init) {
                rule.style[prop] = update(init).toString();
              }
            }
          }
        }
        // need to actually update the style
        elem.textContent = rules.map((rule) => rule.cssText).join("\n");
      } else if (elem instanceof SVGImageElement) {
        proms.push(
          (async () => {
            const blob = await updateColors(elem.href.baseVal, update);
            const url = await blob2url(blob);
            elem.setAttribute("href", url);
          })(),
        );
      } else if (elem instanceof SVGElement) {
        for (const prop of COLOR_PROPS) {
          const init = d3color.color(elem.style[prop]);
          if (init) {
            elem.style[prop] = update(init).toString();
          }
        }
      }
    }
    await Promise.all(proms);
    const serial = new XMLSerializer();
    const rendered = serial.serializeToString(svg);
    return new Blob([rendered], { type: "image/svg+xml" });
  } else {
    throw new Error(`unhandled url type: ${blob.type}`);
  }
}

export async function genPreview(
  image: string,
  pool: readonly ColorSpaceObject[],
  increments: number,
): Promise<Blob> {
  const update = new Map<string, ColorSpaceObject>();
  for await (const target of extractColors(image)) {
    const key = target.formatHex();
    if (update.has(key)) continue;
    const { color } = colorSeparation(target, pool, {
      increments,
    });
    update.set(key, color);
  }

  const updater = (orig: ColorSpaceObject): ColorSpaceObject => {
    return update.get(orig.formatHex())!.copy({ opacity: orig.opacity });
  };

  return await updateColors(image, updater);
}

export async function genSeparation(
  image: string,
  pool: readonly ColorSpaceObject[],
  increments: number,
): Promise<Blob[]> {
  const mapping = new Map<string, number[]>();
  for await (const target of extractColors(image)) {
    const key = target.formatHex();
    if (mapping.has(key)) continue;
    const { opacities } = colorSeparation(target, pool, {
      increments,
    });
    mapping.set(key, opacities);
  }

  return await Promise.all(
    pool.map((_, ind) => {
      const updater = (orig: ColorSpaceObject): ColorSpaceObject => {
        const opacity = mapping.get(orig.formatHex())![ind];
        const updated = d3color.gray((1 - opacity) * 100);
        return updated.copy({ opacity: orig.opacity });
      };

      return updateColors(image, updater);
    }),
  );
}

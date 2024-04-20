import * as d3color from "d3-color";
import { ColorSpaceObject } from "d3-color";
import { bulkColorSeparation } from "./bulksep";
import { blob2url, url2blob } from "./conversion";

const COLOR_PROPS = ["fill", "stroke", "stopColor"] as const;

async function* extractColors(
  blob: Blob,
): AsyncIterableIterator<ColorSpaceObject> {
  if (blob.type === "image/png" || blob.type === "image/jpeg") {
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height, {
      // eslint-disable-next-line spellcheck/spell-checker
      colorSpace: "srgb",
    });
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = data.slice(i, i + 3);
      yield d3color.rgb(r, g, b);
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
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              const color = d3color.color(rule.style?.[prop]);
              if (color) {
                yield color;
              }
            }
          }
        }
      } else if (elem instanceof SVGImageElement) {
        const href = await url2blob(elem.href.baseVal);
        for await (const color of extractColors(href)) {
          yield color;
        }
      } else if (elem instanceof SVGElement) {
        for (const prop of COLOR_PROPS) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
  blob: Blob,
  update: (css: ColorSpaceObject) => ColorSpaceObject,
): Promise<Blob> {
  if (blob.type === "image/png" || blob.type === "image/jpeg") {
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const imdat = ctx.getImageData(0, 0, bmp.width, bmp.height, {
      // eslint-disable-next-line spellcheck/spell-checker
      colorSpace: "srgb",
    });
    for (let i = 0; i < imdat.data.length; i += 4) {
      const [ri, gi, bi] = imdat.data.slice(i, i + 3);
      const { r, g, b } = update(d3color.rgb(ri, gi, bi)).rgb();
      imdat.data.set([r, g, b], i);
    }
    ctx.putImageData(imdat, 0, 0);
    return await canvas.convertToBlob();
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
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
            const href = await url2blob(elem.href.baseVal);
            const blob = await updateColors(href, update);
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
  blob: Blob,
  pool: readonly ColorSpaceObject[],
  increments: number,
): Promise<Blob> {
  // eslint-disable-next-line spellcheck/spell-checker
  /* TODO some part of this initial setup still takes some time. I'm not sure
   * if it's the image munging, or the color set creation. Theoretically, we
   * could create the color set on the webworker, but in practice this turned
   * out not as fast, and it's not clear why. */
  const update = new Map<string, ColorSpaceObject>();
  for await (const [key, color] of bulkColorSeparation(
    extractColors(blob),
    pool,
    increments,
  )) {
    update.set(key, color);
  }

  const updater = (orig: ColorSpaceObject): ColorSpaceObject => {
    return update.get(orig.formatHex())!.copy({ opacity: orig.opacity });
  };

  return await updateColors(blob, updater);
}

export async function genSeparation(
  blob: Blob,
  pool: readonly ColorSpaceObject[],
  increments: number,
): Promise<readonly Blob[]> {
  const mapping = new Map<string, number[]>();
  for await (const [key, , opac] of bulkColorSeparation(
    extractColors(blob),
    pool,
    increments,
  )) {
    mapping.set(key, opac);
  }

  return await Promise.all(
    pool.map((_, ind) => {
      const updater = (orig: ColorSpaceObject): ColorSpaceObject => {
        const opacity = mapping.get(orig.formatHex())![ind];
        const updated = d3color.gray((1 - opacity) * 100);
        return updated.copy({ opacity: orig.opacity });
      };

      return updateColors(blob, updater);
    }),
  );
}

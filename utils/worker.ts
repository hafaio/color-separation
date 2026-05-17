import * as d3color from "d3-color";
import { packRgb, unpackRgb } from "./color";
import { colorSeparation, composeColors } from "./sep";
import type { Message, Result } from "./winterface";

addEventListener("message", (event: MessageEvent<Message>) => {
  try {
    const { colors, pool, renderPool, increments } = event.data;

    const colorPool = [];
    const renderColors = [];
    for (let i = 0; i < pool.length; i++) {
      const { r, g, b } = unpackRgb(pool[i]);
      colorPool.push(d3color.rgb(r, g, b));
      const { r: rr, g: rg, b: rb } = unpackRgb(renderPool[i]);
      renderColors.push(d3color.rgb(rr, rg, rb));
    }

    const prevs = new Uint32Array(colors.size);
    const opacs = new Float64Array(colors.size * colorPool.length);
    let i = 0;
    for (const key of colors) {
      const { r, g, b } = unpackRgb(key);
      const { opacities } = colorSeparation(d3color.rgb(r, g, b), colorPool, {
        increments,
      });
      const {
        r: pr,
        g: pg,
        b: pb,
      } = composeColors(opacities, renderColors).rgb();
      prevs[i] = packRgb(pr, pg, pb);
      opacs.set(opacities, i * colorPool.length);
      i++;
    }
    const msg: Result = { typ: "success", prevs, opacs };
    postMessage(msg, {
      transfer: [prevs.buffer as ArrayBuffer, opacs.buffer as ArrayBuffer],
    });
  } catch (ex) {
    const err = ex instanceof Error ? ex.toString() : "unknown error";
    const res: Result = { typ: "err", err };
    postMessage(res);
  }
});

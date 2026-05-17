import * as d3color from "d3-color";
import { packRgb, unpackRgb } from "./color";
import { colorSeparation } from "./sep";
import type { Message, Result } from "./winterface";

addEventListener("message", (event: MessageEvent<Message>) => {
  try {
    const { colors, pool, increments } = event.data;

    const colorPool = [];
    for (let i = 0; i < pool.length; i++) {
      const { r, g, b } = unpackRgb(pool[i]);
      colorPool.push(d3color.rgb(r, g, b));
    }

    const prevs = new Uint32Array(colors.size);
    const opacs = new Float64Array(colors.size * colorPool.length);
    let i = 0;
    for (const key of colors) {
      const { r, g, b } = unpackRgb(key);
      const { color, opacities } = colorSeparation(
        d3color.rgb(r, g, b),
        colorPool,
        { increments },
      );
      const { r: pr, g: pg, b: pb } = color.rgb();
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

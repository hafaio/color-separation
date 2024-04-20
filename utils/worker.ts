import * as d3color from "d3-color";
import { colorSeparation } from "./sep";
import { Message, Result } from "./winterface";

addEventListener("message", (event: MessageEvent<Message>) => {
  try {
    const { colors, pool, increments } = event.data;

    const colorPool = [];
    for (let i = 0; i < pool.length; i += 3) {
      const [r, g, b] = pool.slice(i, i + 3);
      colorPool.push(d3color.rgb(r, g, b));
    }

    const prevs = new Uint8ClampedArray(colors.size * 3);
    const opacs = new Float64Array(colors.size * colorPool.length);
    let i = 0;
    for (const key of colors) {
      const target = d3color.color(key)!;
      const { color, opacities } = colorSeparation(target, colorPool, {
        increments,
      });
      const { r, g, b } = color.rgb();
      prevs.set([r, g, b], i * 3);
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

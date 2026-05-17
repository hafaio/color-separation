import { buildSolverContext, solveColors } from "./solver-context";
import type { Message, Result } from "./winterface";

addEventListener("message", (event: MessageEvent<Message>) => {
  try {
    const {
      colors,
      pool,
      renderPool,
      mixingMode,
      autoOrder,
      increments,
      lambda,
    } = event.data;

    const ctx = buildSolverContext(
      pool,
      renderPool,
      mixingMode,
      autoOrder,
      colors,
      increments,
      lambda,
    );

    const prevs = new Uint32Array(colors.size);
    const opacs = new Float64Array(colors.size * ctx.poolColors.length);
    solveColors(ctx, colors.keys(), colors.size, prevs, opacs, 1, (value) =>
      postMessage({ typ: "progress", value }),
    );

    const msg: Result = {
      typ: "success",
      prevs,
      opacs,
      chosenOrder: ctx.chosenOrder,
    };
    postMessage(msg, {
      transfer: [prevs.buffer as ArrayBuffer, opacs.buffer as ArrayBuffer],
    });
  } catch (ex) {
    const err = ex instanceof Error ? ex.toString() : "unknown error";
    const res: Result = { typ: "err", err };
    postMessage(res);
  }
});

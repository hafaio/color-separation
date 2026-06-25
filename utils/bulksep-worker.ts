import { buildSolverContext, solveColors } from "./solver-context";
import { type BulkMessage, type BulkResult, serve } from "./worker-rpc";

serve<BulkMessage, BulkResult>(async (message, onProgress) => {
  const {
    colors,
    pool,
    renderPool,
    mixingMode,
    autoOrder,
    increments,
    lambda,
  } = message;

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
  solveColors(ctx, colors.keys(), colors.size, prevs, opacs, 1, onProgress);

  return { prevs, opacs, chosenOrder: ctx.chosenOrder };
});

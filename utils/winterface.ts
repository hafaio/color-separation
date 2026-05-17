import type { RgbU32 } from "./color";
import type { MixingMode } from "./sep";

export interface Message {
  readonly colors: ReadonlyMap<RgbU32, number>;
  readonly pool: Uint32Array;
  readonly renderPool: Uint32Array;
  readonly mixingMode: MixingMode;
  readonly autoOrder: boolean;
  readonly increments: number;
  readonly lambda: number;
}

interface Err {
  readonly typ: "err";
  readonly err: string;
}

interface Success {
  readonly typ: "success";
  readonly prevs: Uint32Array;
  readonly opacs: Float64Array;
  /** Permutation of input pool indices; identity if no auto-order ran. */
  readonly chosenOrder: readonly number[];
}

/** Fraction of work done in [0, 1]; posted periodically during the solver. */
export interface Progress {
  readonly typ: "progress";
  readonly value: number;
}

// Render budget split: solver gets this fraction; trailing I/O the rest.
export const SOLVER_FRACTION = 0.95;

export type Result = Err | Success;
export type WorkerOut = Result | Progress;

export interface RasterMessage {
  readonly blob: Blob;
  readonly pool: Uint32Array;
  readonly renderPool: Uint32Array;
  readonly mixingMode: MixingMode;
  readonly autoOrder: boolean;
  readonly increments: number;
  readonly lambda: number;
  readonly outputType: string;
}

interface RasterSuccess {
  readonly typ: "success";
  readonly preview: Blob;
  readonly separations: readonly Blob[];
  readonly chosenOrder: readonly number[];
}

export type RasterResult = Err | RasterSuccess;
export type RasterWorkerOut = RasterResult | Progress;

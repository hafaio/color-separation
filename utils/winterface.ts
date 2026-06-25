import type { RgbU32 } from "./color";
import type { MixingMode } from "./sep";

export const SOLVER_FRACTION = 0.95;

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
  readonly chosenOrder: readonly number[];
}

export interface Progress {
  readonly typ: "progress";
  readonly value: number;
}

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
  readonly grayscale: boolean;
}

interface RasterSuccess {
  readonly typ: "success";
  readonly preview: Blob;
  readonly separations: readonly Blob[];
  readonly chosenOrder: readonly number[];
}

export type RasterResult = Err | RasterSuccess;
export type RasterWorkerOut = RasterResult | Progress;

// Off-main-thread encode requests (SVG export path). `id` correlates each
// response to its request since several encodes are in flight at once.
export interface EncodeRequest {
  readonly id: number;
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly type: string;
  readonly grayscale: boolean;
}

export interface EncodeResponse {
  readonly id: number;
  readonly blob?: Blob;
  readonly error?: string;
}

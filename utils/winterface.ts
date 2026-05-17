import type { RgbU32 } from "./color";

export interface Message {
  readonly colors: Set<RgbU32>;
  readonly pool: Uint32Array;
  readonly increments: number;
}

interface Err {
  readonly typ: "err";
  readonly err: string;
}

interface Success {
  readonly typ: "success";
  readonly prevs: Uint32Array;
  readonly opacs: Float64Array;
}

export type Result = Err | Success;

export interface RasterMessage {
  readonly blob: Blob;
  readonly pool: Uint32Array;
  readonly increments: number;
  readonly outputType: string;
}

interface RasterSuccess {
  readonly typ: "success";
  readonly preview: Blob;
  readonly separations: readonly Blob[];
}

export type RasterResult = Err | RasterSuccess;

export interface Message {
  readonly colors: Set<string>;
  readonly pool: Uint8ClampedArray;
  readonly increments: number;
}

interface Err {
  readonly typ: "err";
  readonly err: string;
}

interface Success {
  readonly typ: "success";
  readonly prevs: Uint8ClampedArray;
  readonly opacs: Float64Array;
}

export type Result = Err | Success;

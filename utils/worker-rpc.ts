import type { RgbU32 } from "./color";
import type { MixingMode } from "./sep";

// Render budget split: solver gets this fraction; trailing I/O the rest.
export const SOLVER_FRACTION = 0.95;

type WorkerReply<Receive> =
  | { readonly kind: "progress"; readonly progress: number }
  | { readonly kind: "result"; readonly result: Receive }
  | { readonly kind: "error"; readonly error: string };

type OnProgress = (progress: number) => void;

/**
 * Worker side: turn an async handler into a message responder. Each request
 * carries its own reply `MessagePort` (on `event.ports`) — the standard "private
 * response path per task" pattern — so concurrent calls never cross-talk and
 * the worker needs no correlation bookkeeping.
 */
export function serve<Send, Receive>(
  handler: (payload: Send, onProgress: OnProgress) => Promise<Receive>,
): void {
  addEventListener("message", (event: MessageEvent<Send>) => {
    const [port] = event.ports;
    const reply = (message: WorkerReply<Receive>): void =>
      port.postMessage(message);
    handler(event.data, (progress) =>
      reply({ kind: "progress", progress }),
    ).then(
      (result) => reply({ kind: "result", result }),
      (error) => reply({ kind: "error", error: String(error) }),
    );
  });
}

/**
 * Client side: given a way to spawn a worker, return a typed async sender. Each
 * call opens a `MessageChannel`, hands one port to the worker, and listens on
 * the other, so concurrent calls stay isolated with no ids or bookkeeping.
 *
 * By default each call spawns a fresh worker and terminates it when it settles
 * — best for infrequent heavy calls (the compute dwarfs the spawn, memory is
 * freed, and concurrent calls run in parallel on separate workers). Pass
 * `reuse: true` for frequent calls that share expensive setup (e.g. a compiled
 * wasm codec): one lazily-spawned worker is reused for every call.
 *
 * `transfer` pulls the buffers to hand off (rather than copy) out of a payload.
 */
export function createSender<Send, Receive>(
  spawn: () => Worker,
  {
    reuse = false,
    transfer = () => [],
  }: { reuse?: boolean; transfer?: (payload: Send) => Transferable[] } = {},
): (payload: Send, onProgress?: OnProgress) => Promise<Receive> {
  let shared: Worker | undefined;
  return (payload, onProgress) =>
    new Promise<Receive>((resolve, reject) => {
      let worker: Worker;
      if (reuse) {
        worker = shared ??= spawn();
      } else {
        worker = spawn();
      }
      const { port1, port2 } = new MessageChannel();
      port1.addEventListener(
        "message",
        (event: MessageEvent<WorkerReply<Receive>>) => {
          const reply = event.data;
          if (reply.kind === "progress") {
            onProgress?.(reply.progress);
            return;
          }
          port1.close();
          if (!reuse) worker.terminate();
          if (reply.kind === "result") resolve(reply.result);
          else reject(new Error(reply.error));
        },
      );
      port1.start();
      worker.postMessage(payload, [port2, ...transfer(payload)]);
    });
}

export interface BulkMessage {
  readonly colors: ReadonlyMap<RgbU32, number>;
  readonly pool: Uint32Array;
  readonly renderPool: Uint32Array;
  readonly mixingMode: MixingMode;
  readonly autoOrder: boolean;
  readonly increments: number;
  readonly lambda: number;
}

export interface BulkResult {
  readonly prevs: Uint32Array;
  readonly opacs: Float64Array;
  readonly chosenOrder: readonly number[];
}

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

export interface RasterOut {
  readonly preview: Blob;
  readonly separations: readonly Blob[];
  readonly chosenOrder: readonly number[];
}

export interface EncodePayload {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly type: "image/png" | "image/jpeg";
}

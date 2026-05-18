import type { ReactElement } from "react";

export default function HelpText({
  closeable,
}: {
  closeable: boolean;
}): ReactElement {
  const footer = closeable ? (
    <p className="pt-4 pb-4 text-slate-600 dark:text-slate-400">
      Click the info button below to hide this information.
    </p>
  ) : null;
  return (
    <div className="flex flex-col justify-between flex-grow min-h-0 overflow-y-auto pr-1 -mr-1">
      <div className="space-y-3 flex-grow text-slate-600 dark:text-slate-400">
        <p>
          Separate an SVG or raster image into spot colors for risograph and
          other layered printing workflows.
        </p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>Upload an image by clicking above or dropping it anywhere.</li>
          <li>
            Open the palette to add or remove inks. Inks without a dot are
            spectrally calibrated and can use Kubelka–Munk mixing; inks with a
            white center dot fall back to alpha-blend mixing.
          </li>
          <li>
            Toggle inks in the picker. Right-click an active ink to remap any
            color routed to it onto another active ink — useful for collapsing
            two close pool colors without re-running the solver.
          </li>
          <li>Pick a mixing model and print order, then export.</li>
        </ol>
        <div className="space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Mixing models
          </p>
          <ul className="list-disc ml-4 space-y-1">
            <li>
              <span className="font-medium">Linear</span> — averages ink colors
              in linear RGB. Order-independent and fast; ignores ink opacity.
            </li>
            <li>
              <span className="font-medium">Alpha blend</span> — composites inks
              top-down with per-layer opacity, modeling translucent inks over a
              white substrate. Order-dependent.
            </li>
            <li>
              <span className="font-medium">Kubelka–Munk</span> — spectral
              halftone model using calibrated reflectance per ink, with
              Neugebauer–Demichel dot-coverage physics. Most accurate for
              risograph blends; requires every active ink to be calibrated.
            </li>
          </ul>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Print order
          </p>
          <p>
            Order matters for alpha-blend and Kubelka–Munk. Choose a fixed order
            or let the solver search permutations for the lowest weighted
            reconstruction error.
          </p>
        </div>
      </div>
      {footer}
    </div>
  );
}

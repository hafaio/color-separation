import type { ReactElement } from "react";
import { MEASURED_INKS } from "../utils/inks";

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
            Open the palette to add or remove colors. Riso inks without a dot
            can use Kubelka-Munk mixing; selecting one with a white center dot
            turns that mode off.
          </li>
          <li>
            Add your own color with the <span className="font-medium">+</span>{" "}
            tile: pick a swatch and name it. Custom colors have no spectral
            data, so they rule out Kubelka-Munk too. Right-click a custom color
            to delete it.
          </li>
          <li>
            Toggle colors in the picker. Right-click an active color to remap
            any color routed to it onto another active one — useful for
            collapsing two close pool colors without re-running the solver.
          </li>
          <li>Pick a mixing model and print order, then export.</li>
        </ol>
        <div className="space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Mixing models
          </p>
          <ul className="list-disc ml-4 space-y-1">
            <li>
              <span className="font-medium">Subtractive</span> — mixes ink
              colors straight in sRGB, as a linear program. Fastest, and hits
              almost any color exactly, but it isn't how ink behaves on paper.
            </li>
            <li>
              <span className="font-medium">Multiply</span> — treats each ink as
              a filter built from its published color, so overprinting darkens.
              Order only matters with press simulation on.
            </li>
            <li>
              <span className="font-medium">Kubelka-Munk</span> — models
              absorption, scattering and fluorescence across 36 wavelength
              bands. {MEASURED_INKS.length} inks are calibrated from measured
              spectra, the rest inferred from their published color. The most
              physical of the three, and the only one that handles fluorescent
              inks.
            </li>
          </ul>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Press simulation
          </p>
          <p>
            On by default for Multiply and Kubelka-Munk. Dots spread on
            absorbent paper — a nominal 50% covers about 75% — while a dot
            landing on ink already down spreads no further. Calibrated from one
            photographed chart on one machine, so treat it as approximate on any
            other. Subtractive is an abstraction rather than a print prediction,
            so it isn't offered there.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Ink minimization
          </p>
          <p>
            How much color shift, in ΔE00, you'll accept to drop an ink layer.
            Zero keeps every color as accurate as the palette allows; higher
            settings rebuild colors from fewer layers. Offered for Multiply and
            Kubelka-Munk; Subtractive fits nearly every color exactly and has no
            spare layers to trade.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Discretizations
          </p>
          <p>
            Rounds each layer's opacity to a fixed number of steps, for a
            posterized look.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Print order
          </p>
          <p>
            Which ink prints first, paper-adjacent. Kubelka-Munk always cares,
            and Multiply cares once press simulation is on, since a dot spreads
            differently on paper than on ink already down. Subtractive never
            does. Choose a fixed order or let Automatic search permutations for
            the lowest weighted reconstruction error — though where the model
            ignores order there is nothing to search. It also numbers and names
            the exported layers, so it still matters there.
          </p>
        </div>
      </div>
      {footer}
    </div>
  );
}

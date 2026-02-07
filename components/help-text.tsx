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
    <div className="flex flex-col justify-between flex-grow">
      <div className="space-y-1 flex-grow">
        <p className="text-slate-600 dark:text-slate-400">
          Separate an SVG into spot colors; useful for risograph printing.
          Currently this assumes a naive subtractive color model, that works
          reasonably, but could probably be improved.
        </p>
        <ol className="list-decimal ml-4 text-slate-600 dark:text-slate-400">
          <li>Upload your SVG by clicking above or dropping it anywhere.</li>
          <li>Customize your color pallette by adding colors available.</li>
          <li>
            Select different colors and losses to check our your decomposition.
          </li>
          <li>Click export to download an individual SVG for each layer.</li>
        </ol>
      </div>
      {footer}
    </div>
  );
}

import { ReactElement } from "react";

export default function HelpText({
  closeable,
}: {
  closeable: boolean;
}): ReactElement {
  const footer = closeable ? (
    <p className="pt-4 pb-4">
      Click the info button below to hide this information.
    </p>
  ) : null;
  return (
    <div className="flex flex-col justify-between flex-grow">
      <div className="space-y-1 flex-grow">
        <p>
          Separate an SVG into spot colors; useful for risograph printing.
          Currently this assumes a naive color model, and printing on white.
        </p>
        <ol className="list-decimal ml-4">
          <li>
            Upload your SVG by clicking above or dropping it anywhere. Your SVG
            can contain opacity, but <span className="italic">must not</span>{" "}
            contain overlapping elements, embedded bitmaps, or gradients.
          </li>
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

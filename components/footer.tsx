"use client";

import { Tooltip } from "@ark-ui/react/tooltip";
import type { ReactElement } from "react";
import { FaGithub, FaInfoCircle } from "react-icons/fa";

export default function Footer({
  helpDisabled,
  toggleHelp,
}: {
  helpDisabled: boolean;
  toggleHelp: () => void;
}): ReactElement {
  return (
    <div className="flex justify-center space-x-2">
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className="p-2 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
            aria-label="show help information"
            disabled={helpDisabled}
            onClick={toggleHelp}
            type="button"
          >
            <FaInfoCircle />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow">
            show help
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
      <a
        href="https://github.com/hafaio/color-separation"
        target="_blank"
        rel="noreferrer"
      >
        <button
          className="p-2 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label="view source on github"
          type="button"
        >
          <FaGithub />
        </button>
      </a>
    </div>
  );
}

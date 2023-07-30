"use client";

import { IconButton, Tooltip } from "@chakra-ui/react";
import { ReactElement } from "react";
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
      <Tooltip label="show help">
        <IconButton
          aria-label="show help information"
          icon={<FaInfoCircle />}
          isDisabled={helpDisabled}
          onClick={toggleHelp}
        />
      </Tooltip>
      <a
        href="https://github.com/hafaio/color-separation"
        target="_blank"
        rel="noreferrer"
      >
        <IconButton aria-label="view source on github" icon={<FaGithub />} />
      </a>
    </div>
  );
}

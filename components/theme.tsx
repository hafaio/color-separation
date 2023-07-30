"use client";

import {
  ChakraProvider,
  extendTheme,
  withDefaultColorScheme,
} from "@chakra-ui/react";
import { ReactElement, ReactNode } from "react";
import "../styles/global.css";

const theme = extendTheme(
  {
    config: { initialColorMode: "system", useSystemColorMode: true },
  },
  withDefaultColorScheme({ colorScheme: "gray" }),
);

export default function Theme({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}

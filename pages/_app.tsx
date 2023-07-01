import {
  ChakraProvider,
  extendTheme,
  withDefaultColorScheme,
} from "@chakra-ui/react";
import type { AppProps } from "next/app";
import "../styles/global.css";

const theme = extendTheme(
  {
    config: { initialColorMode: "system", useSystemColorMode: true },
  },
  withDefaultColorScheme({ colorScheme: "gray" }),
);

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

import {
  ChakraProvider,
  extendTheme,
  localStorageManager,
} from "@chakra-ui/react";
import type { AppProps } from "next/app";
import "../styles/global.css";

const theme = extendTheme({
  config: { initialColorMode: "system", useSystemColorMode: true },
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider colorModeManager={localStorageManager} theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

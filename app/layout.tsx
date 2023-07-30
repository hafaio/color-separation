import { Metadata } from "next";
import { ReactElement, ReactNode } from "react";
import "../styles/global.css";

export const metadata: Metadata = {
  title: "Spot Color Separation",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

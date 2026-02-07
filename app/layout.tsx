import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import "./global.css";

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
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

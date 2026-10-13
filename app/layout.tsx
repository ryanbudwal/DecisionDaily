import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Daily — One financial decision every day",
  description: "Build financial judgment through a shared daily challenge, locked reasoning, transparent scores, and a permanent practice archive.",
  openGraph: {
    title: "Decision Daily — One financial decision every day",
    description: "Analyze the evidence, lock your reasoning, and learn from one shared financial challenge every day.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decision Daily — One financial decision every day",
    description: "Review the evidence, make your call, and improve your financial decision process.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<Analytics /></body>
    </html>
  );
}

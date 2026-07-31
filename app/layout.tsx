import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DecisionLab — One financial decision every day",
  description: "Build financial judgment through a shared daily challenge, locked reasoning, transparent scores, and a permanent practice archive.",
  openGraph: {
    title: "DecisionLab — One financial decision every day",
    description: "Analyze the evidence, lock your reasoning, and learn from one shared financial challenge every day.",
    type: "website",
    images: [{ url: "/decisionlab-social.svg", width: 1200, height: 630, alt: "DecisionLab daily financial reasoning challenge" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DecisionLab — Practice better investment decisions",
  description: "A learning environment for evaluating evidence, managing risk, and calibrating confidence using historical market scenarios.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

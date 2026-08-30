import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Revora Revenue Recovery Engine",
  description: "AI-native, deterministic linear programming recovery and guardrail policy engine for failed transactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0B0D13] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}


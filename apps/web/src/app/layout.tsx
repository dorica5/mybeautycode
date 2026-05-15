import type { Metadata } from "next";
import { Anton, Outfit } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "myne — hair & beauty, together",
  description:
    "Connect with professionals, keep your visit history, and own your look — the myne app for clients and stylists.",
  openGraph: {
    title: "myne",
    description: "Hair & beauty, together.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body
        className={`${anton.variable} ${outfit.variable} ${outfit.className} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

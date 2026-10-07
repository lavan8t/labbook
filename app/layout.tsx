import type { Metadata } from "next";
import { Roboto_Flex, Google_Sans_Flex } from "next/font/google";
import "./globals.css";

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
  axes: ["opsz", "wdth", "GRAD", "XOPQ", "YOPQ", "XTRA"],
});

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-google-sans-flex",
  axes: ["opsz", "wdth", "GRAD"],
});

export const metadata: Metadata = {
  title: "LabBook Academic Engine",
  description: "Relational division and GiST temporal exclusion visualizer",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${robotoFlex.variable} ${googleSansFlex.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}

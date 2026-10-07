import type { Metadata } from "next";
import { Roboto_Flex } from "next/font/google";
import "./globals.css";

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
  display: "swap",
  axes: ["opsz", "wdth", "GRAD", "XOPQ", "YOPQ", "XTRA"],
});

export const metadata: Metadata = {
  title: "LabBook Academic Engine",
  description: "Relational division and GiST temporal exclusion visualizer",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${robotoFlex.variable} h-full antialiased`}>
      <body className="min-h-full font-sans antialiased bg-[#FFFFFF] text-[#0F172A]">{children}</body>
    </html>
  );
}

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
  title: "LabBook",
  description: "Research equipment reservation system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${robotoFlex.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-full font-sans antialiased bg-[#fffbfa] text-[#201a19]">
        {children}
      </body>
    </html>
  );
}

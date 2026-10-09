import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusBook",
  description: "Campus Auditorium & Smart Lecture Hall Reservation System",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" style={{ fontVariationSettings: "'ROND' 100" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght,wdth,ROND@8..144,100..1000,25..151,0..100&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className="min-h-full font-sans antialiased bg-surface text-on-surface"
        style={{ fontVariationSettings: "'ROND' 100" }}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SVB Social Media Studio",
  description:
    "Spieltags- und Ergebnisgrafiken des SV Bergheim direkt im Browser erstellen und herunterladen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

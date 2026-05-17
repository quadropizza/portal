import type { Metadata } from "next";
import { Bowlby_One, Archivo_Black, Space_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const bowlby = Bowlby_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-titulo",
  display: "swap",
});

const archivo = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-subtitulo",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-corpo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quadrô Portal",
  description: "Plataforma de gestão da Quadrô Pizza",
  robots: { index: false, follow: false }, // uso interno, não indexar
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bowlby.variable} ${archivo.variable} ${spaceMono.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Outfit, DM_Sans, Quicksand, Nunito } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "Dental Clinic Engine",
  description: "A multi-template dental clinic engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${outfit.variable} ${dmSans.variable} ${quicksand.variable} ${nunito.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

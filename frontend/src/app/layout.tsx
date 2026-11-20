import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Herald - Multi-Agent Operations Engine",
  description: "Everything, handled automatically. Autonomous engine for service operations: discovers leads, builds proof assets, tracks demo views, and enforces next steps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark h-full overflow-hidden ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`antialiased selection:bg-indigo-600/30 selection:text-indigo-600 dark:selection:text-indigo-200 bg-[#FAF8F5] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 h-full overflow-hidden transition-colors duration-200 ${plusJakartaSans.className} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal OS - Side Hustle CRM & Autopilot",
  description: "Autopilot-first CRM for service side hustles: finds leads, builds proof assets, tracks demo views, and enforces next steps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full overflow-hidden" suppressHydrationWarning>
      <body className="antialiased selection:bg-indigo-600/30 selection:text-indigo-600 dark:selection:text-indigo-200 bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 h-full overflow-hidden transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}

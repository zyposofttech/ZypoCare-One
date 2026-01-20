import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense, type ReactNode } from "react";

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { GlobalLoader } from "@/components/global-loading/GlobalLoader";
import { GlobalNavWatcher } from "@/components/global-loading/GlobalNavWatcher";
import { NavigationLoader } from "@/components/NavigationLoader";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ZypoCare One",
  description: "ZypoCare One - AI Powered Hospital Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-zc-bg text-zc-text`}>
        <ThemeProvider>
          <Suspense fallback={<div className="p-6 text-sm text-zc-muted">Loading…</div>}>
            <GlobalNavWatcher />
            <NavigationLoader />
            {children}
          </Suspense>

          {/* Global UI utilities */}
          <GlobalLoader />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

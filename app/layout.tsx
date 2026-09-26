import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { PwaManager } from "@/components/pwa/pwa-manager";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "منصة رسو",
  title: {
    default: "منصة رسو | حوكمة المزادات",
    template: "%s | منصة رسو",
  },
  description: "المنظومة الرقمية لحوكمة المزادات وتوثيق التعاملات في أسواق النفع العام.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "رسو",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b4f24",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          {children}
          <Toaster />
          <PwaManager />
        </TooltipProvider>
      </body>
    </html>
  );
}

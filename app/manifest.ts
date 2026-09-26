import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "منصة رسو لحوكمة المزادات",
    short_name: "رسو",
    description: "المنظومة الرقمية لحوكمة المزادات وتوثيق التعاملات في أسواق النفع العام.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f2e8",
    theme_color: "#0b4f24",
    lang: "ar",
    dir: "rtl",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "التحقق من سند",
        short_name: "التحقق",
        description: "البحث عن سند مزاد برقم السند أو الجوال",
        url: "/verify",
        icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "تسجيل دخول السوق",
        short_name: "تسجيل دخول",
        description: "تسجيل بائع أو زائر وإصدار بطاقة QR",
        url: "/dashboard/entries/new",
        icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "توثيق ترسية",
        short_name: "ترسية جديدة",
        description: "مسح QR وإصدار سند الترسية",
        url: "/dashboard/settlements/new",
        icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  }
}

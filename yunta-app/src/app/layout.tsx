import type { Metadata, Viewport } from "next";
import { SplashScreen } from "@/components/ui/splash-screen";
import "./globals.css";

export const metadata: Metadata = {
  title: "YUNTA",
  description: "Gestión financiera y juntas familiares",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50 text-gray-900">
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}

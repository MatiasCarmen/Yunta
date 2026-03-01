import type { Metadata, Viewport } from "next";
import { SplashScreen } from "@/components/ui/splash-screen";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yunta - Finanzas en Familia",
  description: "Gestión financiera y juntas familiares",
  manifest: "/manifest.json",
  icons: {
    icon: "/isotipo.png",
    shortcut: "/isotipo.png",
    apple: "/isotipo.png",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('yunta-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}

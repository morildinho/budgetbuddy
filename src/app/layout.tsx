import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Budgetbuddy",
  description: "Spor dagligvareforbruket ditt ved å skanne kvitteringer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Budgetbuddy",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#17624e",
};

const themeScript = `
  try {
    var savedTheme = localStorage.getItem("budgetbuddy.theme");
    var activeTheme = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = activeTheme;
    var updateThemeMeta = function () {
      var currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      var themeMetas = document.querySelectorAll('meta[name="theme-color"]');
      themeMetas.forEach(function (themeMeta, index) {
        if (index === 0) {
          themeMeta.setAttribute("content", currentTheme === "dark" ? "#09111f" : "#17624e");
        } else {
          themeMeta.remove();
        }
      });
    };
    if (document.head) {
      new MutationObserver(updateThemeMeta).observe(document.head, { childList: true });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.setTimeout(updateThemeMeta, 0);
      }, { once: true });
    } else {
      window.setTimeout(updateThemeMeta, 0);
    }
  } catch (_) {
    document.documentElement.dataset.theme = "light";
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" data-theme="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="budgetbuddy-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}

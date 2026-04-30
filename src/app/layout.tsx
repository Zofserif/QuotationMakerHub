import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_DESCRIPTION, APP_NAME, APP_ORIGIN } from "@/lib/app-config";
import { Providers } from "./providers";
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
  title: APP_NAME,
  description: APP_DESCRIPTION,
  ...(APP_ORIGIN
    ? {
        metadataBase: new URL(APP_ORIGIN),
        openGraph: {
          title: APP_NAME,
          description: APP_DESCRIPTION,
          siteName: APP_NAME,
          url: APP_ORIGIN,
          type: "website",
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

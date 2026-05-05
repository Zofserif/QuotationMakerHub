import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_ORIGIN,
  APP_SOCIAL_PREVIEW_IMAGE_ALT,
  APP_SOCIAL_PREVIEW_IMAGE_HEIGHT,
  APP_SOCIAL_PREVIEW_IMAGE_SRC,
  APP_SOCIAL_PREVIEW_IMAGE_TYPE,
  APP_SOCIAL_PREVIEW_IMAGE_WIDTH,
} from "@/lib/app-config";
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

const metadataTitle = "Remote Quote - Create Quote and Send to Client";

const socialPreviewImage = {
  url: APP_SOCIAL_PREVIEW_IMAGE_SRC,
  alt: APP_SOCIAL_PREVIEW_IMAGE_ALT,
  width: APP_SOCIAL_PREVIEW_IMAGE_WIDTH,
  height: APP_SOCIAL_PREVIEW_IMAGE_HEIGHT,
  type: APP_SOCIAL_PREVIEW_IMAGE_TYPE,
};

export const metadata: Metadata = {
  title: metadataTitle,
  description: APP_DESCRIPTION,
  ...(APP_ORIGIN
    ? {
        metadataBase: new URL(APP_ORIGIN),
        alternates: {
          canonical: "/",
        },
        openGraph: {
          title: metadataTitle,
          description: APP_DESCRIPTION,
          siteName: APP_NAME,
          url: APP_ORIGIN,
          type: "website",
          locale: "en_US",
          images: [socialPreviewImage],
        },
        twitter: {
          card: "summary_large_image",
          title: metadataTitle,
          description: APP_DESCRIPTION,
          images: [socialPreviewImage],
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

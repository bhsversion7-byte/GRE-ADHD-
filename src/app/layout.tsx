import { Providers } from "@/providers/providers";
import { cn } from "@/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import type React from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gre-visual-memory.local"),
  title: {
    default: "GRE 图像记忆单词系统",
    template: "%s | GRE 图像记忆单词系统",
  },
  description:
    "A low-distraction GRE vocabulary trainer for visual memory, active recall, spaced repetition, and high-volume daily study.",
  keywords: [
    "GRE vocabulary",
    "visual memory",
    "spaced repetition",
    "active recall",
    "vocabulary trainer",
    "GRE 单词",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://gre-visual-memory.local/",
    siteName: "GRE 图像记忆单词系统",
    title: "GRE 图像记忆单词系统",
    description:
      "Low-distraction GRE vocabulary training for 200-500 words per day through small chunks, visual hooks, active recall, and spaced repetition.",
    images: [
      {
        url: "/seo.png",
        width: 1200,
        height: 630,
        alt: "GRE Visual Memory Vocabulary Trainer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GRE 图像记忆单词系统",
    description:
      "Visual memory, active recall, and spaced repetition for GRE vocabulary.",
    images: ["/seo.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <Providers>
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

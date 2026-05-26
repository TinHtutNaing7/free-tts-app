import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myanmar Voice — Gemini TTS",
  description:
    "Convert Myanmar (Burmese) text into natural speech voiceover powered by Google Gemini TTS.",
  keywords: ["Myanmar", "Burmese", "TTS", "Text to Speech", "Gemini", "Voiceover"],
  authors: [{ name: "Myanmar Voice" }],
};

export const viewport: Viewport = {
  themeColor: "#080604",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="my" dir="ltr">
      <head>
        {/* Preconnect for Google Fonts (loaded via CSS @import) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FitBuddy — Screenless AI Fitness Coach",
  description: "Affordable, screenless, haptic-first fitness coach: ESP32 + BNO085 IMU with on-device form scoring and real-time vibration feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0F172A] text-slate-100 min-h-screen selection:bg-[#39FF14] selection:text-black`}
      >
        {children}
      </body>
    </html>
  );
}

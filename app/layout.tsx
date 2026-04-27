import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components";
import AuthInitializer from "@/app/AuthInitializer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Escrow - Jual beli aman, tanpa risiko",
  description: "Platform marketplace escrow yang aman untuk pembeli dan penjual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-bg-primary text-text-primary font-inter">
        <AuthInitializer />
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

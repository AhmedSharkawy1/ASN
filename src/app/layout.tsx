import type { Metadata } from "next";
import { Inter, Outfit, Cairo } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import Navbar from "@/components/ui/Navbar";
import CustomCursor from "@/components/ui/CustomCursor";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const cairo = Cairo({ subsets: ["latin", "arabic"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "ASN Technology | Futuristic AI Solutions",
  description: "Next-generation AI solutions for the enterprise. Experience the future with ASN Technology.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "ASN Technology",
    description: "Premium futuristic AI technology company.",
    type: "website",
  }
};

import { LanguageProvider } from "@/lib/context/LanguageContext";
import { ThemeProvider } from "@/lib/context/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body
        className={clsx(
          inter.variable,
          outfit.variable,
          cairo.variable,
          "font-sans antialiased selection:bg-blue selection:text-white"
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <CustomCursor />
            <Navbar />
            {children}
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

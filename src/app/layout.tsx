import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { headers } from "next/headers";

const CustomCursor = dynamic(() => import("@/components/ui/CustomCursor"), { ssr: false });
const Navbar = dynamic(() => import("@/components/ui/Navbar"));

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const cairo = Cairo({ subsets: ["latin", "arabic"], variable: "--font-cairo", display: "swap" });

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if we are on a restaurant subdomain based on the host header
  const headersList = headers();
  const host = headersList.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const rootDomain = isLocalhost ? 'localhost:3000' : 'asntechnology.net';
  const currentHost = host.replace(`.${rootDomain}`, '');

  const reservedSubdomains = ['www', 'admin', 'api', 'dashboard', 'app', rootDomain];
  const isRestaurantSubdomain = currentHost !== host && currentHost !== rootDomain && !reservedSubdomains.includes(currentHost);

  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://supabase.co" />
      </head>
      <body
        className={clsx(
          inter.variable,
          cairo.variable,
          "font-sans antialiased selection:bg-blue selection:text-white"
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <CustomCursor />
            {!isRestaurantSubdomain && <Navbar />}
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

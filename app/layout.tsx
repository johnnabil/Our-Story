import type { Metadata } from "next";
import { Libre_Baskerville, Nunito_Sans } from "next/font/google";

import { Providers } from "@/components/providers/Providers";

import "@/app/globals.css";

const archiveSerif = Libre_Baskerville({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"]
});

const archiveSans = Nunito_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"]
});

const customTabIcon = process.env.NEXT_PUBLIC_TAB_ICON_URL?.trim();
const siteIcon = customTabIcon && customTabIcon.length > 0 ? customTabIcon : "/icon.svg";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Relationship memories website",
  icons: {
    icon: siteIcon,
    shortcut: siteIcon,
    apple: siteIcon
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archiveSerif.variable} ${archiveSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

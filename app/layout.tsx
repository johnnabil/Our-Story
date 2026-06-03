import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

import { Providers } from "@/components/providers/Providers";

import "@/app/globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"]
});

const dmSans = DM_Sans({
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
      <body className={`${cormorant.variable} ${dmSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

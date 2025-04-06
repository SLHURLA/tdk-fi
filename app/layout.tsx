import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/context/ThemeContext";
import Navbar from "@/components/Navbar/Navbar";
import { AppSidebar } from "@/components/Sidebar/Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import SessionProviders from "@/context/SessionContext";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

//test

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProviders>
          <Providers>
            <SidebarProvider>
              <div className="w-full">{children}</div>
            </SidebarProvider>
          </Providers>
        </SessionProviders>
      </body>
    </html>
  );
}

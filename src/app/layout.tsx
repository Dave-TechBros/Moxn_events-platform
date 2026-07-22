import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";

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
  title: "Moxn Eventra — Discover & ticket local events",
  description:
    "Discover local events, RSVP or buy tickets, and get a QR pass for entry. Energetic, time-aware, and built for organizers and admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <ThemeProvider>
        <AuthProvider>
          <Nav />
          <main className="container pb-24 pt-6 md:pb-12 md:pt-8">
            {children}
          </main>
          <Footer />
          <Toaster richColors position="top-center" />
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

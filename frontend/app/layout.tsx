import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Vazhi AI — Career Guidance",
  description: "AI-powered personalized career roadmaps for students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Education-themed backdrop image */}
        <div className="page-backdrop" />
        {/* Animated ambient glows */}
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        <div className="ambient-glow-3" />
        {/* Grid overlay */}
        <div className="grid-pattern-overlay" />
        {/* Providers */}
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

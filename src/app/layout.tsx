import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nuanu HR Recruitment ATS",
  description: "Enterprise AI-Powered Applicant Tracking System by Nuanu",
  keywords: ["HR", "Recruitment", "ATS", "Nuanu", "Hiring", "AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

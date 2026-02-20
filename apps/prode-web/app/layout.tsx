import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "../components/top-nav";

export const metadata: Metadata = {
  title: "Prode World Cup 2026",
  description: "Football prediction platform for tournament play"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

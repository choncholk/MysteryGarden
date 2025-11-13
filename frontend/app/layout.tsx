import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Mystery Garden - FHE Plant Growing Game",
  description: "A FHEVM-based plant growing game with encrypted growth mechanics",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-white text-gray-900 antialiased`}>
        <div className="fixed inset-0 w-full h-full bg-white z-[-20] min-w-[850px]"></div>
        <main className="flex flex-col max-w-screen-lg mx-auto pb-20 min-w-[850px]">
          <nav className="flex w-full px-3 md:px-0 h-fit py-8 justify-between items-center border-b-2 border-primary-green">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-yellow to-primary-green bg-clip-text text-transparent">
              🌱 Mystery Garden
            </h1>
          </nav>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import { Newsreader, DM_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const siteUrl = "https://github.com/jerrysoer/claude-intel";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Claude Intel — Your AI Spending Intelligence Report",
  description:
    "Understand your Claude Code spending. Track tokens, compare costs across providers, and discover usage patterns with an interactive analytics dashboard.",
  keywords: [
    "claude code",
    "ai spending",
    "token analytics",
    "llm cost tracker",
    "claude usage",
  ],
  authors: [{ name: "scrolly.to" }],
  creator: "scrolly.to",
  openGraph: {
    title: "Claude Intel — Your AI Spending Intelligence Report",
    description: "Track tokens, compare costs, discover patterns.",
    type: "article",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Intel — AI Spending Report",
    description: "Track tokens, compare costs, discover patterns.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Dark-mode-first blocking script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('claude-intel-theme');
                  if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="2ae605db-85da-46d9-ad96-b28d1cb93ec2"
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${newsreader.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

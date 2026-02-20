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
          data-do-not-track="true"
        />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "Claude Intel",
                description:
                  "Track your Claude Code AI spending. Compare costs across providers. Discover usage patterns with an interactive analytics dashboard.",
                url: "https://github.com/jerrysoer/claude-intel",
                applicationCategory: "DeveloperApplication",
                operatingSystem: "macOS, Linux",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
                author: {
                  "@type": "Organization",
                  name: "scrolly.to",
                  url: "https://scrolly.to",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "How does Claude Intel calculate spending?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Claude Intel reads your local ~/.claude/projects/ JSONL session logs and applies Anthropic API token pricing to calculate costs. Costs are estimated at API rates — actual cost depends on your subscription plan (Pro, Max, or API).",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Does Claude Intel send my data anywhere?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "No. Claude Intel runs entirely on your local machine. It reads your local Claude Code session files and serves the dashboard on localhost. No data leaves your computer.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "What is the Cost Lab feature?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "The Cost Lab re-prices your actual Claude Code token usage against competing providers (OpenAI, Google, ByteDance) so you can compare what your workload would cost elsewhere. It also lets you simulate rebalancing your model mix between Opus and Sonnet.",
                    },
                  },
                ],
              },
            ]),
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${newsreader.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://scrolly.to/api/pixel/79f85d39-9f80-45ed-a966-3bc6f4e89ab5"
          alt=""
          width={1}
          height={1}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        />
      </body>
    </html>
  );
}

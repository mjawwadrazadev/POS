import "@site/styles/template.css";
import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import Header from "@site/components/headers/Header1";
import TemplateRuntimeProvider from "@site/components/common/TemplateRuntimeProvider";
import SiteFooter from "@site/components/footers/SiteFooter";
import { siteConfig } from "@site/content/site";

// Root layout for the public website. The POS app has its own root layout in app/(app),
// so the website's template CSS never loads inside the dashboard (and vice versa).

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get("template.theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="en" className="no-touch" color-scheme={initialTheme} suppressHydrationWarning>
      <body className={`${manrope.variable} ${jetbrainsMono.variable}`}>
        <TemplateRuntimeProvider>
          <Header initialTheme={initialTheme} />
          {children}
          <SiteFooter />
        </TemplateRuntimeProvider>
      </body>
    </html>
  );
}

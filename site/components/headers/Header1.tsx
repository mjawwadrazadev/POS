"use client";

import Link from "next/link";
import { useRef } from "react";
import ThemeSwitcher from "@site/components/headers/ThemeSwitcher";
import TextScramble from "@site/components/animations/TextScramble";
import { useLenis } from "@site/components/common/LenisContext";
import { useHeaderScrollHidden } from "@site/hooks/useHeaderScrollHidden";
import CommonLoadAnimation, {
  CommonLoadFade,
} from "@site/components/animations/CommonLoadAnimation";
import { usePathname } from "next/navigation";
import { siteConfig } from "@site/content/site";

type Header1Props = {
  initialTheme: "light" | "dark";
};

export default function Header1({ initialTheme }: Header1Props) {
  const headerRef = useRef<HTMLElement>(null);
  const lenis = useLenis();
  useHeaderScrollHidden(headerRef, lenis);
  const pathname = usePathname();
  // Pages whose headline sits on a dark banner use the light ("permanent") header
  const isPermanent = pathname === "/features";
  return (
    <CommonLoadAnimation>
      <header
        id="header"
        ref={headerRef}
        className={`mxd-header ${isPermanent ? "mxd-header-permanent" : ""}`}
      >
        <CommonLoadFade index={0}>
          <div className="mxd-header__logo loading-fade">
            <Link className="mxd-logo" href={`/`}>
              <svg
                className="mxd-logo__image"
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 42.4 36"
              >
                <path d="M25.8,13.8h2.8v5.5h-2.8v-5.5ZM13.8,16.6v2.8h2.8v-5.5h-2.8v2.8ZM32.2,0v2.8h-2.8V0h2.8ZM26.7,5.5h2.8v-2.8h-2.8v2.8ZM21.2,5.5h-5.5v2.8h11.1v-2.8h-5.5ZM12.8,2.8v2.8h2.8v-2.8h-2.8ZM10.1,0v2.8h2.8V0h-2.8ZM7.3,5.5v5.5h2.8V2.8h-2.8v2.8ZM4.5,13.8v2.8H0v2.8h2.8v2.8H0v2.8h2.8v11.1h2.8v-8.3h5.5v-2.8h-5.5v-8.3h1.9v-5.5h-2.9v2.8ZM35,5.5v-2.8h-2.8v8.3h2.8v-5.5ZM42.4,19.4v-2.8h-4.7v-5.5h-2.8v5.5h1.9v8.3h-5.5v2.8h5.5v8.3h2.8v-11.1h2.8v-2.8h-2.8v-2.8h2.8Z" />
              </svg>
              <div className="mxd-logo__text">
                <TextScramble className="mxd-scramble">{siteConfig.wordmark[0]}</TextScramble>
                <TextScramble className="mxd-scramble">{siteConfig.wordmark[1]}</TextScramble>
              </div>
            </Link>
          </div>
        </CommonLoadFade>
        <CommonLoadFade index={1}>
          <div className="mxd-header__controls loading-fade">
            {/* The POS app has its own root layout, so a plain <a> does the full page load */}
            <a
              className="btn mxd-header__link slide-right"
              href={siteConfig.loginHref}
              aria-label="Login to RST POS"
            >
              <span className="btn-caption">
                <TextScramble className="mxd-scramble">Login</TextScramble>
              </span>
              <i>
                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                  <path d="M10.8,0v3.6h-3.6V0h3.6ZM14.4,10.8h3.6v-3.6h-3.6v-3.6h-3.6v3.6H0v3.6h10.8v3.6h3.6v-3.6ZM10.8,14.4h-3.6v3.6h3.6v-3.6Z" />
                </svg>
              </i>
            </a>
            <ThemeSwitcher
              isPermanent={isPermanent}
              initialTheme={initialTheme}
            />
          </div>
        </CommonLoadFade>
      </header>
    </CommonLoadAnimation>
  );
}

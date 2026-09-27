"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ThemeSwitcher from "@site/components/headers/ThemeSwitcher";
import TextScramble from "@site/components/animations/TextScramble";
import { useLenis } from "@site/components/common/LenisContext";
import { useHeaderScrollHidden } from "@site/hooks/useHeaderScrollHidden";
import CommonLoadAnimation, { CommonLoadFade } from "@site/components/animations/CommonLoadAnimation";
import { siteConfig } from "@site/content/site";
import { headerNav, isNavActive } from "@site/data/menu";

type Header1Props = {
  initialTheme: "light" | "dark";
};

const CHEVRON = "M2,6h2v2H2V6ZM4,8h2v2H4V8ZM6,10h2v2H6V10ZM8,12h2v2H8V12ZM10,10h2v2H10V10ZM12,8h2v2H12V8ZM14,6h2v2H14V6Z";

/** Website header: logo on the left, every page link in the middle, Login and the theme switch on the right. */
export default function Header1({ initialTheme }: Header1Props) {
  const headerRef = useRef<HTMLElement>(null);
  const lenis = useLenis();
  useHeaderScrollHidden(headerRef, lenis);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Pages whose headline sits on a dark banner use the light ("permanent") header
  const isPermanent = pathname === "/features";

  // Close the mobile menu after navigating
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <CommonLoadAnimation>
      <header
        id="header"
        ref={headerRef}
        className={`mxd-header site-header ${isPermanent ? "mxd-header-permanent" : ""}`}
      >
        <CommonLoadFade index={0}>
          <div className="mxd-header__logo loading-fade">
            <Link className="mxd-logo" href="/">
              <svg className="mxd-logo__image" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 42.4 36">
                <path d="M25.8,13.8h2.8v5.5h-2.8v-5.5ZM13.8,16.6v2.8h2.8v-5.5h-2.8v2.8ZM32.2,0v2.8h-2.8V0h2.8ZM26.7,5.5h2.8v-2.8h-2.8v2.8ZM21.2,5.5h-5.5v2.8h11.1v-2.8h-5.5ZM12.8,2.8v2.8h2.8v-2.8h-2.8ZM10.1,0v2.8h2.8V0h-2.8ZM7.3,5.5v5.5h2.8V2.8h-2.8v2.8ZM4.5,13.8v2.8H0v2.8h2.8v2.8H0v2.8h2.8v11.1h2.8v-8.3h5.5v-2.8h-5.5v-8.3h1.9v-5.5h-2.9v2.8ZM35,5.5v-2.8h-2.8v8.3h2.8v-5.5ZM42.4,19.4v-2.8h-4.7v-5.5h-2.8v5.5h1.9v8.3h-5.5v2.8h5.5v8.3h2.8v-11.1h2.8v-2.8h-2.8v-2.8h2.8Z" />
              </svg>
              <div className="mxd-logo__text">
                <TextScramble className="mxd-scramble">{siteConfig.wordmark[0]}</TextScramble>
                <TextScramble className="mxd-scramble">{siteConfig.wordmark[1]}</TextScramble>
              </div>
            </Link>
          </div>
        </CommonLoadFade>

        {/* Page links (desktop) */}
        <CommonLoadFade index={1}>
          <nav className="site-nav loading-fade" aria-label="Main">
            <ul className="site-nav__list">
              {headerNav.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <li key={item.href} className={`site-nav__item${item.children ? " has-children" : ""}`}>
                    <Link className={`site-nav__link${active ? " is-active" : ""}`} href={item.href} aria-current={active ? "page" : undefined}>
                      <TextScramble className="mxd-scramble">{item.label}</TextScramble>
                      {item.children && (
                        <svg className="site-nav__chevron" viewBox="0 0 18 18" aria-hidden>
                          <path d={CHEVRON} />
                        </svg>
                      )}
                    </Link>
                    {item.children && (
                      <div className="site-nav__dropdown">
                        <ul>
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`site-nav__sublink${pathname === child.href ? " is-active" : ""}`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                          <li className="site-nav__all">
                            <Link href={item.href} className="site-nav__sublink">
                              View all {item.label.toLowerCase()} →
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </CommonLoadFade>

        <CommonLoadFade index={2}>
          <div className="mxd-header__controls loading-fade">
            {/* The POS app has its own root layout, so a plain <a> does the full page load */}
            <a className="btn mxd-header__link slide-right" href={siteConfig.loginHref} aria-label="Login to RST POS">
              <span className="btn-caption">
                <TextScramble className="mxd-scramble">Login</TextScramble>
              </span>
              <i>
                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                  <path d="M10.8,0v3.6h-3.6V0h3.6ZM14.4,10.8h3.6v-3.6h-3.6v-3.6h-3.6v3.6H0v3.6h10.8v3.6h3.6v-3.6ZM10.8,14.4h-3.6v3.6h3.6v-3.6Z" />
                </svg>
              </i>
            </a>
            <ThemeSwitcher isPermanent={isPermanent} initialTheme={initialTheme} />
            {/* Menu button (tablets and phones only) */}
            <button
              type="button"
              className="site-nav__toggle"
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span className={mobileOpen ? "is-open" : ""} />
              <span className={mobileOpen ? "is-open" : ""} />
            </button>
          </div>
        </CommonLoadFade>

        {/* Page links (tablets and phones) */}
        {mobileOpen && (
          <div id="site-mobile-nav" className="site-mobile-nav" data-lenis-prevent="">
            <ul>
              {headerNav.map((item) => (
                <li key={item.href}>
                  <Link className={`site-mobile-nav__link${isNavActive(pathname, item.href) ? " is-active" : ""}`} href={item.href}>
                    {item.label}
                  </Link>
                  {item.children && (
                    <ul className="site-mobile-nav__sub">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link href={child.href}>{child.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>
    </CommonLoadAnimation>
  );
}

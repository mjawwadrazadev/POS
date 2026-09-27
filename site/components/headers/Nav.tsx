"use client";

import type { MutableRefObject, ReactNode } from "react";
import { Fragment, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuLinkItem } from "@site/types/menu";
import { companyLinks, productLinks, solutionLinks } from "@site/data/menu";
import { useMxdMenuGsap, useMxdMenuGsapRefs } from "@site/hooks/useMxdMenuGsap";
import TextScramble from "@site/components/animations/TextScramble";
import PlaceholderImage from "@site/components/common/Placeholder";
import { mailtoHref, siteConfig, socialLinks } from "@site/content/site";

function normalizePath(p: string): string {
  if (!p) return "/";
  const t = p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
  return t || "/";
}

function pathMatches(pathname: string, href: string): boolean {
  return normalizePath(pathname) === normalizePath(href);
}

function sectionHasActiveRoute(pathname: string, links: MenuLinkItem[]): boolean {
  return links.some((l) => pathMatches(pathname, l.href));
}

function makeSlotters<T>(arr: MutableRefObject<(T | null)[]>, len: number): ((el: T | null) => void)[] {
  return Array.from({ length: len }, (_, i) => (el: T | null) => {
    arr.current[i] = el;
  });
}

const ARROW_PATH =
  "M10.8,0v3.6h-3.6V0h3.6ZM14.4,10.8h3.6v-3.6h-3.6v-3.6h-3.6v3.6H0v3.6h10.8v3.6h3.6v-3.6ZM10.8,14.4h-3.6v3.6h3.6v-3.6Z";

type NavProps = {
  navNode: HTMLElement | null;
  toggleNode: HTMLElement | null;
  hamburgerNode: HTMLElement | null;
  setNavNode: (el: HTMLElement | null) => void;
  registerMenuReset: (fn: (() => void) | null) => void;
};

export default function Nav({ navNode, toggleNode, hamburgerNode, setNavNode, registerMenuReset }: NavProps) {
  const pathname = usePathname();
  const g = useMxdMenuGsapRefs();

  const homeActive = pathMatches(pathname, "/");
  const solutionsActive = pathname.startsWith("/industries");
  const productActive = sectionHasActiveRoute(pathname, productLinks);
  const companyActive = sectionHasActiveRoute(pathname, companyLinks);
  const contactActive = pathMatches(pathname, "/contact");

  // The menu animation expects exactly 5 rows, 4 arrows, 6 dividers, 10 caption spans and 8 contact links.
  const headerSlots = useMemo(() => makeSlotters(g.headerSplitTargets, 3), [g]);
  const mainSlots = useMemo(() => makeSlotters(g.mainMenuLinkSpans, 10), [g]);
  const contactSlots = useMemo(() => makeSlotters(g.contactAnchors, 8), [g]);
  const contactRevealSlots = useMemo(() => makeSlotters(g.contactRevealTargets, 8), [g]);
  const footerSlots = useMemo(() => makeSlotters(g.footerSplitTargets, 4), [g]);
  const dividerSlots = useMemo(() => makeSlotters(g.dividers, 6), [g]);
  const arrowSlots = useMemo(() => makeSlotters(g.arrows, 4), [g]);
  const liSlots = useMemo(() => makeSlotters(g.menuItemLis, 5), [g]);
  const toggleSlots = useMemo(() => makeSlotters(g.menuToggles, 5), [g]);
  const submenuSlots = useMemo(() => makeSlotters(g.menuSubmenus, 5), [g]);

  useMxdMenuGsap(navNode, toggleNode, hamburgerNode, registerMenuReset, g);

  const renderSubmenuLinks = (links: MenuLinkItem[]) =>
    links.map((link) => (
      <li key={link.href} className={`submenu__item ${pathMatches(pathname, link.href) ? "active" : ""}`}>
        {link.external ? <a href={link.href}>{link.label}</a> : <Link href={link.href}>{link.label}</Link>}
      </li>
    ));

  const parentItemClass = (current: boolean) => `main-menu__item${current ? " main-menu__item--current" : ""}`;

  const arrow = (i: number, hidden = false) => (
    <div ref={arrowSlots[i]} className="main-menu__arrow" style={hidden ? { display: "none" } : undefined}>
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
        <path d={ARROW_PATH} />
      </svg>
    </div>
  );

  const caption = (i: number, number: string, label: string) => (
    <>
      <span ref={mainSlots[i * 2]} className="main-menu__number">
        {number}
      </span>
      <span ref={mainSlots[i * 2 + 1]} className="main-menu__caption">
        {label}
      </span>
    </>
  );

  const submenuRow = (i: number, number: string, label: string, links: MenuLinkItem[], active: boolean) => (
    <li ref={liSlots[i]} className={parentItemClass(active)}>
      <div ref={toggleSlots[i]} className="main-menu__toggle">
        <p className="main-menu__link">{caption(i, number, label)}</p>
        {arrow(i)}
      </div>
      <ul ref={submenuSlots[i]} className="submenu">
        {renderSubmenuLinks(links)}
      </ul>
      <div ref={dividerSlots[i + 1]} className="main-menu__divider divider-bottom" />
    </li>
  );

  const contactLink = (i: number, href: string, content: ReactNode, external = false, scramble = true) => (
    <li>
      <a
        ref={contactSlots[i]}
        className="tag tag-m"
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {scramble ? (
          <TextScramble ref={contactRevealSlots[i]} className="mxd-scramble">
            {content as string}
          </TextScramble>
        ) : (
          <span ref={contactRevealSlots[i]}>{content}</span>
        )}
      </a>
    </li>
  );

  return (
    <nav className="mxd-menu mxd-menu--gsap" ref={setNavNode}>
      <div ref={g.backdrop} className="mxd-menu__backdrop" />
      <div ref={g.overlay} className="mxd-menu__overlay">
        <div ref={g.content} className="mxd-menu__content" data-lenis-prevent="">
          {/* Menu Logo */}
          <div className="mxd-menu__logo">
            <Link href="/" className="menu-logo">
              <svg className="menu-logo__image" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 42.4 36">
                <path d="M25.8,13.8h2.8v5.5h-2.8v-5.5ZM13.8,16.6v2.8h2.8v-5.5h-2.8v2.8ZM32.2,0v2.8h-2.8V0h2.8ZM26.7,5.5h2.8v-2.8h-2.8v2.8ZM21.2,5.5h-5.5v2.8h11.1v-2.8h-5.5ZM12.8,2.8v2.8h2.8v-2.8h-2.8ZM10.1,0v2.8h2.8V0h-2.8ZM7.3,5.5v5.5h2.8V2.8h-2.8v2.8ZM4.5,13.8v2.8H0v2.8h2.8v2.8H0v2.8h2.8v11.1h2.8v-8.3h5.5v-2.8h-5.5v-8.3h1.9v-5.5h-2.9v2.8ZM35,5.5v-2.8h-2.8v8.3h2.8v-5.5ZM42.4,19.4v-2.8h-4.7v-5.5h-2.8v5.5h1.9v8.3h-5.5v2.8h5.5v8.3h2.8v-11.1h2.8v-2.8h-2.8v-2.8h2.8Z" />
              </svg>
              <div className="menu-logo__text">
                <span ref={headerSlots[0]}>{siteConfig.wordmark[0]}</span>
                <span ref={headerSlots[1]}>{siteConfig.wordmark[1]}</span>
              </div>
            </Link>
          </div>
          {/* Menu Media */}
          <div className="mxd-menu__media">
            <div ref={g.mediaWrapper} className="menu-media__wrapper">
              <PlaceholderImage width={900} height={1280} alt="RST POS" style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
          {/* Main Navigation */}
          <div className="mxd-menu__navigation">
            <div className="mxd-menu__inner">
              <div className="mxd-menu__shadow shadow-top" />
              <div className="mxd-menu__caption">
                <p ref={headerSlots[2]}>
                  🧾 One point of sale
                  <br />
                  for every kind of business
                </p>
              </div>
              {/* left side */}
              <div className="mxd-menu__left">
                <div className="main-menu">
                  <div className="main-menu__content">
                    <ul id="main-menu" className="main-menu__accordion">
                      <li ref={liSlots[0]} className={parentItemClass(homeActive)}>
                        <div ref={dividerSlots[0]} className="main-menu__divider divider-top" />
                        <div ref={toggleSlots[0]} className="main-menu__toggle">
                          <Link className="main-menu__link" href="/">
                            {caption(0, "/ 01", "Home")}
                          </Link>
                          {arrow(0, true)}
                        </div>
                        <ul ref={submenuSlots[0]} className="submenu" style={{ display: "none" }} />
                        <div ref={dividerSlots[1]} className="main-menu__divider divider-bottom" />
                      </li>
                      {submenuRow(1, "/ 02", "Solutions", solutionLinks, solutionsActive)}
                      {submenuRow(2, "/ 03", "Product", productLinks, productActive)}
                      {submenuRow(3, "/ 04", "Company", companyLinks, companyActive)}
                      <li ref={liSlots[4]} className={parentItemClass(contactActive)}>
                        <div ref={toggleSlots[4]} className="main-menu__toggle">
                          <Link className="main-menu__link" href="/contact">
                            {caption(4, "/ 05", "Contact")}
                          </Link>
                        </div>
                        <div ref={dividerSlots[5]} className="main-menu__divider divider-bottom" />
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              {/* right side */}
              <div className="mxd-menu__right">
                <div className="menu-contact">
                  <div className="menu-contact__item">
                    <ul className="menu-contact__list">
                      {contactLink(0, mailtoHref, siteConfig.email)}
                      {contactLink(1, siteConfig.phoneHref, siteConfig.phone)}
                    </ul>
                  </div>
                  <div className="menu-contact__item">
                    <ul className="menu-contact__list">
                      {contactLink(
                        2,
                        siteConfig.mapHref,
                        <>
                          {siteConfig.address[0]}
                          <br />
                          {siteConfig.address[1]}
                        </>,
                        true,
                        false
                      )}
                    </ul>
                  </div>
                  <div className="menu-contact__item">
                    <ul className="menu-contact__list">
                      {socialLinks.map((s, i) => (
                        <Fragment key={s.name}>{contactLink(3 + i, s.url, s.name, true)}</Fragment>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              {/* data bottom line */}
              <div className="mxd-menu__shadow" />
              <div className="mxd-menu__data">
                <div className="menu-data__left">
                  <p ref={footerSlots[0]} className="menu-data__text">
                    Made with{" "}
                    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                      <path d="M2.6,6.4v2.6H0V3.9h2.6v2.6ZM15.4,3.9v5.1h2.6V3.9h-2.6ZM12.9,11.6h2.6v-2.6h-2.6v2.6ZM2.6,9v2.6h2.6v-2.6h-2.6ZM10.3,14.1h2.6v-2.6h-2.6v2.6ZM5.1,11.6v2.6h2.6v-2.6h-2.6ZM7.7,3.9V1.3H2.6v2.6h5.1ZM15.4,3.9V1.3h-5.1v2.6h5.1ZM10.3,6.4v-2.6h-2.6v2.6h2.6ZM7.7,16.7h2.6v-2.6h-2.6v2.6Z" />
                    </svg>{" "}
                    by <span ref={footerSlots[1]}>{siteConfig.company}</span>
                  </p>
                </div>
                <div className="menu-data__right">
                  <p ref={footerSlots[2]} className="menu-data__text">
                    Copyright {siteConfig.name}
                  </p>
                  <p ref={footerSlots[3]} className="menu-data__text">
                    ©{new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

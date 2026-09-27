"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLenis } from "@site/components/common/LenisContext";

type SmoothAnchorLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  targetId: string;
  children: ReactNode;
};

/** Same-page hash link: smooth scroll via Lenis when available, else native smooth behavior. */
export default function SmoothAnchorLink({
  targetId,
  children,
  ...rest
}: SmoothAnchorLinkProps) {
  const lenis = useLenis();
  const hash = targetId.startsWith("#") ? targetId : `#${targetId}`;
  const { onClick, ...anchorProps } = rest;

  const handleClick: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    e.preventDefault();
    const target = document.querySelector(hash);
    if (!(target instanceof HTMLElement)) return;

    if (lenis) {
      lenis.scrollTo(target);
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.history.replaceState(null, "", hash);
  };

  return (
    <a href={hash} onClick={handleClick} {...anchorProps}>
      {children}
    </a>
  );
}

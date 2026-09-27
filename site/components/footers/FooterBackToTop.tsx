"use client";

import BackToTop from "@site/components/common/BackToTop";
import TextScramble from "@site/components/animations/TextScramble";

/** Same markup as the React Nextjs Template; click uses Lenis (`mxdToTop` parity). */
export default function FooterBackToTop() {
  return (
    <BackToTop className="btn btn-line-icon btn-line-default slide-up">
      <TextScramble className="btn-caption mxd-scramble">
        Back to Top
      </TextScramble>
      <i>
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          x="0px"
          y="0px"
          viewBox="0 0 18 18"
          enableBackground="new 0 0 18 18"
          xmlSpace="preserve"
        >
          <path d="M0,7.2h3.6v3.6H0V7.2z M10.8,3.6V0H7.2v3.6H3.6v3.6h3.6V18h3.6V7.2h3.6V3.6H10.8z M14.4,7.2v3.6H18V7.2H14.4z" />
        </svg>
      </i>
    </BackToTop>
  );
}

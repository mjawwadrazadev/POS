"use client";

import CommonLoadAnimation, {
  CommonLoadFade,
} from "@site/components/animations/CommonLoadAnimation";

type NavTriggerProps = {
  setToggleNode: (el: HTMLDivElement | null) => void;
  setHamburgerNode: (el: HTMLElement | null) => void;
};

export default function NavTrigger({
  setToggleNode,
  setHamburgerNode,
}: NavTriggerProps) {
  return (
    <CommonLoadAnimation>
      <CommonLoadFade index={0}>
        <div className="mxd-menu__contain loading-fade">
          <div className="mxd-menu__toggle" ref={setToggleNode}>
            <a
              href="#0"
              className="mxd-menu__hamburger"
              aria-label="Menu"
              ref={setHamburgerNode}
            >
              <div className="hamburger__line" />
              <div className="hamburger__line" />
            </a>
          </div>
        </div>
      </CommonLoadFade>
    </CommonLoadAnimation>
  );
}

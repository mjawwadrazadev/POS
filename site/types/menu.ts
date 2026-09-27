export type MenuLinkItem = {
  href: string;
  label: string;
  /** Link that leaves the website (e.g. the POS login), rendered as a plain <a> */
  external?: boolean;
};

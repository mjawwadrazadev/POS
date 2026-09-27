declare module "gsap/dist/Flip.js" {
  export class Flip {
    static getState(targets: Element | Element[] | string | null): unknown;
    static from(state: unknown, vars: Record<string, unknown>): unknown;
    static fit(
      target: Element | string,
      destination: Element | string,
      vars?: Record<string, unknown>,
    ): unknown;
  }
}

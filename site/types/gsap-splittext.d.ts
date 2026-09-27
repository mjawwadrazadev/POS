declare module "gsap/SplitText.js" {
  export class SplitText {
    static create(element: HTMLElement, vars?: Record<string, unknown>): SplitText;
    lines: HTMLElement[];
    words: HTMLElement[];
    chars: HTMLElement[];
    revert(): void;
  }
}

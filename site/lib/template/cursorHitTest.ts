/**
 * Derives custom-cursor state from the DOM under the pointer, matching `mxdCursor()` in `js/app.js`
 * (classes + `data-cursor-text` / `data-cursor-image`). Used so Next.js pages work without
 * per-element listeners or a one-time `querySelectorAll` at init (which misses route updates).
 */

export type MergedCursorHit = {
  opposite: boolean;
  link: boolean;
  text: {
    variant: "default" | "permanent" | "accent";
    content: string;
  } | null;
  image: { src: string; transparent: boolean } | null;
};

function startElement(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target as Node).nodeType) return null;
  const n = target as Node;
  if (n.nodeType === Node.TEXT_NODE) return n.parentElement;
  if (n instanceof HTMLElement) return n;
  return null;
}

/** Walk ancestors from the pointer target; innermost wins for text/image. */
export function resolveCursorHitFromTarget(
  target: EventTarget | null,
): MergedCursorHit {
  let opposite = false;
  let link = false;
  let text: MergedCursorHit["text"] = null;
  let image: MergedCursorHit["image"] = null;

  let el = startElement(target);
  while (el) {
    if (el.id === "mxd-cursor") break;

    if (el.classList.contains("bg-color-opposite")) opposite = true;
    if (el.classList.contains("btn-link")) link = true;

    if (!image) {
      const src = el.dataset.cursorImage;
      if (src && el.classList.contains("active-cursor-image-tr")) {
        image = { src, transparent: true };
      } else if (src && el.classList.contains("active-cursor-image")) {
        image = { src, transparent: false };
      }
    }

    if (!text) {
      const content = el.dataset.cursorText ?? "";
      if (el.classList.contains("active-cursor-permanent")) {
        text = { variant: "permanent", content };
      } else if (el.classList.contains("active-cursor-accent")) {
        text = { variant: "accent", content };
      } else if (el.classList.contains("active-cursor")) {
        text = { variant: "default", content };
      }
    }

    el = el.parentElement;
  }

  return { opposite, link, text, image };
}

export function mergedCursorHitKey(hit: MergedCursorHit): string {
  const t = hit.text;
  const i = hit.image;
  return [
    hit.opposite ? "1" : "0",
    hit.link ? "1" : "0",
    t ? `${t.variant}:${t.content}` : "",
    i ? `${i.transparent ? "tr" : "op"}:${i.src}` : "",
  ].join("|");
}

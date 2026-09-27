"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function marqueeTrack(
  item: HTMLElement,
  time: number,
  direction: string,
): gsap.core.Tween {
  const mod = gsap.utils.wrap(0, 50);
  return gsap.to(item, {
    duration: time,
    ease: "none",
    x: direction,
    modifiers: {
      x: (x) => mod(parseFloat(x)) + "%",
    },
    repeat: -1,
  });
}

function bindVelocityToTimeline(master: gsap.core.Timeline): () => void {
  const tween = gsap.to(master, {
    duration: 1.5,
    timeScale: 1,
    paused: true,
  });
  const timeScaleClamp = gsap.utils.clamp(1, 6);
  const scrollTrigger = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      master.timeScale(timeScaleClamp(Math.abs(self.getVelocity() / 200)));
      tween.invalidate().restart();
    },
  });

  return () => {
    scrollTrigger.kill();
    tween.kill();
    master.kill();
  };
}

/**
 * Infinite horizontal marquee toward the left (track = `.marquee__toleft`).
 * Pass `ref.current` from React — do not query the DOM from here.
 */
export function initCtaMarqueeToLeft(track: HTMLElement | null): () => void {
  if (!track) return () => {};

  const originalHTML = track.innerHTML;
  track.innerHTML += originalHTML;

  const master = gsap.timeline().add(marqueeTrack(track, 70, "-=50%"), 0);
  const detachVelocity = bindVelocityToTimeline(master);

  return () => {
    detachVelocity();
    track.innerHTML = originalHTML;
  };
}

/**
 * Infinite horizontal marquee toward the right (track = `.marquee__toright`).
 */
export function initCtaMarqueeToRight(track: HTMLElement | null): () => void {
  if (!track) return () => {};

  const originalHTML = track.innerHTML;
  track.innerHTML += originalHTML;

  const master = gsap.timeline().add(marqueeTrack(track, 70, "+=50%"), 0);
  const detachVelocity = bindVelocityToTimeline(master);

  return () => {
    detachVelocity();
    track.innerHTML = originalHTML;
  };
}

/**
 * Two synchronized rows (`.marquee__top` + `.marquee__bottom` inside `.marquee--gsap`):
 * top moves left, bottom moves right, with scroll-velocity timeScale.
 */
export function initCtaMarqueeTwoLines(
  topTrack: HTMLElement | null,
  bottomTrack: HTMLElement | null,
): () => void {
  if (!topTrack || !bottomTrack) return () => {};

  const originalTop = topTrack.innerHTML;
  const originalBottom = bottomTrack.innerHTML;
  topTrack.innerHTML += originalTop;
  bottomTrack.innerHTML += originalBottom;

  const master = gsap
    .timeline()
    .add(marqueeTrack(topTrack, 70, "-=50%"), 0)
    .add(marqueeTrack(bottomTrack, 70, "+=50%"), 0);
  const detachVelocity = bindVelocityToTimeline(master);

  return () => {
    detachVelocity();
    topTrack.innerHTML = originalTop;
    bottomTrack.innerHTML = originalBottom;
  };
}

"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { gsap } from "gsap";

type AnimationTargetType = "item" | "fade";

type LoadAnimationContextValue = {
  registerTarget: (
    type: AnimationTargetType,
    index: number,
  ) => (el: HTMLElement | null) => void;
};

const LoadAnimationContext = createContext<LoadAnimationContextValue | null>(
  null,
);

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(value);
        return;
      }
      (ref as { current: T | null }).current = value;
    });
  };
}

type CommonLoadAnimationProps = {
  children: ReactNode;
};

export default function CommonLoadAnimation({
  children,
}: CommonLoadAnimationProps) {
  const loadingItemRefs = useRef<HTMLElement[]>([]);
  const fadeItemRefs = useRef<HTMLElement[]>([]);

  const registerTarget = useMemo(
    () =>
      (type: AnimationTargetType, index: number) =>
      (el: HTMLElement | null) => {
        if (!el) return;
        if (type === "item") {
          loadingItemRefs.current[index] = el;
          return;
        }
        fadeItemRefs.current[index] = el;
      },
    [],
  );

  useLayoutEffect(() => {
    const loadingItems = loadingItemRefs.current.filter(Boolean);
    const fadeInItems = fadeItemRefs.current.filter(Boolean);
    const animations: gsap.core.Tween[] = [];

    if (loadingItems.length) {
      gsap.set(loadingItems, { opacity: 0 });
      animations.push(
        gsap.to(loadingItems, {
          duration: 0.3,
          ease: "none",
          startAt: { y: 10 },
          y: 0,
          opacity: 1,
          delay: 0.6,
          stagger: 0.08,
        }),
      );
    }

    if (fadeInItems.length) {
      gsap.set(fadeInItems, { opacity: 0 });
      animations.push(
        gsap.to(fadeInItems, {
          duration: 0.8,
          ease: "none",
          opacity: 1,
          delay: 1,
        }),
      );
    }

    return () => {
      animations.forEach((animation) => animation.kill());
    };
  }, []);

  return (
    <LoadAnimationContext.Provider value={{ registerTarget }}>
      {children}
    </LoadAnimationContext.Provider>
  );
}

type CommonLoadAnimatedNodeProps = {
  index: number;
  children: ReactNode;
};

function CommonLoadAnimatedNode({
  type,
  index,
  children,
}: CommonLoadAnimatedNodeProps & { type: AnimationTargetType }) {
  const context = useContext(LoadAnimationContext);
  if (!context) {
    return children;
  }
  if (!isValidElement(children)) {
    return children;
  }
  const element = children as ReactElement<{ ref?: Ref<HTMLElement> }>;
  const registerRef = context.registerTarget(type, index);
  const childRef = element.props.ref;

  return cloneElement(element, {
    ref: mergeRefs(childRef, registerRef),
  });
}

export function CommonLoadItem({
  index,
  children,
}: CommonLoadAnimatedNodeProps) {
  return (
    <CommonLoadAnimatedNode type="item" index={index}>
      {children}
    </CommonLoadAnimatedNode>
  );
}

export function CommonLoadFade({
  index,
  children,
}: CommonLoadAnimatedNodeProps) {
  return (
    <CommonLoadAnimatedNode type="fade" index={index}>
      {children}
    </CommonLoadAnimatedNode>
  );
}

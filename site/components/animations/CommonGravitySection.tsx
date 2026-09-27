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
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Matter from "matter-js";

gsap.registerPlugin(ScrollTrigger);

type GravityContextValue = {
  registerContainer: (el: HTMLElement | null) => void;
  registerObject: (index: number) => (el: HTMLElement | null) => void;
};

const GravityContext = createContext<GravityContextValue | null>(null);

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

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

type CommonGravitySectionProps = {
  children: ReactNode;
  animateOnScroll?: boolean;
};

export default function CommonGravitySection({
  children,
  animateOnScroll = true,
}: CommonGravitySectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const objectRefs = useRef<Array<HTMLElement | null>>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const registerContainer = useMemo(
    () => (el: HTMLElement | null) => {
      containerRef.current = el;
    },
    [],
  );

  const registerObject = useMemo(
    () => (index: number) => (el: HTMLElement | null) => {
      objectRefs.current[index] = el;
    },
    [],
  );

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const config = {
      gravity: { x: 0, y: 1 },
      restitution: 0.5,
      friction: 0.15,
      frictionAir: 0.02,
      density: 0.002,
      wallThickness: 200,
      mouseStiffness: 0.6,
    };

    const clearRetryTimer = () => {
      if (!retryTimerRef.current) return;
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    };

    const initPhysics = (attempt = 0) => {
      cleanupRef.current?.();
      clearRetryTimer();

      const objects = objectRefs.current.filter(
        (node): node is HTMLElement => Boolean(node && node.isConnected),
      );
      if (!objects.length) {
        if (attempt < 20) {
          retryTimerRef.current = window.setTimeout(
            () => initPhysics(attempt + 1),
            120,
          );
        }
        return;
      }

      const engine = Matter.Engine.create();
      engine.gravity.x = config.gravity.x;
      engine.gravity.y = config.gravity.y;
      engine.constraintIterations = 10;
      engine.positionIterations = 20;
      engine.velocityIterations = 16;
      engine.timing.timeScale = 1;

      const containerRect = container.getBoundingClientRect();
      if (!containerRect.width || !containerRect.height) {
        Matter.Engine.clear(engine);
        if (attempt < 20) {
          retryTimerRef.current = window.setTimeout(
            () => initPhysics(attempt + 1),
            120,
          );
        }
        return;
      }

      const wallThickness = config.wallThickness;
      const worldBodies: {
        body: Matter.Body;
        element: HTMLElement;
        width: number;
        height: number;
      }[] = [];

      const walls = [
        Matter.Bodies.rectangle(
          containerRect.width / 2,
          containerRect.height + wallThickness / 2,
          containerRect.width + wallThickness * 2,
          wallThickness,
          { isStatic: true },
        ),
        Matter.Bodies.rectangle(
          -wallThickness / 2,
          containerRect.height / 2,
          wallThickness,
          containerRect.height + wallThickness * 2,
          { isStatic: true },
        ),
        Matter.Bodies.rectangle(
          containerRect.width + wallThickness / 2,
          containerRect.height / 2,
          wallThickness,
          containerRect.height + wallThickness * 2,
          { isStatic: true },
        ),
      ];
      Matter.World.add(engine.world, walls);

      objects.forEach((obj, index) => {
        const img = obj.tagName === "IMG" ? obj : obj.querySelector("img");
        if (img) {
          (img as HTMLImageElement).draggable = false;
          (img as HTMLImageElement).style.pointerEvents = "none";
        }

        const objRect = obj.getBoundingClientRect();
        if (!objRect.width || !objRect.height) return;

        const startX =
          Math.random() * (containerRect.width - objRect.width) + objRect.width / 2;
        const startY = -500 - index * 200;
        const startRotation = (Math.random() - 0.5) * Math.PI;

        const body = Matter.Bodies.rectangle(
          startX,
          startY,
          objRect.width,
          objRect.height,
          {
            restitution: config.restitution,
            friction: config.friction,
            frictionAir: config.frictionAir,
            density: config.density,
          },
        );
        Matter.Body.setAngle(body, startRotation);
        worldBodies.push({
          body,
          element: obj,
          width: objRect.width,
          height: objRect.height,
        });
        Matter.World.add(engine.world, body);
      });

      if (!worldBodies.length) {
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
        if (attempt < 20) {
          retryTimerRef.current = window.setTimeout(
            () => initPhysics(attempt + 1),
            120,
          );
        }
        return;
      }
      initializedRef.current = true;

      const topWallTimer = window.setTimeout(() => {
        const topWall = Matter.Bodies.rectangle(
          containerRect.width / 2,
          -wallThickness / 2,
          containerRect.width + wallThickness * 2,
          wallThickness,
          { isStatic: true },
        );
        Matter.World.add(engine.world, topWall);
      }, 5000);

      const mouse = Matter.Mouse.create(container);
      const mousewheelHandler = (
        mouse as unknown as { mousewheel?: EventListener }
      ).mousewheel;
      if (mousewheelHandler) {
        mouse.element.removeEventListener("mousewheel", mousewheelHandler);
        mouse.element.removeEventListener("DOMMouseScroll", mousewheelHandler);
      }

      const mouseConstraint = Matter.MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: config.mouseStiffness,
          render: { visible: false },
        },
      });
      mouseConstraint.mouse.element.oncontextmenu = () => false;

      let dragging: Matter.Body | null = null;
      let originalInertia: number | null = null;

      const onStartDrag = (event: Matter.IEvent<Matter.MouseConstraint>) => {
        dragging = (
          event as unknown as {
            body?: Matter.Body;
          }
        ).body ?? null;
        if (!dragging) return;
        originalInertia = dragging.inertia;
        Matter.Body.setInertia(dragging, Infinity);
        Matter.Body.setVelocity(dragging, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(dragging, 0);
      };

      const onEndDrag = () => {
        if (!dragging) return;
        Matter.Body.setInertia(dragging, originalInertia ?? 1);
        dragging = null;
        originalInertia = null;
      };

      Matter.Events.on(mouseConstraint, "startdrag", onStartDrag);
      Matter.Events.on(mouseConstraint, "enddrag", onEndDrag);

      const beforeUpdate = () => {
        if (!dragging) return;
        const found = worldBodies.find((b) => b.body === dragging);
        if (!found) return;

        const minX = found.width / 2;
        const maxX = containerRect.width - found.width / 2;
        const minY = found.height / 2;
        const maxY = containerRect.height - found.height / 2;

        Matter.Body.setPosition(dragging, {
          x: clamp(dragging.position.x, minX, maxX),
          y: clamp(dragging.position.y, minY, maxY),
        });

        Matter.Body.setVelocity(dragging, {
          x: clamp(dragging.velocity.x, -20, 20),
          y: clamp(dragging.velocity.y, -20, 20),
        });
      };
      Matter.Events.on(engine, "beforeUpdate", beforeUpdate);

      const releaseMouse = () => {
        mouseConstraint.constraint.bodyB = null;
      };
      container.addEventListener("mouseleave", releaseMouse);
      container.addEventListener("mouseup", releaseMouse);

      Matter.World.add(engine.world, mouseConstraint);

      const runner = Matter.Runner.create();
      Matter.Runner.run(runner, engine);

      let updateRaf = 0;
      const updatePositions = () => {
        worldBodies.forEach(({ body, element, width, height }) => {
          const x = clamp(body.position.x - width / 2, 0, containerRect.width - width);
          const y = clamp(
            body.position.y - height / 2,
            -height * 3,
            containerRect.height - height,
          );
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
          element.style.transform = `rotate(${body.angle}rad)`;
        });
        updateRaf = window.requestAnimationFrame(updatePositions);
      };
      updatePositions();

      cleanupRef.current = () => {
        window.clearTimeout(topWallTimer);
        container.removeEventListener("mouseleave", releaseMouse);
        container.removeEventListener("mouseup", releaseMouse);
        if (updateRaf) window.cancelAnimationFrame(updateRaf);
        Matter.Events.off(mouseConstraint, "startdrag", onStartDrag);
        Matter.Events.off(mouseConstraint, "enddrag", onEndDrag);
        Matter.Events.off(engine, "beforeUpdate", beforeUpdate);
        Matter.Runner.stop(runner);
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
      };
    };

    let trigger: ScrollTrigger | null = null;
    if (animateOnScroll) {
      trigger = ScrollTrigger.create({
        trigger: section.querySelector(".mxd-gravity-section") ?? section,
        start: "top bottom",
        once: true,
        onEnter: () => initPhysics(),
      });

      retryTimerRef.current = window.setTimeout(() => {
        if (initializedRef.current) return;
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.2) {
          initPhysics();
        }
      }, 250);
    } else {
      initPhysics();
    }

    const relaunch = () => {
      initializedRef.current = false;
      ScrollTrigger.refresh();
      initPhysics();
    };
    window.addEventListener("resize", relaunch);

    return () => {
      trigger?.kill();
      clearRetryTimer();
      window.removeEventListener("resize", relaunch);
      cleanupRef.current?.();
      cleanupRef.current = null;
      initializedRef.current = false;
    };
  }, [animateOnScroll]);

  return (
    <GravityContext.Provider value={{ registerContainer, registerObject }}>
      <section ref={sectionRef}>{children}</section>
    </GravityContext.Provider>
  );
}

type CommonGravityNodeProps = {
  children: ReactNode;
};

export function CommonGravityContainer({ children }: CommonGravityNodeProps) {
  const context = useContext(GravityContext);
  if (!context || !isValidElement(children)) return children;
  const element = children as ReactElement<{ ref?: Ref<HTMLElement> }>;
  return cloneElement(element, {
    ref: mergeRefs(element.props.ref, context.registerContainer),
  });
}

type CommonGravityObjectProps = {
  index: number;
  children: ReactNode;
};

export function CommonGravityObject({ index, children }: CommonGravityObjectProps) {
  const context = useContext(GravityContext);
  if (!context || !isValidElement(children)) return children;
  const element = children as ReactElement<{ ref?: Ref<HTMLElement> }>;
  return cloneElement(element, {
    ref: mergeRefs(element.props.ref, context.registerObject(index)),
  });
}

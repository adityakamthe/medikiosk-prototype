"use client";

import {
  Children,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

export const revealEase = [0.2, 0.7, 0.2, 1] as const;

export function LineMaskReveal({
  lines,
  className = "",
}: {
  lines: string[];
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <span ref={ref} className={`block ${className}`}>
      {lines.map((line, i) => (
        <span key={line} className="block overflow-hidden">
          <span
            className="block will-change-transform transition-transform duration-700 ease-out"
            style={{
              transform: inView ? "translateY(0)" : "translateY(100%)",
              transitionDelay: `${i * 100}ms`,
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </span>
  );
}

export function SectionIntro({
  eyebrow,
  children,
  className = "",
  light = false,
}: {
  eyebrow: string;
  children: ReactNode;
  className?: string;
  light?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      <p
        className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-500 ease-out ${
          light ? "text-cornsilk/70" : "text-pine-teal"
        } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
      >
        {eyebrow}
      </p>
      <div
        className={`transition-all duration-600 delay-150 ease-out ${
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function CountUp({
  to,
  className = "",
}: {
  to: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("en-IN")}
    </span>
  );
}

export function StaggerGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const items = Children.toArray(children);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          className="transition-all duration-500 ease-out"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transitionDelay: `${i * 100}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

export function DepthHeadline({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`transition-transform duration-500 ${className}`}>
      {children}
    </div>
  );
}

export function MockupTilt({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: py * -8, ry: px * 8 });
  }

  function onLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  return (
    <div ref={ref} className={`[perspective:1200px] ${className}`}>
      <div
        className="will-change-transform transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {children}
      </div>
    </div>
  );
}

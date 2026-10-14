"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/**
 * Entrance on scroll: communicates sequence and keeps long lists from landing all at once.
 * Server HTML is fully visible (no hidden state before JS). After mount, only items that start
 * below the fold are hidden and then revealed as they scroll into view.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.15 });
  const [armed, setArmed] = useState(false);
  const Tag = as === "li" ? motion.li : motion.div;

  useEffect(() => {
    if (reduce || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight) setArmed(true);
  }, [reduce]);

  const hidden = armed && !seen;
  return (
    <Tag
      ref={ref as never}
      className={className}
      initial={false}
      animate={hidden ? { opacity: 0, y: 18 } : { opacity: 1, y: 0 }}
      transition={hidden ? { duration: 0 } : { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

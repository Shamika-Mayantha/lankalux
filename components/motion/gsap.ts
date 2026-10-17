"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);

// The house curve: a long, heavy settle.
CustomEase.create("lux", "0.16, 1, 0.3, 1");
CustomEase.create("luxInOut", "0.7, 0, 0.2, 1");
gsap.defaults({ ease: "lux", duration: 1 });

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isCoarsePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export { gsap, ScrollTrigger, SplitText, useGSAP };

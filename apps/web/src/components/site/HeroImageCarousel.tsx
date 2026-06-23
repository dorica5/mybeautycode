"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HERO_IMAGES = [
  {
    src: "/images/hero/hero-3.png",
    alt: "Curly hair beauty portrait",
  },
  {
    src: "/images/hero/hero-1.png",
    alt: "Manicured hands with nude polish",
  },
  {
    src: "/images/hero/hero-2.png",
    alt: "Lash extension treatment",
  },
] as const;

const ROTATE_MS = 4500;

export function HeroImageCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="relative aspect-[4/5] w-[320px] shrink-0 overflow-hidden rounded-t-[10rem] sm:w-[360px] sm:rounded-t-[11.25rem] md:w-[480px] md:rounded-t-[15rem] lg:w-[520px] lg:rounded-t-[16.25rem]"
      aria-roledescription="carousel"
      aria-label="Beauty highlights"
    >
      {HERO_IMAGES.map((image, index) => (
        <div
          key={image.src}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={index !== activeIndex}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            unoptimized
            sizes="(max-width: 768px) 360px, 520px"
            className="object-cover object-center"
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  );
}

import Image from "next/image";
import type { Photo as PhotoData } from "@/lib/photos";

const OPTIMISED_REMOTE = /^https:\/\/([a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/|admin\.lankalux\.com\/)/i;

/**
 * With object-fit: cover, a wide photo in a taller frame is drawn wider than the frame, so the
 * browser must fetch a correspondingly wider file. Scale every vw/px width in `sizes` (not the media-query breakpoints) by that factor.
 */
function cropSizes(sizes: string, photo: PhotoData, frameAspect?: number) {
  if (!frameAspect) return sizes;
  const factor = Math.max(1, photo.width / photo.height / frameAspect) * 1.05;
  if (factor <= 1.05) return sizes;
  return sizes.replace(/(?<![\d.])(?<!:\s?)(\d+(?:\.\d+)?)(vw|px)/g, (_, n, unit) => `${Math.round(Number(n) * factor)}${unit}`);
}

/**
 * A photo that fills its frame. The frame (parent) sets the size and crop;
 * `data-photo-key` keeps the admin key visible in the DOM for debugging overrides.
 */
export function Photo({
  photo,
  sizes = "100vw",
  priority = false,
  className = "",
  position,
  alt,
  frameAspect,
}: {
  photo: PhotoData;
  sizes?: string;
  priority?: boolean;
  className?: string;
  position?: string;
  alt?: string;
  /** Width ÷ height of the frame, when it is narrower than the photo (portrait crops). */
  frameAspect?: number;
}) {
  const remote = /^https?:\/\//.test(photo.src);
  return (
    <Image
      src={photo.src}
      alt={alt ?? photo.alt}
      fill
      sizes={cropSizes(sizes, photo, frameAspect)}
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      placeholder={photo.blurDataURL ? "blur" : "empty"}
      blurDataURL={photo.blurDataURL}
      unoptimized={remote && !OPTIMISED_REMOTE.test(photo.src)}
      data-photo-key={photo.key}
      className={`object-cover ${className}`}
      style={position ? { objectPosition: position } : undefined}
    />
  );
}

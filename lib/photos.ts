import "server-only";
import manifest from "@/content/generated/images.json";
import { getSiteContent } from "./site-content";

export type Photo = {
  /** Original repo path, the key admin overrides are saved under. */
  key: string;
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
  alt: string;
};

type Entry = { w: number; h: number; blur: string };
const files = manifest as Record<string, Entry>;

/** Resolve a photo key to the admin override when one is published, otherwise to the local master. */
export async function photo(key: string, alt = ""): Promise<Photo> {
  const k = key.replace(/^\/+/, "");
  const entry = files[k];
  if (!entry) throw new Error(`Unknown photo key ${k}`);
  const { photos } = await getSiteContent();
  const override = photos[k];
  return {
    key: k,
    src: override || "/" + k,
    width: entry.w,
    height: entry.h,
    // An override has its own colours; keep the blur only for the local photo.
    blurDataURL: override ? undefined : entry.blur,
    alt,
  };
}

export async function photos(list: { key: string; alt?: string }[]): Promise<Photo[]> {
  return Promise.all(list.map((p) => photo(p.key, p.alt ?? "")));
}

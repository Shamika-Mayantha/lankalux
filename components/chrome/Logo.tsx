import Image from "next/image";
import mark from "@/public/lankalux-mark.png";

/** The gold palm-and-island mark with the wordmark set in the display face. */
export function Logo({ className = "", markClass = "size-9" }: { className?: string; markClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image src={mark} alt="" className={markClass} sizes="48px" loading="eager" />
      <span className="font-display text-[1.375rem] uppercase leading-none tracking-[0.12em]">LankaLux</span>
    </span>
  );
}

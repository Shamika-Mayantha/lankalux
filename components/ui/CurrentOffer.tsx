import { getPromotions } from "@/lib/site-content";

const formatDay = (ymd: string) =>
  new Date(ymd + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Colombo" });

/** "Current offer": the live promotions from admin (Website → Promotions). Renders nothing when there are none. */
export async function CurrentOffer({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const promotions = await getPromotions();
  if (!promotions.length) return null;
  const surface = tone === "dark" ? "bg-forest-700 text-ivory" : "bg-sand text-ink";
  const soft = tone === "dark" ? "text-ivory/75" : "text-ink-soft";
  return (
    <aside aria-label="Current offer" data-reveal className={`space-y-5 ${className}`}>
      {promotions.map((p) => (
        <div key={p.title + p.message} className={`${surface} px-6 py-5`}>
          <p className={`text-[0.95rem] ${soft}`}>Current offer{p.ends_on ? ` · until ${formatDay(p.ends_on)}` : ""}</p>
          <p className="mt-1 font-display text-[1.625rem] leading-tight">{p.title}</p>
          <p className="mt-2 max-w-[60ch]">{p.message}</p>
        </div>
      ))}
    </aside>
  );
}

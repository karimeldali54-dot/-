import type { PublicCard } from "@/game/table";

export function CardView({
  card,
  selected = false,
  casting = false,
  onSelect,
}: {
  card: PublicCard;
  selected?: boolean;
  casting?: boolean;
  onSelect?: () => void;
}) {
  const body =
    card.face === "down" ? (
      <img src="/art/card-back.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : card.face === "ability" && card.image ? (
      <img src={card.image} alt={card.name} className="absolute inset-0 h-full w-full object-cover" />
    ) : card.face === "ability" ? (
      <div className="absolute inset-0 flex flex-col justify-between bg-night p-2">
        <span className="w-fit rounded-full bg-carnelian px-2 py-0.5 text-xs font-bold text-sand">قدرة</span>
        <div>
          <h3 className="text-sm font-extrabold leading-tight text-gold">{card.name}</h3>
          <p className="mt-1 text-xs leading-snug text-sand">{card.blurb}</p>
        </div>
      </div>
    ) : card.image ? (
      <>
        <img src={card.image} alt="" className="absolute inset-0 h-full w-full bg-night object-contain" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night via-night/90 to-transparent px-2 pb-2 pt-8">
          <h3 className="text-sm font-extrabold leading-tight text-sand">{card.name}</h3>
        </div>
      </>
    ) : (
      <div className="absolute inset-0 flex flex-col justify-between bg-night p-2">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-lapis px-2 py-0.5 text-xs font-bold text-sand">{card.kindLabel}</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-sm font-extrabold text-night">
            {card.value}
          </span>
        </div>
        <div>
          <p className="text-xs font-bold text-gold">{card.culture}</p>
          <h3 className="text-sm font-extrabold leading-tight text-sand">{card.name}</h3>
        </div>
      </div>
    );
  const className = `relative block aspect-[2/3] w-full overflow-hidden rounded-card border-2 text-start shadow-lg ${
    selected ? "border-gold ring-2 ring-gold" : "border-gold/70"
  } ${card.frozen ? "ice-lock" : ""} ${card.shield ? "scarab-ward" : ""} ${casting ? "card-cast" : ""}`;
  const inner = (
    <>
      {body}
      {card.face === "piece" ? (
        <span className="absolute top-1 left-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-gold text-sm font-extrabold text-night">
          {card.value}
        </span>
      ) : null}
      {card.frozen ? <span className="ice-mark" aria-hidden="true" /> : null}
      {card.shield ? <span className="scarab-badge" aria-hidden="true" /> : null}
    </>
  );
  if (!onSelect) return <article className={className}>{inner}</article>;
  return (
    <button type="button" onClick={onSelect} className={className} aria-pressed={selected}>
      {inner}
    </button>
  );
}

export function CardBack({
  label,
  className = "",
  frozen = false,
  shield = false,
}: {
  label: string;
  className?: string;
  frozen?: boolean;
  shield?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-card border-2 shadow-lg ${frozen ? "ice-lock border-sky-200" : "border-gold"} ${shield ? "scarab-ward" : ""} ${className}`}>
      <img src="/art/card-back.jpg" alt={label} className="aspect-[2/3] w-full object-cover" />
      {frozen ? <span className="ice-mark" aria-hidden="true" /> : null}
      {shield ? <span className="scarab-badge" aria-hidden="true" /> : null}
    </div>
  );
}

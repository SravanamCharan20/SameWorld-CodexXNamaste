const PALETTE = ["#818CF8", "#A78BFA", "#F5B822", "#22C55E", "#F472B6", "#38BDF8"];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({
  name,
  size = 28,
  mine = false,
}: {
  name: string;
  size?: number;
  mine?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const bg = mine ? "#818CF8" : colorFor(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-background shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, backgroundColor: bg }}
    >
      {initial}
    </div>
  );
}

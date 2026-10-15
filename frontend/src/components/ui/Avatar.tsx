import { initial } from "@/lib/format";

const COLORS = ["#8250df", "#0969da", "#1a7f37", "#bf3989", "#9a6700", "#cf222e", "#0a7f87", "#6639ba"];

export function Avatar({ name, size = 20 }: { name: string; size?: number }) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: COLORS[hash % COLORS.length], fontSize: Math.round(size * 0.55) }}
      title={name}
      aria-hidden="true"
    >
      {initial(name)}
    </span>
  );
}

export function UserChip({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="muted">Unassigned</span>;

  return (
    <span className="user-chip">
      <Avatar name={name} />
      <span>{name}</span>
    </span>
  );
}

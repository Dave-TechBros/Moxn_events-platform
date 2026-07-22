import { cn } from "@/lib/utils";

// Category tag — color added purposefully (grayscale-first design).
export function CategoryTag({
  name,
  color,
  className,
}: {
  name: string;
  color?: string;
  className?: string;
}) {
  const style = color
    ? ({
        backgroundColor: `hsl(${color} / 0.12)`,
        color: `hsl(${color})`,
        borderColor: `hsl(${color} / 0.25)`,
      } as React.CSSProperties)
    : undefined;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        !color && "border-transparent bg-secondary text-secondary-foreground",
        className
      )}
      style={style}
    >
      {name}
    </span>
  );
}

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-[0_0_0_1px_hsl(var(--accent)/0.4)] hover:bg-accent/90 hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.6),0_8px_24px_-4px_hsl(var(--accent)/0.4)]",
  secondary:
    "border border-border bg-transparent text-foreground hover:bg-secondary/60 hover:border-border/80",
  ghost:
    "bg-transparent text-foreground hover:bg-secondary/60",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

/**
 * Classes do botão expostas como helper pra ser aplicada em
 * `<a>`/`<Link>` quando o "botão" é na verdade uma navegação,
 * sem precisar wrap em `<button>` aninhado.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", size = "md", className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={buttonClasses({ variant, size, className })}
        {...rest}
      />
    );
  },
);

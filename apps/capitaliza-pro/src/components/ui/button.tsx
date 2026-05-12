import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "whatsapp";
type Size = "sm" | "md" | "lg" | "xl";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-[0_8px_24px_-8px_hsl(var(--accent)/0.5)] hover:bg-accent/90 hover:shadow-[0_12px_32px_-8px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5",
  secondary:
    "border border-foreground/10 bg-card text-foreground hover:bg-secondary hover:border-foreground/20",
  ghost:
    "bg-transparent text-foreground hover:bg-secondary",
  whatsapp:
    "bg-[#25D366] text-white shadow-[0_8px_24px_-8px_rgba(37,211,102,0.5)] hover:bg-[#1ebd5a] hover:shadow-[0_12px_32px_-8px_rgba(37,211,102,0.6)] hover:-translate-y-0.5",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
  xl: "h-16 px-10 text-lg",
};

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

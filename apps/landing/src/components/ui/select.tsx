import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Select nativo estilizado pra match dos outros inputs do form.
 *
 * Mantemos `<select>` nativo ao invés de Radix Select pra preservar
 * a11y completa (keyboard nav, screen reader) sem custo de bundle.
 * Wrapper relativo + chevron absolute pra esconder a seta default
 * inconsistente entre Chrome/Safari/Firefox em dark mode.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-11 w-full appearance-none rounded-md border border-border bg-background/50 pl-3.5 pr-10 text-sm text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    );
  },
);

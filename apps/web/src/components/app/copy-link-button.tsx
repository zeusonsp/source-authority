"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyLinkButtonProps = {
  value: string;
  /** Aria-label opcional. Default: "Copiar link" */
  label?: string;
};

export function CopyLinkButton({
  value,
  label = "Copiar link",
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback caso clipboard API não esteja disponível (HTTP, browser
      // antigo). Mantém UX silenciosa — user pode selecionar e copiar
      // manualmente do texto exibido ao lado.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-accent" />
          <span>Copiado</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          <span>Copiar</span>
        </>
      )}
    </Button>
  );
}

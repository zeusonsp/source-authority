"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn, WHATSAPP_URL } from "@/lib/utils";

/**
 * Floating WhatsApp button — sticky no canto inferior direito.
 * Aparece depois de 600px de scroll pra não competir com o Hero CTA.
 */
export function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 font-semibold text-white shadow-[0_8px_32px_-8px_rgba(37,211,102,0.6)] transition-all duration-500 hover:bg-[#1ebd5a] hover:shadow-[0_12px_40px_-8px_rgba(37,211,102,0.8)]",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <MessageCircle className="size-5 fill-current" />
      <span className="hidden text-sm sm:inline">Falar agora</span>
    </a>
  );
}

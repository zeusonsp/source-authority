import { ComoFunciona } from "@/components/sections/ComoFunciona";
import { CTA } from "@/components/sections/CTA";
import { Diferenciais } from "@/components/sections/Diferenciais";
import { Hero } from "@/components/sections/Hero";
import { Numeros } from "@/components/sections/Numeros";
import { Planos } from "@/components/sections/Planos";
import { ProvablyFair } from "@/components/sections/ProvablyFair";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Diferenciais />
      <ProvablyFair />
      <Numeros />
      <ComoFunciona />
      <Planos />
      <CTA />
      <FloatingWhatsApp />
    </main>
  );
}

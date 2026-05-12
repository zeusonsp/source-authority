import { Ticker } from "@/components/sections/Ticker";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { SelosInstitucionais } from "@/components/sections/SelosInstitucionais";
import { Planos } from "@/components/sections/Planos";
import { Diferenciais } from "@/components/sections/Diferenciais";
import { ProvablyFair } from "@/components/sections/ProvablyFair";
import { Premiados } from "@/components/sections/Premiados";
import { PremiosDiarios } from "@/components/sections/PremiosDiarios";
import { CSR } from "@/components/sections/CSR";
import { FAQ } from "@/components/sections/FAQ";
import { CTAFinal } from "@/components/sections/CTAFinal";
import { Footer } from "@/components/sections/Footer";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";

export default function HomePage() {
  return (
    <>
      <Ticker />
      <Header />
      <main>
        <Hero />
        <SelosInstitucionais />
        <Planos />
        <Diferenciais />
        <ProvablyFair />
        <Premiados />
        <PremiosDiarios />
        <CSR />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}

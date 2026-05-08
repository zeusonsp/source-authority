import { ComparativoLinktree } from "@/components/sections/ComparativoLinktree";
import { Hero } from "@/components/sections/Hero";
import { Pricing } from "@/components/sections/Pricing";
import { Problema } from "@/components/sections/Problema";
import { Solucao } from "@/components/sections/Solucao";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Problema />
      <Solucao />
      <ComparativoLinktree />
      <Pricing />
    </main>
  );
}

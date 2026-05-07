import { Hero } from "@/components/sections/Hero";
import { Problema } from "@/components/sections/Problema";
import { Solucao } from "@/components/sections/Solucao";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Problema />
      <Solucao />
    </main>
  );
}

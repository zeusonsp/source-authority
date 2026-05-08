import type { Metadata } from "next";
import { DemoForm } from "./demo-form";

export const metadata: Metadata = {
  title: "Solicitar demo",
};

type SearchParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export default function DemoPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  return (
    <main className="container mx-auto px-6 py-20 md:py-28">
      <div className="mx-auto max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent">
          Beta privado
        </span>
        <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
          Solicitar demo
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Conta um pouco sobre tua empresa. Voltamos em até 24h com um link
          de acesso ao beta privado.
        </p>

        <div className="mt-10">
          <DemoForm
            utm={{
              utm_source: searchParams?.utm_source,
              utm_medium: searchParams?.utm_medium,
              utm_campaign: searchParams?.utm_campaign,
              utm_content: searchParams?.utm_content,
              utm_term: searchParams?.utm_term,
            }}
          />
        </div>
      </div>
    </main>
  );
}

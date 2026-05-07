import { PlaceholderPage } from "@/components/app/placeholder-page";

export const metadata = {
  title: "Link Mestre",
};

export default function LinkPage() {
  return (
    <PlaceholderPage
      title="Link Mestre"
      badge="Em construção · Fase 3"
      description="Esta tela será implementada na Fase 3 do roadmap (Cloudflare Worker + tracking edge). Por enquanto seu link mestre fica em zeusoficial.com.br até a ativação do oficial.sourceauthority.com.br/[slug]."
    />
  );
}
